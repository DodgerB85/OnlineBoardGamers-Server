import json

from django.test import SimpleTestCase

from siteUtils.calcStats_IND import calculate_stats, parse_game


class INDHullUpgradeAttributionTests(SimpleTestCase):
    def test_hull_upgrades_are_attributed_to_the_player_who_paid(self):
        def player(name, hull_level):
            # Player layout of a finished export: [name, displayName, colour, moneyCash, moneyBank, slots, RnD]
            return [name, name, 0, 0, 0, [], [1, 1, 1, 1, hull_level]]

        # Export layout: [players, cities, gameflow, history, activeCompanies]
        data = [
            [player("alice", 2), player("bob", 2)],
            [],
            [7],
            [
                [39, 0, 5, [4, 2]],  # alice raises her own hull
                [39, 1, 3, [4, 2, 0]],  # bob raises alice's hull
                [39, 1, 8, [4, 2]],  # bob raises his own hull
                [39, 0, 9, [1, 2]],  # alice raises her slots, not her hull
            ],
            [],
        ]

        game = parse_game(1234, json.dumps(data), "alice")

        alice, bob = game["players"]
        self.assertEqual((alice["hull_own"], alice["hull_other"]), (1, 1))
        self.assertEqual((bob["hull_own"], bob["hull_other"]), (1, 0))


class INDHullStatsAggregationTests(SimpleTestCase):
    def test_hull_stats_split_and_percentages(self):
        def player(name, is_winner, hull_own, hull_other, seat):
            return {
                "name": name,
                "is_winner": is_winner,
                "seat": seat,
                "score": 0,
                "rnd": [1, 1, 1, 1, 1],
                "slots_used": 0,
                "companies": 0,
                "mergers": 0,
                "company_counts": {"Shipping": 0, "Rice": 0, "Spice": 0, "Rubber": 0, "Oil": 0},
                "hull_own": hull_own,
                "hull_other": hull_other,
            }

        games = [
            {"game_id": 1, "turn": 5, "players": [player("alice", True, 3, 1, 0), player("bob", False, 1, 0, 1)]},
            {"game_id": 2, "turn": 6, "players": [player("carol", True, 0, 0, 0), player("dave", False, 0, 2, 1)]},
        ]

        hull = calculate_stats(games)["hull_stats"]

        self.assertEqual(hull["total"], 7)
        self.assertEqual((hull["own_pct"], hull["other_pct"]), (57, 43))
        self.assertEqual((hull["winner"]["avg_other"], hull["other"]["avg_other"]), (0.5, 1.0))
        self.assertEqual((hull["winner"]["other_share_pct"], hull["other"]["other_share_pct"]), (25, 67))
        self.assertEqual((hull["winner"]["pushed_pct"], hull["other"]["pushed_pct"]), (50, 50))
        self.assertEqual(hull["pushed_game_ids"], [1, 2])
        self.assertEqual(hull["winner"]["pushed_game_ids"], [1])
        self.assertEqual(hull["other"]["pushed_game_ids"], [2])

