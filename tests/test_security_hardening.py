import base64
import gzip
import json

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.template import Context, Template
from django.test import SimpleTestCase, TestCase
from django.urls import Resolver404, resolve, reverse

from Lobby.forms import ChangeUsernameForm, NewUserForm
from Lobby.models import Tournament, User
from RNB.common import MAX_RNB_MAP_BYTES, normalize_rnb_map, parse_rnb_map


class UsernameValidationTests(SimpleTestCase):
    def test_registration_rejects_html_username(self):
        form = NewUserForm()
        form.cleaned_data = {"username": "</script><img src=x onerror=alert(1)>"}
        with self.assertRaises(ValidationError):
            form.clean_username()

    def test_username_change_rejects_html_username(self):
        form = ChangeUsernameForm()
        form.cleaned_data = {"username": "Evil<script>"}
        with self.assertRaises(ValidationError):
            form.clean_username()


class ScriptJsonFilterTests(SimpleTestCase):
    def test_json_in_script_cannot_close_script_tag(self):
        rendered = Template("{% load script_json %}{{ value|script_json }}").render(
            Context({"value": ["</script><img src=x onerror=alert(1)>"]})
        )
        self.assertNotIn("</script>", rendered)
        self.assertIn("\\u003C/script\\u003E", rendered)


class RNBMapValidationTests(SimpleTestCase):
    def test_malformed_or_oversized_map_is_rejected(self):
        self.assertIsNone(normalize_rnb_map('{"not": "a list"}'))
        self.assertIsNone(normalize_rnb_map("[" * (MAX_RNB_MAP_BYTES + 1)))

    def test_invalid_stored_map_reads_as_empty(self):
        self.assertEqual(parse_rnb_map("not json"), [])


class PasswordPolicyTests(SimpleTestCase):
    def test_short_numeric_and_common_passwords_are_rejected(self):
        for password in ("short", "12345678", "password"):
            with self.assertRaises(ValidationError):
                validate_password(password)


class LegacyRedirectRemovalTests(SimpleTestCase):
    def test_nd_and_old_prefixes_are_gone(self):
        for path in ("/nd/foo/", "/old/foo/"):
            with self.assertRaises(Resolver404):
                resolve(path)


class TournamentChatValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="chatty", password="pw")
        self.client.force_login(self.user)
        self.tournament = Tournament.objects.create(
            tournamentCategory="Mini",
            gameCode="RNB",
            tournamentName="Test",
            maxTournamentPlayers=4,
            maxGamePlayers=2,
            creator=self.user,
        )

    def _post(self, entry):
        return self.client.post(
            reverse("sendMTchatMessage"),
            data=json.dumps({"MT_ID": self.tournament.id, "newEntry": entry}),
            content_type="application/json",
        )

    def test_normal_client_entry_is_stored(self):
        response = self._post([123, "hello"])

        self.assertEqual(response.status_code, 200)
        self.tournament.refresh_from_db()
        stored = json.loads(gzip.decompress(base64.b64decode(self.tournament.chatData)).decode("utf-8"))
        self.assertEqual(stored[0], [self.user.username, 123, "hello"])

    def test_non_string_message_is_rejected(self):
        response = self._post([123, {"x": 1}])

        self.assertEqual(response.status_code, 400)
