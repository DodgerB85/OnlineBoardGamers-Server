import json
import time
from unittest.mock import patch

from django.test import TestCase

from Lobby.models import Profile, User
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendNextTurnNotification,
    SN_sendReminderEmail,
    SN_sendReminderExpiredEmail,
    shouldSendEmail,
)


class TestShouldSendEmail(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="player", password="testpass123")
        self.profile = self.user.profile
        self.profile.email_confirmed = True
        self.profile.emailNotifications = json.dumps([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
        self.profile.save()

    def test_rejects_shadow_and_bot_users(self):
        self.assertFalse(shouldSendEmail("yourTurn", "SHADOW", self.profile, 30))
        self.assertFalse(shouldSendEmail("gameInvite", "FcmAI", self.profile, 30))

    def test_rejects_unconfirmed_email(self):
        self.profile.email_confirmed = False
        self.profile.save()

        self.assertFalse(shouldSendEmail("gameInvite", self.user.username, self.profile, 30))

    def test_your_turn_suppressed_for_live_games(self):
        self.assertFalse(shouldSendEmail("yourTurn", self.user.username, self.profile, 10))

    @patch("Lobby.sharedFunctions.sharedNotifications.time.time")
    def test_expired_stop_email_window_is_cleared(self, mock_time):
        mock_time.return_value = 1700000000
        self.profile.stopEmailsUntil = round(1700000000 / 60) - 1
        self.profile.save()

        self.assertTrue(shouldSendEmail("yourTurn", self.user.username, self.profile, 30))
        self.profile.refresh_from_db()
        self.assertIsNone(self.profile.stopEmailsUntil)

    def test_future_stop_email_window_suppresses_turn_email(self):
        self.profile.stopEmailsUntil = round(time.time() / 60) + 30
        self.profile.save()

        self.assertFalse(shouldSendEmail("yourTurn", self.user.username, self.profile, 30))

    def test_each_email_preference_can_disable_matching_type(self):
        cases = [
            ("yourTurn", 0),
            ("gameInvite", 1),
            ("turnExpired", 2),
            ("tournamentGameStart", 3),
            ("tournamentWin", 4),
            ("gameDecline", 5),
            ("gameStart", 6),
            ("gameEnd", 7),
            ("2hourReminder", 8),
            ("24hrReminder", 9),
            ("tournamentOpen", 10),
            ("MTinvite", 10),
        ]

        for email_type, disabled_index in cases:
            notifications = [1] * 11
            notifications[disabled_index] = 0
            self.profile.emailNotifications = json.dumps(notifications)
            self.profile.stopEmailsUntil = None
            self.profile.save()
            self.assertFalse(shouldSendEmail(email_type, self.user.username, self.profile, 30), email_type)

    def test_factory_fix_ignores_preferences_but_requires_confirmed_email(self):
        self.profile.emailNotifications = json.dumps([0] * 11)
        self.profile.save()

        self.assertTrue(shouldSendEmail("yourTurnFactoryFix", self.user.username, self.profile, 10))

        unconfirmed = Profile.objects.get(user=self.user)
        unconfirmed.email_confirmed = False
        unconfirmed.save()
        self.assertFalse(shouldSendEmail("yourTurnFactoryFix", self.user.username, unconfirmed, 10))


class TestReminderContent(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reminder_player", password="testpass123")
        self.profile = self.user.profile
        self.profile.email_confirmed = True
        self.profile.emailNotifications = json.dumps([1] * 11)
        self.profile.webhooks = json.dumps([["DC", "https://discord.com/api/webhooks/1/test", ""]])
        self.profile.save()

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    def test_two_hour_reminder_includes_flexi_time(self, mock_webhooks, mock_email):
        SN_sendReminderEmail("reminder_player", "HLC", 1, "Test Game", flexiTimeString="23:45")

        self.assertIn("Flexi-Time remaining: 23:45", mock_webhooks.call_args[0][1])
        self.assertIn("Flexi-Time remaining: 23:45", mock_email.call_args[0][2])

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    def test_expired_reminder_reports_remaining_flexi(self, mock_webhooks, mock_email):
        SN_sendReminderExpiredEmail(
            "reminder_player",
            "HLC",
            1,
            "Test Game",
            flexiTimeString="23:45",
            flexiRemainingSeconds=23 * 60 * 60 + 45 * 60,
        )

        message = mock_webhooks.call_args[0][1]
        self.assertIn("You are now using Flexi-Time. Remaining: 23:45", message)
        self.assertNotIn("could be kicked out at any time", message)

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    def test_expired_reminder_reports_exhausted_flexi(self, mock_webhooks, mock_email):
        SN_sendReminderExpiredEmail(
            "reminder_player",
            "HLC",
            1,
            "Test Game",
            flexiTimeString="00:00",
            flexiRemainingSeconds=0,
        )

        self.assertIn("Your move time and Flexi-Time are used up", mock_webhooks.call_args[0][1])

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    def test_expired_reminder_keeps_old_wording_without_flexi(self, mock_webhooks, mock_email):
        SN_sendReminderExpiredEmail("reminder_player", "HLC", 1, "Test Game")

        self.assertIn("You could be kicked out at any time", mock_webhooks.call_args[0][1])

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    def test_factory_phase_does_not_say_your_turn(self, mock_webhooks, mock_email):
        SN_sendNextTurnNotification(
            "HLC",
            ["reminder_player"],
            1,
            "Test Game",
            "Build Factory",
            30,
            notification_kind="factory_phase",
        )

        message = mock_webhooks.call_args[0][1]
        self.assertIn("Build Factory is in progress", message)
        self.assertNotIn("Your turn at OnlineBoardGamers", message)
