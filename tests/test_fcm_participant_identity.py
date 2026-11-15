from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase

from FCM.views import _resolve_kickout_user
from Lobby.models import Game, GamePlayer, User


class FCMParticipantIdentityTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            maxPlayers=2,
            startingOptions="[]",
        )
        self.alice_gp = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        self.bob_gp = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)

    def test_end_game_resolves_the_winner_by_seat_not_name(self):
        request = SimpleNamespace(user=self.alice)

        with patch("django_q.tasks.async_task") as async_task:
            self.game.presenter().endGame(
                request,
                "old-alice-name",
                [["old-alice-name", 10], ["old-bob-name", 5]],
                [],
                self.game.id,
                winnerSeat=0,
                finalScoresSeats=[[0, 10], [1, 5]],
            )

        self.alice_gp.refresh_from_db()
        self.assertTrue(self.alice_gp.winner)
        final_positions = async_task.call_args.args[2]
        self.assertEqual(final_positions[0][0], self.alice.username)
        self.assertEqual(final_positions[1][0], self.bob.username)

    def test_kickout_target_resolves_by_seat(self):
        target = _resolve_kickout_user(self.game, {"kickedSeat": 1, "kickedName": "old-bob-name"})
        self.assertEqual(target, self.bob)
