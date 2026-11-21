import json

from django.apps import apps as django_apps
from django.test import TestCase

from Lobby.migrationHelpers import backfill_remaining_turn_order
from Lobby.models import Game, GamePlayer, User


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

    def test_setter_prefers_seats_over_conflicting_names(self):
        presenter = self.game.presenter()

        presenter.setCurrentPlayersFromArrInTurnOrder([self.players[0].username], current_player_seats=[2])

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertIsNone(self.game_players[0].remainingTurnOrder)
        self.assertFalse(self.game_players[0].is_current)
        self.assertEqual(self.game_players[2].remainingTurnOrder, 1)
        self.assertTrue(self.game_players[2].is_current)
        self.assertEqual(presenter.getRemainingTurnOrderNames(), [self.players[2].username])

    def test_renamed_player_is_current_from_the_seat_not_the_stale_name(self):
        presenter = self.game.presenter()
        stale_name = self.players[1].username
        self.players[1].username = "turn-renamed"
        self.players[1].save(update_fields=["username"])

        presenter.setCurrentPlayersFromArrInTurnOrder([stale_name], current_player_seats=[1])

        self.game_players[1].refresh_from_db()
        self.assertEqual(self.game_players[1].remainingTurnOrder, 1)
        self.assertTrue(self.game_players[1].is_current)
        self.assertEqual(presenter.getRemainingTurnOrderNames(), ["turn-renamed"])

    def test_server_setter_prefers_seats_over_conflicting_names(self):
        presenter = self.game.presenter()

        presenter.setServerCurrentPlayerNamesInTurnOrder([self.players[0].username], seats=[2])

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertIsNone(self.game_players[0].remainingTurnOrder)
        self.assertEqual(self.game_players[2].remainingTurnOrder, 1)
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [self.players[2].username])

    def test_reduce_current_players_uses_seats(self):
        presenter = self.game.presenter()
        self.game.players.filter(pk__in=[self.game_players[0].pk, self.game_players[1].pk]).update(is_current=True)

        presenter.reduceCurrentPlayersUsingArray([self.players[0].username], current_player_seats=[1])

        self.game_players[0].refresh_from_db()
        self.game_players[1].refresh_from_db()
        self.assertFalse(self.game_players[0].is_current)
        self.assertTrue(self.game_players[1].is_current)

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

        backfill_remaining_turn_order(django_apps, None)

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

        backfill_remaining_turn_order(django_apps, None)

        for gp in self.game_players:
            gp.refresh_from_db()
        self.assertEqual(self.game_players[2].remainingTurnOrder, 1)
        self.assertEqual(self.game_players[1].remainingTurnOrder, 2)
        self.assertIsNone(self.game_players[0].remainingTurnOrder)

    def test_kicked_seat_left_in_the_queue_is_not_returned(self):
        presenter = self.game.presenter()
        kicked_gp = self.game_players[1]
        kicked_gp.is_kicked = True
        kicked_gp.remainingTurnOrder = 1
        kicked_gp.save(update_fields=["is_kicked", "remainingTurnOrder"])
        self.game_players[0].remainingTurnOrder = 2
        self.game_players[0].save(update_fields=["remainingTurnOrder"])

        self.assertEqual(presenter.getRemainingTurnOrderNames(), [self.players[0].username])

    def test_stale_save_cannot_restore_a_kicked_seat_to_the_queue(self):
        presenter = self.game.presenter()
        kicked_gp = self.game_players[1]
        kicked_gp.is_kicked = True
        kicked_gp.save(update_fields=["is_kicked"])

        # A stale client sends the queue it had before the kickout
        presenter.setServerCurrentPlayerNamesInTurnOrder([self.players[1].username, self.players[0].username])

        kicked_gp.refresh_from_db()
        self.assertIsNone(kicked_gp.remainingTurnOrder)
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [self.players[0].username])
        self.assertEqual(presenter.getRemainingTurnOrderNames(), [self.players[0].username])

    def test_kicked_seat_played_by_ai_stays_in_the_queue(self):
        ai_gp = self.game_players[1]
        ai_gp.is_kicked = True
        ai_gp.is_ai = True
        ai_gp.remainingTurnOrder = 1
        ai_gp.save(update_fields=["is_kicked", "is_ai", "remainingTurnOrder"])

        self.assertEqual(self.game.presenter().getRemainingTurnOrderNames(), [self.players[1].username])
