from django.test import TestCase
from django.urls import reverse


class RegistrationPageTests(TestCase):
    def test_labels_and_email_username_warning_are_present(self):
        response = self.client.get(reverse("register"))

        self.assertContains(response, 'for="id_username"')
        self.assertContains(response, 'for="some_id"')
        self.assertContains(response, 'for="id_password1"')
        self.assertContains(response, 'for="id_password2"')
        self.assertContains(response, 'id="usernameEmailWarning"')
        self.assertContains(response, "Usernames are visible to other players")
