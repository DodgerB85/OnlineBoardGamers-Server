"""The admin-error webhook must not fire during tests.

FCM's map-sync guard, presenter consistency checks and several notification paths
call SN_sendAdminErrorMessage on failure. Tests that deliberately provoke those
failures would otherwise post to the real admin Discord webhook, so the sender
short-circuits when Django is pointed at a test database.
"""
import json
from unittest.mock import patch

from django.db import connection
from django.test import TestCase

from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage


class AdminErrorWebhookTest(TestCase):
    def test_does_not_post_while_testing(self):
        self.assertTrue(str(connection.settings_dict.get("NAME", "")).startswith("test_"), "expected to be on a test database")

        with patch("Lobby.sharedFunctions.sharedNotifications.requests.post") as mock_post:
            SN_sendAdminErrorMessage("this must never reach discord")

        mock_post.assert_not_called()

    def test_does_not_post_from_the_map_sync_guard(self):
        # the real path that spammed: an FCM save whose board differs from the
        # server's, which is rejected and reported
        from django.urls import reverse

        from Lobby.models import Game

        user = self._make_user("webhooktester")
        Game.objects.create(
            gameCode="FCM",
            creator=user,
            host=user,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="[3,3,0,2]",
        )
        game = Game.objects.get(gameCode="FCM")

        self.client.force_login(user)
        with patch("Lobby.sharedFunctions.sharedNotifications.requests.post") as mock_post:
            self.client.post(
                reverse("FCM:processTurn"),
                data=json.dumps(
                    {
                        "action": "saveNormal",
                        "gameID": game.id,
                        "latestUpdate": game.latestUpdate,
                        "turn": 0,
                        "phase": 0,
                        "status": "ACTIVE",
                        "gameData": "STATE-1",
                        "saveRewind": False,
                        "BKSN": user.username,
                        "nextPlayer": [user.username],
                        "checksum": False,
                        "IPM": False,
                        "mapTiles": [9, 9, 9, 9],
                    }
                ),
                content_type="application/json",
            )

        mock_post.assert_not_called()

    def _make_user(self, name):
        from Lobby.models import User

        return User.objects.create_user(name, name + "@example.com", "pw")


import json  # noqa: E402  (kept last so the helpers above read first)
