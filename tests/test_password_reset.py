from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse


class PasswordResetTests(TestCase):
    def test_unknown_email_gets_the_same_message(self):
        response = self.client.post(reverse("password_reset"), {"email": "nobody@example.com"})

        self.assertEqual(response.status_code, 302)
        messages = [str(message) for message in get_messages(response.wsgi_request)]
        self.assertTrue(any("If that email address is registered" in message for message in messages))
