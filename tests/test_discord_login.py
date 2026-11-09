from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from Lobby.models import User


class DiscordLoginTests(TestCase):
    def setUp(self):
        self.callback_url = reverse("discord_callback")

    def login_with_discord(self, identity):
        session = self.client.session
        session["discord_login_state"] = "state"
        session.save()
        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = identity
            return self.client.get(self.callback_url, {"code": "code", "state": "state"})

    def test_login_and_register_pages_link_to_discord(self):
        self.assertContains(self.client.get(reverse("myLogin")), reverse("discord_login"))
        self.assertContains(self.client.get(reverse("register")), reverse("discord_login"))

    def test_discord_login_uses_configured_redirect_uri(self):
        with patch("Lobby.views.DISCORD_REDIRECT_URI", "http://localhost:8000/discord/callback/"):
            response = self.client.get(reverse("discord_login"))

        self.assertIn(
            "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fdiscord%2Fcallback%2F",
            response["Location"],
        )

    def test_profile_discord_link_uses_configured_redirect_uri(self):
        user = User.objects.create_user("profiled", "profile@example.com", "pw")
        self.client.force_login(user)

        with patch("Lobby.views.DISCORD_REDIRECT_URI", "http://localhost:8000/discord/callback/"):
            response = self.client.get(reverse("profile"))

        self.assertContains(
            response,
            "redirect_uri=http%3A//localhost%3A8000/discord/callback/",
        )

    def test_new_user_is_created_active_with_profile_and_verified_email(self):
        response = self.login_with_discord(
            {
                "id": "123",
                "username": "discorduser",
                "email": "new@example.com",
                "verified": True,
            }
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("index"))
        user = User.objects.get(email="new@example.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.profile.email_confirmed)
        self.assertEqual(user.profile.discord_login_id, "123")
        self.assertIsNone(user.profile.discord_id)
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_linked_user_can_log_in(self):
        user = User.objects.create_user("linked", "linked@example.com", "pw")
        user.profile.discord_login_id = "456"
        user.profile.save()

        response = self.login_with_discord({"id": "456", "username": "discordname"})

        self.assertEqual(response["Location"], reverse("index"))
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_unverified_discord_email_cannot_sign_up(self):
        before = User.objects.count()

        response = self.login_with_discord(
            {
                "id": "789",
                "username": "unverified",
                "email": "unverified@example.com",
                "verified": False,
            }
        )

        self.assertEqual(response["Location"], reverse("myLogin"))
        self.assertEqual(User.objects.count(), before)

    def test_existing_email_is_not_auto_linked(self):
        User.objects.create_user("existing", "taken@example.com", "pw")
        before = User.objects.count()

        response = self.login_with_discord(
            {
                "id": "999",
                "username": "newdiscord",
                "email": "taken@example.com",
                "verified": True,
            }
        )

        self.assertEqual(response["Location"], reverse("myLogin"))
        self.assertEqual(User.objects.count(), before)

    def test_username_collision_gets_a_suffix(self):
        User.objects.create_user("discorduser", "other@example.com", "pw")

        self.login_with_discord(
            {
                "id": "321",
                "username": "discorduser",
                "email": "new@example.com",
                "verified": True,
            }
        )

        self.assertEqual(User.objects.get(email="new@example.com").username, "discorduser_2")

    def test_unsafe_next_is_ignored(self):
        session = self.client.session
        session["discord_login_state"] = "state"
        session["discord_login_next"] = "https://evil.example.com/"
        session.save()
        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = {
                "id": "654",
                "username": "redirected",
                "email": "redirected@example.com",
                "verified": True,
            }
            response = self.client.get(self.callback_url, {"code": "code", "state": "state"})

        self.assertEqual(response["Location"], reverse("index"))

    def test_existing_link_flow_still_works(self):
        user = User.objects.create_user("linker", "linker@example.com", "pw")
        self.client.force_login(user)
        session = self.client.session
        session["discord_oauth_state"] = "link-state"
        session.save()

        with (
            patch("Lobby.views.requests") as requests_mock,
            patch("Lobby.views.SN_sendDiscordDM") as send_dm,
        ):
            requests_mock.post.return_value.json.return_value = {"access_token": "token"}
            requests_mock.get.return_value.json.return_value = {"id": "777", "username": "discordname"}
            response = self.client.get(self.callback_url, {"code": "code", "state": "link-state"})

        self.assertEqual(response["Location"], reverse("profile"))
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.discord_id, "777")
        self.assertEqual(user.profile.discord_login_id, "777")
        send_dm.assert_called_once()

    def test_stopping_discord_dms_keeps_discord_login(self):
        user = User.objects.create_user("dms", "dms@example.com", "pw")
        user.profile.discord_id = "888"
        user.profile.discord_login_id = "888"
        user.profile.save()
        self.client.force_login(user)

        response = self.client.post(reverse("stop_discord_dms"))

        self.assertEqual(response["Location"], reverse("profile"))
        user.profile.refresh_from_db()
        self.assertIsNone(user.profile.discord_id)
        self.assertEqual(user.profile.discord_login_id, "888")
