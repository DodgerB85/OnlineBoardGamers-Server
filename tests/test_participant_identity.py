from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase

from Lobby.models import Game, GamePlayer, User


class SharedParticipantIdentityTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="BUS",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            maxPlayers=2,
            startingOptions="[]",
        )
        self.alice_gp = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        self.bob_gp = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)

    def test_seat_helpers_use_gameplayer_positions(self):
        presenter = self.game.presenter()

        self.assertEqual(presenter.getSeatPlayerNames(), [self.alice.username, self.bob.username])
        self.assertEqual(presenter.getSeatNameMap(), {0: self.alice.username, 1: self.bob.username})
        self.assertEqual(presenter.namesForSeats([1, 0], ["old-b", "old-a"]), [self.bob.username, self.alice.username])
        self.assertEqual(presenter.resolveGamePlayer(seat=1, username="old-b").player, self.bob)
        self.assertEqual(presenter.resolveKickoutUser(seat=1, username="old-b"), self.bob)

    def test_bus_end_game_resolves_winner_and_positions_by_seat(self):
        request = SimpleNamespace(user=self.alice)

        with patch("django_q.tasks.async_task") as async_task:
            self.game.presenter().endGame(
                request,
                "old-bob-name",
                ["old-bob-name", "old-alice-name"],
                [],
                self.game.id,
                winnerSeat=1,
                finalPositionsSeats=[1, 0],
            )

        self.bob_gp.refresh_from_db()
        self.assertTrue(self.bob_gp.winner)
        final_positions = async_task.call_args.args[2]
        self.assertEqual(final_positions[0][0], self.bob.username)
        self.assertEqual(final_positions[1][0], self.alice.username)

    def test_cns_end_game_resolves_winner_and_positions_by_seat(self):
        game = Game.objects.create(
            gameCode="CNS",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            maxPlayers=2,
            startingOptions="[]",
        )
        alice_gp = GamePlayer.objects.create(game=game, player=self.alice, seat_order=0, is_current=True)
        bob_gp = GamePlayer.objects.create(game=game, player=self.bob, seat_order=1)
        request = SimpleNamespace(user=self.alice)

        with patch("django_q.tasks.async_task") as async_task:
            game.presenter().endGame(
                request,
                "old-bob-name",
                ["old-bob-name", "old-alice-name"],
                game.id,
                winnerSeat=1,
                finalPositionsSeats=[1, 0],
            )

        bob_gp.refresh_from_db()
        self.assertTrue(bob_gp.winner)
        self.assertFalse(alice_gp.winner)
        final_positions = async_task.call_args.args[2]
        self.assertEqual(final_positions[0][0], self.bob.username)
        self.assertEqual(final_positions[1][0], self.alice.username)
