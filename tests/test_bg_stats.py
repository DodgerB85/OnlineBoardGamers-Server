"""The opt-in BG Stats preference is saved from the profile form and reaches every game's show page."""
from pathlib import Path

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User

ROOT = Path(__file__).resolve().parent.parent

# Every game that has an end screen must load the shared helper and pass the flag.
GAME_TEMPLATES = [
    "FCM/templates/FCM/showFCMgame.html",
    "HLC/templates/HLC/HLCtemplate.html",
    "BUS/templates/BUS/showBUSgame.html",
    "TGZ/templates/TGZ/showTGZgame.html",
    "CNS/templates/CNS/showCNSgame.html",
    "AQY/templates/AQY/showAQYgame.html",
    "IND/templates/IND/showINDgame.html",
    "KFW/templates/KFW/showKFWgame.html",
    "WEB/templates/WEB/showWEBgame.html",
    "RNB/templates/RNB/showRNBgame.html",
    "NTR/templates/NTR/showNTRgame.html",
    "URR/templates/URR/showURRgame.html",
    "ROW/templates/ROW/showROWgame.html",
    "DDL/templates/DDL/showDDLgame.html",
]

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

    def test_every_game_template_loads_the_helpers_and_passes_the_flag(self):
        for template in GAME_TEMPLATES:
            with self.subTest(template=template):
                source = (ROOT / template).read_text(encoding="utf-8")
                self.assertIn("Lobby/common/qrcode.js", source)
                self.assertIn("Lobby/common/bgStats.js", source)
                self.assertRegex(source, r"bgStatsEnabled = \{\{ bgStatsEnabled\|default:0 \}\};")
