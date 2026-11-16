"""Server-side validation helpers for the RNB trade rules."""

import json
import os
import sys
import unittest
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from RNB import RNBconstants as rfRNB
from RNB.views import (
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
        self.assertTrue(_rnb_validate_trade_resources(self.raw_data[3], [0], home))
        self.assertTrue(_rnb_validate_trade_resources(self.raw_data[3], [1], home))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [2], home))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [0, 0], home))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [-1], home))
        self.assertFalse(_rnb_validate_trade_resources(self.raw_data[3], [99], home))

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
