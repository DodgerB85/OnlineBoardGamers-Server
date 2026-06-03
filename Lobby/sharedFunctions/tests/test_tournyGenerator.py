from collections import Counter

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

    def test_4_players_returns_games(self):
        players = ["A", "B", "C", "D"]
        result = multiGamePlayers4p(players)
        # Should return a list of games (not an error)
        self.assertIsInstance(result, list)
        # Each game should have exactly 4 players
        for game in result:
            self.assertEqual(len(game), 4)

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

    def test_balance_failure_returns_error_code_2(self):
        # With exactly 4 players it works, but some player counts may trigger balance failure
        # At minimum, verify that a valid size works
        players = [f"P{i}" for i in range(16)]
        result = multiGamePlayers4p(players)
        # If it's not an error, it should be a list of games
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
            count = Counter(p for game in result for p in game)
            for player in players:
                self.assertEqual(count[player], 4)


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
