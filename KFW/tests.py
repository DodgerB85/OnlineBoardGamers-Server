
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer


class KFWIssue53Tests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.player_one = user_model.objects.create_user(username="kfw_issue53_a", password="pw")
        self.player_two = user_model.objects.create_user(username="kfw_issue53_b", password="pw")
        self.player_three = user_model.objects.create_user(username="kfw_issue53_c", password="pw")

        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.player_one,
            host=self.player_one,
            gameStatus="ACTIVE",
            maxPlayers=3,
            turn=4,
            phase=1,
            startingOptions="[]",
        )

        GamePlayer.objects.bulk_create(
            [
                GamePlayer(game=self.game, player=self.player_one, seat_order=0),
                GamePlayer(game=self.game, player=self.player_two, seat_order=1),
                GamePlayer(game=self.game, player=self.player_three, seat_order=2),
            ]
        )

        self.game.KFWplayersHiddenData = json.dumps(
            [
                [self.player_one.username, [0, 0, 0, 0], [0, 0, 0], []],
                [self.player_two.username, [0, 0, 0, 0], [0, 0, 0], []],
                [self.player_three.username, [0, 0, 0, 0], [0, 0, 0], []],
            ]
        )
        self.game.KFWplayersMoveData = json.dumps(
            [
                [self.player_one.username, "1710000000001", "prebuild-a"],
                [self.player_two.username, "1710000000002", "prebuild-b"],
                [self.player_three.username, "1710000000003", "prebuild-c"],
            ]
        )
        self.game.save(update_fields=["KFWplayersHiddenData", "KFWplayersMoveData"])

    @patch("Lobby.presenters.GamePresenter.sendYourTurnNotification")
    def test_save_game_phase_ends_when_all_village_prebuilds_are_already_submitted(self, _mock_notify):
        self.client.force_login(self.player_one)

        response = self.client.post(
            reverse("KFW:processKFWturn"),
            data=json.dumps(
                {
                    "action": "saveGame",
                    "gameID": self.game.id,
                    "latestUpdate": self.game.latestUpdate,
                    "data": "",
                    "data2": self.game.presenter().compressData([]),
                    "turn": 5,
                    "phase": 2,
                    "status": "ACTIVE",
                    "nextPlayer": [],
                    "IPM": "",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response.json().get("phaseEnded"),
            "Issue #53 repro: entering village expansion with no remaining builders should auto-finish the phase.",
        )
