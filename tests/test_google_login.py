from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from Lobby.models import User
from Lobby.views import _default_oauth_redirect_uri


class OAuthRedirectDefaultTests(TestCase):
    @override_settings(DEBUG=True)
    def test_debug_defaults_to_localhost(self):
        self.assertEqual(
            _default_oauth_redirect_uri("/google/callback/"),
            "http://localhost:8000/google/callback/",
        )

    @override_settings(DEBUG=False)
    def test_production_defaults_to_live_site(self):
        self.assertEqual(
            _default_oauth_redirect_uri("/google/callback/"),
            "https://www.onlineboardgamers.com/google/callback/",
        )


class GoogleLoginTests(TestCase):
    def setUp(self):
        self.callback_url = reverse("google_callback")

    def login_with_google(self, identity):
        session = self.client.session
        session["google_login_state"] = "state"
        session.save()
        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = identity
            return self.client.get(self.callback_url, {"code": "code", "state": "state"})

    def test_login_and_register_pages_link_to_google(self):
        self.assertContains(self.client.get(reverse("myLogin")), reverse("google_login"))
        self.assertContains(self.client.get(reverse("register")), reverse("google_login"))

    def test_google_login_uses_configured_redirect_uri(self):
        with (
            patch("Lobby.views.config", side_effect=lambda key, default=None: "client-id" if key == "GOOGLE_CLIENT_ID" else default),
            patch("Lobby.views.GOOGLE_REDIRECT_URI", "http://localhost:8000/google/callback/"),
        ):
            response = self.client.get(reverse("google_login"))

        self.assertIn(
            "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fgoogle%2Fcallback%2F",
            response["Location"],
        )

    def test_new_user_is_created_active_with_profile_and_verified_email(self):
        response = self.login_with_google(
            {
                "sub": "123",
                "email": "new@example.com",
                "email_verified": True,
            }
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], reverse("index"))
        user = User.objects.get(email="new@example.com")
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.profile.email_confirmed)
        self.assertEqual(user.profile.google_login_id, "123")
        self.assertIsNone(user.profile.discord_login_id)
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_linked_user_can_log_in(self):
        user = User.objects.create_user("linked", "linked@example.com", "pw")
        user.profile.google_login_id = "456"
        user.profile.save()

        response = self.login_with_google({"sub": "456"})

        self.assertEqual(response["Location"], reverse("index"))
        self.assertEqual(int(self.client.session["_auth_user_id"]), user.pk)

    def test_unverified_google_email_cannot_sign_up(self):
        before = User.objects.count()

        response = self.login_with_google(
            {
                "sub": "789",
                "email": "unverified@example.com",
                "email_verified": False,
            }
        )

        self.assertEqual(response["Location"], reverse("myLogin"))
        self.assertEqual(User.objects.count(), before)

    def test_existing_email_is_not_auto_linked(self):
        User.objects.create_user("existing", "taken@example.com", "pw")
        before = User.objects.count()

        response = self.login_with_google(
            {
                "sub": "999",
                "email": "taken@example.com",
                "email_verified": True,
            }
        )

        self.assertEqual(response["Location"], reverse("myLogin"))
        self.assertEqual(User.objects.count(), before)

    def test_username_collision_gets_a_suffix(self):
        User.objects.create_user("taken", "other@example.com", "pw")

        self.login_with_google(
            {
                "sub": "321",
                "email": "taken@example.com",
                "email_verified": True,
            }
        )

        self.assertEqual(User.objects.get(email="taken@example.com").username, "taken_2")

    def test_unsafe_next_is_ignored(self):
        session = self.client.session
        session["google_login_state"] = "state"
        session["google_login_next"] = "https://evil.example.com/"
        session.save()
        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = {
                "sub": "654",
                "email": "redirected@example.com",
                "email_verified": True,
            }
            response = self.client.get(self.callback_url, {"code": "code", "state": "state"})

        self.assertEqual(response["Location"], reverse("index"))

    def test_profile_page_links_google(self):
        user = User.objects.create_user("profiled", "profile@example.com", "pw")
        self.client.force_login(user)

        response = self.client.get(reverse("profile"))

        self.assertContains(response, reverse("google_link"))

    def test_link_flow_stores_google_id(self):
        user = User.objects.create_user("linker", "linker@example.com", "pw")
        self.client.force_login(user)
        session = self.client.session
        session["google_link_state"] = "link-state"
        session.save()

        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = {"sub": "777", "email_verified": True}
            response = self.client.get(self.callback_url, {"code": "code", "state": "link-state"})

        self.assertEqual(response["Location"], reverse("profile"))
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.google_login_id, "777")

    def test_link_flow_refuses_google_account_linked_elsewhere(self):
        other = User.objects.create_user("other", "other@example.com", "pw")
        other.profile.google_login_id = "888"
        other.profile.save()
        user = User.objects.create_user("linker", "linker@example.com", "pw")
        self.client.force_login(user)
        session = self.client.session
        session["google_link_state"] = "link-state"
        session.save()

        with patch("Lobby.views.requests.post") as post, patch("Lobby.views.requests.get") as get:
            post.return_value.json.return_value = {"access_token": "token"}
            get.return_value.json.return_value = {"sub": "888", "email_verified": True}
            response = self.client.get(self.callback_url, {"code": "code", "state": "link-state"})

        self.assertEqual(response["Location"], reverse("profile"))
        user.profile.refresh_from_db()
        self.assertIsNone(user.profile.google_login_id)
