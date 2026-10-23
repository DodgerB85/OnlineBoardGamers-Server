"""Admin rights come from Profile flags only - not from is_superuser."""
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from Lobby.models import Game, User
from Lobby.sharedFunctions.permissions import can_act_in_game, is_game_admin, is_site_admin


class AdminFlagTests(TestCase):
    def test_superuser_is_neither_site_nor_game_admin(self):
        superuser = User.objects.create_superuser("root", "root@example.com", "pw")

        self.assertFalse(is_site_admin(superuser))
        self.assertFalse(is_game_admin(superuser))

    def test_flags_grant_the_matching_rights_only(self):
        user = User.objects.create_superuser("root2", "root2@example.com", "pw")
        user.profile.is_site_admin = True
        user.profile.save(update_fields=["is_site_admin"])

        self.assertTrue(is_site_admin(user))
        self.assertFalse(is_game_admin(user))

    def test_plain_user_and_anonymous_are_neither(self):
        plain = User.objects.create_user("plain", "plain@example.com", "pw")

        for user in (plain, AnonymousUser()):
            self.assertFalse(is_site_admin(user))
            self.assertFalse(is_game_admin(user))

    def test_game_admin_can_act_in_a_game_they_do_not_play(self):
        player = User.objects.create_user("player", "p@example.com", "pw")
        outsider = User.objects.create_user("outsider", "o@example.com", "pw")
        other = User.objects.create_user("other", "x@example.com", "pw")
        game = Game.objects.create(gameCode="FCM", creator=player, host=player, gameStatus="ACTIVE", gameData="STATE", startingMap="")

        outsider.profile.is_game_admin = True
        outsider.profile.save(update_fields=["is_game_admin"])

        self.assertTrue(can_act_in_game(outsider, game))
        self.assertFalse(can_act_in_game(other, game))
