import json
from unittest.mock import patch

from django.contrib.messages import get_messages
from django.test import RequestFactory, TestCase, override_settings
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
import NTR.NTRconstants as rfNTR
from Lobby.models import Game, GamePlayer, Tournament, User
from NTR.common import create_ntr_game

# Render the page without needing a collected staticfiles manifest.
TEST_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def messages(response):
    return [str(m) for m in get_messages(response.wsgi_request)]


def base_post(**overrides):
    data = {
        "playerNumber": "2",
        "gameName": "Test Game",
        "gameDescription": "A test game",
        "pace": "40",
        "kickoutDuration": "100",
    }
    data.update(overrides)
    return data


class NTRCreationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")
        self.extra = User.objects.create_user(username="extra", password="pw")
        self.extra2 = User.objects.create_user(username="extra2", password="pw")
        User.objects.create_user(username="SHADOW", password="pw")
        self.client.force_login(self.creator)

    def test_invited_game_waits_with_scenario_and_options(self):
        response = self.client.post(
            reverse("NTR:createNTRgame"),
            base_post(player2="invited", scenario=str(rfNTR.SO_SCENARIO_DEC_02), frenchReinforcements="1"),
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "waiting"}))

        created = Game.objects.get(gameCode="NTR")
        self.assertEqual(created.gameStatus, "WAITING")
        self.assertEqual(created.maxPlayers, 2)
        self.assertEqual(list(created.invitedPlayers.values_list("username", flat=True)), ["invited"])
        # Only the creator is seated; invited players take their seat when they join.
        self.assertEqual(created.players.count(), 1)
        self.assertEqual(len(json.loads(created.zoomLevels)), 2)

        starting_options = json.loads(created.startingOptions)
        self.assertIn(rfNTR.SO_SCENARIO_DEC_02, starting_options)
        self.assertIn(rfNTR.SO_FRENCH_REINFORCEMENTS, starting_options)

        starting_map = json.loads(created.startingMap)
        self.assertEqual(starting_map["scenario"], "dec_02")
        self.assertTrue(starting_map["options"]["french_reinforcements"])
        self.assertFalse(starting_map["options"]["team_play"])

    def test_default_scenario_is_the_first_december(self):
        self.client.post(reverse("NTR:createNTRgame"), base_post())

        created = Game.objects.get(gameCode="NTR")
        self.assertEqual(json.loads(created.startingMap)["scenario"], "dec_01")
        self.assertEqual(json.loads(created.startingOptions), [rfNTR.DEFAULT_SCENARIO])

    def test_team_play_uses_four_or_eight_players(self):
        # Team play is 4 or 8 seats; a posted 2 is corrected, and the player count
        # decides the seat openings rather than a hardcoded 8.
        cases = [("4", ["invited", "extra", "extra2"]), ("2", ["invited", "extra"])]
        for player_number, invited in cases:
            with self.subTest(playerNumber=player_number):
                Game.objects.filter(gameCode="NTR").delete()
                post = base_post(playerNumber=player_number, teamPlay="1")
                for seat, username in enumerate(invited, start=2):
                    post[f"player{seat}"] = username

                self.client.post(reverse("NTR:createNTRgame"), post)

                created = Game.objects.get(gameCode="NTR")
                self.assertEqual(created.maxPlayers, 4)
                self.assertEqual(created.invitedPlayers.count(), len(invited))
                self.assertEqual(len(json.loads(created.zoomLevels)), 4)
                self.assertIn(rfNTR.SO_TEAM_PLAY, json.loads(created.startingOptions))
                self.assertTrue(json.loads(created.startingMap)["options"]["team_play"])

    def test_practice_game_is_two_seats_and_cannot_be_team_play(self):
        response = self.client.post(
            reverse("NTR:createNTRgame"),
            base_post(playerNumber="8", trainingGame="1", teamPlay="1"),
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}))

        created = Game.objects.get(gameCode="NTR")
        self.assertEqual(created.gameStatus, "ACTIVE")
        self.assertTrue(created.statsExcludedGame)
        self.assertEqual(created.maxPlayers, 2)
        self.assertEqual(set(created.players.values_list("player__username", flat=True)), {"creator", "SHADOW"})

        starting_options = json.loads(created.startingOptions)
        self.assertIn(rf.SO_TRAINING_GAME, starting_options)
        self.assertNotIn(rfNTR.SO_TEAM_PLAY, starting_options)

    def test_too_many_invites_rejected(self):
        response = self.client.post(reverse("NTR:createNTRgame"), base_post(player2="invited", player3="extra"))

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createNTRpage"))
        self.assertIn("Too many players", " ".join(messages(response)))
        self.assertFalse(Game.objects.filter(gameCode="NTR").exists())


class NTRMiniTournamentCreationTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.client.force_login(self.creator)

    def test_mini_tournament_stores_scenario_and_team_play(self):
        response = self.client.post(
            reverse("createNTRminiTournament"),
            {
                "tournamentName": "Test Cup",
                "tournamentDescription": "",
                "tournamentFormat": "RR",
                "playersPerGameMT": "4",
                "totalPlayersMT": "8",
                "invtedPlayersListMT": "[]",
                "scenario": str(rfNTR.SO_SCENARIO_DEC_02),
                "frenchReinforcements": "1",
            },
        )

        self.assertEqual(response.status_code, 302)
        tournament = Tournament.objects.get(gameCode="NTR")
        self.assertEqual(tournament.tournamentCategory, "Mini")
        self.assertEqual(tournament.maxGamePlayers, 4)
        self.assertEqual(
            json.loads(tournament.startingOptions),
            [rfNTR.SO_SCENARIO_DEC_02, rfNTR.SO_TEAM_PLAY, rfNTR.SO_FRENCH_REINFORCEMENTS],
        )


class NTRTournamentCreationTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = User.objects.create_user(username="admin", password="pw")
        self.creator = User.objects.create_user(username="creator", password="pw")

        self.tournament = Tournament.objects.create(
            tournamentCategory="Mini",
            gameCode="NTR",
            tournamentName="Test Cup",
            tournamentDescription="",
            tournamentStatus="OP",
            tournamentType="RR",
            startingOptions=json.dumps([rfNTR.SO_SCENARIO_DEC_02, rfNTR.SO_TEAM_PLAY]),
            maxTournamentPlayers=4,
            maxGamePlayers=4,
            roundsBeforeKnockout=4,
            creator=self.creator,
        )

    def test_starting_the_mini_tournament_creates_ntr_games(self):
        from Lobby.sharedFunctions.sharedFunctions import SF_startAnyTournament

        players = [User.objects.create_user(username=f"p{i}", password="pw") for i in range(4)]
        self.tournament.startingPlayers.add(*players)

        request = self.factory.get("/")
        request.user = self.admin
        with patch("django_q.tasks.async_task"), patch("django_q.tasks.schedule"):
            SF_startAnyTournament(request, self.tournament)

        created = Game.objects.get(relatedMiniTournament=self.tournament)
        self.assertEqual(created.gameStatus, "ACTIVE")
        self.assertEqual(created.maxPlayers, 4)
        self.assertEqual(created.players.count(), 4)
        self.assertEqual(created.creator, self.admin)
        self.assertEqual(json.loads(created.startingMap)["scenario"], "dec_02")
        self.assertTrue(json.loads(created.startingMap)["options"]["team_play"])


@override_settings(STORAGES=TEST_STORAGES)
class NTRShowPageTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        User.objects.create_user(username="SHADOW", password="pw")
        self.client.force_login(self.creator)

        self.client.post(
            reverse("NTR:createNTRgame"),
            base_post(trainingGame="1", scenario=str(rfNTR.SO_SCENARIO_DEC_02)),
        )
        self.game = Game.objects.get(gameCode="NTR")

    def test_show_page_passes_starting_map_and_latest_update(self):
        response = self.client.get(reverse("NTR:showNTRgame", kwargs={"game_id": self.game.id}))

        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("initData.startingMap = '", body)
        self.assertIn("dec_02", body)
        self.assertIn("initData.latestUpdate = ", body)
        self.assertNotIn("initData.scenario =", body)


class NTRTurnTests(TestCase):
    def setUp(self):
        self.patcher = patch("django_q.tasks.async_task")
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")

        self.client.force_login(self.creator)
        self.client.post(reverse("NTR:createNTRgame"), base_post(player2="invited"))
        self.game = Game.objects.get(gameCode="NTR")

        # The invited player joining the last seat starts the game.
        self.client.force_login(self.invited)
        self.client.post(
            reverse("joinGame", kwargs={"gameType": "NTR"}),
            data=json.dumps({"gameID": self.game.id, "source": "ajax", "action": ""}),
            content_type="application/json",
        )
        self.game.refresh_from_db()
        self.client.force_login(self.creator)

    def save_payload(self, latest_update, game_data):
        return {
            "action": "saveGame",
            "gameID": self.game.id,
            "latestUpdate": latest_update,
            "gameData": game_data,
            "turn": 2,
            "phase": rfNTR.PHASE_FRENCH_TURN,
            "nextPlayer": ["invited"],
            "status": "ACTIVE",
            "saveRewind": True,
        }

    def finish_payload(self, winner, final_positions):
        payload = self.save_payload(self.game.latestUpdate, "final position")
        payload.update(
            {
                "status": "FINISHED",
                "turn": 6,
                "phase": rfNTR.PHASE_GAME_OVER,
                "nextPlayer": [],
                "saveRewind": False,
                "winner": winner,
                "finalPositions": final_positions,
            }
        )
        return payload

    def seat_usernames(self):
        return list(self.game.players.order_by("seat_order").values_list("player__username", flat=True))

    def test_save_updates_data_and_hands_the_turn_over(self):
        old_latest_update = self.game.latestUpdate
        game_data = json.dumps({"board": {}, "turn": 2, "phase": rfNTR.PHASE_FRENCH_TURN})

        with patch("django_q.tasks.schedule"):
            response = self.client.post(
                reverse("NTR:processNTRturn"),
                self.save_payload(old_latest_update, game_data),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, game_data)
        self.assertEqual(self.game.turn, 2)
        self.assertEqual(self.game.phase, rfNTR.PHASE_FRENCH_TURN)
        self.assertNotEqual(str(self.game.latestUpdate), str(old_latest_update))
        self.assertTrue(self.game.players.get(player=self.invited).is_current)
        self.assertFalse(self.game.players.get(player=self.creator).is_current)
        self.assertEqual(json.loads(self.game.rewindData), [[game_data]])

    def test_stale_save_is_rejected_without_changing_the_game(self):
        stale_latest_update = int(self.game.latestUpdate) - 1

        response = self.client.post(
            reverse("NTR:processNTRturn"),
            self.save_payload(stale_latest_update, "stale"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"syncError": True})
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "")
        self.assertEqual(str(self.game.latestUpdate), str(stale_latest_update + 1))

    def test_finishing_the_game_marks_the_winning_seat(self):
        winner_username = self.seat_usernames()[0]

        response = self.client.post(
            reverse("NTR:processNTRturn"),
            self.finish_payload([winner_username], [0, 1]),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        self.assertEqual(self.game.gameData, "final position")
        winners = list(self.game.players.filter(winner=True).values_list("player__username", flat=True))
        self.assertEqual(winners, [winner_username])

    def test_draw_finishes_without_a_winner(self):
        response = self.client.post(
            reverse("NTR:processNTRturn"),
            self.finish_payload([], [0, 1]),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        self.assertEqual(self.game.players.filter(winner=True).count(), 0)

    def test_team_play_marks_every_winner(self):
        game = Game.objects.create(
            gameCode="NTR",
            creator=self.creator,
            host=self.creator,
            gameStatus="ACTIVE",
            maxPlayers=4,
            startingOptions=json.dumps([rfNTR.SO_TEAM_PLAY]),
        )
        team_users = [User.objects.create_user(username=f"team{i}", password="pw") for i in range(2)]
        for seat, user in enumerate([self.creator, self.invited, *team_users]):
            GamePlayer.objects.create(game=game, player=user, seat_order=seat)

        request = RequestFactory().get("/")
        request.user = self.creator
        with patch("django_q.tasks.async_task"):
            game.presenter().endGame(request, ["team0", "team1"], [2, 3, 0, 1], game.id)

        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "FINISHED")
        winners = set(game.players.filter(winner=True).values_list("player__username", flat=True))
        self.assertEqual(winners, {"team0", "team1"})

    def test_poll_reports_a_finished_game(self):
        old_latest_update = self.game.latestUpdate
        self.client.post(
            reverse("NTR:processNTRturn"),
            self.finish_payload([self.seat_usernames()[0]], [0, 1]),
            content_type="application/json",
        )

        response = self.client.post(
            reverse("NTR:NTRdata", kwargs={"dataType": 3}),
            {"gameID": self.game.id, "latestUpdate": old_latest_update},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["latest"])
        self.assertTrue(response.json()["finishedGame"])


class NTRJoinTests(TestCase):
    def setUp(self):
        self.patcher = patch("django_q.tasks.async_task")
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.schedule_patcher = patch("django_q.tasks.schedule")
        self.schedule_patcher.start()
        self.addCleanup(self.schedule_patcher.stop)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.joiner = User.objects.create_user(username="joiner", password="pw")

        self.client.force_login(self.creator)
        self.client.post(reverse("NTR:createNTRgame"), base_post(player2="joiner"))
        self.game = Game.objects.get(gameCode="NTR")

    def test_joining_the_last_seat_starts_the_game(self):
        self.client.force_login(self.joiner)
        response = self.client.post(
            reverse("joinGame", kwargs={"gameType": "NTR"}),
            data=json.dumps({"gameID": self.game.id, "source": "ajax", "action": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "ACTIVE")
        self.assertEqual(self.game.players.count(), 2)
        self.assertEqual(self.game.players.filter(is_current=True).count(), 1)
        self.assertEqual(len(self.game.presenter().getArrayOfIsCurrentPlayers()), 1)
