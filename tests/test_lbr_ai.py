import json
import shutil
import subprocess
import unittest
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from django.urls import reverse

from LBR.ai_worker import STEP_SCRIPT, play_ai_turn, schedule_ai_turn
from Lobby.models import Game, User


def base_post(**overrides):
    data = {
        "playerNumber": "2",
        "gameName": "AI Test Game",
        "gameDescription": "AI seats",
        "pace": "40",
        "kickoutDuration": "100",
    }
    data.update(overrides)
    return data


def initial_state_json(num_seats, names):
    payload = {"mode": "init", "numSeats": num_seats, "playerNames": names}
    process = subprocess.run(
        [settings.LBR_AI_NODE, str(STEP_SCRIPT)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=30,
    )
    if process.returncode != 0:
        raise RuntimeError(process.stderr)
    return json.loads(process.stdout)["stateJson"]


class LBRAISeatCreationTests(TestCase):
    def setUp(self):
        self.async_task = patch("django_q.tasks.async_task").start()
        self.addCleanup(patch.stopall)
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")
        self.client.force_login(self.creator)

    def test_mixed_game_keeps_human_invites_and_marks_ai_seats(self):
        self.client.post(
            reverse("LBR:createLBRgame"),
            base_post(playerNumber="3", ai2="1", player3="invited"),
        )
        game = Game.objects.get(gameCode="LBR")

        seats = {gp.player.username: gp for gp in game.players.select_related("player")}
        self.assertIn("creator", seats)
        ai_gp = next(gp for gp in seats.values() if gp.is_ai)
        self.assertEqual(ai_gp.seat_order, 1)
        self.assertFalse(seats["creator"].is_ai)
        self.assertEqual(list(game.invitedPlayers.values_list("username", flat=True)), ["invited"])
        self.assertEqual(game.gameStatus, "WAITING")
        self.assertEqual(game.maxPlayers, 3)

    def test_any_seat_can_be_ai_including_the_creator(self):
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", ai1="1", ai2="1"))
        game = Game.objects.get(gameCode="LBR")

        self.assertEqual(game.gameStatus, "ACTIVE")
        self.assertEqual(game.players.count(), 2)
        self.assertTrue(all(gp.is_ai for gp in game.players.all()))
        self.assertEqual(game.invitedPlayers.count(), 0)
        self.assertTrue(game.players.filter(is_current=True).exists())
        scheduled = [call.args for call in self.async_task.call_args_list if call.args[0] == "LBR.ai_worker.play_ai_turn"]
        self.assertIn((game.id, game.latestUpdate), [(args[1], args[2]) for args in scheduled])

    def test_ai_seat_is_never_invited(self):
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="4", ai2="1", player3="invited"))
        game = Game.objects.get(gameCode="LBR")
        self.assertFalse(game.invitedPlayers.filter(username__startswith="TigrisAI").exists())
        self.assertEqual(game.invitedPlayers.count(), 1)


class LBRAITakeoverTests(TestCase):
    def setUp(self):
        patch("django_q.tasks.async_task").start()
        patch("django_q.tasks.schedule").start()
        self.addCleanup(patch.stopall)
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.other = User.objects.create_user(username="other", password="pw")
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
        self.seat_names = list(self.game.players.order_by("seat_order").values_list("player__username", flat=True))

    def test_resign_hands_the_seat_to_the_ai_in_place(self):
        seat_order = self.game.players.get(player=self.other).seat_order
        old_latest_update = self.game.latestUpdate
        game_data = self.game.gameData

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {"action": "resign", "gameID": self.game.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        gp = self.game.players.get(player=self.other)
        self.assertTrue(gp.is_ai)
        self.assertTrue(gp.is_missing)
        self.assertEqual(gp.seat_order, seat_order)
        self.assertEqual(self.game.gameData, game_data)
        self.assertNotEqual(str(self.game.latestUpdate), str(old_latest_update))

    def test_resigned_player_becomes_a_spectator_and_cannot_save(self):
        self.client.post(
            reverse("LBR:processLBRturn"),
            {"action": "resign", "gameID": self.game.id},
            content_type="application/json",
        )
        self.game.refresh_from_db()

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {
                "action": "saveGame",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "gameData": "forged",
                "turn": 2,
                "phase": 0,
                "nextPlayer": [self.seat_names[0]],
                "status": "ACTIVE",
                "saveRewind": True,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.game.refresh_from_db()
        self.assertNotEqual(self.game.gameData, "forged")

        response = self.client.get(reverse("LBR:showLBRgame", kwargs={"game_id": self.game.id}))
        self.assertContains(response, "initData.pov = -9")

    def test_ai_seat_is_not_a_kickout_target(self):
        self.client.force_login(self.creator)
        ai_gp = self.game.players.get(player=self.other)
        ai_gp.is_ai = True
        ai_gp.save(update_fields=["is_ai"])
        self.game.kickoutDuration = 10
        self.game.latestUpdate = str(int(__import__("time").time() * 1000) - 20 * 60 * 1000)
        self.game.save()
        self.game.players.update(is_current=False)
        self.game.players.filter(player=self.other).update(is_current=True)

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {
                "action": "kickout",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "kickedName": ai_gp.player.username,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)


@unittest.skipUnless(shutil.which(settings.LBR_AI_NODE), "node is required for the LBR rules step")
class LBRAIWorkerTests(TestCase):
    def setUp(self):
        self.async_task = patch("django_q.tasks.async_task").start()
        self.schedule = patch("django_q.tasks.schedule").start()
        self.admin_error = patch("LBR.ai_worker.SN_sendAdminErrorMessage").start()
        self.addCleanup(patch.stopall)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.client.force_login(self.creator)
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", ai2="1"))
        self.game = Game.objects.get(gameCode="LBR")
        self.ai_gp = self.game.players.get(is_ai=True)
        self.names = list(self.game.players.order_by("seat_order").values_list("player__username", flat=True))

    def set_position(self, actions_used=1):
        state = json.loads(initial_state_json(len(self.names), self.names))
        state["activeSeat"] = self.ai_gp.seat_order
        state["actionsUsed"] = actions_used
        self.game.gameData = json.dumps(state)
        self.game.autoMoves = None
        self.game.save()
        return state

    def test_ai_move_saves_through_the_turn_path_and_notifies_the_human(self):
        self.set_position(actions_used=1)
        old_latest_update = self.game.latestUpdate

        with patch("LBR.ai_worker.request_ai_action", return_value={"type": "pass"}):
            result = play_ai_turn(self.game.id, old_latest_update)

        self.assertEqual(result, "ok")
        self.game.refresh_from_db()
        state = json.loads(self.game.gameData)
        self.assertNotEqual(state["activeSeat"], self.ai_gp.seat_order)
        self.assertNotEqual(self.game.gameData, "")
        self.assertNotEqual(str(self.game.latestUpdate), str(old_latest_update))
        self.assertTrue(self.game.players.get(player=self.creator).is_current)
        self.assertFalse(self.game.players.get(player=self.ai_gp.player).is_current)

        notification_calls = [
            call.args
            for call in self.schedule.call_args_list
            if call.args and call.args[0] == "Lobby.sharedFunctions.sharedNotifications.SN_sendNextTurnNotificationWithValidation"
        ]
        self.assertEqual(len(notification_calls), 1)
        self.assertIn("creator", notification_calls[0][2])

    def test_missing_seat_is_taken_over_by_the_ai(self):
        human_gp = self.game.players.get(player=self.creator)
        human_gp.is_missing = True
        human_gp.is_current = True
        human_gp.save()
        state = json.loads(initial_state_json(len(self.names), self.names))
        state["activeSeat"] = human_gp.seat_order
        self.game.gameData = json.dumps(state)
        self.game.autoMoves = None
        self.game.save()

        self.assertTrue(schedule_ai_turn(self.game.id))
        human_gp.refresh_from_db()
        self.assertTrue(human_gp.is_ai)

    def test_human_move_handing_the_turn_to_an_ai_queues_the_ai_but_not_a_notification(self):
        self.game.gameData = json.dumps({"turnNumber": 2, "pending": None, "activeSeat": self.ai_gp.seat_order, "gameOver": False})
        self.game.save()
        self.async_task.reset_mock()
        self.schedule.reset_mock()

        response = self.client.post(
            reverse("LBR:processLBRturn"),
            {
                "action": "saveGame",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "gameData": self.game.gameData,
                "turn": 2,
                "phase": 0,
                "nextPlayer": [self.ai_gp.player.username],
                "status": "ACTIVE",
                "saveRewind": False,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertTrue(self.game.players.get(player=self.ai_gp.player).is_current)
        self.assertFalse(
            any(
                call.args and call.args[0] == "Lobby.sharedFunctions.sharedNotifications.SN_sendNextTurnNotificationWithValidation"
                for call in self.schedule.call_args_list
            )
        )
        ai_tasks = [call.args for call in self.async_task.call_args_list if call.args[0] == "LBR.ai_worker.play_ai_turn"]
        self.assertIn((self.game.id, self.game.latestUpdate), [(args[1], args[2]) for args in ai_tasks])

    def test_stale_ai_save_is_rejected(self):
        self.set_position()
        stale = str(int(self.game.latestUpdate) - 1)
        data_before = self.game.gameData

        with patch("LBR.ai_worker.request_ai_action") as request_ai:
            result = play_ai_turn(self.game.id, stale)

        self.assertEqual(result, "stale")
        request_ai.assert_not_called()
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, data_before)

    def test_service_action_rejected_by_rules_falls_back_to_a_legal_move(self):
        self.set_position()
        # Cell 0 already holds a starting temple, so this placement is illegal.
        with patch(
            "LBR.ai_worker.request_ai_action",
            return_value={"type": "placeTile", "colour": "R", "pos": 10},
        ):
            result = play_ai_turn(self.game.id, self.game.latestUpdate)

        self.assertEqual(result, "ok")
        self.assertTrue(self.admin_error.called)
        self.assertIn("rejected by LBRrules", self.admin_error.call_args.args[0])
        self.game.refresh_from_db()
        self.assertNotEqual(self.game.gameData, "")

    def test_ai_only_game_deals_its_own_opening_position(self):
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", ai1="1", ai2="1"))
        game = Game.objects.filter(gameCode="LBR").latest("id")
        self.assertEqual(game.gameData, "")

        result = play_ai_turn(game.id, game.latestUpdate)

        self.assertEqual(result, "ok")
        game.refresh_from_db()
        state = json.loads(game.gameData)
        self.assertEqual(state["numSeats"], 2)
        self.assertEqual(len(state["tiles"]), 176)
        self.assertNotEqual(game.latestUpdate, "")
        task_calls = [call.args for call in self.async_task.call_args_list if call.args[0] == "LBR.ai_worker.play_ai_turn"]
        self.assertTrue(task_calls)

    def test_schedule_claims_a_turn_only_once(self):
        self.set_position()
        before = len([c for c in self.async_task.call_args_list if c.args[0] == "LBR.ai_worker.play_ai_turn"])
        self.assertTrue(schedule_ai_turn(self.game.id))
        self.game.refresh_from_db()
        self.assertTrue(self.game.autoMoves.startswith(f"ai:{self.game.latestUpdate}:"))
        self.assertFalse(schedule_ai_turn(self.game.id))
        after = len([c for c in self.async_task.call_args_list if c.args[0] == "LBR.ai_worker.play_ai_turn"])
        self.assertEqual(after - before, 1)
