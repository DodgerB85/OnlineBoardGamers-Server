"""Non-players cannot mutate an FCM game; adminKickout is admin-only."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class FcmPermissionsTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player", "p@example.com", "pw")
        self.outsider = User.objects.create_user("outsider", "o@example.com", "pw")
        self.game = Game.objects.create(gameCode="FCM", creator=self.player, host=self.player, gameStatus="ACTIVE", gameData="STATE-0", startingMap="")
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)

    def _post(self, user, url, payload, method="post"):
        self.client.force_login(user)
        payload = {"gameID": self.game.id, "latestUpdate": self.game.latestUpdate, **payload}
        return getattr(self.client, method)(url, data=json.dumps(payload), content_type="application/json")

    def test_outsider_cannot_take_turn_actions(self):
        response = self._post(self.outsider, reverse("FCM:processTurn"), {"action": "deleteMoveData"})
        self.assertEqual(response.status_code, 403)

    def test_outsider_can_still_poll_load_new(self):
        response = self._post(self.outsider, reverse("FCM:processTurn"), {"action": "loadNew"})
        self.assertNotEqual(response.status_code, 403)

    def test_player_cannot_admin_kickout(self):
        response = self._post(self.player, reverse("FCM:processTurn"), {"action": "adminKickout", "kickedName": "player"})
        self.assertEqual(response.status_code, 403)

    def test_outsider_cannot_chat(self):
        response = self._post(self.outsider, reverse("FCM:sendChatMessage"), {"action": "sendChatMessage", "newEntry": ["outsider", "hi"]})
        self.assertEqual(response.status_code, 403)

    def test_outsider_cannot_zoom(self):
        response = self._post(self.outsider, reverse("FCM:changeAssistance"), {"action": "zoom", "playerNumber": 0, "zoomLevel": "100", "allPlayers": True}, method="put")
        self.assertEqual(response.status_code, 403)
        self.game.refresh_from_db()
        self.assertNotEqual(self.game.zoomLevels, "100")
