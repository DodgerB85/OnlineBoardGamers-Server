import base64
import gzip
import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from FCM import FCMconstants as rf
from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import SF_fastSerializeGame


class FcmCap3Test(TestCase):
    def setUp(self):
        self.human = User.objects.create_user("player")
        self.ai = User.objects.create_user("FcmAI")
        User.objects.create_user("SHADOW")
        User.objects.create_user("SHADOW_2")
        self.client.force_login(self.human)

    @patch("FCM.common.cap3_available", return_value=True)
    def test_cap3_occupies_the_selected_opening_seat_in_practice(self, _available):
        route = reverse("FCM:createFCMgame")
        setup = {
            "gameName": "Cap3 test", "gameDescription": "", "pace": "1",
            "mapData": "", "playerNumber": "4", "trainingGame": "102",
        }
        self.client.post(route, {**setup, "playerNumber": "3", "fcmCap3": "1"})
        self.client.post(route, {**setup, "fcmCap3": "5"})
        self.client.post(route, {**setup, "fcmCap3": ["1", "1"]})
        self.client.post(route, {**setup, "fcmCap3": ["1", "2", "3", "4"]})
        self.client.post(route, {**setup, "fcmCap3": ["1", "2"], "player3": "No room"})
        self.client.post(route, {**setup, "fcmCap3": "1", "urbanPlanning": "40"})
        self.assertFalse(Game.objects.exists())

        for seat in range(1, 5):
            with self.subTest(seat=seat):
                self.client.post(route, {
                    **setup, "fcmCap3": str(seat), "player2": "First shadow", "player3": "Second shadow",
                })
                practice = Game.objects.latest("id")
                self.assertEqual(practice.gameStatus, "ACTIVE")
                self.assertEqual(practice.players.count(), 4)
                self.assertIn(rf.SO_CAP3_AI, json.loads(practice.startingOptions))
                self.assertTrue(practice.statsExcludedGame)
                self.assertEqual(practice.players.get(player=self.ai).seat_order, seat - 1)
                self.assertEqual(practice.players.get(player=self.ai).is_current, seat == 1)
                self.assertEqual(
                    json.loads(practice.players.get(player=self.human).notes),
                    ["First shadow", "Second shadow"],
                )

    @patch("FCM.common.cap3_available", return_value=True)
    def test_three_cap3_opponents_start_with_expansions_in_regular_and_practice_games(self, _available):
        setup = {
            "gameName": "Cap3 test", "gameDescription": "", "pace": "1",
            "mapData": "", "playerNumber": "4", "fcmCap3": ["1", "2", "4"],
            "newMilestones": "21", "coffee": "19", "lobbyists": "22",
        }
        for practice in (False, True):
            with self.subTest(practice=practice):
                self.client.post(reverse("FCM:createFCMgame"), {
                    **setup, **({"trainingGame": "102"} if practice else {}),
                })
                game = Game.objects.latest("id")
                self.assertEqual(game.gameStatus, "ACTIVE")
                self.assertTrue({19, 21, 22, rf.SO_CAP3_AI}.issubset(json.loads(game.startingOptions)))
                self.assertEqual(list(game.players.filter(is_ai=True).values_list("seat_order", flat=True)), [0, 1, 3])
                self.assertEqual(game.players.get(player=self.human).seat_order, 2)
                self.assertEqual(game.presenter().isTrainingGame(), practice)
                self.assertEqual(SF_fastSerializeGame(game, self.human)["deleteableGame"], practice)

    @patch("FCM.common.cap3_available", return_value=True)
    @patch("Lobby.views.cap3_available", return_value=True)
    def test_regular_game_pins_cap3_when_the_last_player_joins(self, _page_available, _available):
        self.client.post(reverse("FCM:createFCMgame"), {
            "gameName": "Cap3 test", "gameDescription": "", "pace": "1",
            "mapData": "", "playerNumber": "4", "fcmCap3": ["2", "4"], "fcmCap3Policy": "full",
        })
        regular = Game.objects.get()
        self.assertEqual(regular.gameStatus, "AVAILABLE")
        self.assertEqual(regular.players.count(), 3)
        self.assertEqual(regular.players.get(player=self.ai).seat_order, 1)
        self.assertNotIn(102, json.loads(regular.startingOptions))
        self.assertIn(rf.SO_CAP3_FULL_ROLLOUT, json.loads(regular.startingOptions))

        join_route = reverse("joinGame", args=["FCM"])
        self.client.force_login(User.objects.create_user("joiner"))
        response = self.client.post(join_route, {"gameID": regular.id}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        regular.refresh_from_db()
        self.assertEqual(regular.gameStatus, "ACTIVE")
        self.assertEqual(list(regular.players.values_list("seat_order", flat=True)), [0, 1, 2, 3])
        self.assertEqual(regular.players.get(player=self.ai).seat_order, 1)

        self.client.force_login(self.human)
        response = self.client.get(reverse("createFCMpage", args=[regular.id]))
        self.assertContains(response, 'setupData.cap3Seats = [2, 4]')
        self.assertContains(response, 'name="fcmCap3"', count=4)
        self.assertEqual(response.context["playerNames"], [
            player.player.username for player in regular.players.exclude(is_ai=True).exclude(player=self.human)
        ])

    def active_game(self, phase):
        game = Game.objects.create(
            gameCode="FCM", creator=self.human, host=self.human, maxPlayers=4,
            gameStatus="ACTIVE", phase=phase, turn=0, latestUpdate="1000",
            startingOptions=json.dumps([rf.SO_CAP3_AI, rf.SO_STRICT_PAYDAY_FRIDGE]),
        )
        second_ai = User.objects.create_user("FcmAI_2", is_active=False)
        for seat, user in enumerate([self.human, self.ai, second_ai, User.objects.get(username="SHADOW_2")]):
            GamePlayer.objects.create(game=game, player=user, seat_order=seat, is_current=(phase == rf.PHASE_SETUP_RESERVE or seat == 1))
        return game

    def test_regular_simultaneous_move_is_saved_for_cap3_only(self):
        game = self.active_game(rf.PHASE_SETUP_RESERVE)
        move = {
            "action": "saveSimulMove", "gameID": game.id, "latestUpdate": game.latestUpdate,
            "phase": game.phase, "turn": game.turn, "cap3Seat": 1,
            "moveData": base64.b64encode(gzip.compress(b"[2]")).decode(),
        }
        route = reverse("FCM:processTurn")
        response = self.client.post(route, move, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["allPlayersMoved"])
        game.refresh_from_db()
        self.assertTrue(game.presenter().hasValidActualMoveData(self.ai.username))
        self.assertFalse(game.presenter().hasValidActualMoveData(self.human.username))
        self.assertNotIn(self.ai.username, response.json()["playersToMove"])
        second_move = {**move, "cap3Seat": 2}
        response = self.client.post(route, second_move, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["allPlayersMoved"])
        self.assertNotIn("FcmAI_2", response.json()["playersToMove"])
        game.refresh_from_db()
        self.assertTrue(game.presenter().hasValidActualMoveData("FcmAI_2"))
        self.assertFalse(game.presenter().hasValidActualMoveData(self.human.username))
        response = self.client.post(route, move, content_type="application/json")
        self.assertTrue(response.json()["syncError"])

    @patch("FCM.cap3.subprocess.run")
    @patch("FCM.cap3.cap3_available", return_value=True)
    def test_only_current_four_seat_cap3_positions_reach_the_policy(self, _available, run):
        game = self.active_game(rf.PHASE_SETUP_RESTAURANT1)
        route = reverse("FCM:cap3_turn", args=[game.pk])
        payload = {
            "latestUpdate": "999",
            "cap3Seat": 1,
            "state": [[[["player"]], [["FcmAI", "Cap3 AI"]], [["C"]], [["D"]]], 200, [[0, 1, 2, 3], 0, [1, 2, 3, 0]]],
            "metadata": {
                "starting_map": [0] * 32, "subphase": 0, "availableEmployees": [],
                "availableMarketingCampaigns": [], "availableMilestones": [], "bankruptPlayers": [],
            },
        }
        self.assertEqual(self.client.post(route, payload, content_type="application/json").status_code, 409)
        run.assert_not_called()

        payload["latestUpdate"] = "1000"
        game.startingOptions = json.dumps([rf.SO_CAP3_AI, rf.SO_LOBBYISTS, rf.SO_NEW_MS])
        game.save(update_fields=["startingOptions"])
        payload["state"].insert(0, [])
        self.assertEqual(self.client.post(route, {**payload, "cap3Seat": 2}, content_type="application/json").status_code, 409)
        run.assert_not_called()

        expected = {"seat": 1, "phase": 0, "steps": [{"actions": [161000]}]}
        run.return_value.stdout = json.dumps(expected)
        response = self.client.post(route, payload, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)
        request_data = json.loads(run.call_args.kwargs["input"])
        self.assertEqual(request_data["state"][3][2][0], 1)
        self.assertEqual(request_data["metadata"]["turn"], 0)
        self.assertEqual(request_data["metadata"]["starting_options"], ["22", "21"])
        self.assertEqual(run.call_args.args[0][1:], ["--cap3"])

        game.startingOptions = json.dumps([
            rf.SO_CAP3_AI, rf.SO_CAP3_FULL_ROLLOUT, rf.SO_LOBBYISTS, rf.SO_NEW_MS,
        ])
        game.save(update_fields=["startingOptions"])
        response = self.client.post(route, payload, content_type="application/json")
        self.assertEqual(response.json(), expected)
        self.assertEqual(run.call_args.args[0][1:], ["--full-rollout"])
        self.assertEqual(json.loads(run.call_args.kwargs["input"])["metadata"]["starting_options"], ["22", "21"])
