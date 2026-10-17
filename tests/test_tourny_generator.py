from collections import Counter
from itertools import combinations
from math import prod
from unittest.mock import Mock, patch

from django.test import TestCase

from Lobby.sharedFunctions.tournyGenerator import (
    _compute_game_groups,
    multiGamePlayers4p,
    multiGamePlayersRound2,
)
from Lobby.sharedFunctions.availabilityMatchmaking import (
    _anneal,
    availability_profile,
    build_matchup_counts,
    expected_game_duration,
    multigame_round_one_indices,
    multigame_round_two_indices,
    optimize_disjoint_groups,
    optimize_multigame_order,
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


class TestAvailabilityMatchmaking(PrintSuccessTestCase):
    def setUp(self):
        super().setUp()
        time_limit_patch = patch("Lobby.sharedFunctions.availabilityMatchmaking.ANNEALING_TIME_LIMIT_SECONDS", 0.02)
        self.addCleanup(time_limit_patch.stop)
        time_limit_patch.start()

    def test_empty_observations_use_uniform_prior(self):
        profile = availability_profile([], [])

        self.assertEqual(profile, (0.125,) * 24)

    def test_single_player_wait_includes_days_without_a_response(self):
        profile = (0.01,) * 24
        single_wait = 100.0
        group_wait = single_wait

        self.assertAlmostEqual(expected_game_duration([profile]), single_wait + 21 * group_wait)

    def test_single_player_daily_window_includes_repeated_missed_days(self):
        for available_hour in (0, 3, 23):
            with self.subTest(available_hour=available_hour):
                profile = tuple(0.6 if hour == available_hour else 0.0 for hour in range(24))
                # Average first opportunity is 12.5 hours; missed days add 24 * 0.4 / 0.6.
                single_wait = 28.5
                group_wait = single_wait

                self.assertAlmostEqual(expected_game_duration([profile]), single_wait + 21 * group_wait)

    def test_group_wait_allows_responses_in_different_hours(self):
        even_hour_player = tuple(1.0 if hour % 2 == 0 else 0.0 for hour in range(24))
        odd_hour_player = tuple(1.0 if hour % 2 == 1 else 0.0 for hour in range(24))

        # Each player averages 1.5 hours; both have responded after exactly 2 hours.
        single_wait_sum = 3.0
        group_wait = 2.0

        self.assertAlmostEqual(
            expected_game_duration([even_hour_player, odd_hour_player]),
            single_wait_sum + 21 * group_wait,
        )

    def test_six_player_group_wait_includes_responses_after_one_day(self):
        hourly_probabilities = (0.01, 0.02, 0.03, 0.04, 0.05, 0.06)
        profiles = [(probability,) * 24 for probability in hourly_probabilities]
        single_wait_sum = sum(1 / probability for probability in hourly_probabilities)
        # Sum the chance someone is still missing after each hour. At 5,000 hours,
        # even the slowest player's remaining chance is below 2e-22.
        group_wait = sum(
            1 - prod(1 - (1 - probability) ** hours for probability in hourly_probabilities)
            for hours in range(5000)
        )

        self.assertAlmostEqual(expected_game_duration(profiles), single_wait_sum + 21 * group_wait)

    def test_six_player_daily_window_includes_repeated_missed_days(self):
        profile = (0.6,) + (0.0,) * 23
        single_wait_sum = 6 * 28.5
        # The first daily window averages 12.5 hours away. Add a day whenever
        # at least one player has missed every window so far.
        group_wait = 12.5 + 24 * sum(1 - (1 - 0.4 ** days) ** 6 for days in range(1, 200))

        self.assertAlmostEqual(expected_game_duration([profile] * 6), single_wait_sum + 21 * group_wait)

    def test_annealing_restarts_from_best_and_improves_after_400_swaps(self):
        initial = ["A", "B", "C", "D"]
        choose_slots = Mock(side_effect=[(0, 1)] + [(2, 3)] * 399 + [(1, 2)])
        rng = Mock()
        rng.random.return_value = 0.0
        # The first swap finds a better state, then accepted worse swaps leave
        # the current state elsewhere. Swap 401 improves from the saved best.
        scores = {
            ("A", "B", "C", "D"): 100.0,
            ("B", "A", "C", "D"): 50.0,
            ("B", "A", "D", "C"): 50.01,
            ("B", "C", "A", "D"): 40.0,
            ("B", "D", "A", "C"): 200.0,
        }
        clock = [0.0] * 402 + [30.0]

        with (
            patch("Lobby.sharedFunctions.availabilityMatchmaking.ANNEALING_TIME_LIMIT_SECONDS", 30.0),
            patch("Lobby.sharedFunctions.availabilityMatchmaking.time.monotonic", side_effect=clock),
            patch("Lobby.sharedFunctions.availabilityMatchmaking.random.Random", return_value=rng),
            patch("Lobby.sharedFunctions.availabilityMatchmaking._schedule_score", side_effect=lambda groups, profiles, counts, cache: scores[tuple(groups[0])]) as score,
        ):
            optimized = _anneal(initial, lambda players: [players], {}, {}, "cycles", choose_slots)

        self.assertEqual(choose_slots.call_count, 401)
        self.assertEqual(score.call_count, 402)
        self.assertEqual(score.call_args_list[401].args[0], [["B", "C", "A", "D"]])
        self.assertEqual(optimized, ["B", "C", "A", "D"])
        self.assertEqual(initial, ["A", "B", "C", "D"])

    def test_standard_optimizer_preserves_group_sizes_and_players(self):
        groups = [["A", "B"], ["C", "D"]]
        profiles = {player: availability_profile([], []) for player in "ABCD"}

        optimized = optimize_disjoint_groups(groups, profiles, {}, "test-seed")

        self.assertEqual([len(group) for group in optimized], [2, 2])
        self.assertEqual(sorted(player for group in optimized for player in group), list("ABCD"))

    def test_mg_optimizers_preserve_schedule_shape_and_round_two_groups(self):
        profiles = {f"P{index}": availability_profile([], []) for index in range(20)}
        first_round = [f"P{index}" for index in range(20)]
        optimized_first_round = optimize_multigame_order(
            first_round,
            multigame_round_one_indices(len(first_round)),
            profiles,
            {},
            "mg-r1",
        )
        first_round_games = multiGamePlayers4p(optimized_first_round)
        self.assertEqual(len(first_round_games), 20)
        self.assertTrue(all(len(game) == 4 for game in first_round_games))
        self.assertEqual(Counter(player for game in first_round_games for player in game), Counter({player: 4 for player in first_round}))

        second_round = [f"P{index}" for index in range(14)]
        indices = multigame_round_two_indices()
        optimized_second_round = optimize_multigame_order(
            second_round[:7], indices[:7], profiles, {}, "mg-r2-a"
        ) + optimize_multigame_order(
            second_round[7:], [[index - 7 for index in game] for game in indices[7:]], profiles, {}, "mg-r2-b"
        )
        second_round_games = multiGamePlayersRound2(optimized_second_round)
        self.assertEqual(len(second_round_games), 14)
        self.assertTrue(all(len(game) == 4 for game in second_round_games))
        self.assertTrue(all(set(game) <= set(second_round[:7]) for game in second_round_games[:7]))
        self.assertTrue(all(set(game) <= set(second_round[7:]) for game in second_round_games[7:]))

    def test_rematch_counts_ignore_byes(self):
        tpda = [_make_tpda_round([["A", "B", "C", "D"]]) + [["BYEPLAYERS", "E"]]]

        counts = build_matchup_counts(tpda)

        self.assertEqual(counts[frozenset({"A", "B"})], 1)
        self.assertEqual(counts[frozenset({"A", "E"})], 0)
