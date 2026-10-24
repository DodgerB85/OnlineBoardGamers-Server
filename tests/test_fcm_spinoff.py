"""Copying an FCM game to a practice game must load the copied state, not set up a
fresh board. The copied game is a training game with SHADOW seats."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class FcmSpinoffTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("copycat", "c@example.com", "pw")
        for name in ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]:
            User.objects.create_user(name, f"{name}@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameName="Original",
            maxPlayers=2,
            startingOptions=json.dumps([1]),
            gameData="ORIGINAL-STATE",
            phase=4,
            turn=7,
            latestUpdate="123",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0, is_current=True)

    def test_copy_keeps_data_and_adds_training_option(self):
        self.client.force_login(self.player)
        response = self.client.post(
            reverse("FCM:createFCMspinoff"),
            data=json.dumps({"action": "copyGame", "gameID": self.game.id, "pov": 0, "turn": 5, "phase": 3, "data": "COPIED-STATE"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        new_game = Game.objects.get(id=json.loads(response.content)["newID"])
        self.assertEqual(new_game.gameData, "COPIED-STATE")
        self.assertEqual(json.loads(new_game.rewindData), ["COPIED-STATE"])
        self.assertEqual(new_game.turn, 5)
        self.assertEqual(new_game.phase, 3)
        self.assertIn(102, json.loads(new_game.startingOptions))
        self.assertTrue(new_game.statsExcludedGame)
        self.assertEqual(new_game.players.get(player=self.player).seat_order, 0)
