import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class GameCopyTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("copycat", "c@example.com", "pw")
        self.other = User.objects.create_user("onlooker", "o@example.com", "pw")
        for name in ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]:
            User.objects.create_user(name, f"{name}@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="AQY",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameName="Original",
            gameDescription="Original description",
            maxPlayers=3,
            startingOptions=json.dumps([1]),
            gameData="ORIGINAL-STATE",
            startingMap="map",
            zoomLevels=json.dumps([16, 16, 16, 16]),
            playerOrderSeed=42,
            gamePace=40,
            kickoutDuration=100,
            phase=4,
            turn=7,
            latestUpdate="123",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=1, is_current=True)
        GamePlayer.objects.create(game=self.game, player=User.objects.get(username="SHADOW"), seat_order=0)
        GamePlayer.objects.create(game=self.game, player=User.objects.get(username="SHADOW_2"), seat_order=2)

    def post(self, **overrides):
        payload = {
            "action": "copyGame",
            "gameID": self.game.id,
            "pov": 1,
            "turn": 5,
            "phase": 3,
            "data": "COPIED-STATE",
        }
        payload.update(overrides)
        return self.client.post(reverse("createGameCopy"), data=json.dumps(payload), content_type="application/json")

    def test_copy_keeps_state_and_adds_training_option(self):
        self.client.force_login(self.player)
        response = self.post()
        self.assertEqual(response.status_code, 200, response.content)
        new_game = Game.objects.get(id=json.loads(response.content)["newID"])

        self.assertEqual(new_game.gameCode, "AQY")
        self.assertEqual(new_game.gameName, "[Copy] - Original")
        self.assertEqual(new_game.gameData, "COPIED-STATE")
        self.assertEqual(json.loads(new_game.rewindData), ["COPIED-STATE"])
        self.assertEqual(new_game.turn, 5)
        self.assertEqual(new_game.phase, 3)
        self.assertEqual(new_game.maxPlayers, 3)
        self.assertEqual(new_game.startingMap, "map")
        self.assertEqual(new_game.playerOrderSeed, 42)
        self.assertEqual(new_game.gamePace, 40)
        self.assertEqual(new_game.kickoutDuration, 100)
        self.assertIn(102, json.loads(new_game.startingOptions))
        self.assertTrue(new_game.statsExcludedGame)
        self.assertEqual(new_game.gameStatus, "ACTIVE")

        seats = list(new_game.players.order_by("seat_order").values_list("player__username", "seat_order"))
        self.assertEqual(seats, [("SHADOW", 0), ("copycat", 1), ("SHADOW_2", 2)])

    def test_only_a_player_can_copy(self):
        self.client.force_login(self.other)
        self.assertEqual(self.post().status_code, 403)

    def test_requires_copy_action_and_data(self):
        self.client.force_login(self.player)
        self.assertEqual(self.post(action="somethingElse").status_code, 400)
        self.assertEqual(self.post(data="").status_code, 400)

    def test_replay_deep_link_routes_exist(self):
        from django.urls import reverse

        for name in (
            "DDL:showDDLreplayStep",
            "KFW:showKFWreplayStep",
            "RNB:showRNBreplayStep",
            "ROW:showROWreplayStep",
            "URR:showURRreplayStep",
            "WEB:showWEBreplayStep",
        ):
            with self.subTest(route=name):
                self.assertTrue(reverse(name, args=[1, 2]))
