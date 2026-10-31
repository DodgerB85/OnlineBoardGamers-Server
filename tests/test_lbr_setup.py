import json
import time
from unittest.mock import patch

from django.contrib.messages import get_messages
from django.test import TestCase, override_settings
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
import LBR.LBRconstants as rfLBR
from Lobby.models import Game, User

TEST_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def messages(response):
    return [str(m) for m in get_messages(response.wsgi_request)]


def base_post(**overrides):
    data = {
        "playerNumber": "3",
        "gameName": "Test Game",
        "gameDescription": "A test game",
        "pace": "40",
        "kickoutDuration": "100",
    }
    data.update(overrides)
    return data


class LBRCreationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")
        self.extra = User.objects.create_user(username="extra", password="pw")
        for name in ["SHADOW", "SHADOW_2", "SHADOW_3"]:
            User.objects.create_user(username=name, password="pw")
        self.client.force_login(self.creator)

    def test_invited_game_waits_with_three_seats(self):
        response = self.client.post(
            reverse("LBR:createLBRgame"),
            base_post(player2="invited", player3="extra"),
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "waiting"}))

        created = Game.objects.get(gameCode="LBR")
        self.assertEqual(created.gameStatus, "WAITING")
        self.assertEqual(created.maxPlayers, 3)
        self.assertEqual(created.phase, rfLBR.PHASE_TURN)
        self.assertEqual(
            sorted(created.invitedPlayers.values_list("username", flat=True)),
            ["extra", "invited"],
        )
        self.assertEqual(created.players.count(), 1)
        self.assertEqual(len(json.loads(created.zoomLevels)), 3)

    def test_practice_game_starts_with_shadows(self):
        response = self.client.post(
            reverse("LBR:createLBRgame"),
            base_post(playerNumber="3", trainingGame="1", player2="One", player3="Two"),
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}))

        created = Game.objects.get(gameCode="LBR")
        self.assertEqual(created.gameStatus, "ACTIVE")
        self.assertTrue(created.statsExcludedGame)
        self.assertEqual(
            set(created.players.values_list("player__username", flat=True)),
            {"creator", "SHADOW", "SHADOW_2"},
        )
        self.assertIn(rf.SO_TRAINING_GAME, json.loads(created.startingOptions))
        self.assertTrue(created.players.filter(is_current=True).exists())

    def test_player_count_outside_two_to_four_is_rejected(self):
        for count in ["1", "5"]:
            with self.subTest(count=count):
                Game.objects.filter(gameCode="LBR").delete()
                response = self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber=count))
                self.assertEqual(response.status_code, 302)
                self.assertEqual(response.url, reverse("createLBRpage"))
                self.assertFalse(Game.objects.filter(gameCode="LBR").exists())
                self.assertIn("Land Between Rivers is for 2 to 4 players", messages(response))

    def test_inviting_yourself_is_rejected(self):
        response = self.client.post(reverse("LBR:createLBRgame"), base_post(player2="creator"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createLBRpage"))
        self.assertFalse(Game.objects.filter(gameCode="LBR").exists())

    @override_settings(STORAGES=TEST_STORAGES)
    def test_create_and_show_pages_render(self):
        response = self.client.get(reverse("createLBRpage"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Land Between Rivers")

        response = self.client.get(reverse("LBR:LBRhelp"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Land Between Rivers Help")

        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", player2="invited"))
        game = Game.objects.get(gameCode="LBR")
        self.client.force_login(self.invited)
        self.client.post(
            reverse("joinGame", kwargs={"gameType": "LBR"}),
            json.dumps({"gameID": game.id, "source": "ajax", "action": ""}),
            content_type="application/json",
        )
        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "ACTIVE")

        response = self.client.get(reverse("LBR:showLBRgame", kwargs={"game_id": game.id}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "initData.gameData")


class LBRTurnTests(TestCase):
    def setUp(self):
        self.patcher = patch("django_q.tasks.async_task")
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.schedule_patcher = patch("django_q.tasks.schedule")
        self.schedule_patcher.start()
        self.addCleanup(self.schedule_patcher.stop)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.other = User.objects.create_user(username="other", password="pw")
        User.objects.create_user(username="outsider", password="pw")

        self.client.force_login(self.creator)
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", player2="other"))
        self.game = Game.objects.get(gameCode="LBR")

        self.client.force_login(self.other)
        self.client.post(
            reverse("joinGame", kwargs={"gameType": "LBR"}),
            json.dumps({"gameID": self.game.id, "source": "ajax", "action": ""}),
            content_type="application/json",
        )
        self.game.refresh_from_db()
        self.client.force_login(self.creator)
        self.seat_names = list(self.game.players.order_by("seat_order").values_list("player__username", flat=True))

    def save_payload(self, latest_update, game_data, next_player=None):
        return {
            "action": "saveGame",
            "gameID": self.game.id,
            "latestUpdate": latest_update,
            "gameData": game_data,
            "turn": 2,
            "phase": rfLBR.PHASE_TURN,
            "nextPlayer": next_player or [self.seat_names[1]],
            "status": "ACTIVE",
            "saveRewind": True,
        }

    def test_save_updates_data_and_hands_the_turn_over(self):
        old_latest_update = self.game.latestUpdate
        game_data = json.dumps({"turnNumber": 2, "pending": None})

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            self.save_payload(old_latest_update, game_data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, game_data)
        self.assertEqual(self.game.turn, 2)
        self.assertEqual(self.game.phase, rfLBR.PHASE_TURN)
        self.assertNotEqual(str(self.game.latestUpdate), str(old_latest_update))
        self.assertTrue(self.game.players.get(player__username=self.seat_names[1]).is_current)
        self.assertFalse(self.game.players.get(player__username=self.seat_names[0]).is_current)
        self.assertEqual(json.loads(self.game.rewindData), [[game_data]])

    def test_stale_save_is_rejected_without_changing_the_game(self):
        stale_latest_update = int(self.game.latestUpdate) - 1

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            self.save_payload(stale_latest_update, "stale"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"syncError": True})
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "")
        self.assertEqual(str(self.game.latestUpdate), str(stale_latest_update + 1))

    def test_non_player_cannot_save(self):
        self.client.force_login(User.objects.get(username="outsider"))
        response = self.client.post(
            reverse("LBR:processLBRturn"),
            self.save_payload(self.game.latestUpdate, "forged"),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "")

    def test_finishing_marks_the_winner_and_final_positions(self):
        payload = self.save_payload(self.game.latestUpdate, "final position")
        payload.update(
            {
                "status": "FINISHED",
                "phase": rfLBR.PHASE_GAME_OVER,
                "nextPlayer": [],
                "saveRewind": False,
                "winner": [self.seat_names[0]],
                "finalPositions": [0, 1],
            }
        )
        response = self.client.post(
            reverse("LBR:processLBRturn"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        winners = list(self.game.players.filter(winner=True).values_list("player__username", flat=True))
        self.assertEqual(winners, [self.seat_names[0]])

    def test_kickout_marks_the_overdue_current_player_missing(self):
        self.game.kickoutDuration = 10
        self.game.latestUpdate = str(int(time.time() * 1000) - 20 * 60 * 1000)
        self.game.rewindData = "[[\"old\"]]"
        self.game.save()
        old_latest_update = self.game.latestUpdate

        target = self.seat_names[0]
        voter = self.seat_names[1]
        self.client.force_login(User.objects.get(username=voter))
        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {
                "action": "kickout",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "kickedName": target,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        target_gp = self.game.players.get(player__username=target)
        self.assertTrue(target_gp.is_missing)
        self.assertTrue(target_gp.is_kicked)
        self.assertTrue(target_gp.is_ai)
        self.assertEqual(self.game.rewindData, '[["old"]]')
        self.assertNotEqual(str(self.game.latestUpdate), str(old_latest_update))
        self.assertEqual(response.json()["missingPlayers"], [target])

    def test_kickout_of_a_non_current_player_is_rejected(self):
        self.game.kickoutDuration = 10
        self.game.latestUpdate = str(int(time.time() * 1000) - 20 * 60 * 1000)
        self.game.save()
        target = self.seat_names[1]  # seat 0 is current after the shuffle
        voter = self.seat_names[0]
        self.client.force_login(User.objects.get(username=voter))
        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {
                "action": "kickout",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "kickedName": target,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_poll_reports_finished_game(self):
        old_latest_update = self.game.latestUpdate
        payload = self.save_payload(old_latest_update, "final")
        payload.update(
            {
                "status": "FINISHED",
                "phase": rfLBR.PHASE_GAME_OVER,
                "nextPlayer": [],
                "saveRewind": False,
                "winner": [self.seat_names[0]],
                "finalPositions": [0, 1],
            }
        )
        self.client.post(reverse("LBR:processLBRturn"), payload, content_type="application/json")

        response = self.client.post(
            reverse("LBR:LBRdata", kwargs={"dataType": 3}),
            {"gameID": self.game.id, "latestUpdate": old_latest_update},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["latest"])
        self.assertTrue(response.json()["finishedGame"])
