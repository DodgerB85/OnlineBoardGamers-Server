import json
import time
from unittest.mock import patch

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


def messages(response):
    return [str(m) for m in get_messages(response.wsgi_request)]


class ROWGameFlowTests(TestCase):
    """End-to-end smoke test for the ROW (Great Western Trail) game shell.

    The rules live in the Vue client; the server only stores the whole
    serialized state and passes the turn. This exercises create -> show ->
    save (turn submission) -> show to make sure the minimal server surface
    works, including the presenter hooks used by the shared view helpers.
    """

    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        User.objects.create_user(username="SHADOW", password="pw")
        self.client.force_login(self.creator)

    def test_create_page_wires_username_autocomplete(self):
        response = self.client.get(reverse("createROWpage"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "createGamePage")
        self.assertContains(response, "autocomplete(input)")

    def _create_training_game(self):
        response = self.client.post(
            reverse("ROW:createROWgame"),
            {
                "playerNumber": "2",
                "gameName": "ROW test",
                "gameDescription": "",
                "pace": "40",
                "kickoutDuration": "100",
                "trainingGame": "1",
            },
        )
        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="ROW")
        self.assertEqual(game.gameStatus, "ACTIVE")
        return game

    def test_show_page_renders_for_involved_player(self):
        game = self._create_training_game()
        response = self.client.get(reverse("ROW:showROWgame", kwargs={"game_id": game.id}))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "initData.gameID")

    def test_save_turn_persists_game_data_and_bumps_latest_update(self):
        game = self._create_training_game()
        old_latest = game.latestUpdate
        payload = {
            "action": "saveGame",
            "gameID": game.id,
            "latestUpdate": game.latestUpdate,
            "gameData": json.dumps({"v": 1, "players": ["creator", "SHADOW"]}),
            "turn": 1,
            "phase": 1,
            "status": "ACTIVE",
            "allIsCurrentPlayers": ["creator"],
            "allRemainingPlayersInTurnOrder": ["creator", "SHADOW"],
            "saveRewind": True,
        }
        response = self.client.post(
            reverse("ROW:processROWturn"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("latestUpdate", body)

        game.refresh_from_db()
        self.assertEqual(json.loads(game.gameData)["v"], 1)
        self.assertNotEqual(game.latestUpdate, old_latest)

        # Reloading the show page must not blow up on stored state.
        reload = self.client.get(reverse("ROW:showROWgame", kwargs={"game_id": game.id}))
        self.assertEqual(reload.status_code, 200)

    def test_stale_save_rejected(self):
        game = self._create_training_game()
        payload = {
            "action": "saveGame",
            "gameID": game.id,
            "latestUpdate": "1",
            "gameData": "{}",
            "turn": 1,
            "phase": 1,
            "status": "ACTIVE",
            "allIsCurrentPlayers": ["creator"],
            "allRemainingPlayersInTurnOrder": ["creator"],
            "saveRewind": False,
        }
        response = self.client.post(
            reverse("ROW:processROWturn"),
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get("syncError"))

    def _active_two_player_game(self, kickout_duration=100):
        other = User.objects.create_user(username="row-other", password="pw")
        latest = str(int(time.time() * 1000))
        game = Game.objects.create(
            gameCode="ROW",
            gameName="ROW kickout test",
            creator=self.creator,
            host=self.creator,
            gameStatus="ACTIVE",
            maxPlayers=2,
            turn=1,
            phase=1,
            created=latest,
            latestUpdate=latest,
            kickoutDuration=kickout_duration,
            gameData="{}",
            startingOptions="[]",
            zoomLevels="[16,16]",
            serverCurrentPlayerNamesInTurnOrder=["creator", "row-other"],
        )
        GamePlayer.objects.create(game=game, player=self.creator, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=game, player=other, seat_order=1, is_current=False)
        return game, other

    def _post_turn(self, payload):
        return self.client.post(
            reverse("ROW:processROWturn"),
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_resign_on_your_turn_promotes_the_next_player(self):
        game, other = self._active_two_player_game()
        response = self._post_turn({"action": "resign", "gameID": game.id, "latestUpdate": game.latestUpdate})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("syncError", response.json())

        game.refresh_from_db()
        creator_gp = GamePlayer.objects.get(game=game, player=self.creator)
        other_gp = GamePlayer.objects.get(game=game, player=other)
        self.assertTrue(creator_gp.is_missing)
        self.assertFalse(creator_gp.is_current)
        self.assertTrue(other_gp.is_current)
        self.assertEqual(game.serverCurrentPlayerNamesInTurnOrder, ["row-other"])

    def test_stale_resign_is_rejected(self):
        game, _other = self._active_two_player_game()
        response = self._post_turn({"action": "resign", "gameID": game.id, "latestUpdate": "1"})
        self.assertTrue(response.json().get("syncError"))
        game.refresh_from_db()
        self.assertFalse(GamePlayer.objects.get(game=game, player=self.creator).is_missing)

    def test_kickout_requires_the_timed_out_current_player(self):
        game, other = self._active_two_player_game(kickout_duration=1)
        game.latestUpdate = str(int(time.time() * 1000) - 120_000)
        game.serverCurrentPlayerNamesInTurnOrder = ["row-other", "creator"]
        game.save(update_fields=["latestUpdate", "serverCurrentPlayerNamesInTurnOrder"])
        GamePlayer.objects.filter(game=game, player=self.creator).update(is_current=False)
        GamePlayer.objects.filter(game=game, player=other).update(is_current=True)

        # The creator is not on turn, so they are not eligible.
        response = self._post_turn(
            {"action": "kickout", "gameID": game.id, "latestUpdate": game.latestUpdate, "kickedName": "creator"}
        )
        self.assertEqual(response.status_code, 400)

        # The current player is eligible once the timer has expired.
        response = self._post_turn(
            {"action": "kickout", "gameID": game.id, "latestUpdate": game.latestUpdate, "kickedName": "row-other"}
        )
        self.assertEqual(response.status_code, 200)
        game.refresh_from_db()
        self.assertTrue(GamePlayer.objects.get(game=game, player=other).is_kicked)
        self.assertTrue(GamePlayer.objects.get(game=game, player=self.creator).is_current)

    @patch("django_q.tasks.async_task")
    def test_end_game_maps_seat_positions_and_puts_missing_players_last(self, async_task):
        game, other = self._active_two_player_game()
        GamePlayer.objects.filter(game=game, player=self.creator).update(is_missing=True)
        request = type("R", (), {"user": other})()

        game.presenter().endGame(request, ["row-other"], [[1], [0]], [], game.id)

        self.assertTrue(GamePlayer.objects.get(game=game, player=other).winner)
        self.assertFalse(GamePlayer.objects.get(game=game, player=self.creator).winner)
        end_call = next(call for call in async_task.call_args_list if call.args[0].endswith("SN_M_sendEndGameNotificationAnyGame"))
        final_results = end_call.args[2]
        self.assertEqual([row[0] for row in final_results], ["row-other", "creator"])
        self.assertEqual(final_results[-1][1], "Last")

    def test_lightweight_poll_returns_latest_without_game_data(self):
        game, _other = self._active_two_player_game()
        unchanged = self.client.post(
            reverse("ROW:ROWdata", kwargs={"dataType": 3}),
            data=json.dumps({"gameID": game.id, "latestUpdate": game.latestUpdate}),
            content_type="application/json",
        )
        unchanged_body = unchanged.json()
        self.assertTrue(unchanged_body["latest"])
        self.assertIn("kickoutVotesData", unchanged_body)
        self.assertNotIn("gameData", unchanged_body)

        changed = self.client.post(
            reverse("ROW:ROWdata", kwargs={"dataType": 3}),
            data=json.dumps({"gameID": game.id, "latestUpdate": "1"}),
            content_type="application/json",
        )
        body = changed.json()
        self.assertFalse(body["latest"])
        self.assertIn("gameData", body)
        self.assertEqual(body["currentPlayerNames"], ["creator", "row-other"])

    def test_finished_game_ignores_late_saves(self):
        game, _other = self._active_two_player_game()
        game.gameStatus = "FINISHED"
        game.gameData = '{"final":true}'
        game.save(update_fields=["gameStatus", "gameData"])

        response = self._post_turn(
            {
                "action": "saveGame",
                "gameID": game.id,
                "latestUpdate": game.latestUpdate,
                "gameData": '{"changed":true}',
                "turn": 2,
                "phase": 1,
                "status": "ACTIVE",
                "allIsCurrentPlayers": ["creator"],
                "allRemainingPlayersInTurnOrder": ["creator", "row-other"],
                "saveRewind": False,
            }
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get("finishedGame"))
        game.refresh_from_db()
        self.assertEqual(game.gameData, '{"final":true}')
        self.assertEqual(game.turn, 1)
