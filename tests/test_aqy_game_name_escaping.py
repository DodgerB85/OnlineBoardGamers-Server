import importlib

from django.apps import apps
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, User


class AqyGameNameEscapingTests(TestCase):
    """The rematch create page copies the old game's text into a JS string:
    without escapejs Django's autoescape was stored verbatim by the next save,
    so the name displayed as "Again&amp;again"."""

    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        for shadow in ("SHADOW", "SHADOW_2", "SHADOW_3"):
            User.objects.create_user(username=shadow, password="pw")
        self.client.force_login(self.creator)

    def test_rematch_prefill_does_not_reescape(self):
        response = self.client.post(
            reverse("AQY:createAQYgame"),
            {
                "playerNumber": "2",
                "gameName": "Again&again",
                "gameDescription": "A & B",
                "pace": "40",
                "kickoutDuration": "100",
            },
        )
        self.assertEqual(response.status_code, 302)

        game = Game.objects.get(gameCode="AQY")
        body = self.client.get(reverse("createAQYpage", args=[game.id])).content.decode()

        self.assertIn('setupData.gameName = "Again\\u0026again";', body)
        self.assertIn('setupData.gameDescription = "A \\u0026 B";', body)
        self.assertNotIn('setupData.gameName = "Again&amp;again";', body)

    def test_migration_unescapes_stored_names(self):
        migration = importlib.import_module("Lobby.migrations.0128_unescape_aqy_game_text")
        stacked = Game.objects.create(gameCode="AQY", gameStatus="ACTIVE", gameName="Again&amp;amp;again", gameDescription="A &amp; B")
        clean = Game.objects.create(gameCode="AQY", gameStatus="ACTIVE", gameName="Again&again")
        other_game = Game.objects.create(gameCode="CNS", gameStatus="ACTIVE", gameName="Again&amp;again")

        migration.unescape_aqy_game_text(apps, None)

        stacked.refresh_from_db()
        self.assertEqual(stacked.gameName, "Again&again")
        self.assertEqual(stacked.gameDescription, "A & B")
        clean.refresh_from_db()
        self.assertEqual(clean.gameName, "Again&again")
        other_game.refresh_from_db()
        self.assertEqual(other_game.gameName, "Again&amp;again")
