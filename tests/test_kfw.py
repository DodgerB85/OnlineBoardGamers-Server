
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, GamePlayer


class KFWReplayRouteTests(TestCase):
    """The copied replay link opens on the requested step and never leaks a seat view."""

    def setUp(self):
        user_model = get_user_model()
        self.player_one = user_model.objects.create_user(username="kfw_replay_a", password="pw")
        self.player_two = user_model.objects.create_user(username="kfw_replay_b", password="pw")
        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.player_one,
            host=self.player_one,
            gameStatus="ACTIVE",
            maxPlayers=2,
            turn=0,
            phase=0,
            startingOptions="[]",
        )
        GamePlayer.objects.create(game=self.game, player=self.player_one, seat_order=0)
        GamePlayer.objects.create(game=self.game, player=self.player_two, seat_order=1)

    def test_replay_url_sets_the_exact_step_and_is_spoiler_free(self):
        response = self.client.get(reverse("KFW:showKFWreplayStep", args=[self.game.id, 40]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "initData.spoilerFree = true;")
        # The URL is 1-based; the template converts it to the 0-based frame index.
        self.assertContains(response, "initData.replayStep = 40-1;")
        self.assertContains(response, "initData.pov = -99;")

    def test_involved_player_gets_a_spectator_view_on_a_replay_url(self):
        self.client.force_login(self.player_one)
        response = self.client.get(reverse("KFW:showKFWreplayStep", args=[self.game.id, 3]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "initData.replayStep = 3-1;")
        self.assertContains(response, "initData.pov = -99;")
        self.assertNotContains(response, "initData.statsExcludedGame")


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
        self.gp_one = GamePlayer.objects.create(game=self.game, player=self.player_one, seat_order=0)
        self.gp_two = GamePlayer.objects.create(game=self.game, player=self.player_two, seat_order=1)
        self.gp_one.moveDataJSON = {"hidden": [[0, 0, 0, 0], [0, 0, 0], []]}
        self.gp_two.moveDataJSON = {"hidden": [[0, 0, 0, 0], [0, 0, 0], []]}
        self.gp_one.save(update_fields=["moveDataJSON"])
        self.gp_two.save(update_fields=["moveDataJSON"])
        self.game.KFWserverData = json.dumps([[0, 0, 0, 0], [0, 0, 0]])
        self.set_moves("final-a", "final-b")
        self.game.save()

    def set_moves(self, move_one, move_two):
        for gp, move, timestamp in (
            (self.gp_one, move_one, "1710000000001"),
            (self.gp_two, move_two, "1710000000002"),
        ):
            gp.currentMoveTime = timestamp if move else ""
            gp.currentMoveData = move
            gp.save(update_fields=["currentMoveTime", "currentMoveData"])

    def test_all_ready_keeps_moves_until_the_game_over_save_lands(self):
        response = self.game.presenter().getJsonMoveResponseFinalScoring()

        self.assertTrue(response[-1]["allReady"])
        self.gp_one.refresh_from_db()
        self.gp_two.refresh_from_db()
        self.assertEqual([self.gp_one.currentMoveData, self.gp_two.currentMoveData], ["final-a", "final-b"])

    def test_does_not_finish_when_a_required_player_has_no_move(self):
        # This is the state a failed game-over save used to leave behind: nobody current, a move missing.
        self.set_moves("final-a", "")

        response = self.game.presenter().getJsonMoveResponseFinalScoring()

        self.assertFalse(response[-1]["allReady"])
        self.gp_one.refresh_from_db()
        self.gp_two.refresh_from_db()
        self.assertEqual([self.gp_one.currentMoveData, self.gp_two.currentMoveData], ["final-a", ""])


class KFWTrainingFinalScoringTests(TestCase):
    """Practice games score seat by seat, so the unscored seat must stay current."""

    def setUp(self):
        user_model = get_user_model()
        self.player_one = user_model.objects.create_user(username="kfw_training_a", password="pw")
        self.player_two = user_model.objects.create_user(username="kfw_training_b", password="pw")

        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.player_one,
            host=self.player_one,
            gameStatus="ACTIVE",
            maxPlayers=2,
            turn=0,
            phase=4,
            startingOptions=json.dumps([rf.SO_TRAINING_GAME]),
        )
        self.gp_one = GamePlayer.objects.create(game=self.game, player=self.player_one, seat_order=0, is_current=True)
        self.gp_two = GamePlayer.objects.create(game=self.game, player=self.player_two, seat_order=1)
        for gp in (self.gp_one, self.gp_two):
            gp.moveDataJSON = {"hidden": [[0, 0, 0, 0], [0, 0, 0], []]}
            gp.save(update_fields=["moveDataJSON"])
        self.game.KFWserverData = json.dumps([[0, 0, 0, 0], [0, 0, 0]])
        self.game.save()
        self.client.force_login(self.player_one)

    def submit(self, name, move):
        return self.client.post(
            reverse("KFW:processKFWturn"),
            data=json.dumps(
                {
                    "action": "saveFinalScoringMove",
                    "latestUpdate": self.game.latestUpdate,
                    "moveData": move,
                    "turn": 0,
                    "phase": 4,
                    "status": "ACTIVE",
                    "gameID": self.game.id,
                    "BKSN": name,
                    "data2": self.game.presenter().compressData([]),
                }
            ),
            content_type="application/json",
        )

    def test_the_unscored_seat_is_offered_after_the_first_submit(self):
        data = self.submit(self.player_one.username, "score-one").json()

        self.assertEqual(next(item["ready"] for item in data if "ready" in item), [True, False])
        self.assertFalse(data[-1]["allReady"])
        self.gp_two.refresh_from_db()
        self.assertTrue(self.gp_two.is_current)

    def test_a_game_with_no_current_players_offers_the_unscored_seat(self):
        # The state game 38396 was left in: the first seat scored and every is_current flag was cleared.
        self.gp_one.is_current = False
        self.gp_one.currentMoveTime = "1710000000001"
        self.gp_one.currentMoveData = "score-one"
        self.gp_one.save(update_fields=["is_current", "currentMoveTime", "currentMoveData"])

        self.assertEqual(self.game.presenter().getCurrentPlayers(), [self.player_two.username])

    def test_both_seats_can_finish(self):
        self.submit(self.player_one.username, "score-one")

        data = self.submit(self.player_two.username, "score-two").json()

        self.assertTrue(data[-1]["allReady"])


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

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    @patch("Lobby.presenters.GamePresenter.getKickoutVoteThreshold", return_value=1)
    def test_kickout_can_repair_a_current_player_already_missing_and_kicked(self, _threshold, _kickout_required):
        self.game.players.filter(player=self.players[2]).update(is_missing=True, is_kicked=True)

        self.assertEqual(self.kickout().status_code, 200)

        seat = self.game.players.get(player=self.players[2])
        self.assertTrue(seat.is_kicked)
        self.assertFalse(seat.is_current)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=1)
    def test_cannot_kick_during_flex_time(self, _kickout_required):
        self.assertEqual(self.kickout().status_code, 400)
        self.game.refresh_from_db()
        self.assertFalse(self.game.players.get(player=self.players[2]).is_kicked)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_only_the_current_other_player_can_be_kicked(self, _kickout_required):
        self.assertEqual(self.kickout(self.players[0]).status_code, 400)  # self
        self.assertEqual(self.kickout(self.players[1]).status_code, 400)  # not on turn
