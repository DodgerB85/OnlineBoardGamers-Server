import json

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, User


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
