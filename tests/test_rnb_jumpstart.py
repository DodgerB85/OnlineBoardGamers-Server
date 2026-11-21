"""RNB &c Jumpstart: preset piles need a matching player count, the pile-building variant needs 3+ players."""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
import django

django.setup()

from RNB import RNBconstants as rfRNB
from RNB.common import jumpstart_map_error
from RNB.views import _valid_rnb_map

PRESET_3P = json.dumps([[0, 0, 0, 1], {"UK": 1, "JS": [[6, 6], [2, 0], [7, 5]]}])
NO_PILES = json.dumps([[0, 0, 0, 1], {"UK": 2}])
JS = [rfRNB.SO_JUMP_START]


class RNBJumpstartTests(unittest.TestCase):
    def test_no_jumpstart_any_count(self):
        self.assertIsNone(jumpstart_map_error(PRESET_3P, [], 2))

    def test_preset_piles_need_matching_count(self):
        self.assertIsNone(jumpstart_map_error(PRESET_3P, JS, 3))
        self.assertIsNotNone(jumpstart_map_error(PRESET_3P, JS, 2))
        self.assertIsNotNone(jumpstart_map_error(PRESET_3P, JS, 4))

    def test_variant_needs_three_players(self):
        self.assertIsNotNone(jumpstart_map_error(NO_PILES, JS, 2))
        self.assertIsNone(jumpstart_map_error(NO_PILES, JS, 3))
        self.assertIsNone(jumpstart_map_error(NO_PILES, JS, 6))

    def test_saved_piles_must_match_player_count(self):
        self.assertTrue(_valid_rnb_map(json.loads(PRESET_3P), 3))
        self.assertFalse(_valid_rnb_map(json.loads(PRESET_3P), 2))
        self.assertFalse(_valid_rnb_map([[0, 0, 0], {"JS": [["x"], [], []]}], 3))
        self.assertTrue(_valid_rnb_map(json.loads(NO_PILES), 2))

    def test_empty_map(self):
        self.assertIsNotNone(jumpstart_map_error("", JS, 2))
        self.assertIsNone(jumpstart_map_error("", JS, 4))


if __name__ == "__main__":
    unittest.main()
