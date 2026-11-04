"""The opt-in BG Stats preference is saved from the profile form and reaches the TGZ page."""
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


class BgStatsPreferenceTest(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player", "p@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="TGZ",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def test_profile_form_saves_the_preference(self):
        for enabled in (True, False):
            with self.subTest(enabled=enabled):
                post = dict(PROFILE_POST)
                if enabled:
                    post["bgStatsEnabled"] = "bgStatsEnabled"
                response = self.client.post(reverse("profile"), post)
                self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
                self.player.profile.refresh_from_db()
                self.assertEqual(self.player.profile.bgStatsEnabled, enabled)

    def test_show_page_reads_the_preference_and_loads_the_qr_helper_only_when_on(self):
        response = self.client.get(reverse("TGZ:showTGZgame", args=[self.game.id]))
        self.assertContains(response, "initData.bgStatsEnabled = 0;")
        self.assertNotContains(response, "Lobby/common/qrcode.js")

        self.player.profile.bgStatsEnabled = True
        self.player.profile.save(update_fields=["bgStatsEnabled"])

        response = self.client.get(reverse("TGZ:showTGZgame", args=[self.game.id]))
        self.assertContains(response, "initData.bgStatsEnabled = 1;")
        self.assertContains(response, "Lobby/common/qrcode.js")
