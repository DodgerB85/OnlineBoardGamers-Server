"""Server-side validation helpers for the RNB trade rules."""

import json
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from RNB import RNBconstants as rfRNB
from RNB.views import (
    _append_trade_history,
    _delete_pending_moves,
    _get_rnb_home_location,
    _remove_matching_trades,
    _rnb_player_has_transporter_on_home,
    _rnb_trade_option_enabled,
    _rnb_validate_trade_resources,
)


class RNBTradeRulesTests(unittest.TestCase):
    def setUp(self):
        # 0 players, 1 wonder bricks, 2 transporters, 3 resources, 4 history
        self.raw_data = [
            [],
            [],
            [[0, 30, [5, 1]], [1, 30, [6, 1]]],
            [[0, [5], 1], [1, [5, 2], 2], [0, [6], 3]],
            [[2, 0, 0, [5]], [2, 1, 0, [6]]],
        ]

    def test_home_tiles_come_from_history(self):
        self.assertEqual(_get_rnb_home_location(self.raw_data, 0), [5])
        self.assertEqual(_get_rnb_home_location(self.raw_data, 1), [6])
        self.assertIsNone(_get_rnb_home_location(self.raw_data, 2))

    def test_goods_must_be_on_the_home_tile(self):
        home = [5]
        self.assertTrue(_rnb_validate_trade_resources(self.raw_data[3], [0], home, self.raw_data[2], 0))
        self.assertTrue(_rnb_validate_trade_resources(self.raw_data[3], [1], home, self.raw_data[2], 0))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [2], home, self.raw_data[2], 0))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [0, 0], home, self.raw_data[2], 0))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [-1], home, self.raw_data[2], 0))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [99], home, self.raw_data[2], 0))

    def test_goods_on_a_transporter_count_as_on_that_tile(self):
        resources = [[0, [-1, 0], 1], [1, [-1, 1], 2]]
        self.assertTrue(_rnb_validate_trade_resources(resources, [0], [5], self.raw_data[2], 0))
        self.assertTrue(_rnb_validate_trade_resources(resources, [1], [6], self.raw_data[2], 1))
        self.assertFalse(_rnb_validate_trade_resources(resources, [0], [6], self.raw_data[2], 0))
        self.assertFalse(_rnb_validate_trade_resources(resources, [1], [5], self.raw_data[2], 1))

    def test_goods_must_be_on_your_own_transporter(self):
        transporters = self.raw_data[2] + [[1, 30, [5, 2]]]
        resources = [[0, [-1, 2], 1]]
        self.assertFalse(_rnb_validate_trade_resources(resources, [0], [5], transporters, 0))
        self.assertTrue(_rnb_validate_trade_resources(resources, [0], [5], transporters, 1))

    def test_goods_on_a_carried_transporter_are_not_on_the_tile(self):
        transporters = [[0, 30, [5, 1]], [1, 30, [6, 1]], [0, 30, [-1, 0]]]
        resources = [[0, [-1, 2], 1]]
        self.assertFalse(_rnb_validate_trade_resources(resources, [0], [5], transporters, 0))

    def test_trade_history_records_relative_time_and_whether_presets_were_cleared(self):
        raw_data = [[], [], [], [], [[2, 0, 10, [5]]]]
        game = SimpleNamespace(created=str(1_700_000_000_000))
        with patch("RNB.views.time.time", return_value=1_700_000_100):
            _append_trade_history(game, raw_data, 0, 1, [5], [6], presets_cleared=False)
            _append_trade_history(game, raw_data, 0, 1, [5], [6], presets_cleared=True)
        self.assertEqual(raw_data[4][-2:], [[41, 0, 90, [1, [5], [6]]], [41, 0, 0, [1, [5], [6], True]]])

    def test_pending_presets_are_dropped_for_every_player_but_current_moves_are_kept(self):
        pending_move = {"status": "pending", "turn": 2}
        current_move = {"status": "current", "turn": 1}
        game_players = [
            SimpleNamespace(moveDataJSON=[pending_move, current_move], save=Mock()),
            SimpleNamespace(moveDataJSON=[pending_move], save=Mock()),
            SimpleNamespace(moveDataJSON=[pending_move], save=Mock()),
            SimpleNamespace(moveDataJSON=None, save=Mock()),
        ]
        game = SimpleNamespace(players=SimpleNamespace(only=lambda *fields: game_players))

        self.assertTrue(_delete_pending_moves(game))
        self.assertEqual([player.moveDataJSON for player in game_players], [[current_move], [], [], None])
        self.assertFalse(_delete_pending_moves(game))
        for player in game_players[:3]:
            player.save.assert_called_once_with(update_fields=["moveDataJSON"])
        game_players[3].save.assert_not_called()

    def test_both_players_need_a_transporter_on_their_home_tile(self):
        self.assertTrue(_rnb_player_has_transporter_on_home(self.raw_data, 0, [5]))
        self.assertTrue(_rnb_player_has_transporter_on_home(self.raw_data, 1, [6]))
        self.assertFalse(_rnb_player_has_transporter_on_home(self.raw_data, 1, [5]))

    def test_carried_transporter_is_not_on_the_tile(self):
        raw_data = [[], [], [[0, 33, [-1, 0]]], [], []]
        self.assertFalse(_rnb_player_has_transporter_on_home(raw_data, 0, [5]))

    def test_docked_and_sea_transporters_count(self):
        docked = [[], [], [[0, 33, [3, 5, 0]]], [], []]
        at_sea = [[], [], [[0, 33, [-1, 5, 0]]], [], []]
        self.assertTrue(_rnb_player_has_transporter_on_home(docked, 0, [5]))
        self.assertTrue(_rnb_player_has_transporter_on_home(at_sea, 0, [5]))

    def test_trade_option_gate(self):
        self.assertTrue(_rnb_trade_option_enabled(SimpleNamespace(startingOptions=json.dumps([rfRNB.SO_TRADE]))))
        self.assertFalse(_rnb_trade_option_enabled(SimpleNamespace(startingOptions=json.dumps([rfRNB.SO_BOMBS]))))

    def test_stale_accept_removes_only_the_matching_trade(self):
        trade_data = {
            "playerTrades": [
                [0, 1, [10], [20], "pending"],
                [0, 2, [10], [21], "pending"],
                [2, 1, [11], [20], "pending"],
            ]
        }
        self.assertTrue(_remove_matching_trades(trade_data, 0, 1, [10], [20]))
        self.assertEqual(
            trade_data["playerTrades"],
            [[0, 2, [10], [21], "pending"], [2, 1, [11], [20], "pending"]],
        )

    def test_remove_matching_trades_reports_when_nothing_matched(self):
        trade_data = {"playerTrades": [[0, 1, [10], [20], "pending"]]}
        self.assertFalse(_remove_matching_trades(trade_data, 0, 2, [10], [20]))
        self.assertEqual(trade_data["playerTrades"], [[0, 1, [10], [20], "pending"]])


if __name__ == "__main__":
    unittest.main()
