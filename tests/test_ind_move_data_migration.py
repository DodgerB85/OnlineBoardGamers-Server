import importlib
import json

from django.apps import apps as django_apps
from django.test import TestCase

from Lobby.models import Game, GamePlayer, User

IND_MOVE_MIGRATION = importlib.import_module("Lobby.migrations.0138_migrate_ind_pre_move_data_to_gameplayer")


class IndMoveDataMigrationTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@example.com", "pw")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="IND",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
            turn=3,
            maxPlayers=2,
            playersPreMoveData=json.dumps(
                [
                    ["alice", [3, 4], 12345, [3, [[1], [2]]]],
                    ["bob", [5], 12346, [3, [[], []]]],
                ]
            ),
        )
        self.gp_alice = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0)
        self.gp_bob = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)

    def _migrate(self):
        IND_MOVE_MIGRATION.migrate_ind_pre_move_data(django_apps, None)

    def test_migration_copies_rows_into_game_players(self):
        self._migrate()

        self.gp_alice.refresh_from_db()
        self.gp_bob.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveTime, "12345")
        self.assertEqual(self.gp_alice.moveDataJSON, {"phases": [3, 4], "data": [3, [[1], [2]]]})
        self.assertEqual(self.gp_bob.currentMoveTime, "12346")
        self.assertEqual(self.gp_bob.moveDataJSON, {"phases": [5], "data": [3, [[], []]]})

    def test_migration_is_idempotent(self):
        self._migrate()
        self.gp_alice.moveDataJSON = {"phases": [9], "data": [1]}
        self.gp_alice.save(update_fields=["moveDataJSON"])

        self._migrate()

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON, {"phases": [9], "data": [1]})

    def test_getter_falls_back_to_old_rows_without_writing(self):
        rows = self.game.presenter().getOrScaffoldAllPreMoveData()

        self.assertEqual(rows[0], ["alice", [3, 4], "12345", [3, [[1], [2]]]])
        self.gp_alice.refresh_from_db()
        self.assertFalse(isinstance(self.gp_alice.moveDataJSON, dict))

    def test_rename_before_migration_still_copies_by_seat(self):
        self.alice.username = "alice2"
        self.alice.save(update_fields=["username"])

        self._migrate()

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON, {"phases": [3, 4], "data": [3, [[1], [2]]]})
        rows = self.game.presenter().getOrScaffoldAllPreMoveData()
        self.assertEqual(rows[0][0], "alice2")

    def test_save_writes_to_the_game_player(self):
        self.game.presenter().insertPlayerPreMoveData("alice", [3], [3, [[7], []]])

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON, {"phases": [3], "data": [3, [[7], []]]})
        rows = self.game.presenter().getOrScaffoldAllPreMoveData()
        self.assertEqual(rows[0][1:], [[3], self.gp_alice.currentMoveTime, [3, [[7], []]]])

    def test_clear_all_pre_move_data_leaves_no_gp_state(self):
        self.game.presenter().insertPlayerPreMoveData("alice", [3], [3, [[7], []]])

        self.game.presenter().clearAllPreMoveData()

        self.gp_alice.refresh_from_db()
        self.assertIsNone(self.gp_alice.moveDataJSON)
        self.assertEqual(self.gp_alice.currentMoveTime, "")
        self.assertEqual(self.game.playersPreMoveData, "")
