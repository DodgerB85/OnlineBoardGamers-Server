import importlib
import json
import time

from django.apps import apps as django_apps
from django.test import TestCase

from Lobby.models import Game, GamePlayer, User

FLEXI_MIGRATION = importlib.import_module("Lobby.migrations.0141_gameplayer_flexisecondsused")


class FlexiTimeMigrationTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("player1", "p1@example.com", "pw")
        self.other = User.objects.create_user("player2", "p2@example.com", "pw")
        self.game = Game.objects.create(gameCode="FCM", creator=self.player, host=self.player, gameStatus="ACTIVE", maxPlayers=2)
        self.gp = GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0, is_current=True)
        self.other_gp = GamePlayer.objects.create(game=self.game, player=self.other, seat_order=1)

    def test_backfill_copies_username_ledger_onto_game_players(self):
        self.game.kickoutFlexiData = json.dumps([["player1", 300], ["player2", 0]])
        self.game.save(update_fields=["kickoutFlexiData"])

        FLEXI_MIGRATION.backfill_flexi_seconds(django_apps, None)

        self.gp.refresh_from_db()
        self.other_gp.refresh_from_db()
        self.assertEqual(self.gp.flexiSecondsUsed, 300)
        self.assertEqual(self.other_gp.flexiSecondsUsed, 0)

    def test_backfill_ignores_finished_games_and_non_flexi_rows(self):
        self.game.gameStatus = "FINISHED"
        self.game.kickoutFlexiData = json.dumps([["player1", 300]])
        self.game.save(update_fields=["gameStatus", "kickoutFlexiData"])

        FLEXI_MIGRATION.backfill_flexi_seconds(django_apps, None)

        self.gp.refresh_from_db()
        self.assertEqual(self.gp.flexiSecondsUsed, 0)

    def test_presenter_kickout_uses_the_game_player_bank(self):
        self.game.kickoutDuration = 100
        self.game.latestUpdate = str(int(time.time() * 1000) - 26 * 60 * 60 * 1000)
        self.game.save(update_fields=["kickoutDuration", "latestUpdate"])
        self.gp.flexiSecondsUsed = 23 * 60 * 60
        self.gp.save(update_fields=["flexiSecondsUsed"])

        self.assertEqual(self.game.presenter().kickoutRequired(), 2)
