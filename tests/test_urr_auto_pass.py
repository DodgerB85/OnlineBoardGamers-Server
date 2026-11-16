"""URR settlement auto-pass flags live on GamePlayer, not in gameData."""

import json
import time

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User
from URR import URRconstants as rfURR

TURN_URL = "URR:processURRturn"
POLL_URL = "URR:URRdata"


class UrrAutoPassTests(TestCase):
    def setUp(self):
        self.users = [User.objects.create_user(username=f"urrAutoPass{i}", password="pw") for i in range(3)]
        self.game = Game.objects.create(
            gameCode="URR",
            creator=self.users[0],
            host=self.users[0],
            gameStatus="ACTIVE",
            turn=4,
            phase=rfURR.PHASE_SETTLEMENT,
            maxPlayers=3,
            latestUpdate=str(int(time.time() * 1000)),
            startingOptions="[]",
            playerOrderSeed=1,
            serverCurrentPlayerNamesInTurnOrder=[user.username for user in self.users],
        )
        for index, user in enumerate(self.users):
            GamePlayer.objects.create(game=self.game, player=user, seat_order=index, is_current=index == 0)
        self.client.force_login(self.users[0])

    def post(self, action, **payload):
        return self.client.post(
            reverse(TURN_URL),
            json.dumps({"action": action, "gameID": self.game.id, **payload}),
            content_type="application/json",
        )

    def game_player(self, index):
        return GamePlayer.objects.get(game=self.game, player=self.users[index])

    def test_phase_mode_is_stamped_with_the_current_turn_and_does_not_change_the_game_version(self):
        version = self.game.latestUpdate
        response = self.post("setAutoPass", mode="phase", prices=[])

        self.assertEqual(response.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.latestUpdate, version)
        self.assertEqual(
            self.game_player(0).moveDataJSON["urrAutoPass"],
            {"mode": "phase", "turn": 4, "prices": []},
        )
        self.assertEqual(response.json()["autoPassData"][self.users[0].username]["mode"], "phase")

    def test_price_mode_keeps_the_snapshot_and_clears_without_leaving_an_empty_object(self):
        prices = [90, 80, 70, 60]
        self.assertEqual(self.post("setAutoPass", mode="price", prices=prices).status_code, 200)
        self.assertEqual(
            self.game_player(0).moveDataJSON["urrAutoPass"],
            {"mode": "price", "turn": 4, "prices": prices},
        )

        self.assertEqual(self.post("setAutoPass", mode=None).status_code, 200)
        self.assertIsNone(self.game_player(0).moveDataJSON)

    def test_each_player_keeps_their_own_flag_and_the_poll_returns_all_of_them(self):
        self.client.force_login(self.users[1])
        self.assertEqual(self.post("setAutoPass", mode="phase", prices=[]).status_code, 200)
        self.client.force_login(self.users[0])
        self.assertEqual(self.post("setAutoPass", mode="price", prices=[100, 82, 71, 60]).status_code, 200)

        self.assertEqual(self.game_player(0).moveDataJSON["urrAutoPass"]["mode"], "price")
        self.assertEqual(self.game_player(1).moveDataJSON["urrAutoPass"]["mode"], "phase")
        self.assertFalse(self.game_player(2).moveDataJSON)

        data = self.client.post(
            reverse(POLL_URL, args=[3]),
            json.dumps({"gameID": self.game.id, "latestUpdate": self.game.latestUpdate}),
            content_type="application/json",
        ).json()
        self.assertEqual(data["autoPassData"][self.users[0].username]["mode"], "price")
        self.assertEqual(data["autoPassData"][self.users[1].username]["mode"], "phase")
        self.assertNotIn(self.users[2].username, data["autoPassData"])

    def test_setting_validates_phase_mode_prices_and_active_membership(self):
        invalid_mode = self.post("setAutoPass", mode="forever", prices=[])
        self.assertEqual(invalid_mode.status_code, 400)

        invalid_prices = self.post("setAutoPass", mode="price", prices=[100, 82])
        self.assertEqual(invalid_prices.status_code, 400)

        self.game.phase = rfURR.PHASE_DEVELOPMENT
        self.game.save(update_fields=["phase"])
        self.assertEqual(self.post("setAutoPass", mode="phase", prices=[]).status_code, 400)

        outsider = User.objects.create_user(username="urrAutoPassOutsider", password="pw")
        self.client.force_login(outsider)
        self.assertEqual(self.post("setAutoPass", mode="phase", prices=[]).status_code, 403)

    def test_the_show_page_gives_the_client_the_stored_flag(self):
        self.post("setAutoPass", mode="phase", prices=[])

        response = self.client.get(reverse("URR:showURRgame", args=[self.game.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.context["autoPassData"])[self.users[0].username]["turn"], 4)
