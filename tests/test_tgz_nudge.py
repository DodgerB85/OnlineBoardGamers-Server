"""TGZ's "Alert Admins" nudge must go through the server.

The Discord webhook lives in .env, so the client only sends what to alert
about (type + gameID) and the view composes the message and picks the
webhook key.
"""
import json
from unittest.mock import patch

from django.test import TestCase


class TgzNudgeTourneyAdminsTest(TestCase):
    def setUp(self):
        from Lobby.models import Game, GamePlayer, User

        self.user = User.objects.create_user("nudgetester", "nudge@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="TGZ",
            creator=self.user,
            host=self.user,
            gameStatus="ACTIVE",
            gameData="",
            startingMap="",
        )
        GamePlayer.objects.create(game=self.game, player=self.user, seat_order=0, is_current=True)
        self.client.force_login(self.user)

    def _post(self, payload):
        with patch("TGZ.views.SN_sendAdminErrorMessage") as mock_send:
            response = self.client.post(
                "/TGZ/nudgeTourneyAdmins/",
                data=json.dumps(payload),
                content_type="application/json",
            )
        return response, mock_send

    def test_resign_alert_uses_tournament_admin_webhook(self):
        response, mock_send = self._post({"type": 0, "gameID": self.game.id})

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()
        self.assertIn("RESIGN REQUEST RECEIVED", mock_send.call_args[0][0])
        self.assertIn("Player: nudgetester", mock_send.call_args[0][0])
        self.assertEqual(mock_send.call_args.kwargs["webhook_key"], "WEBHOOK_TGZ_TOURNAMENT_ADMIN")

    def test_timeout_alert_names_current_player(self):
        response, mock_send = self._post({"type": 1, "gameID": self.game.id})

        self.assertEqual(response.status_code, 200)
        self.assertIn("Timed Out Player: nudgetester", mock_send.call_args[0][0])

    def test_unknown_type_rejected(self):
        response, mock_send = self._post({"type": 9, "gameID": self.game.id})

        self.assertEqual(response.status_code, 400)
        mock_send.assert_not_called()

    def test_unknown_game_rejected(self):
        response, mock_send = self._post({"type": 0, "gameID": 99999999})

        self.assertEqual(response.status_code, 404)
        mock_send.assert_not_called()
