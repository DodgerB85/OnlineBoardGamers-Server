from django.contrib.auth.models import AnonymousUser
from django.template.loader import render_to_string
from django.test import TestCase, override_settings
from django.urls import reverse

from Lobby.models import User


@override_settings(STORAGES={
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class AppearanceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="theme-player", password="pw")
        self.client.force_login(self.user)

    def test_profile_can_enable_and_disable_dark_mode(self):
        self.assertFalse(self.user.profile.darkMode)
        for is_dark in (True, False):
            with self.subTest(is_dark=is_dark):
                data = {"action": "updateProfileAppearance"}
                if is_dark:
                    data["darkMode"] = "on"
                response = self.client.post(reverse("profile"), data)
                self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
                self.user.profile.refresh_from_db()
                self.assertEqual(self.user.profile.darkMode, is_dark)
                self.assertTrue(self.user.profile.hotStreakEnabled)

    def test_lobby_shell_only_themes_authenticated_dark_mode_users(self):
        for user, is_dark in ((AnonymousUser(), False), (self.user, False), (self.user, True)):
            with self.subTest(user=user, is_dark=is_dark):
                self.user.profile.darkMode = is_dark
                html = render_to_string("Lobby/layout.html", {"user": user})
                self.assertEqual('data-theme="dark"' in html, is_dark)
                self.assertEqual("Lobby/CSS/dark.css" in html, is_dark)

    def test_profile_has_one_preview_stylesheet_in_both_modes(self):
        for is_dark in (False, True):
            with self.subTest(is_dark=is_dark):
                self.user.profile.darkMode = is_dark
                self.user.profile.save(update_fields=["darkMode"])
                response = self.client.get(reverse("profile"))
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'id="darkModeStyles"', count=1)
                self.assertContains(response, 'role="switch"')
                html = response.content.decode()
                link = next(line for line in html.splitlines() if 'id="darkModeStyles"' in line)
                self.assertEqual("disabled" in link, not is_dark)

    def test_game_view_templates_do_not_load_lobby_theme(self):
        self.user.profile.darkMode = True
        for game in ("FCM", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB", "URR", "DDL", "ROW", "LBR"):
            with self.subTest(game=game):
                html = render_to_string(f"{game}/show{game}game.html", {"user": self.user})
                self.assertNotIn('data-theme="dark"', html)
                self.assertNotIn("Lobby/CSS/dark.css", html)
