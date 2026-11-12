from django.test import TestCase
from django.urls import reverse

from Lobby.models import User


class ProfileAccountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="oldname", password="pw")
        self.client.force_login(self.user)

    def test_password_fields_have_labels_and_do_not_invite_autofill(self):
        response = self.client.get(reverse("profile"))

        self.assertContains(response, "Old Password</label>")
        self.assertContains(response, "New Password</label>")
        self.assertContains(response, "Confirm New Password</label>")
        self.assertNotContains(response, 'placeholder="Old Password"')
        self.assertContains(response, 'autocomplete="new-password"', count=3)
