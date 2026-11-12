import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class KfwRewindHiddenDataTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@example.com", "pw")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            turn=4,
            phase=4,
            maxPlayers=2,
            startingOptions="[]",
            KFWserverData=json.dumps([[0, 0, 0, 0], [0, 0, 0]]),
        )
        self.gp_alice = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        self.gp_bob = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)
        self.gp_alice.moveDataJSON = {"hidden": [[1, 2, 3, 4], [1, 2, 3], [["h1"]]]}
        self.gp_bob.moveDataJSON = {"hidden": [[4, 3, 2, 1], [3, 2, 1], []]}
        self.gp_alice.save(update_fields=["moveDataJSON"])
        self.gp_bob.save(update_fields=["moveDataJSON"])
        self.client.force_login(self.alice)
        self.url = reverse("KFW:processKFWturn")

    def _post(self, payload):
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        return response

    def _save_rewind(self):
        self._post(
            {
                "action": "saveGame",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "data": "STATE-1",
                "data2": self.game.presenter().compressData([]),
                "turn": 4,
                "phase": 4,
                "status": "ACTIVE",
                "nextPlayer": [self.alice.username],
                "IPM": "",
                "saveRewind": True,
            }
        )
        self.game.refresh_from_db()
        self.assertTrue(self.game.rewindData, "the save must create a rewind point")
        return self.game.latestUpdate

    def test_rewind_restores_hidden_data_on_game_players(self):
        latest_update = self._save_rewind()

        self.gp_alice.moveDataJSON = {"hidden": [[9, 9, 9, 9], [9, 9, 9], []]}
        self.gp_alice.save(update_fields=["moveDataJSON"])

        response = self._post(
            {
                "action": "loadRewind",
                "gameID": self.game.id,
                "latestUpdate": latest_update,
            }
        )

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON["hidden"], [[1, 2, 3, 4], [1, 2, 3], [["h1"]]])
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "STATE-1")
        self.assertEqual(
            self.game.presenter().decompressData(response.json()["gameData1"]),
            [[1, 2, 3, 4], [1, 2, 3], [["h1"]]],
        )

    def test_rewind_with_pending_move_clears_moves_and_restores_hidden(self):
        latest_update = self._save_rewind()
        self.game.presenter().updateSingleMove(self.alice.username, "pending")
        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveData, "pending")

        self.gp_alice.moveDataJSON = {"hidden": [[9, 9, 9, 9], [9, 9, 9], []]}
        self.gp_alice.save(update_fields=["moveDataJSON"])

        self._post(
            {
                "action": "loadRewind",
                "gameID": self.game.id,
                "latestUpdate": latest_update,
            }
        )

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveData, "")
        self.assertEqual(self.gp_alice.currentMoveTime, "")
        self.assertEqual(self.gp_alice.moveDataJSON["hidden"], [[1, 2, 3, 4], [1, 2, 3], [["h1"]]])
