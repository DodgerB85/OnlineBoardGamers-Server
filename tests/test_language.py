from django.conf import settings
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Profile, User


class LanguageChoiceTests(TestCase):
    """The language cookie is the user's live choice; Profile.profileLanguage mirrors it
    so notification emails (sharedNotifications) match the site."""

    def setUp(self):
        self.user = User.objects.create_user(username="linguist", password="pw")
        self.profile = Profile.objects.get(user=self.user)
        self.profile.profileLanguage = "it"
        self.profile.save()
        self.login_url = reverse("myLogin")

    def _login(self, cookie_language=None):
        self.client.cookies[settings.LANGUAGE_COOKIE_NAME] = cookie_language
        return self.client.post(self.login_url, {"username": "linguist", "password": "pw"})

    def _profile_language(self):
        self.profile.refresh_from_db()
        return self.profile.profileLanguage

    def test_login_with_language_cookie_overwrites_stale_profile_language(self):
        self._login(cookie_language="en-gb")

        self.assertEqual(self._profile_language(), "en-gb")
        self.assertEqual(self.client.cookies[settings.LANGUAGE_COOKIE_NAME].value, "en-gb")

    def test_login_without_language_cookie_keeps_profile_language(self):
        self._login()

        self.assertEqual(self._profile_language(), "it")
        self.assertEqual(self.client.cookies[settings.LANGUAGE_COOKIE_NAME].value, "it")

    def test_login_ignores_unsupported_language_cookie(self):
        self._login(cookie_language="not-a-language")

        self.assertEqual(self._profile_language(), "it")
        self.assertEqual(self.client.cookies[settings.LANGUAGE_COOKIE_NAME].value, "it")

    def test_choosing_a_language_while_logged_in_updates_cookie_and_profile(self):
        self.client.force_login(self.user)

        self.client.post(reverse("set_language_custom"), {"language": "de", "next": "/"})

        self.assertEqual(self._profile_language(), "de")
        self.assertEqual(self.client.cookies[settings.LANGUAGE_COOKIE_NAME].value, "de")

    def test_language_cookie_outlives_the_browser_session(self):
        self.client.force_login(self.user)

        response = self.client.post(reverse("set_language_custom"), {"language": "de", "next": "/"})

        self.assertGreater(int(response.cookies[settings.LANGUAGE_COOKIE_NAME]["max-age"]), 60 * 60 * 24 * 365)
