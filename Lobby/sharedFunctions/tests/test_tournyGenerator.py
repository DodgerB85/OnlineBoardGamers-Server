from collections import Counter
from itertools import combinations

from django.test import TestCase

from Lobby.sharedFunctions.tournyGenerator import (
    _compute_game_groups,
    multiGamePlayers4p,
    multiGamePlayersRound2,
)


class PrintSuccessTestCase(TestCase):
    def tearDown(self):
        super().tearDown()
        outcome = getattr(self, '_outcome', None)
        if outcome is None:
            return
        errors = [test for test, _ in getattr(outcome, 'errors', [])]
        failures = [test for test, _ in getattr(outcome, 'failures', [])]
        if self not in errors and self not in failures:
            print(f"  PASS: {self.__class__.__name__}.{self._testMethodName}")


class TestMultiGamePlayers4p(PrintSuccessTestCase):
    def test_fewer_than_4_players_returns_error(self):
        result = multiGamePlayers4p(["A", "B", "C"])
        self.assertEqual(result[0], 1)
        self.assertIn("Need at least 4 players", result[1])

    def test_4_players_returns_error(self):
        players = ["A", "B", "C", "D"]
        result = multiGamePlayers4p(players)
        self.assertEqual(result[0], 1)
        self.assertIn("Need at least 15 players", result[1])

    def test_generated_games_have_unique_players(self):
        players = [f"P{i}" for i in range(15)]
        result = multiGamePlayers4p(players)
        for game in result:
            self.assertEqual(len(game), 4)
            self.assertEqual(len(set(game)), 4)

    def test_all_players_play_exactly_4_games(self):
        players = [f"P{i}" for i in range(16)]
        result = multiGamePlayers4p(players)
        self.assertIsInstance(result, list)
        count = Counter(p for game in result for p in game)
        for player in players:
            self.assertEqual(count[player], 4)

    def test_number_of_games_equals_player_count(self):
        players = [f"P{i}" for i in range(20)]
        result = multiGamePlayers4p(players)
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), len(players))

    def test_each_game_has_4_players(self):
        players = [f"P{i}" for i in range(18)]
        result = multiGamePlayers4p(players)
        self.assertIsInstance(result, list)
        for game in result:
            self.assertEqual(len(game), 4)

    def test_too_few_players_for_round_1_returns_error(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayers4p(players)
        self.assertEqual(result[0], 1)
        self.assertIn("Need at least 15 players", result[1])

    def test_valid_schedules_do_not_repeat_pairs(self):
        players = [f"P{i}" for i in range(20)]
        result = multiGamePlayers4p(players)
        pair_counts = Counter(pair for game in result for pair in combinations(sorted(game), 2))
        self.assertTrue(pair_counts)
        self.assertTrue(all(count == 1 for count in pair_counts.values()))


class TestMultiGamePlayersRound2(PrintSuccessTestCase):
    def test_requires_exactly_14_players(self):
        with self.assertRaises(AssertionError):
            multiGamePlayersRound2([f"P{i}" for i in range(10)])

    def test_returns_14_games(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayersRound2(players)
        self.assertEqual(len(result), 14)

    def test_each_game_has_4_players(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayersRound2(players)
        for game in result:
            self.assertEqual(len(game), 4)

    def test_group_a_uses_first_7_players(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayersRound2(players)
        group_a_games = result[:7]
        group_a_players = set()
        for game in group_a_games:
            group_a_players.update(game)
        # All group A players should be from the first 7
        for p in group_a_players:
            self.assertIn(p, players[:7])

    def test_group_b_uses_last_7_players(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayersRound2(players)
        group_b_games = result[7:]
        group_b_players = set()
        for game in group_b_games:
            group_b_players.update(game)
        for p in group_b_players:
            self.assertIn(p, players[7:])

    def test_each_player_plays_4_games_within_group(self):
        players = [f"P{i}" for i in range(14)]
        result = multiGamePlayersRound2(players)
        count = Counter(p for game in result for p in game)
        for player in players:
            self.assertEqual(count[player], 4)


def _make_tpda_round(groups):
    # groups: list of lists of usernames
    # Returns a single round in TPDA format: [[players, gameId, [winner], name], ...]
    return [[group, 0, [], "test"] for group in groups]


class TestComputeGameGroups(PrintSuccessTestCase):
    """Verify non-MG tournament round creation (extracted logic)."""

    def test_forms_correct_groups_no_history(self):
        players = ["A", "B", "C", "D"]
        games = _compute_game_groups(players, [], 2)
        self.assertEqual(len(games), 2)
        self.assertEqual(len(games[0]), 2)
        self.assertEqual(len(games[1]), 2)
        self.assertEqual(len(players), 0)

    def test_leaves_leftovers_when_players_exceed_full_groups(self):
        players = ["A", "B", "C", "D", "E"]
        games = _compute_game_groups(players, [], 2)
        self.assertEqual(len(games), 2)
        self.assertEqual(len(players), 1)

    def test_avoids_repeating_previous_matchups(self):
        tpda = [_make_tpda_round([["A", "B", "C", "D"], ["E", "F", "G", "H"]])]
        players = ["A", "B", "C", "D", "E", "F", "G", "H"]
        games = _compute_game_groups(players, tpda, 4)
        self.assertEqual(len(games), 2)
        for game in games:
            self.assertEqual(len(game), 4)
        self.assertFalse({"A", "B", "C", "D"} in [set(g) for g in games])
        self.assertFalse({"E", "F", "G", "H"} in [set(g) for g in games])

    def test_mini_leftover_appended_when_two_or_more_remain(self):
        """Simulates the MiniT leftover pattern from SF_createNextRoundGamesSetup."""
        # 6 players, maxGamePlayers=4 → 1 full game + 2 leftovers
        all_players = ["F", "E", "D", "C", "B", "A"]  # reversed strongest-first
        remaining = all_players[:]
        games = _compute_game_groups(remaining, [], 4)

        # Verify _compute_game_groups consumed 4 players
        self.assertEqual(len(games), 1)
        self.assertEqual(len(games[0]), 4)
        self.assertEqual(len(remaining), 2)

        # Simulate the MiniT append that happens in SF_createNextRoundGamesSetup
        if len(remaining) >= 2:
            games.append(remaining[:])
            remaining.clear()

        self.assertEqual(len(games), 2)
        self.assertEqual(len(games[1]), 2)
        self.assertEqual(len(remaining), 0)

    def test_mini_leftover_not_appended_when_one_remains(self):
        """Simulates the MainT path where a single leftover gets a bye instead."""
        # 5 players, maxGamePlayers=4 → 1 full game + 1 leftover
        all_players = ["E", "D", "C", "B", "A"]
        remaining = all_players[:]
        games = _compute_game_groups(remaining, [], 4)

        self.assertEqual(len(games), 1)
        self.assertEqual(len(games[0]), 4)
        self.assertEqual(len(remaining), 1)

        # A single leftover would become a bye in MainT, not a game
        appended = False
        if len(remaining) >= 2:
            games.append(remaining[:])
            remaining.clear()
            appended = True

        self.assertFalse(appended)
        self.assertEqual(len(games), 1)
