from django.test import TestCase
from django.urls import reverse


class LegalPageTests(TestCase):
    def test_homepage_is_public_and_describes_the_app(self):
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Online Board Gamers is a free, browser-based platform")
        self.assertContains(response, reverse("privacy"))
        self.assertNotContains(response, 'name="password"')

    def test_privacy_policy_is_public(self):
        response = self.client.get(reverse("privacy"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Privacy Policy")
        self.assertContains(response, "Google API Services User Data Policy")
        self.assertNotContains(response, 'name="password"')

    def test_terms_of_service_is_public(self):
        response = self.client.get(reverse("terms"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Terms of Service")
