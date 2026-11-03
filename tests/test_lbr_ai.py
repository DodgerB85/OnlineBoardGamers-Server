import json
import shutil
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from LBR.ai_worker import STEP_SCRIPT, play_ai_turn, policy_available, request_ai_action, schedule_ai_turn
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

    def test_seat_one_stays_the_creator_when_ai1_is_posted(self):
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="2", ai1="1", ai2="1"))
        game = Game.objects.get(gameCode="LBR")

        self.assertFalse(game.players.get(player=self.creator).is_ai)
        self.assertEqual(game.players.filter(is_ai=True).count(), 1)
        self.assertEqual(game.gameStatus, "ACTIVE")

    def test_ai_seat_is_never_invited(self):
        self.client.post(reverse("LBR:createLBRgame"), base_post(playerNumber="4", ai2="1", player3="invited"))
        game = Game.objects.get(gameCode="LBR")
        self.assertFalse(game.invitedPlayers.filter(username__startswith="LBRAI").exists())
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
        # The create form always seats the creator, so an all-AI game can only be
        # reached by a taken-over seat; the opening is still dealt by the worker.
        self.game.players.update(is_ai=True)
        self.game.gameData = ""
        self.game.save()

        with patch("LBR.ai_worker.MAX_AI_DECISIONS_PER_TASK", 1):
            result = play_ai_turn(self.game.id, self.game.latestUpdate)

        self.assertEqual(result, "ok")
        self.game.refresh_from_db()
        state = json.loads(self.game.gameData)
        self.assertEqual(state["numSeats"], 2)
        self.assertEqual(len(state["tiles"]), 176)
        self.assertNotEqual(self.game.latestUpdate, "")
        task_calls = [call.args for call in self.async_task.call_args_list if call.args[0] == "LBR.ai_worker.play_ai_turn"]
        self.assertTrue(task_calls)

    def test_ai_plays_its_whole_turn_in_one_task(self):
        self.set_position(actions_used=1)
        # startGame shuffles the seats, so an AI seat can start and be queued at
        # creation; only the calls made by this turn matter here.
        self.async_task.reset_mock()
        human_seat = self.game.players.get(player=self.creator).seat_order
        ai_turn = {"activeSeat": self.ai_gp.seat_order, "pending": None, "gameOver": False}
        human_turn = {"activeSeat": human_seat, "pending": None, "gameOver": False}
        applied = [
            {
                "stateJson": json.dumps(ai_turn),
                "turn": 2,
                "phase": 0,
                "nextPlayer": [self.ai_gp.player.username],
                "status": "ACTIVE",
                "winner": "",
                "finalPositions": [],
                "fallback": False,
            },
            {
                "stateJson": json.dumps(human_turn),
                "turn": 3,
                "phase": 0,
                "nextPlayer": [self.creator.username],
                "status": "ACTIVE",
                "winner": "",
                "finalPositions": [],
                "fallback": False,
            },
        ]

        with patch("LBR.ai_worker.request_ai_action", return_value={"type": "pass"}), patch(
            "LBR.ai_worker._run_step", side_effect=applied
        ) as run_step:
            result = play_ai_turn(self.game.id, self.game.latestUpdate)

        self.assertEqual(result, "ok")
        self.assertEqual(run_step.call_count, 2)
        self.assertFalse(
            any(call.args[0] == "LBR.ai_worker.play_ai_turn" for call in self.async_task.call_args_list)
        )
        self.game.refresh_from_db()
        self.assertEqual(json.loads(self.game.gameData)["activeSeat"], human_seat)

    def test_schedule_claims_a_turn_only_once(self):
        self.set_position()
        before = len([c for c in self.async_task.call_args_list if c.args[0] == "LBR.ai_worker.play_ai_turn"])
        self.assertTrue(schedule_ai_turn(self.game.id))
        self.game.refresh_from_db()
        self.assertTrue(self.game.autoMoves.startswith(f"ai:{self.game.latestUpdate}:"))
        self.assertFalse(schedule_ai_turn(self.game.id))
        after = len([c for c in self.async_task.call_args_list if c.args[0] == "LBR.ai_worker.play_ai_turn"])
        self.assertEqual(after - before, 1)

    def test_polls_cannot_queue_duplicates_while_the_turn_claim_holds(self):
        self.set_position(actions_used=1)
        self.assertTrue(schedule_ai_turn(self.game.id))
        self.game.refresh_from_db()
        # Every AI decision saves a new position but keeps the claim, so a poll
        # that sees the new latestUpdate must not queue another task.
        self.game.latestUpdate = str(int(self.game.latestUpdate) + 1)
        self.game.save()
        self.assertFalse(schedule_ai_turn(self.game.id))
        self.game.refresh_from_db()
        self.assertTrue(self.game.autoMoves.startswith("ai:"))

    def test_an_abandoned_claim_is_replaced(self):
        self.set_position(actions_used=1)
        self.game.autoMoves = f"ai:{self.game.latestUpdate}:{int(time.time()) - settings.LBR_AI_CLAIM_SECONDS - 1}"
        self.game.save()
        self.assertTrue(schedule_ai_turn(self.game.id))

    def test_the_claim_survives_the_ai_decisions_and_is_released_at_the_end(self):
        self.set_position(actions_used=1)
        self.assertTrue(schedule_ai_turn(self.game.id))
        self.game.refresh_from_db()
        claim = self.game.autoMoves
        human_seat = self.game.players.get(player=self.creator).seat_order
        applied = [
            {
                "stateJson": json.dumps({"activeSeat": self.ai_gp.seat_order, "pending": None, "gameOver": False}),
                "turn": 2,
                "phase": 0,
                "nextPlayer": [self.ai_gp.player.username],
                "status": "ACTIVE",
                "winner": "",
                "finalPositions": [],
                "fallback": False,
            },
            {
                "stateJson": json.dumps({"activeSeat": human_seat, "pending": None, "gameOver": False}),
                "turn": 3,
                "phase": 0,
                "nextPlayer": [self.creator.username],
                "status": "ACTIVE",
                "winner": "",
                "finalPositions": [],
                "fallback": False,
            },
        ]
        seen = []

        def step(_payload):
            self.game.refresh_from_db()
            seen.append(self.game.autoMoves)
            return applied[len(seen) - 1]

        with patch("LBR.ai_worker.request_ai_action", return_value={"type": "pass"}), patch(
            "LBR.ai_worker._run_step", side_effect=step
        ):
            result = play_ai_turn(self.game.id, self.game.latestUpdate)

        self.assertEqual(result, "ok")
        self.assertEqual(seen[0], claim)
        self.assertEqual(seen[1], claim, "an AI save must not release its own claim")
        self.game.refresh_from_db()
        self.assertIsNone(self.game.autoMoves)


class LBRAIPolicyTests(SimpleTestCase):
    """The policy subprocess boundary: missing files, crash, timeout, bad output."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        directory = Path(self.tmp.name)
        self.binary = directory / "policy"
        self.model = directory / "model.bin"
        self.model.write_bytes(b"")
        self.binary.write_text("#!/bin/sh\nprintf '{\"action\":{\"type\":\"pass\"}}'\n")
        self.binary.chmod(0o755)
        self.overrides = {
            "LBR_AI_URL": "",
            "LBR_AI_BIN": str(self.binary),
            "LBR_AI_MODEL": str(self.model),
            "LBR_AI_TIMEOUT": 5,
        }

    def test_a_missing_binary_or_model_disables_ai_seats(self):
        with self.settings(**self.overrides):
            self.assertTrue(policy_available())
        self.model.unlink()
        with self.settings(**self.overrides):
            self.assertFalse(policy_available())
        self.binary.unlink()
        with self.settings(**self.overrides):
            self.assertFalse(policy_available())

    def test_the_local_binary_answers_the_request(self):
        with self.settings(**self.overrides):
            self.assertEqual(request_ai_action({"turnNumber": 1}, 0), {"type": "pass"})

    def test_crash_and_malformed_output_raise(self):
        self.binary.write_text("#!/bin/sh\necho boom >&2\nexit 3\n")
        with self.settings(**self.overrides), self.assertRaisesMessage(RuntimeError, "exit 3"):
            request_ai_action({"turnNumber": 1}, 0)

        self.binary.write_text("#!/bin/sh\nprintf 'not json'\n")
        with self.settings(**self.overrides), self.assertRaisesMessage(RuntimeError, "malformed JSON"):
            request_ai_action({"turnNumber": 1}, 0)

        self.binary.write_text("#!/bin/sh\nprintf '{\"turn\": 2}'\n")
        with self.settings(**self.overrides), self.assertRaisesMessage(RuntimeError, "no action"):
            request_ai_action({"turnNumber": 1}, 0)

    def test_a_hung_policy_times_out(self):
        self.binary.write_text("#!/bin/sh\nsleep 5\n")
        with self.settings(**{**self.overrides, "LBR_AI_TIMEOUT": 1}):
            with self.assertRaisesMessage(RuntimeError, "timed out"):
                request_ai_action({"turnNumber": 1}, 0)
