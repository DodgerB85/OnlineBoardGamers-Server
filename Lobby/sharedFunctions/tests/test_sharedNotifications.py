import json
import time
from unittest.mock import patch

from django.test import TestCase

from Lobby.models import Profile, User
from Lobby.sharedFunctions.sharedNotifications import shouldSendEmail


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
