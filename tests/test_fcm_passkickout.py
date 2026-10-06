"""passKickoutFor attribution for FCM's "keep the timed-out player" skip.

The client presses "keep player X" and sends the default move under the name of
the player who actually timed out (passKickoutFor). The server must validate
that the named player really is the timed-out current player before storing the
move under their name, and must refuse anything else with a syncError - the
same response a stale client gets, so no special error handling is needed.
"""
import base64
import gzip
import json
import time

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User

PHASE_RESTRUCTURING = 3
PHASE_WORKING_DAY = 5


def compress(data):
    return base64.b64encode(gzip.compress(json.dumps(data).encode("utf-8"))).decode("utf-8")


def timed_out_latest_update():
    """Old enough to trigger kickoutRequired() == 2 with kickoutDuration=200 (2-day kickout + flexi)."""
    return str(int((time.time() - 4 * 60 * 60 * 24) * 1000))


class FcmPassKickoutTest(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.carol = User.objects.create_user("carol", "c@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
            turn=1,
            phase=PHASE_RESTRUCTURING,
            maxPlayers=2,
            kickoutDuration=200,
            latestUpdate=timed_out_latest_update(),
            FCMplayersMoveData="",
            kickoutFlexiData="",
        )
        GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1, is_current=True)
        self.url = reverse("FCM:processTurn")

    def _post(self, user, action, extra):
        self.client.force_login(user)
        payload = {
            "action": action,
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "turn": 1,
            "phase": self.game.phase,
            "BKSN": user.username,
        }
        payload.update(extra)
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        self.game.refresh_from_db()
        return json.loads(response.content)

    def _players_move_data(self):
        if not self.game.FCMplayersMoveData:
            return []
        return json.loads(self.game.FCMplayersMoveData)

    def _flexi_entries(self):
        if not self.game.kickoutFlexiData:
            return []
        return json.loads(self.game.kickoutFlexiData)

    def test_valid_target_gets_the_move(self):
        body = self._post(
            self.bob,
            "saveSimulMove",
            {
                "phase": PHASE_RESTRUCTURING,
                "moveData": compress([[], [5], 0]),
                "notificationSuppression": False,
                "notRequiedPlayerNames": [],
                "continueFromStalledGame": False,
                "passKickoutFor": "alice",
            },
        )

        self.assertNotIn("syncError", body, body)
        # alice's move counts as done; bob is the only player left to move
        self.assertEqual(body["allPlayersMoved"], False)
        self.assertEqual(body["playersToMove"], ["bob"])

        row = next(row for row in self._players_move_data() if row[0] == "alice")
        self.assertEqual(row[1], [PHASE_RESTRUCTURING, 4])
        self.assertEqual(row[3], [[], [5], 0])

        # flexi time is charged to alice (the mover), not bob (the clicker)
        flexi_names = [entry[0] for entry in self._flexi_entries()]
        self.assertIn("alice", flexi_names)
        self.assertNotIn("bob", flexi_names)

    def test_target_must_be_the_current_timeout_player(self):
        # alice stepped out of the turn order, so the timed-out current player is bob
        GamePlayer.objects.filter(game=self.game, player=self.alice).update(is_current=False)
        self.game.refresh_from_db()

        body = self._post(
            self.bob,
            "saveSimulMove",
            {
                "phase": PHASE_RESTRUCTURING,
                "moveData": compress([[], [5], 0]),
                "notificationSuppression": False,
                "notRequiedPlayerNames": [],
                "continueFromStalledGame": False,
                "passKickoutFor": "alice",
            },
        )

        self.assertTrue(body.get("syncError"), body)
        self.assertEqual(self.game.FCMplayersMoveData, "", "a rejected save must not store the move")

    def test_kickout_must_be_required(self):
        # no kickout is due on a fresh latestUpdate, so skipping is refused
        self.game.latestUpdate = str(int(time.time() * 1000))
        self.game.save()

        body = self._post(
            self.bob,
            "saveSimulMove",
            {
                "phase": PHASE_RESTRUCTURING,
                "moveData": compress([[], [5], 0]),
                "notificationSuppression": False,
                "notRequiedPlayerNames": [],
                "continueFromStalledGame": False,
                "passKickoutFor": "alice",
            },
        )

        self.assertTrue(body.get("syncError"), body)

    def test_non_participant_rejected(self):
        body = self._post(
            self.carol,
            "saveSimulMove",
            {
                "phase": PHASE_RESTRUCTURING,
                "moveData": compress([[], [5], 0]),
                "notificationSuppression": False,
                "notRequiedPlayerNames": [],
                "continueFromStalledGame": False,
                "passKickoutFor": "alice",
            },
        )

        self.assertTrue(body.get("syncError"), body)

    def test_save_normal_attributs_move_and_flex_under_target(self):
        self.game.phase = PHASE_WORKING_DAY
        self.game.save()

        body = self._post(
            self.bob,
            "saveNormal",
            {
                "phase": PHASE_WORKING_DAY,
                "status": "ACTIVE",
                "gameData": "STATE-1",
                "saveRewind": False,
                "IPM": False,
                "checksum": False,
                "nextPlayer": ["bob"],
                "sideData": compress([[[-9], []], [-9]]),
                "passKickoutFor": "alice",
            },
        )

        self.assertNotIn("syncError", body, body)

        standard_phases = [5, 6, 7, 8, 9, 11, 12, 15]
        row = next(row for row in self._players_move_data() if row[0] == "alice")
        self.assertEqual(row[1], standard_phases)
        self.assertEqual(row[3], [[[-9], []], [-9]], "the skip's default side data must land under alice")

        flexi_names = [entry[0] for entry in self._flexi_entries()]
        self.assertIn("alice", flexi_names)
        self.assertNotIn("bob", flexi_names)
