"""FCM saveNormal must refuse a save that silently drops permanent staff.

Game 37571 lost a whole structure between rounds: an empty restructuring move
was accepted and saved. The server had no reason to trust that the incoming
gameData still contained the player's employees, so it now rejects any save
that shrinks a roster outside payday (when firing is the point of the phase).
"""
import base64
import gzip
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User

PHASE_RESTRUCTURING = 3
PHASE_TURN_ORDER = 4
PHASE_PAYDAY = 7


def compress(data):
    return base64.b64encode(gzip.compress(json.dumps(data).encode("utf-8"))).decode("utf-8")


def player(name, employees, beach, marketers=None):
    return [[name], 0, [], 10, employees, beach, [], marketers or [], [], [], -1]


def game_data(players):
    return compress([players, 0, [[0], PHASE_RESTRUCTURING, [0]], [], [], [], 3, [], [0, []], []])


class FcmEmployeeLossGuardTest(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.old_players = [
            player("alice", [1, 2], [3], [14, 9]),
            player("bob", [4], [], [7, 1]),
        ]
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData=game_data(self.old_players),
            startingMap="",
            startingOptions="[]",
            turn=7,
            phase=PHASE_RESTRUCTURING,
            maxPlayers=2,
        )
        GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1, is_current=True)
        self.url = reverse("FCM:processTurn")

    def _save(self, players, phase, starting_options="[]"):
        self.game.startingOptions = starting_options
        self.game.save(update_fields=["startingOptions"])
        self.client.force_login(self.alice)
        payload = {
            "action": "saveNormal",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "turn": 7,
            "phase": phase,
            "status": "ACTIVE",
            "gameData": game_data(players),
            "saveRewind": False,
            "IPM": False,
            "checksum": False,
            "BKSN": "alice",
            "nextPlayer": ["alice", "bob"],
            "sideData": "",
        }
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        self.game.refresh_from_db()
        return json.loads(response.content)

    def test_empty_structure_is_rejected(self):
        old_data = self.game.gameData
        body = self._save(
            [
                player("alice", [], []),
                player("bob", [4], [], [7, 1]),
            ],
            PHASE_TURN_ORDER,
        )

        self.assertTrue(body.get("syncError"), body)
        self.assertTrue(body.get("employeeLoss"), body)
        self.assertEqual(self.game.gameData, old_data, "the refused save must not replace the roster")

    def test_moving_cards_between_structure_and_beach_is_allowed(self):
        body = self._save(
            [
                player("alice", [1], [2, 3], [14, 9]),
                player("bob", [4], [], [7, 1]),
            ],
            PHASE_TURN_ORDER,
        )

        self.assertNotIn("syncError", body, body)

    def test_in_progress_map_save_cannot_drop_employees(self):
        old_data = self.game.gameData
        self.client.force_login(self.alice)
        payload = {
            "action": "saveInProgressMap",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "data": game_data([
                player("alice", [], []),
                player("bob", [4], [], [7, 1]),
            ]),
            "nextPlayer": ["alice", "bob"],
            "tiles": [],
        }
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        body = json.loads(response.content)

        self.assertTrue(body.get("employeeLoss"), body)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, old_data)

    def test_rewind_must_match_the_snapshot_roster(self):
        old_data = self.game.gameData
        self.client.force_login(self.alice)
        payload = {
            "action": "updateDataFromLoadRewind",
            "gameID": self.game.id,
            "turn": 7,
            "phase": PHASE_RESTRUCTURING,
            "nextPlayer": ["alice", "bob"],
            "data": game_data([
                player("alice", [], []),
                player("bob", [4], [], [7, 1]),
            ]),
        }
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        body = json.loads(response.content)

        self.assertTrue(body.get("employeeLoss"), body)
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, old_data)

    def test_headhunt_transfer_is_allowed(self):
        # A Headhunter moves a card from one player to another; with the Labor
        # Market module on, that is not a loss.
        body = self._save(
            [
                player("alice", [], [3], [14, 9]),
                player("bob", [4, 1, 2], [], [7, 1]),
            ],
            PHASE_TURN_ORDER,
            starting_options="[48]",
        )

        self.assertNotIn("syncError", body, body)

    def test_mid_working_day_save_is_exempt(self):
        self.game.phase = 5
        self.game.save(update_fields=["phase"])
        body = self._save(
            [
                player("alice", [], []),
                player("bob", [4], [], [7, 1]),
            ],
            5,
        )

        self.assertNotIn("syncError", body, body)

    def test_transition_into_working_day_is_still_guarded(self):
        self.game.phase = 4  # turn order -> working day
        self.game.save(update_fields=["phase"])
        body = self._save(
            [
                player("alice", [], []),
                player("bob", [4], [], [7, 1]),
            ],
            5,
        )

        self.assertTrue(body.get("employeeLoss"), body)

    def test_training_replacement_is_not_a_loss(self):
        # Training removes one card and adds another: same count, different card.
        body = self._save(
            [
                player("alice", [5, 6], [3], [14, 9]),
                player("bob", [4], [], [7, 1]),
            ],
            PHASE_TURN_ORDER,
        )

        self.assertNotIn("syncError", body, body)

    def test_cards_cannot_move_to_another_player_without_labor_market(self):
        body = self._save(
            [
                player("alice", [], [3], [14, 9]),
                player("bob", [4, 1, 2], [], [7, 1]),
            ],
            PHASE_TURN_ORDER,
        )

        self.assertTrue(body.get("employeeLoss"), body)

    def test_cfo_fired_at_100_dollars_is_allowed(self):
        self.game.gameData = game_data([
            player("alice", [4, 1], [3], [14, 9]),
            player("bob", [2], [], [7, 1]),
        ])
        self.game.phase = 5  # working day -> dinner/pizza transition
        self.game.save(update_fields=["gameData", "phase"])
        body = self._save(
            [
                player("alice", [1], [3], [14, 9]),
                player("bob", [2], [], [7, 1]),
            ],
            11,
        )

        self.assertNotIn("syncError", body, body)

    def test_dinner_cannot_drop_more_than_the_cfo(self):
        self.game.gameData = game_data([
            player("alice", [4, 1], [3], [14, 9]),
            player("bob", [2], [], [7, 1]),
        ])
        self.game.phase = 5
        self.game.save(update_fields=["gameData", "phase"])
        body = self._save(
            [
                player("alice", [], [3], [14, 9]),
                player("bob", [2], [], [7, 1]),
            ],
            11,
        )

        self.assertTrue(body.get("employeeLoss"), body)

    def test_payday_firing_is_allowed(self):
        self.game.phase = PHASE_PAYDAY
        self.game.save(update_fields=["phase"])
        body = self._save(
            [
                player("alice", [1], [], [14, 9]),
                player("bob", [4], [], [7, 1]),
            ],
            PHASE_PAYDAY,
        )

        self.assertNotIn("syncError", body, body)


class FcmOobPreferenceTest(TestCase):
    """Choosing auto-early/late is not a restructuring move."""

    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData=game_data([
                player("alice", [1], [2], [14, 9]),
                player("bob", [4], [3], [7, 1]),
            ]),
            startingMap="",
            startingOptions="[]",
            turn=7,
            phase=PHASE_RESTRUCTURING,
            maxPlayers=2,
        )
        GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1, is_current=True)
        self.url = reverse("FCM:processTurn")

    def test_preference_does_not_complete_restructuring(self):
        self.client.force_login(self.alice)
        response = self.client.post(
            self.url,
            data=json.dumps({
                "action": "saveOOBpreference",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "OOBpreference": 2,
            }),
            content_type="application/json",
        )
        body = json.loads(response.content)
        self.assertTrue(body["OOBsaved"], body)

        self.game.refresh_from_db()
        row = next(row for row in json.loads(self.game.FCMplayersMoveData) if row[0] == "alice")
        self.assertEqual(row[1], [-1], "the preference must not turn the scaffold into a move")
        self.assertEqual(row[3][2], 2)
        self.assertFalse(self.game.presenter().hasValidActualMoveData("alice"))

        # Bob has moved, but Alice still owes a structure.
        self.client.force_login(self.bob)
        response = self.client.post(
            self.url,
            data=json.dumps({
                "action": "saveSimulMove",
                "gameID": self.game.id,
                "latestUpdate": self.game.latestUpdate,
                "turn": 7,
                "phase": PHASE_RESTRUCTURING,
                "moveData": compress([[], [4], 0]),
                "notRequiedPlayerNames": [],
                "continueFromStalledGame": False,
                "BKSN": "bob",
            }),
            content_type="application/json",
        )
        body = json.loads(response.content)
        self.assertFalse(body["allPlayersMoved"], body)
        self.assertIn("alice", body["playersToMove"], body)


class FcmRestructureSkipTest(TestCase):
    """A stale client cannot mark another player with cards as "no move needed"."""

    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData=game_data([
                player("alice", [1], [2], [14, 9]),
                player("bob", [4], [3], [7, 1]),
            ]),
            startingMap="",
            startingOptions="[]",
            turn=7,
            phase=PHASE_RESTRUCTURING,
            maxPlayers=2,
        )
        GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1, is_current=True)
        self.url = reverse("FCM:processTurn")

    def test_player_with_cards_cannot_be_skipped(self):
        self.client.force_login(self.alice)
        payload = {
            "action": "saveSimulMove",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "turn": 7,
            "phase": PHASE_RESTRUCTURING,
            "moveData": compress([[], [1], 0]),
            "notRequiedPlayerNames": ["bob"],
            "continueFromStalledGame": False,
            "BKSN": "alice",
        }
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        body = json.loads(response.content)

        self.assertFalse(body["allPlayersMoved"], body)
        self.assertIn("bob", body["playersToMove"], body)

