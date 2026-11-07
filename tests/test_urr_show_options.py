"""URR colour preference is saved from the profile and reaches the game page."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User

PROFILE_POST = {
    "action": "updateProfileFavourites",
    "fcmResto": "-1",
    "hcColour": "-1",
    "busColour": "-1",
    "tgzColour": "-1",
    "cnsColour": "-1",
    "kfwColour": "-1",
    "webColour": "-1",
}


class UrrShowOptionsTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player", "p@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="URR",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            startingOptions="[]",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def test_profile_form_saves_the_preference(self):
        response = self.client.post(reverse("profile"), {**PROFILE_POST, "urrColour": "4"})
        self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
        self.player.profile.refresh_from_db()
        self.assertEqual(json.loads(self.player.profile.preferredURRoptions), [4])

    def test_preferred_colour_reaches_the_page(self):
        self.player.profile.preferredURRoptions = json.dumps([4])
        self.player.profile.save(update_fields=["preferredURRoptions"])
        response = self.client.get(reverse("URR:showURRgame", args=[self.game.id]))
        self.assertContains(response, "initData.preferredURRoptions = [4];")

    def test_blank_preference_defaults_to_none(self):
        response = self.client.get(reverse("URR:showURRgame", args=[self.game.id]))
        self.assertContains(response, "initData.preferredURRoptions = [-1];")
