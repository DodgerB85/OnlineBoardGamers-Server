import json

import lzstring
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class BusTurnAuthorizationTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("busplayer", "p@example.com", "pw")
        self.outsider = User.objects.create_user("busoutsider", "o@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="BUS",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameData="ORIGINAL",
            startingMap="",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)

    def _save(self, user, data):
        self.client.force_login(user)
        payload = {
            "action": "save",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "data": data,
            "turn": 0,
            "phase": 0,
            "status": "ACTIVE",
            "nextPlayer": [self.player.username],
            "saveRewind": False,
        }
        return self.client.post(reverse("BUS:processBUSturn"), data=json.dumps(payload), content_type="application/json")

    def test_outsider_cannot_save_the_game(self):
        response = self._save(self.outsider, "HACKED")
        self.assertEqual(response.status_code, 403)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "ORIGINAL")

    def test_player_can_save_the_game(self):
        response = self._save(self.player, "UPDATED")
        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "UPDATED")


class ChatSenderTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("chatplayer", "p@example.com", "pw")
        self.outsider = User.objects.create_user("chatoutsider", "o@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="BUS",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameData="STATE",
            startingMap="",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)

    def test_chat_uses_the_logged_in_username(self):
        self.client.force_login(self.outsider)
        payload = {
            "action": "sendChatMessage",
            "gameID": self.game.id,
            "newEntry": ["Somebody Else", 1, "hello"],
        }
        response = self.client.post(reverse("BUS:sendChatMessage"), data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)

        self.game.refresh_from_db()
        entries = json.loads(lzstring.LZString().decompressFromEncodedURIComponent(self.game.chatData))
        self.assertEqual(entries[0][0], self.outsider.username)
