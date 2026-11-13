import importlib
import json

from django.apps import apps as django_apps
from django.test import TestCase

from Lobby.models import Game, GamePlayer, User

TURN_ORDER_MIGRATION = importlib.import_module("Lobby.migrations.0143_gameplayer_remainingturnorder")


class TurnOrderTests(TestCase):
    def setUp(self):
        self.players = [User.objects.create_user(username=f"turn-{index}", password="pw") for index in range(3)]
        self.game = Game.objects.create(
            gameCode="BUS",
            creator=self.players[0],
            host=self.players[0],
            gameStatus="ACTIVE",
            maxPlayers=3,
            startingOptions="[]",
        )
        self.game_players = [
            GamePlayer.objects.create(game=self.game, player=player, seat_order=index)
            for index, player in enumerate(self.players)
        ]

    def test_setter_stores_positions_on_game_players(self):
        presenter = self.game.presenter()

        presenter.setCurrentPlayersFromArrInTurnOrder([self.players[1].username, self.players[0].username])

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertEqual(self.game_players[1].remainingTurnOrder, 1)
        self.assertEqual(self.game_players[0].remainingTurnOrder, 2)
        self.assertIsNone(self.game_players[2].remainingTurnOrder)
        self.assertEqual(presenter.getRemainingTurnOrderNames(), [self.players[1].username, self.players[0].username])

    def test_empty_setter_clears_positions(self):
        presenter = self.game.presenter()
        presenter.setCurrentPlayersFromArrInTurnOrder([self.players[1].username])

        presenter.setCurrentPlayersFromArrInTurnOrder([])

        self.assertFalse(self.game.players.filter(remainingTurnOrder__isnull=False).exists())
        self.assertEqual(presenter.getRemainingTurnOrderNames(), [])

    def test_legacy_field_is_read_when_game_players_have_no_positions(self):
        self.game.serverCurrentPlayerNamesInTurnOrder = [self.players[1].username, self.players[0].username]
        self.game.save(update_fields=["serverCurrentPlayerNamesInTurnOrder"])

        self.assertEqual(
            self.game.presenter().getRemainingTurnOrderNames(),
            [self.players[1].username, self.players[0].username],
        )

    def test_migration_backfills_from_legacy_field(self):
        self.game.serverCurrentPlayerNamesInTurnOrder = [self.players[2].username, self.players[0].username]
        self.game.save(update_fields=["serverCurrentPlayerNamesInTurnOrder"])

        TURN_ORDER_MIGRATION.backfill_remaining_turn_order(django_apps, None)

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertEqual(self.game_players[2].remainingTurnOrder, 1)
        self.assertEqual(self.game_players[0].remainingTurnOrder, 2)
        self.assertIsNone(self.game_players[1].remainingTurnOrder)

    def test_migration_prefers_hlc_queue(self):
        self.game.gameCode = "HLC"
        self.game.currentPlayersInTurnOrder = json.dumps([self.players[2].username, self.players[1].username])
        self.game.serverCurrentPlayerNamesInTurnOrder = [self.players[0].username]
        self.game.save(update_fields=["gameCode", "currentPlayersInTurnOrder", "serverCurrentPlayerNamesInTurnOrder"])

        TURN_ORDER_MIGRATION.backfill_remaining_turn_order(django_apps, None)

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertEqual(self.game_players[2].remainingTurnOrder, 1)
        self.assertEqual(self.game_players[1].remainingTurnOrder, 2)
        self.assertIsNone(self.game_players[0].remainingTurnOrder)
