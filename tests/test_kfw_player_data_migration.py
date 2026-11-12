import importlib
import json

from django.apps import apps as django_apps
from django.test import TestCase

from Lobby.models import Game, GamePlayer, User

KFW_DATA_MIGRATION = importlib.import_module("Lobby.migrations.0139_migrate_kfw_player_data_to_gameplayer")


class KfwPlayerDataMigrationTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@example.com", "pw")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="KFW",
            creator=self.alice,
            host=self.alice,
            gameStatus="ACTIVE",
            turn=4,
            phase=4,
            maxPlayers=2,
            startingOptions="[]",
            KFWserverData=json.dumps([[0, 0, 0, 0], [0, 0, 0]]),
            KFWplayersHiddenData=json.dumps(
                [
                    ["alice", [1, 2, 3, 4], [1, 2, 3], [["h1"]]],
                    ["bob", [4, 3, 2, 1], [3, 2, 1], []],
                ]
            ),
            KFWplayersMoveData=json.dumps(
                [
                    ["alice", "1710000000001", "move-a"],
                    ["bob", "1710000000002", "move-b"],
                ]
            ),
        )
        self.gp_alice = GamePlayer.objects.create(game=self.game, player=self.alice, seat_order=0)
        self.gp_bob = GamePlayer.objects.create(game=self.game, player=self.bob, seat_order=1)

    def _migrate(self):
        KFW_DATA_MIGRATION.migrate_kfw_player_data(django_apps, None)

    def test_migration_copies_hidden_and_move_data(self):
        self._migrate()

        self.gp_alice.refresh_from_db()
        self.gp_bob.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveTime, "1710000000001")
        self.assertEqual(self.gp_alice.currentMoveData, "move-a")
        self.assertEqual(
            self.gp_alice.moveDataJSON,
            {"hidden": [[1, 2, 3, 4], [1, 2, 3], [["h1"]]]},
        )
        self.assertEqual(self.gp_bob.currentMoveTime, "1710000000002")
        self.assertEqual(self.gp_bob.currentMoveData, "move-b")
        self.assertEqual(
            self.gp_bob.moveDataJSON,
            {"hidden": [[4, 3, 2, 1], [3, 2, 1], []]},
        )

    def test_migration_is_idempotent(self):
        self._migrate()
        self.gp_alice.currentMoveData = "new-move"
        self.gp_alice.save(update_fields=["currentMoveData"])
        self.gp_alice.moveDataJSON = {"hidden": [[9, 9, 9, 9], [9, 9, 9], []]}
        self.gp_alice.save(update_fields=["moveDataJSON"])

        self._migrate()

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveData, "new-move")
        self.assertEqual(self.gp_alice.moveDataJSON, {"hidden": [[9, 9, 9, 9], [9, 9, 9], []]})

    def test_getters_fall_back_to_old_rows_without_writing(self):
        presenter = self.game.presenter()

        hidden_rows = presenter.getAllHiddenDataRows()
        self.assertEqual(hidden_rows[0], ["alice", [1, 2, 3, 4], [1, 2, 3], [["h1"]]])
        self.assertEqual(presenter.getMoveData("alice"), "move-a")

        self.gp_alice.refresh_from_db()
        self.assertFalse(isinstance(self.gp_alice.moveDataJSON, dict))
        self.assertEqual(self.gp_alice.currentMoveData, "")

    def test_rename_before_migration_still_copies_by_seat(self):
        self.alice.username = "alice2"
        self.alice.save(update_fields=["username"])

        self._migrate()

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON["hidden"], [[1, 2, 3, 4], [1, 2, 3], [["h1"]]])
        hidden_rows = self.game.presenter().getAllHiddenDataRows()
        self.assertEqual(hidden_rows[0][0], "alice2")

    def test_save_move_writes_to_the_game_player(self):
        self.game.presenter().updateSingleMove("alice", "new-move")

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveData, "new-move")
        self.assertNotEqual(self.gp_alice.currentMoveTime, "")
        self.assertEqual(self.game.presenter().getMoveData("alice"), "new-move")

    def test_clear_all_move_data_leaves_no_gp_state(self):
        self.game.presenter().updateSingleMove("alice", "new-move")

        self.game.presenter().clearAllMoveData()

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.currentMoveTime, "")
        self.assertEqual(self.gp_alice.currentMoveData, "")
        self.assertEqual(self.game.KFWplayersMoveData, "")

    def test_restore_hidden_rows_from_old_snapshot(self):
        self.game.presenter().restoreHiddenDataRows(
            [
                ["old-name-a", [9, 8, 7, 6], [6, 7, 8], [["old"]]],
                ["old-name-b", [1, 1, 1, 1], [2, 2, 2], []],
            ]
        )

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON["hidden"], [[9, 8, 7, 6], [6, 7, 8], [["old"]]])

    def test_game_data1_reads_the_game_player(self):
        self._migrate()

        compressed = self.game.presenter().getGameData1Compressed("alice")

        self.assertEqual(
            self.game.presenter().decompressData(compressed),
            [[1, 2, 3, 4], [1, 2, 3], [["h1"]]],
        )

    def test_end_of_turn_action_writes_hidden_data_to_the_game_player(self):
        presenter = self.game.presenter()

        presenter.processEndOfTurnActions(presenter.compressData([[0, 3, [0]]]))

        self.gp_alice.refresh_from_db()
        self.assertEqual(self.gp_alice.moveDataJSON["hidden"][0][0], 2)
