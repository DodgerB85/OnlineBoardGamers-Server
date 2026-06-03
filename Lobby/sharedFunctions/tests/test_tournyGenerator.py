from collections import Counter
from itertools import combinations

from django.test import TestCase

from Lobby.sharedFunctions.tournyGenerator import (
    multiGamePlayers4p,
    multiGamePlayersRound2,
)


class TestMultiGamePlayers4p(TestCase):
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


class TestMultiGamePlayersRound2(TestCase):
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
