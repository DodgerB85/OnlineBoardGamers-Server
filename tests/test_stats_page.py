from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from Lobby.models import User


@override_settings(
    STORAGES={
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
)
class StatsPageTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="stats-viewer", password="testpass123")
        self.client.force_login(self.user)

    def test_urr_replaces_ntr_in_the_per_game_list(self):
        response = self.client.get(reverse("stats"))
        codes = [game["gameCode"] for game in response.context["game_stats"]]

        self.assertIn("URR", codes)
        self.assertNotIn("NTR", codes)
        self.assertContains(response, 'id="URR"')
        self.assertContains(response, "urr_icon.png")

    def test_player_profile_has_a_urr_tab_and_stats_div(self):
        response = self.client.get(reverse("playerInfo", args=[self.user.username]))

        self.assertContains(response, 'id="URR"')
        self.assertContains(response, 'id="playerStatsDiv11"')
