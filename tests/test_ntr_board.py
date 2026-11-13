import json
import unittest
from pathlib import Path

BOARD = json.loads((Path(__file__).resolve().parent.parent / "NTR/vueNTR/src/js/NTRboard.json").read_text())


class NTRBoardDataTests(unittest.TestCase):
    def test_locales_match_the_printed_map(self):
        locales = BOARD["locales"]
        self.assertEqual(len(locales), 168)
        self.assertNotIn("145", locales)  # 145 and 146 are not printed on the board
        for lid, locale in locales.items():
            self.assertIsInstance(locale["capacity"], int, lid)
            self.assertGreaterEqual(len(locale["polygon"]), 3, lid)
        setups = [l["setup"]["commander"] for l in locales.values() if l["setup"]]
        self.assertEqual(len(setups), 15)

    def test_approaches_join_two_known_locales(self):
        for aid, approach in BOARD["approaches"].items():
            a, b = approach["locales"]
            self.assertEqual(aid, f"{a}-{b}")
            self.assertLess(int(a), int(b))
            self.assertIn(a, BOARD["locales"])
            self.assertIn(b, BOARD["locales"])
            self.assertIn(approach["width"], ("narrow", "wide"))
            self.assertEqual(set(approach["penalties"]), {a, b})

    def test_every_locale_has_an_approach(self):
        touched = {lid for approach in BOARD["approaches"].values() for lid in approach["locales"]}
        self.assertEqual(touched, set(BOARD["locales"]))

    def test_penalties_come_from_placed_symbols(self):
        placed = {}
        for s in BOARD["symbols"]:
            if s["approach"]:
                placed.setdefault((s["approach"], s["locale"]), []).append(s["kind"])
        for aid, approach in BOARD["approaches"].items():
            for lid, kinds in approach["penalties"].items():
                self.assertEqual(kinds, placed.get((aid, lid), []), (aid, lid))

    def test_road_links_use_approaches_of_their_locale(self):
        for lid, links in BOARD["road_links"].items():
            for a, b, _cls in links:
                self.assertIn(lid, BOARD["approaches"][a]["locales"])
                self.assertIn(lid, BOARD["approaches"][b]["locales"])
