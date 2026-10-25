"""The HLC show page embeds chat JSON raw, so non-BMP characters must not break it."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class HlcShowChatTest(TestCase):
    def test_show_page_renders_chat_message_with_emoji(self):
        player = User.objects.create_user("player", "p@example.com", "pw")
        # json.dumps escapes the emoji as a surrogate pair, exactly as the chat endpoint stores it
        chat_entry = json.dumps(
            {"name": "player", "timestamp": 1, "message": "hi \U0001F600"},
            separators=(",", ":"),
        )
        game = Game.objects.create(
            gameCode="HLC",
            creator=player,
            host=player,
            gameStatus="ACTIVE",
            gameData="",
            chatData=chat_entry + ",",
        )
        GamePlayer.objects.create(game=game, player=player, seat_order=0)

        self.client.force_login(player)
        response = self.client.get(reverse("HLC:showHLCgame", args=[game.id]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "\\ud83d\\ude00")
