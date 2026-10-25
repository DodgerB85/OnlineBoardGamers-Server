import json
import time
import base64
import gzip
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Lobby.extraStats import decode_game_data, read_history
from Lobby.models import Game, GamePlayer
from Lobby.presenters import DDLpresenter

import DDL.DDLconstants as rfDDL

User = get_user_model()


class DDLTests(TestCase):
    def setUp(self):
        self.users = [User.objects.create_user(username=f"ddl{i}", password="pw") for i in range(3)]
        self.game = Game.objects.create(
            gameCode="DDL",
            gameStatus="ACTIVE",
            turn=1,
            phase=rfDDL.PHASE_SETUP,
            maxPlayers=3,
            latestUpdate=str(int(time.time() * 1000)),
            startingOptions=json.dumps([rfDDL.SO_AUCTION]),
            playerOrderSeed=1234,
            creator=self.users[0],
            host=self.users[0],
        )
        for idx, user in enumerate(self.users):
            GamePlayer.objects.create(game=self.game, player=user, seat_order=idx, is_current=idx == 0)
        self.game.serverCurrentPlayerNamesInTurnOrder = [u.username for u in self.users]
        self.game.save()

    def post_turn(self, payload):
        return self.client.post(reverse("DDL:processDDLturn"), data=json.dumps(payload), content_type="application/json")

    def test_show_page_has_setup_data(self):
        self.client.force_login(self.users[0])
        response = self.client.get(reverse("DDL:showDDLgame", args=[self.game.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "initData.setupSeed = 1234")
        self.assertContains(response, "initData.displayNames")

    def test_show_page_accepts_compressed_game_data(self):
        payload = {"players": [], "board": {}, "gameflow": {"turn": 1}, "history": [[1, 0, {}, []]]}
        self.game.gameData = base64.b64encode(gzip.compress(json.dumps(payload).encode())).decode()
        self.game.save()
        self.client.force_login(self.users[0])
        response = self.client.get(reverse("DDL:showDDLgame", args=[self.game.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'initData.gameData = "')
        decoded = decode_game_data(self.game)
        self.assertEqual(read_history(self.game, decoded), [(0, None)])

    def test_sealed_bids_are_revealed_only_when_all_are_in(self):
        body = {"action": "saveBid", "gameID": self.game.id, "bid": 4, "round": 1, "tiedPlayers": []}
        self.client.force_login(self.users[0])
        response = self.post_turn(body)
        self.assertEqual(response.json(), {"ok": True})
        response = self.post_turn({"action": "getBids", "gameID": self.game.id, "round": 1, "tiedPlayers": []})
        self.assertFalse(response.json()["ready"])
        self.assertEqual(response.json()["missing"], ["ddl1", "ddl2"])

        for idx in (1, 2):
            self.client.force_login(self.users[idx])
            body["bid"] = 4 - idx
            self.assertEqual(self.post_turn(body).json(), {"ok": True})

        response = self.post_turn({"action": "getBids", "gameID": self.game.id, "round": 1, "tiedPlayers": []})
        data = response.json()
        self.assertTrue(data["ready"])
        self.assertEqual(data["bids"], {"ddl0": 4, "ddl1": 3, "ddl2": 2})

    def test_non_tied_player_cannot_bid_in_tiebreak(self):
        self.client.force_login(self.users[0])
        response = self.post_turn({"action": "saveBid", "gameID": self.game.id, "bid": 9, "round": 2, "tiedPlayers": ["ddl1", "ddl2"]})
        self.assertFalse(response.json()["ok"])

    def test_save_updates_current_player_and_rejects_stale_update(self):
        self.client.force_login(self.users[0])
        old_update = self.game.latestUpdate
        payload = {
            "action": "saveGame",
            "gameID": self.game.id,
            "latestUpdate": old_update,
            "gameData": "not-validated-here",
            "turn": 1,
            "phase": rfDDL.PHASE_MAIN,
            "status": "ACTIVE",
            "saveRewind": False,
            "allIsCurrentPlayers": ["ddl1"],
            "allRemainingPlayersInTurnOrder": ["ddl1", "ddl2", "ddl0"],
        }
        GamePlayer.objects.filter(game=self.game, player=self.users[0]).update(moveDataJSON={"ddlBid": 3, "round": 1})
        response = self.post_turn(payload)
        data = response.json()
        self.assertNotIn("syncError", data)
        self.game.refresh_from_db()
        self.assertEqual(self.game.phase, rfDDL.PHASE_MAIN)
        self.assertEqual(GamePlayer.objects.get(game=self.game, player=self.users[1]).is_current, True)
        self.assertEqual(GamePlayer.objects.get(game=self.game, player=self.users[0]).is_current, False)
        self.assertIsNone(GamePlayer.objects.get(game=self.game, player=self.users[0]).moveDataJSON)

        stale = dict(payload, latestUpdate=old_update)
        response = self.post_turn(stale)
        self.assertTrue(response.json()["syncError"])

    def test_auction_option_is_stored_on_creation(self):
        self.client.force_login(self.users[0])
        response = self.client.post(
            reverse("DDL:createDDLgame"),
            {
                "gameName": "Test DDL",
                "playerNumber": "3",
                "player2": "ddl1",
                "player3": "ddl2",
                "startingOptionAuction": "1",
            },
        )
        self.assertEqual(response.status_code, 302)
        game = Game.objects.filter(gameCode="DDL", gameName="Test DDL").first()
        self.assertIsNotNone(game)
        self.assertIn(rfDDL.SO_AUCTION, json.loads(game.startingOptions))

    def test_tied_end_game_marks_both_winners(self):
        request = SimpleNamespace(user=self.users[0])
        with patch("django_q.tasks.async_task"):
            DDLpresenter(self.game).endGame(request, ["ddl0", "ddl1"], [[0, 1], [2]], [], self.game.id)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        self.assertTrue(GamePlayer.objects.get(game=self.game, player=self.users[0]).winner)
        self.assertTrue(GamePlayer.objects.get(game=self.game, player=self.users[1]).winner)
        self.assertFalse(GamePlayer.objects.get(game=self.game, player=self.users[2]).winner)
