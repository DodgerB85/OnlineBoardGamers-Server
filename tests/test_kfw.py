
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


class KFWFinalScoringTests(TestCase):
    """A failed game-over save must not lose the final scoring moves or end the game without them."""

    def setUp(self):
        user_model = get_user_model()
        self.player_one = user_model.objects.create_user(username="kfw_final_a", password="pw")
        self.player_two = user_model.objects.create_user(username="kfw_final_b", password="pw")

        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.player_one,
            host=self.player_one,
            gameStatus="ACTIVE",
            maxPlayers=2,
            turn=4,
            phase=4,
            startingOptions="[]",
        )
        GamePlayer.objects.bulk_create(
            [
                GamePlayer(game=self.game, player=self.player_one, seat_order=0),
                GamePlayer(game=self.game, player=self.player_two, seat_order=1),
            ]
        )
        self.game.KFWplayersHiddenData = json.dumps(
            [
                [self.player_one.username, [0, 0, 0, 0], [0, 0, 0], []],
                [self.player_two.username, [0, 0, 0, 0], [0, 0, 0], []],
            ]
        )
        self.game.KFWserverData = json.dumps([[0, 0, 0, 0], [0, 0, 0]])
        self.set_moves("final-a", "final-b")
        self.game.save()

    def set_moves(self, move_one, move_two):
        self.game.KFWplayersMoveData = json.dumps(
            [
                [self.player_one.username, "1710000000001" if move_one else "", move_one],
                [self.player_two.username, "1710000000002" if move_two else "", move_two],
            ]
        )
        self.game.save(update_fields=["KFWplayersMoveData"])

    def test_all_ready_keeps_moves_until_the_game_over_save_lands(self):
        response = self.game.presenter().getJsonMoveResponseFinalScoring()

        self.assertTrue(response[-1]["allReady"])
        moves = json.loads(self.game.KFWplayersMoveData)
        self.assertEqual([move[2] for move in moves], ["final-a", "final-b"])

    def test_does_not_finish_when_a_required_player_has_no_move(self):
        # This is the state a failed game-over save used to leave behind: nobody current, a move missing.
        self.set_moves("final-a", "")

        response = self.game.presenter().getJsonMoveResponseFinalScoring()

        self.assertFalse(response[-1]["allReady"])
        moves = json.loads(self.game.KFWplayersMoveData)
        self.assertEqual([move[2] for move in moves], ["final-a", ""])


class KFWKickoutVoteTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.players = [user_model.objects.create_user(username=f"kfw-kickout-{index}", password="pw") for index in range(3)]
        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.players[0],
            host=self.players[0],
            gameStatus="ACTIVE",
            maxPlayers=3,
            startingOptions="[]",
        )
        for index, player in enumerate(self.players):
            GamePlayer.objects.create(game=self.game, player=player, seat_order=index, is_current=index == 2)
        self.client.force_login(self.players[0])

    def kickout(self, target=None, latest_update=None):
        return self.client.post(
            reverse("KFW:processKFWturn"),
            data=json.dumps(
                {
                    "action": "kickout",
                    "gameID": self.game.id,
                    "kickedName": (target or self.players[2]).username,
                    "latestUpdate": latest_update or self.game.latestUpdate,
                }
            ),
            content_type="application/json",
        )

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_vote_is_recorded_then_majority_kicks(self, _kickout_required):
        response = self.kickout()
        self.assertTrue(response.json()["voteCast"])
        votes = json.loads(response.json()["votesData"])
        self.assertEqual(votes[self.players[0].username][0], self.players[2].username)

        self.client.force_login(self.players[1])
        self.kickout()  # second vote reaches the majority and performs the kickout

        seat = self.game.players.get(player=self.players[2])
        self.assertTrue(seat.is_missing)
        self.assertTrue(seat.is_kicked)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=1)
    def test_cannot_kick_during_flex_time(self, _kickout_required):
        self.assertEqual(self.kickout().status_code, 400)
        self.game.refresh_from_db()
        self.assertFalse(self.game.players.get(player=self.players[2]).is_kicked)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_only_the_current_other_player_can_be_kicked(self, _kickout_required):
        self.assertEqual(self.kickout(self.players[0]).status_code, 400)  # self
        self.assertEqual(self.kickout(self.players[1]).status_code, 400)  # not on turn
