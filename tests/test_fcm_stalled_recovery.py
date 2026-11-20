"""A stalled simul phase recovered from the client must restore is_current.

When every player has a move the server clears is_current; if the browser that
received that response never finishes the phase, the game is left with no
current player. On the next page load the client re-sends an empty move with
continueFromStalledGame. If some moves are still missing, the recovered turn
order must land back on GamePlayer.is_current - otherwise the lobby, kickout
timer and turn notifications all stay empty.
"""
import base64
import gzip
import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User

PHASE_PAYDAY = 7
PAYDAY_PHASES = [5, 6, 7, 8, 9, 11, 12, 15]


def compress(data):
    return base64.b64encode(gzip.compress(json.dumps(data).encode("utf-8"))).decode("utf-8")


class FcmStalledRecoveryTest(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pw")
        self.bob = User.objects.create_user("bob", "b@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
            turn=6,
            phase=PHASE_PAYDAY,
            maxPlayers=2,
            kickoutDuration=200,
            kickoutFlexiData="",
        )
        self.alice_gp = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0)
        self.bob_gp = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)
        # alice already has a valid payday move; bob's is missing, so the phase is stalled.
        self.game.presenter().insertPlayerMoveData("alice", PAYDAY_PHASES, [[[-8], []], [0]])

    def test_recovery_restores_missing_players_as_current_and_notifies_them(self):
        payload = {
            "action": "saveSimulMove",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "turn": 6,
            "phase": PHASE_PAYDAY,
            "BKSN": self.alice.username,
            "moveData": compress([0]),
            "notRequiedPlayerNames": [],
            "continueFromStalledGame": True,
        }

        self.client.force_login(self.alice)
        with patch("Lobby.presenters.GamePresenter.sendYourTurnNotification") as mock_notify:
            response = self.client.post(
                reverse("FCM:processTurn"),
                data=json.dumps(payload),
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200, response.content)
        body = json.loads(response.content)
        self.assertNotIn("syncError", body, body)
        self.assertFalse(body["allPlayersMoved"])
        self.assertEqual(body["playersToMove"], ["bob"])

        self.alice_gp.refresh_from_db()
        self.bob_gp.refresh_from_db()
        self.assertFalse(self.alice_gp.is_current)
        self.assertTrue(self.bob_gp.is_current)

        mock_notify.assert_called_once()
        self.assertEqual(mock_notify.call_args[0][1], ["bob"])
