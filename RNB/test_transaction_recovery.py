"""
Test: RnB transaction recovery (disconnect mid-stack-move).

Simulates the sequence:
1. saveStackMove completes on server -> transactionID set on game
2. Client disconnects before calling saveAndUpdateNotifictionsAfterStack
3. Same player (or another) reloads -> RNBdata returns transactionID + allStackData
4. Client recovery code re-runs processStacks + saveAndUpdateNotifictionsAfterStack

Run with:
    .venv/bin/python manage.py test RNB.test_transaction_recovery --keepdb
"""
import json
import os
import sys
import time
from unittest.mock import call, patch

# Ensure Django can find the project root when running standalone
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

User = get_user_model()


def _minimal_game_data_b64():
    """Return a trivially valid (empty-ish) gameDataB64 string.
    In production this is gzip+base64 of the full model state.
    For these server-side tests we just need a non-empty string the
    server will store without parsing."""
    import base64, gzip
    payload = json.dumps({"_test": True}).encode()
    return base64.b64encode(gzip.compress(payload)).decode()


class TransactionRecoveryTest(TestCase):
    """
    Unit-level tests against the Django endpoints.

    We cannot execute processStacks (Vue client logic), so we test
    only the server half of the recovery contract:

    A) saveStackMove sets transactionID on the game.
    B) RNBdata (type=1) returns transactionID + allStackData when lock is set.
    C) saveAndUpdateNotifictionsAfterStack with matching transactionID clears the lock.
    D) saveAndUpdateNotifictionsAfterStack with wrong/missing transactionID leaves
       the lock in place (idempotency / replay-safety).
    """

    def setUp(self):
        from django.conf import settings

        settings.ALLOWED_HOSTS.append("testserver")

        from Lobby.models import Game, GamePlayer

        self.Game = Game
        self.GamePlayer = GamePlayer

        # Two users: player A is current mover, player B is waiting
        self.userA = User.objects.create_user("playerA", password="pw")
        self.userB = User.objects.create_user("playerB", password="pw")

        self.clientA = Client()
        self.clientA.login(username="playerA", password="pw")

        self.clientB = Client()
        self.clientB.login(username="playerB", password="pw")

        # Minimal RnB game with player A as current player
        self.game = Game.objects.create(
            gameCode="RNB",
            gameStatus="ACTIVE",
            turn=1,
            phase=2,
            latestUpdate=str(int(time.time() * 1000)),
            gameData=_minimal_game_data_b64(),
            currentPlayersInTurnOrder="playerA",
            serverCurrentPlayerNamesInTurnOrder=["playerA", "playerB"],
            transactionID="",
            creator=self.userA,
            host=self.userA,
        )
        # GamePlayer rows
        self.gpA = GamePlayer.objects.create(
            game=self.game,
            player=self.userA,
            is_current=True,
            moveDataJSON=[],
            seat_order=0,
        )
        self.gpB = GamePlayer.objects.create(
            game=self.game,
            player=self.userB,
            is_current=False,
            moveDataJSON=[],
            seat_order=1,
        )

    # ------------------------------------------------------------------
    # A: saveStackMove sets transactionID
    # ------------------------------------------------------------------
    def test_A_saveStackMove_sets_transaction_id(self):
        """Server must set a non-empty transactionID after saveStackMove."""
        lu = self.game.latestUpdate
        payload = {
            "action": "saveStackMove",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "actionStack": "",
            "mainPhaseSkipsData": [],
            "BKSN": "playerA",
            "isCurrent": True,
            "conflictPresetData": "",
            "saveRewind": False,
            "knownArrayLengths": [],
            "knownFinalHistoryidx": 0,
            "playerIndex": 0,
            "expectedResPreProduction": [],
            "allIsCurrentPlayers": ["playerB"],
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
        }
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Server returned a transactionID
        self.assertIn("transactionID", data, "Response missing transactionID")
        self.assertTrue(data["transactionID"], "transactionID should be non-empty")

        # DB also has the lock set
        self.game.refresh_from_db()
        self.assertEqual(self.game.transactionID, data["transactionID"])

    # ------------------------------------------------------------------
    # B: RNBdata returns transactionID when lock is set
    # ------------------------------------------------------------------
    def test_B_RNBdata_returns_transactionID_when_locked(self):
        """RNBdata type=1 must expose transactionID + allStackData while locked."""
        self.game.transactionID = "test-lock-abc"
        self.game.save()

        resp = self.clientA.post(
            "/RNB/data/1/",
            data=json.dumps({"gameID": self.game.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertIn("transactionID", data)
        self.assertEqual(data["transactionID"], "test-lock-abc")
        self.assertIn("allStackData", data)

    # ------------------------------------------------------------------
    # C: saveAndUpdateNotifictionsAfterStack clears lock with matching ID
    # ------------------------------------------------------------------
    def test_C_saveAndUpdate_clears_lock_with_matching_id(self):
        """Correct transactionID must clear the lock."""
        lock_id = "correct-lock-id"
        self.game.transactionID = lock_id
        self.game.save()

        lu = self.game.latestUpdate
        payload = {
            "action": "saveAndUpdateNotifictionsAfterStack",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "BKSN": "playerA",
            "allIsCurrentPlayers": ["playerB"],
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
            "currentPlayerNeedsToFixMove": False,
            "transactionID": lock_id,
        }
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertNotIn("syncError", data)

        self.game.refresh_from_db()
        self.assertEqual(self.game.transactionID, "", "Lock should be cleared after matching submit")

    # ------------------------------------------------------------------
    # D: saveAndUpdateNotifictionsAfterStack with WRONG id leaves lock
    # ------------------------------------------------------------------
    def test_D_wrong_transactionID_leaves_lock(self):
        """Wrong transactionID must not clear the lock (prevents stale replay)."""
        lock_id = "correct-lock-id"
        self.game.transactionID = lock_id
        self.game.save()

        lu = self.game.latestUpdate
        payload = {
            "action": "saveAndUpdateNotifictionsAfterStack",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "BKSN": "playerA",
            "allIsCurrentPlayers": ["playerB"],
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
            "currentPlayerNeedsToFixMove": False,
            "transactionID": "wrong-id",
        }
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        self.game.refresh_from_db()
        self.assertEqual(self.game.transactionID, lock_id, "Lock should remain with wrong transactionID")

    # ------------------------------------------------------------------
    # E: Empty transactionID submit also leaves lock (missing field)
    # ------------------------------------------------------------------
    def test_E_missing_transactionID_leaves_lock(self):
        """Missing transactionID in request must not clear the lock."""
        lock_id = "correct-lock-id"
        self.game.transactionID = lock_id
        self.game.save()

        lu = self.game.latestUpdate
        payload = {
            "action": "saveAndUpdateNotifictionsAfterStack",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "BKSN": "playerA",
            "allIsCurrentPlayers": ["playerB"],
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
            "currentPlayerNeedsToFixMove": False,
            # transactionID intentionally omitted
        }
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)

        self.game.refresh_from_db()
        self.assertEqual(self.game.transactionID, lock_id, "Lock must remain when transactionID missing")

    # ------------------------------------------------------------------
    # F (GAP): recovering player is excluded from their own notification
    # ------------------------------------------------------------------
    def test_F_FAILING_recovery_player_gets_no_notification(self):
        """
        BUG: when Player B triggers recovery for Player A's stuck transaction,
        Player B becomes the new current player — but the notification filter
        on line 765 of views.py excludes request.user from playerListToNotify.
        Since request.user IS Player B, B never receives a 'your turn' notification.

        This test asserts that sendYourTurnNotification is called with ['playerB'].
        It FAILS because the current code passes [] instead.
        """
        lock_id = "playerA-stuck-lock"
        self.game.transactionID = lock_id
        self.game.save()

        lu = self.game.latestUpdate

        # Player B triggers recovery: sends saveAndUpdateNotifictionsAfterStack
        # with the transactionID they got from RNBdata.
        # After stack processing, B is now the current player.
        payload = {
            "action": "saveAndUpdateNotifictionsAfterStack",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "BKSN": "playerB",
            "allIsCurrentPlayers": ["playerB"],   # B is the new current player
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
            "currentPlayerNeedsToFixMove": False,
            "transactionID": lock_id,
        }

        with patch("Lobby.presenters.GamePresenter.sendYourTurnNotification") as mock_notify:
            resp = self.clientB.post(   # <-- request.user = playerB
                "/RNB/processRNBturn/",
                data=json.dumps(payload),
                content_type="application/json",
            )
            self.assertEqual(resp.status_code, 200)

            # Lock should be cleared (this part works)
            self.game.refresh_from_db()
            self.assertEqual(self.game.transactionID, "", "Lock must be cleared")

            # Player B is now current — they must receive a notification.
            # FAILS: the filter `if p not in {request.user.username}` excludes
            # playerB (the recovering user), so mock is called with [] and the
            # notification is silently dropped.
            mock_notify.assert_called_once()
            notified = mock_notify.call_args[0][1]  # second positional arg = playerListToNotify
            self.assertIn(
                "playerB",
                notified,
                "Player B (the recovering user) must be notified it is their turn. "
                "BUG: they are excluded because request.user == playerB.",
            )

    # ------------------------------------------------------------------
    # G: Django-Q task is scheduled when saveStackMove sets transactionID
    # ------------------------------------------------------------------
    def test_G_saveStackMove_schedules_stuck_notification_task(self):
        """
        After saveStackMove saves with a transactionID, a Django-Q task must
        be scheduled so that players are notified if the client never completes
        stack processing (the disconnect gap).
        """
        lu = self.game.latestUpdate
        payload = {
            "action": "saveStackMove",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "actionStack": "",
            "mainPhaseSkipsData": [],
            "BKSN": "playerA",
            "isCurrent": True,
            "conflictPresetData": "",
            "saveRewind": False,
            "knownArrayLengths": [],
            "knownFinalHistoryidx": 0,
            "playerIndex": 0,
            "expectedResPreProduction": [],
            "allIsCurrentPlayers": ["playerB"],
            "allRemainingPlayersInTurnOrder": ["playerB"],
            "pendingPlayersArr": [],
        }

        with patch("RNB.views.schedule") as mock_schedule:
            resp = self.clientA.post(
                "/RNB/processRNBturn/",
                data=json.dumps(payload),
                content_type="application/json",
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        transaction_id = data.get("transactionID", "")
        self.assertTrue(transaction_id)

        # schedule() must have been called for the stuck-transaction notifier
        fn_paths = [c.args[0] for c in mock_schedule.call_args_list]
        self.assertIn(
            "Lobby.sharedFunctions.sharedNotifications.SN_notifyStuckRNBTransaction",
            fn_paths,
            "Django-Q schedule() must be called for SN_notifyStuckRNBTransaction",
        )

        # Scheduled call must pass game_id, transaction_id, and submitting username
        stuck_call = next(
            c for c in mock_schedule.call_args_list
            if c.args[0] == "Lobby.sharedFunctions.sharedNotifications.SN_notifyStuckRNBTransaction"
        )
        self.assertEqual(stuck_call.args[1], self.game.id)
        self.assertEqual(stuck_call.args[2], transaction_id)
        self.assertEqual(stuck_call.args[3], "playerA")

    # ------------------------------------------------------------------
    # H: SN_notifyStuckRNBTransaction no-ops when lock already cleared
    # ------------------------------------------------------------------
    def test_H_stuck_notification_noop_when_lock_cleared(self):
        """
        If recovery fires before the Django-Q task runs (normal case),
        transactionID is cleared. The task must silently do nothing.
        """
        from Lobby.sharedFunctions.sharedNotifications import SN_notifyStuckRNBTransaction

        stale_id = "already-cleared"
        self.game.transactionID = ""  # cleared by recovery
        self.game.save()

        with patch(
            "Lobby.sharedFunctions.sharedNotifications._SN_sendStuckTransactionNotification"
        ) as mock_send:
            SN_notifyStuckRNBTransaction(self.game.id, stale_id, "playerA")
            mock_send.assert_not_called()

    # ------------------------------------------------------------------
    # I: SN_notifyStuckRNBTransaction fires for the submitting player
    # ------------------------------------------------------------------
    def test_I_stuck_notification_fires_for_submitting_player(self):
        """
        If recovery never happened (transactionID still matches), the task must
        notify the submitting player — not whoever is next in turn order.
        """
        from Lobby.sharedFunctions.sharedNotifications import SN_notifyStuckRNBTransaction

        lock_id = "still-stuck"
        self.game.transactionID = lock_id
        self.game.serverCurrentPlayerNamesInTurnOrder = ["playerB"]  # B is next, but A submitted
        self.game.save()

        with patch(
            "Lobby.sharedFunctions.sharedNotifications._SN_sendStuckTransactionNotification"
        ) as mock_send:
            SN_notifyStuckRNBTransaction(self.game.id, lock_id, "playerA")
            mock_send.assert_called_once()
            notified_username = mock_send.call_args[0][0]
            self.assertEqual(notified_username, "playerA")  # submitter, not B

    # ------------------------------------------------------------------
    # J: saveConflictMove rejects stale latestUpdate (praying/TO branch)
    # ------------------------------------------------------------------
    def test_J_saveConflictMove_rejects_stale_latest_update(self):
        """
        A stale client save during a conflict praying/TO phase must NOT
        overwrite the game state. Otherwise its stale wonderTurnOrder /
        turnOrder corrupts the new turn order and the next phase (eg
        movement) starts with the wrong player.
        """
        # setUp already puts the game in a TO phase (phase=2)
        lu = self.game.latestUpdate
        conflict_payload = {
            "action": "saveConflictMove",
            "latestUpdate": lu,
            "gameDataB64": _minimal_game_data_b64(),
            "turn": 1,
            "phase": 2,
            "status": "ACTIVE",
            "gameID": self.game.id,
            "BKSN": "playerA",
            "conflictPresetData": "",
            "saveRewind": False,
            "clientNextPlayerNames": ["playerB"],
            "nextSinglePlayerUsername": "playerB",
            "allRemainingPlayersInTurnOrder": ["playerB"],
        }
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(conflict_payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("syncError", resp.json(), "Fresh latestUpdate must be accepted")

        # Now a STALE client (old latestUpdate) submits: must be rejected
        stale_payload = dict(conflict_payload)
        stale_payload["latestUpdate"] = "1"  # old version
        resp = self.clientA.post(
            "/RNB/processRNBturn/",
            data=json.dumps(stale_payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("syncError"), "Stale latestUpdate must be rejected with syncError")

        # The game state must be untouched by the stale save
        self.game.refresh_from_db()
        self.assertEqual(self.game.phase, 2)
        self.assertNotEqual(self.game.latestUpdate, stale_payload["latestUpdate"])


if __name__ == "__main__":
    import unittest

    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(__import__(__name__))
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if result.wasSuccessful():
        print("\n=== All tests passed! ===")
    else:
        print("\n=== Some tests failed ===")
