import json
import time

from django.test import TestCase

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_buildGamePlayerContext,
    SF_serializeGame,
)

# Build Factory is simultaneous but processed in turn order, and early
# submissions must stay secret: nobody may learn who has already submitted
# except the submitter themself (who sees only their own name removed).


class HLCFactoryQueueTests(TestCase):
    def setUp(self):
        self.users = [User.objects.create_user(username=name, password="testpass123") for name in ["alice", "bob", "carol", "dave"]]
        self.game = Game.objects.create(
            gameCode="HLC",
            gameStatus="ACTIVE",
            maxPlayers=4,
            turn=1,
            phase=3,
            creator=self.users[0],
            host=self.users[0],
            latestUpdate=str(int(time.time() * 1000)),
            created=str(int(time.time() * 1000)),
            startingOptions=json.dumps([]),
            currentPlayersInTurnOrder=json.dumps(["alice", "bob", "carol", "dave"]),
        )
        for seat, user in enumerate(self.users):
            GamePlayer.objects.create(game=self.game, player=user, seat_order=seat, is_current=True)
        self.presenter = self.game.presenter()

    def submit_factory(self, username):
        self.presenter.updateSingleMove(username, "compresseddata")

    def test_only_queue_head_is_notified_when_later_players_submitted_early(self):
        self.submit_factory("bob")
        self.submit_factory("carol")

        # bob and carol stay in the turn order (no leak), but only alice -
        # the head of the queue - is blocking and gets reminder emails
        self.assertEqual(self.presenter.getArrayOfIsCurrentPlayers(), ["alice"])
        self.assertEqual(self.presenter.getCurrentPlayersInOrderArrHLC(), ["alice", "bob", "carol", "dave"])
        # The load list drops the submitters but keeps queue order, so [0] is
        # still the head for the kickout panel
        self.assertEqual(self.presenter.getCurrentPlayersHLC(), ["alice", "dave"])

    def test_head_follows_queue_order_not_seat_order(self):
        self.game.currentPlayersInTurnOrder = json.dumps(["bob", "alice", "carol", "dave"])
        self.game.save()

        self.assertEqual(self.presenter.getArrayOfIsCurrentPlayers(), ["bob"])
        self.assertEqual(self.presenter.getCurrentPlayersHLC(), ["bob", "alice", "carol", "dave"])

        self.submit_factory("alice")
        self.assertEqual(self.presenter.getArrayOfIsCurrentPlayers(), ["bob"])
        self.assertEqual(self.presenter.getCurrentPlayersHLC(), ["bob", "carol", "dave"])

    def test_non_factory_phase_is_unchanged(self):
        self.game.phase = 2
        self.game.save()

        self.assertEqual(set(self.presenter.getArrayOfIsCurrentPlayers()), {"alice", "bob", "carol", "dave"})

    def test_lobby_hides_only_the_submitters_own_name(self):
        self.submit_factory("bob")
        self.submit_factory("carol")

        def serialize_for(username):
            user = User.objects.get(username=username)
            return SF_serializeGame(self.game, user, SF_buildGamePlayerContext(self.game))

        # The head and later non-submitters still see the full queue
        self.assertEqual(serialize_for("alice")["currentPlayersSplit"], ["alice", "bob", "carol", "dave"])
        self.assertTrue(serialize_for("alice")["myMove"])
        self.assertEqual(serialize_for("dave")["currentPlayersSplit"], ["alice", "bob", "carol", "dave"])
        self.assertTrue(serialize_for("dave")["myMove"])

        # Each submitter sees only their own name removed - never anyone else's
        self.assertEqual(serialize_for("bob")["currentPlayersSplit"], ["alice", "carol", "dave"])
        self.assertFalse(serialize_for("bob")["myMove"])
        self.assertEqual(serialize_for("carol")["currentPlayersSplit"], ["alice", "bob", "dave"])
        self.assertFalse(serialize_for("carol")["myMove"])

    def test_illegal_move_head_counts_as_not_submitted(self):
        # A head whose stored build became invalid keeps their queue slot
        self.submit_factory("alice")
        gp = self.game.players.get(player=self.users[0])
        gp.currentMoveTime = "ILLEGALMOVE"
        gp.save()

        self.assertEqual(self.presenter.getArrayOfIsCurrentPlayers(), ["alice"])
        self.assertIn("alice", self.presenter.getCurrentPlayersHLC())
