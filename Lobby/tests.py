from django.test import SimpleTestCase
from Lobby.sharedFunctions.tournyGenerator import _compute_game_groups


def make_tpda_round(groups):
    # groups: list of lists of usernames
    # Returns a single round in TPDA format: [[players, gameId, [winner], "name"], ...]
    return [[group, 0, [], "test"] for group in groups]


class TournamentMatchmakingTests(SimpleTestCase):

    def test_2p_first_round_no_history(self):
        # 4 players, no history, 2p game → 2 pairs formed
        players = ["A", "B", "C", "D"]  # strongest-first
        groups = _compute_game_groups(players, [], 2)
        self.assertEqual(len(groups), 2)
        self.assertEqual(sorted(groups[0] + groups[1]), ["A", "B", "C", "D"])

    def test_2p_avoids_rematch(self):
        # Round 1: A+B, C+D. Round 2 should produce A+C or A+D (not A+B again)
        tpda = [make_tpda_round([["A", "B"], ["C", "D"]])]
        players = ["A", "B", "C", "D"]
        groups = _compute_game_groups(players, tpda, 2)
        self.assertEqual(len(groups), 2)
        for group in groups:
            self.assertEqual(len(group), 2)
        # A should NOT be paired with B again
        for group in groups:
            self.assertFalse(set(group) == {"A", "B"}, "A and B should not be rematched")
            self.assertFalse(set(group) == {"C", "D"}, "C and D should not be rematched")

    def test_3p_avoids_rematch(self):
        # Round 1: [A,B,C] and [D,E,F]. Round 2 should avoid repeating those groups.
        tpda = [make_tpda_round([["A", "B", "C"], ["D", "E", "F"]])]
        players = ["A", "B", "C", "D", "E", "F"]
        groups = _compute_game_groups(players, tpda, 3)
        self.assertEqual(len(groups), 2)
        for group in groups:
            self.assertEqual(len(group), 3)
        # Neither original group should be recreated
        self.assertFalse({"A", "B", "C"} in [set(g) for g in groups])
        self.assertFalse({"D", "E", "F"} in [set(g) for g in groups])

    def test_4p_avoids_rematch(self):
        # Round 1: [A,B,C,D] and [E,F,G,H]. Round 2 should mix them.
        tpda = [make_tpda_round([["A", "B", "C", "D"], ["E", "F", "G", "H"]])]
        players = ["A", "B", "C", "D", "E", "F", "G", "H"]
        groups = _compute_game_groups(players, tpda, 4)
        self.assertEqual(len(groups), 2)
        for group in groups:
            self.assertEqual(len(group), 4)
        self.assertFalse({"A", "B", "C", "D"} in [set(g) for g in groups])
        self.assertFalse({"E", "F", "G", "H"} in [set(g) for g in groups])

    def test_all_played_everyone_still_forms_groups(self):
        # After many rounds, everyone has faced everyone. Should still form valid groups.
        tpda = [
            make_tpda_round([["A", "B", "C"], ["D", "E", "F"]]),
            make_tpda_round([["A", "D", "E"], ["B", "C", "F"]]),
            make_tpda_round([["A", "E", "F"], ["B", "C", "D"]]),
        ]
        players = ["A", "B", "C", "D", "E", "F"]
        groups = _compute_game_groups(players, tpda, 3)
        self.assertEqual(len(groups), 2)
        all_assigned = sorted(groups[0] + groups[1])
        self.assertEqual(all_assigned, ["A", "B", "C", "D", "E", "F"])

    def test_empty_history_exact_fit(self):
        # Exactly maxGamePlayers players → one game
        players = ["X", "Y", "Z"]
        groups = _compute_game_groups(players, [], 3)
        self.assertEqual(len(groups), 1)
        self.assertEqual(sorted(groups[0]), ["X", "Y", "Z"])

    def test_respects_points_order_no_history(self):
        # With no history, strongest (first) player anchors first group
        players = ["P1", "P2", "P3", "P4"]  # P1 = strongest
        groups = _compute_game_groups(players, [], 2)
        # P1 should be in the first group
        self.assertIn("P1", groups[0])

    def test_lookahead_avoids_second_game_all_rematches(self):
        tpda = [
            make_tpda_round([["A", "B", "C"], ["D", "E", "F"]]),
            make_tpda_round([["A", "B", "D"], ["C", "E", "F"]]),
            make_tpda_round([["A", "B", "E"], ["C", "D", "F"]]),
        ]
        players = ["A", "B", "C", "D", "E", "F"]
        groups = _compute_game_groups(players, tpda, 3)
        self.assertEqual(set(groups[0]), {"A", "C", "D"})
        self.assertEqual(set(groups[1]), {"B", "E", "F"})
