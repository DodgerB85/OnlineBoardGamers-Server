from django.test import TestCase
from django.urls import reverse

from Lobby.models import User


class DiscordOauthStateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("discorduser", "d@example.com", "pw")
        self.client.force_login(self.user)

    def test_callback_rejects_wrong_state(self):
        session = self.client.session
        session["discord_oauth_state"] = "expected"
        session.save()

        response = self.client.get("/discord/callback/", {"code": "abc", "state": "wrong"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("profile"))

    def test_callback_rejects_missing_state(self):
        response = self.client.get("/discord/callback/", {"code": "abc"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("profile"))
