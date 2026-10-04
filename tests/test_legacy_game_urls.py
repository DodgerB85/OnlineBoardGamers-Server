"""
Legacy bare game URLs: /GAME/<id>/ should redirect to /GAME/<id>/show/.

Historically each game had its own model, and old links looked like
/GAME/<old_model_id>/. Those ids were preserved in Game.original_id when the
models were merged, so /GAME/<original_id>/ has to keep resolving.

The hole: redirect_old_url used to query original_id ONLY. Every game created
since that backfill has original_id = NULL, so /GAME/<current_id>/ raised 404.
FCM and HLC already fell back to the direct id; the other games did not.

These tests use the real routes, not the view functions, so a broken urlconf
also fails here.
"""

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, User

# gameCode -> (legacy url name, canonical show url name)
LEGACY_ROUTES = [
    ("BUS", "showBUSgameOld", "showBUSgame"),
    ("CNS", "redirectLegacyCNS", "showCNSgame"),
    ("TGZ", "redirectLegacyTGZ", "showTGZgame"),
    ("WEB", "redirect_old_url", "showWEBgame"),
    ("AQY", "redirect_old_url", "showAQYgame"),
    ("KFW", "redirect_old_url", "showKFWgame"),
    ("IND", "redirect_old_url", "showINDgame"),
]


class LegacyGameUrlRedirectTests(TestCase):
    def setUp(self):
        self.host = User.objects.create_user("host", password="pw")

    def _game(self, game_code, original_id=None):
        return Game.objects.create(
            gameCode=game_code,
            creator=self.host,
            host=self.host,
            gameStatus="ACTIVE",
            gameData="STATE",
            original_id=original_id,
        )

    def test_bare_id_redirects_when_game_has_no_original_id(self):
        """
        The regression: a game with original_id = NULL used to 404 on /GAME/<id>/.
        """
        for game_code, legacy_name, show_name in LEGACY_ROUTES:
            with self.subTest(game=game_code):
                game = self._game(game_code, original_id=None)
                url = reverse(f"{game_code}:{legacy_name}", args=[game.id])
                response = self.client.get(url)
                self.assertEqual(response.status_code, 302, f"{game_code}: {url} did not redirect")
                self.assertEqual(response["Location"], reverse(f"{game_code}:{show_name}", args=[game.id]))

    def test_original_id_still_resolves(self):
        """The original legacy behaviour must keep working."""
        for game_code, legacy_name, show_name in LEGACY_ROUTES:
            with self.subTest(game=game_code):
                game = self._game(game_code, original_id=None)
                # Give it a distinct legacy id that must NOT match its own primary key.
                legacy_id = 900000 + game.id
                Game.objects.filter(id=game.id).update(original_id=legacy_id)

                url = reverse(f"{game_code}:{legacy_name}", args=[legacy_id])
                response = self.client.get(url)
                self.assertEqual(response.status_code, 302, f"{game_code}: original_id lookup broke")
                self.assertEqual(response["Location"], reverse(f"{game_code}:{show_name}", args=[game.id]))

    def test_genuinely_missing_game_still_404s(self):
        """The fallback must not turn an unknown id into a redirect to /show/."""
        for game_code, legacy_name, _show_name in LEGACY_ROUTES:
            with self.subTest(game=game_code):
                url = reverse(f"{game_code}:{legacy_name}", args=[999999])
                response = self.client.get(url)
                self.assertEqual(response.status_code, 404)
                self.assertTemplateUsed(response, "Lobby/404.html")

    def test_other_games_code_does_not_leak(self):
        """The fallback must stay scoped to the game in the path."""
        bus_game = self._game("BUS", original_id=None)
        bus_url = reverse("BUS:showBUSgameOld", args=[bus_game.id])
        self.assertEqual(self.client.get(bus_url).status_code, 302)

        # The same numeric id under CNS must not resolve to the BUS game.
        cns_response = self.client.get(reverse("CNS:redirectLegacyCNS", args=[bus_game.id]))
        self.assertEqual(cns_response.status_code, 404)


class Handler404StatusTests(TestCase):
    """
    handler404 must return a real 404, not a 200.

    It used to end in a bare render(), which returns HTTP 200 - so every missing
    page on the site answered 200 while displaying the 404 page. That hides
    broken links from crawlers, uptime checks and log analysis.
    """

    def test_unknown_url_returns_404_not_200(self):
        response = self.client.get("/this-page-does-not-exist/")
        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "Lobby/404.html")

    def test_unknown_game_id_returns_404(self):
        response = self.client.get(reverse("FCM:showFCMgame", args=[999999]))
        self.assertEqual(response.status_code, 404)