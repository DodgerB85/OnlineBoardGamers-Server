import json
import time

import lzstring
from django.test import TestCase
from django.urls import reverse

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
        self.bks = User.objects.create_user(username="BotKickStarter", password="testpass123")
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

    def test_draining_the_queue_clears_the_hlc_turn_order(self):
        # When the last factory is processed the server queue empties. The HLC
        # copy must empty with it, or the show page sees stale names and never
        # runs its factory-phase kickstart.
        self.presenter.setCurrentPlayersFromArrInTurnOrder([])
        self.game.refresh_from_db()

        self.assertEqual(self.presenter.getCurrentPlayersInOrderArrHLC(), [])
        self.assertFalse(self.game.players.filter(is_current=True).exists())

    def test_resigning_removes_the_seat_from_the_factory_queue(self):
        # The client swaps the seat to a bot once the server confirms the
        # resignation. If the server never records it, the bot seat keeps the
        # turn and nobody can act.
        for gp in self.game.players.all():
            gp.remainingTurnOrder = gp.seat_order + 1
            gp.save(update_fields=["remainingTurnOrder"])
        self.client.force_login(self.users[0])
        response = self.client.post(
            reverse("HLC:processHLCturn"),
            json.dumps({"action": "resign", "gameID": self.game.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        gp = self.game.players.get(player=self.users[0])
        self.assertTrue(gp.is_missing)
        self.assertFalse(gp.is_current)
        self.assertIsNone(gp.remainingTurnOrder)
        self.assertEqual(self.presenter.getCurrentPlayersInOrderArrHLC(), ["bob", "carol", "dave"])
        self.assertEqual(self.presenter.getArrayOfIsCurrentPlayers(), ["bob"])

    def test_last_resigning_player_can_still_submit_the_final_factory(self):
        # A resignation removes the seat before its turn-ending factory save
        # arrives, leaving the queue empty. That save must still be processed so
        # the client can move the phase on.
        alice_gp = self.game.players.get(player=self.users[0])
        alice_gp.remainingTurnOrder = 1
        alice_gp.save(update_fields=["remainingTurnOrder"])
        self.game.currentPlayersInTurnOrder = json.dumps(["alice"])
        self.game.save(update_fields=["currentPlayersInTurnOrder"])
        self.client.force_login(self.users[0])
        self.client.post(
            reverse("HLC:processHLCturn"),
            json.dumps({"action": "resign", "gameID": self.game.id}),
            content_type="application/json",
        )
        self.game.refresh_from_db()
        self.assertEqual(self.presenter.getCurrentPlayersInOrderArrHLC(), [])

        components = [20] * 60
        model = [components, [], [3, 5, 0, [0], [0], 0, []], [[[]], [[]], [[]], [[]]], 0, [], [], 0, [], 0, [], 0, [], 0, [], [], [0]]
        lzs = lzstring.LZString()
        self.game.gameData = lzs.compressToEncodedURIComponent(json.dumps(model))
        self.game.save(update_fields=["gameData"])

        response = self.client.post(
            reverse("HLC:processHLCturn"),
            json.dumps(
                {
                    "action": "saveFactoryMove",
                    "gameID": self.game.id,
                    "name": "alice",
                    "idx": -1,
                    "useTheFirst": False,
                    "data": lzs.compressToEncodedURIComponent(json.dumps([1, 2, 3])),
                    "other": lzs.compressToEncodedURIComponent(json.dumps([[], [], [], components, [[], []]])),
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertTrue(result["VFFFP"])
        self.assertEqual(result["currentPlayers"], [])

    def test_bot_kick_starter_repair_drops_live_bot_seats_and_sets_the_queue(self):
        for gp in self.game.players.all():
            gp.remainingTurnOrder = gp.seat_order + 1
            gp.save(update_fields=["remainingTurnOrder"])
        self.game.turn = 5
        self.game.gameData = "repaired-data"
        self.game.save(update_fields=["turn", "gameData"])
        self.client.force_login(self.bks)

        response = self.client.post(
            reverse("HLC:processHLCturn"),
            json.dumps(
                {
                    "action": "adminRepair",
                    "gameID": self.game.id,
                    "latestUpdate": self.game.latestUpdate,
                    "data": "repaired-data",
                    "turn": 5,
                    "phase": 3,
                    "nextPlayer": ["bob", "carol", "dave"],
                    "nextPlayerSeats": [1, 2, 3],
                    "botSeats": [0],
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        alice_gp = self.game.players.get(player=self.users[0])
        self.assertTrue(alice_gp.is_missing)
        self.assertFalse(alice_gp.is_current)
        self.assertIsNone(alice_gp.remainingTurnOrder)
        self.assertEqual(self.presenter.getCurrentPlayersInOrderArrHLC(), ["bob", "carol", "dave"])
        self.assertEqual(response.json()["currentPlayers"], ["bob", "carol", "dave"])
        self.assertTrue(self.game.players.get(player=self.users[1]).is_current)
        self.assertTrue(self.game.players.get(player=self.users[2]).is_current)
        self.assertTrue(self.game.players.get(player=self.users[3]).is_current)

    def test_admin_repair_is_bot_kick_starter_only(self):
        self.client.force_login(self.users[0])

        response = self.client.post(
            reverse("HLC:processHLCturn"),
            json.dumps(
                {
                    "action": "adminRepair",
                    "gameID": self.game.id,
                    "latestUpdate": self.game.latestUpdate,
                    "data": self.game.gameData,
                    "turn": self.game.turn,
                    "phase": self.game.phase,
                    "nextPlayer": [],
                    "nextPlayerSeats": [],
                    "botSeats": [1],
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(self.game.players.get(player=self.users[1]).is_missing)

    def test_show_page_reports_no_current_player_when_queue_is_stale(self):
        # The bad row left by a lost next-phase save: server queue empty,
        # currentPlayersInTurnOrder still naming the old queue.
        self.game.players.update(is_current=False)
        self.game.save()
        self.client.force_login(self.users[0])

        response = self.client.get(reverse("HLC:showHLCgame", args=[self.game.id]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "global.currentPlayers = [];")
