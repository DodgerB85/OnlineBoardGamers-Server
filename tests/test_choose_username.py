from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class ChooseUsernameTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("emailuser", "user@example.com")
        self.user.profile.username_change_allowed = True
        self.user.profile.save()
        self.client.force_login(self.user)

    def test_page_shows_current_username(self):
        response = self.client.get(reverse("choose_username"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'value="emailuser"')

    def test_post_changes_username_once(self):
        response = self.client.post(reverse("choose_username"), {"username": "newplayer"})

        self.assertEqual(response["Location"], reverse("index"))
        self.user.refresh_from_db()
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.username, "newplayer")
        self.assertFalse(self.user.profile.username_change_allowed)

    def test_duplicate_username_is_rejected(self):
        User.objects.create_user("taken", "taken@example.com")

        response = self.client.post(reverse("choose_username"), {"username": "TAKEN"})

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "emailuser")
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.username_change_allowed)

    def test_keep_current_username_clears_flag(self):
        response = self.client.post(reverse("choose_username"), {"username": "emailuser"})

        self.assertEqual(response["Location"], reverse("index"))
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.username_change_allowed)

    def test_page_unavailable_after_use(self):
        self.user.profile.username_change_allowed = False
        self.user.profile.save()

        response = self.client.get(reverse("choose_username"))

        self.assertEqual(response["Location"], reverse("index"))

    def test_next_is_used_after_setting_username(self):
        session = self.client.session
        session["choose_username_next"] = reverse("profile")
        session.save()

        response = self.client.post(reverse("choose_username"), {"username": "newplayer"})

        self.assertEqual(response["Location"], reverse("profile"))

    def test_change_blocked_after_joining_a_game(self):
        game = Game.objects.create(creator=self.user, host=self.user, gameCode="FCM")
        GamePlayer.objects.create(game=game, player=self.user)

        response = self.client.post(reverse("choose_username"), {"username": "newplayer"})

        self.assertEqual(response["Location"], reverse("index"))
        self.user.refresh_from_db()
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.username, "emailuser")
        self.assertFalse(self.user.profile.username_change_allowed)
