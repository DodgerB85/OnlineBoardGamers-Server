"""FCM's legacy "Alert Admins" bundle posts {content} with no CSRF header.

The webhook lives in .env, so the view is the relay: it checks the caller,
validates the message, and forwards to WEBHOOK_FCM_TOURNAMENT_ADMIN.
"""
import json
from unittest.mock import patch

from django.test import Client, TestCase


class FcmNudgeTourneyAdminsTest(TestCase):
    def setUp(self):
        from Lobby.models import User

        self.user = User.objects.create_user("fcmnudger", "fcmnudge@example.com", "pw")
        self.client.force_login(self.user)
        self.message = "============\nGAME TIMEOUT\nAlerting Player: fcmnudger"

    def _post(self, payload, extra_headers=None):
        with patch("FCM.views.SN_sendAdminErrorMessage") as mock_send:
            response = self.client.post(
                "/FCM/nudgeTourneyAdmins/",
                data=json.dumps(payload),
                content_type="application/json",
                **(extra_headers or {}),
            )
        return response, mock_send

    def test_content_forwarded_to_fcm_tournament_admin_webhook(self):
        response, mock_send = self._post({"content": self.message})

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[0][0], self.message)
        self.assertEqual(mock_send.call_args.kwargs["webhook_key"], "WEBHOOK_FCM_TOURNAMENT_ADMIN")

    def test_legacy_bundle_sends_no_csrf_token(self):
        strict = Client(enforce_csrf_checks=True)
        strict.force_login(self.user)
        with patch("FCM.views.SN_sendAdminErrorMessage") as mock_send:
            response = strict.post(
                "/FCM/nudgeTourneyAdmins/",
                data=json.dumps({"content": self.message}),
                content_type="application/json",
                headers={"Origin": "http://testserver"},
            )

        self.assertEqual(response.status_code, 200)
        mock_send.assert_called_once()

    def test_cross_site_origin_rejected(self):
        response, mock_send = self._post(
            {"content": self.message},
            extra_headers={"HTTP_ORIGIN": "https://evil.example"},
        )

        self.assertEqual(response.status_code, 403)
        mock_send.assert_not_called()

    def test_login_required(self):
        self.client.logout()
        response, mock_send = self._post({"content": self.message})

        self.assertEqual(response.status_code, 302)
        mock_send.assert_not_called()

    def test_blank_content_rejected(self):
        response, mock_send = self._post({"content": "   "})

        self.assertEqual(response.status_code, 400)
        mock_send.assert_not_called()

    def test_non_json_rejected(self):
        with patch("FCM.views.SN_sendAdminErrorMessage") as mock_send:
            response = self.client.post(
                "/FCM/nudgeTourneyAdmins/",
                data="not json",
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 400)
        mock_send.assert_not_called()
