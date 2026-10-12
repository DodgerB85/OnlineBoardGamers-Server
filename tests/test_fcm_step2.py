"""Stale-write rejection for saveAndUpdateNotifictions and deleteMoveData."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class FcmStep2StaleWriteTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player", "p@example.com", "pw")
        self.game = Game.objects.create(gameCode="FCM", creator=self.player, host=self.player, gameStatus="ACTIVE", gameData="STATE-0", startingMap="")
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def _post(self, payload):
        payload = {"gameID": self.game.id, "latestUpdate": "stale-value", **payload}
        return self.client.post(reverse("FCM:processTurn"), data=json.dumps(payload), content_type="application/json")

    def test_stale_save_and_update_notifications_is_rejected(self):
        response = self._post({"action": "saveAndUpdateNotifictions", "data": "STATE-NEW", "playerIndexesToNotify": []})
        self.assertEqual(response.json(), {"syncError": True})
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "STATE-0")

    def test_stale_delete_move_data_is_rejected(self):
        response = self._post({"action": "deleteMoveData", "phase": 1})
        self.assertEqual(response.json(), {"syncError": True})
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "STATE-0")
