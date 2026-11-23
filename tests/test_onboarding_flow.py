import json
import time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from Lobby.models import Game, GamePlayer
from Lobby.tokens import account_activation_token

User = get_user_model()


def now_ms():
    return str(int(time.time() * 1000))


def make_player(game, user, seat=0):
    return GamePlayer.objects.create(game=game, player=user, seat_order=seat)


class RegistrationFlowTests(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("Lobby.views.send_mail")
    def test_register_keeps_next_and_sends_activation_link(self, send_mail):
        response = self.client.post(
            reverse("register"),
            {
                "username": "newbie",
                "email": "newbie@example.com",
                "password1": "VeryStrongPass123",
                "password2": "VeryStrongPass123",
                "next": "/join/FCM1/",
            },
        )

        self.assertRedirects(response, reverse("check_email"), fetch_redirect_response=False)
        user = User.objects.get(username="newbie")
        self.assertFalse(user.is_active)
        self.assertEqual(self.client.session["activation_email"], "newbie@example.com")
        self.assertEqual(self.client.session["activation_next"], "/join/FCM1/")
        message = send_mail.call_args.args[1]
        self.assertIn("next=/join/FCM1/", message)

    def test_registration_form_uses_email_input_and_autocomplete(self):
        response = self.client.get(reverse("register"))

        self.assertContains(response, 'type="email"')
        self.assertContains(response, 'autocomplete="email"')
        self.assertContains(response, 'autocomplete="new-password"')
        self.assertContains(response, "Lobby/email.png")

    @patch("Lobby.views.SN_sendAdminErrorMessage")
    @patch("Lobby.views.send_mail", side_effect=Exception("smtp down"))
    def test_email_failure_shows_check_email_instead_of_bare_error(self, _send_mail, _admin):
        response = self.client.post(
            reverse("register"),
            {
                "username": "mailfail",
                "email": "mailfail@example.com",
                "password1": "VeryStrongPass123",
                "password2": "VeryStrongPass123",
            },
        )

        self.assertRedirects(response, reverse("check_email"), fetch_redirect_response=False)
        self.assertTrue(User.objects.filter(username="mailfail").exists())
        page = self.client.get(reverse("check_email"))
        self.assertContains(page, "Resend activation email")
        self.assertContains(page, "We could not send")

    @patch("Lobby.views.send_mail")
    def test_check_email_resends_to_inactive_account(self, send_mail):
        user = User.objects.create_user("waiting", "waiting@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = self.client.post(reverse("check_email"), {"email": "waiting@example.com"})

        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()
        self.assertEqual(send_mail.call_args.args[3], ["waiting@example.com"])

    @patch("Lobby.views.send_mail")
    def test_resend_cooldown_blocks_an_immediate_second_email(self, send_mail):
        user = User.objects.create_user("cooldown", "cooldown@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])

        self.client.post(reverse("check_email"), {"email": "cooldown@example.com"})
        response = self.client.post(reverse("check_email"), {"email": "cooldown@example.com"})

        self.assertEqual(send_mail.call_count, 1)
        self.assertContains(response, "Please wait a minute")

    @patch("Lobby.views.send_mail")
    def test_resend_hourly_email_limit_blocks_the_fourth_email(self, send_mail):
        user = User.objects.create_user("hourly", "hourly@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])
        cooldown_key = "resend_activation_cooldown:hourly@example.com"

        for _ in range(3):
            cache.delete(cooldown_key)
            self.client.post(reverse("check_email"), {"email": "hourly@example.com"})

        cache.delete(cooldown_key)
        response = self.client.post(reverse("check_email"), {"email": "hourly@example.com"})

        self.assertEqual(send_mail.call_count, 3)
        self.assertContains(response, "If that email address has an inactive account")

    @patch("Lobby.views.send_mail")
    def test_global_activation_email_cap_blocks_new_sends(self, send_mail):
        user = User.objects.create_user("globalcap", "globalcap@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])
        cache.set("activation_email_global", 50, 3600)

        response = self.client.post(reverse("check_email"), {"email": "globalcap@example.com"})

        send_mail.assert_not_called()
        self.assertContains(response, "We could not send")

    @patch("Lobby.views.send_mail")
    def test_active_account_never_gets_an_activation_email(self, send_mail):
        User.objects.create_user("active", "active@example.com", "pw")

        response = self.client.post(reverse("check_email"), {"email": "active@example.com"})

        send_mail.assert_not_called()
        self.assertContains(response, "If that email address has an inactive account")


class ActivationTests(TestCase):
    def test_activation_redirects_to_validated_next_and_logs_in(self):
        user = User.objects.create_user("activator", "activate@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])
        url = reverse(
            "activate",
            kwargs={
                "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": account_activation_token.make_token(user),
            },
        )

        response = self.client.get(url + "?next=/join/FCM1/")

        self.assertRedirects(response, "/join/FCM1/", fetch_redirect_response=False)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.profile.email_confirmed)
        self.assertIn("_auth_user_id", self.client.session)

    def test_already_active_activation_shows_login_option(self):
        user = User.objects.create_user("already", "already@example.com", "pw")
        url = reverse(
            "activate",
            kwargs={
                "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": "not-a-real-token",
            },
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Account already active")
        self.assertContains(response, reverse("myLogin"))

    def test_expired_activation_offers_new_link(self):
        user = User.objects.create_user("expired", "expired@example.com", "pw")
        user.is_active = False
        user.save(update_fields=["is_active"])
        url = reverse(
            "activate",
            kwargs={
                "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
                "token": "not-a-real-token",
            },
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Activation link expired")
        self.assertContains(response, "Request a new link")


class LoginNextTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("loginuser", "login@example.com", "GoodPass123")

    def test_failed_login_keeps_next(self):
        response = self.client.post(
            reverse("myLogin"),
            {"username": "loginuser", "password": "wrong", "next": "/join/FCM1/"},
        )

        self.assertContains(response, 'name="next" value="/join/FCM1/"')

    def test_successful_login_returns_to_next(self):
        response = self.client.post(
            reverse("myLogin"),
            {"username": "loginuser", "password": "GoodPass123", "next": "/join/FCM1/"},
        )

        self.assertRedirects(response, "/join/FCM1/", fetch_redirect_response=False)


class JoinLinkPreviewTests(TestCase):
    def setUp(self):
        self.creator = User.objects.create_user("host", "host@example.com", "pw")
        self.viewer = User.objects.create_user("viewer", "viewer@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="FCM",
            gameName="Preview Game",
            creator=self.creator,
            host=self.creator,
            gameStatus="AVAILABLE",
            maxPlayers=2,
            created=now_ms(),
            latestUpdate=now_ms(),
        )
        make_player(self.game, self.creator)
        self.url = reverse("joinGameLink", kwargs={"joinGameLink": f"FCM{self.game.id}"})

    def test_guest_sees_public_preview_with_game_metadata(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Preview Game")
        self.assertContains(response, "invited you to play")
        self.assertContains(response, "Create a free account")
        self.assertContains(response, "og:image")
        self.assertContains(response, "fcm-box.jpg")
        self.assertNotContains(response, "availableLink")

    def test_signed_in_user_sees_join_button(self):
        self.client.force_login(self.viewer)
        response = self.client.get(self.url)

        self.assertContains(response, "availableLink")
        self.assertContains(response, "Join")

    def test_full_game_hides_join_button(self):
        self.game.maxPlayers = 1
        self.game.save(update_fields=["maxPlayers"])
        self.client.force_login(self.viewer)

        response = self.client.get(self.url)

        self.assertContains(response, "This game is full.")
        self.assertNotContains(response, 'class="buttonDiv Join availableLink"')


class LobbyOnboardingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("newplayer", "new@example.com", "pw")
        self.creator = User.objects.create_user("host2", "host2@example.com", "pw")

    def test_start_here_card_for_user_with_no_games(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("index"))

        self.assertContains(response, "Start here")
        self.assertContains(response, "Practice solo")
        self.assertContains(response, "Join an open game")
        self.assertContains(response, 'id="startHereJoinAvailable"')

    def test_experienced_game_shows_requirement_before_join(self):
        game = Game.objects.create(
            gameCode="FCM",
            gameName="Experts Only",
            creator=self.creator,
            host=self.creator,
            gameStatus="AVAILABLE",
            maxPlayers=2,
            startingOptions=json.dumps([120]),
            created=now_ms(),
            latestUpdate=now_ms(),
        )
        make_player(game, self.creator)
        self.client.force_login(self.user)

        response = self.client.get(reverse("index"))

        self.assertContains(response, "Requires 2 finished games")
        self.assertNotContains(response, 'class="buttonDiv Join availableLink"')


class CreatePageQuickActionsTests(TestCase):
    def setUp(self):
        User.objects.create_user("SHADOW", "shadow@example.com", "pw")
        self.user = User.objects.create_user("creator2", "creator2@example.com", "pw")
        self.client.force_login(self.user)

    def test_fcm_create_page_has_quick_actions_and_expert_disclosure(self):
        response = self.client.get(reverse("createFCMpage"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "createActionsLabels")
        self.assertContains(response, "Create game now")
        self.assertContains(response, "Create practice game now")
        self.assertContains(response, "Review options first")
        self.assertContains(response, "Defaults are already selected")
        self.assertContains(response, '<details class="card expert-options">')
        self.assertContains(response, 'target="_blank" rel="noopener"')

    def test_tgz_create_page_has_quick_actions_and_expert_disclosure(self):
        response = self.client.get(reverse("createTGZpage"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "createActionsLabels")
        self.assertContains(response, '<details class="card expert-options expertTGZoptions"')

