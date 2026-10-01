"""Availability-based scoring and bounded tournament schedule optimization."""

import itertools
import math
import random
import time
from collections import defaultdict


# Three 40-player cohorts from Result_availability.csv: 72 reduced historical repeat-pairs
# from 18 to 5 while keeping the mean slowest-table score within 3% of the speed-only search.
REMATCH_PENALTY = 72.0
ANNEALING_CYCLE_STEPS = 400
ANNEALING_TIME_LIMIT_SECONDS = 30.0


def availability_profile(move_counts, turn_counts):
    """Reconstruct the smoothed hourly profile used by FCM_profile_sim."""
    move_counts = _normalize_counts(move_counts)
    turn_counts = _normalize_counts(turn_counts)
    non_move_counts = [max(0, turns - moves) for moves, turns in zip(move_counts, turn_counts)]

    probabilities = []
    for hour in range(24):
        previous_hour = (hour - 1) % 24
        next_hour = (hour + 1) % 24
        moves = move_counts[hour] + 0.5 * (move_counts[previous_hour] + move_counts[next_hour])
        non_moves = non_move_counts[hour] + 0.5 * (non_move_counts[previous_hour] + non_move_counts[next_hour])
        probabilities.append((0.125 + moves) / (1 + moves + non_moves))
    return tuple(probabilities)


def _normalize_counts(counts):
    if not isinstance(counts, list):
        counts = []
    normalized = []
    for value in counts[:24]:
        normalized.append(value if isinstance(value, (int, float)) and value >= 0 else 0)
    return normalized + [0] * (24 - len(normalized))


def expected_response_wait(profile):
    """Average hours until a response, including repeated missed days."""
    waits = []
    for hour in range(24):
        expected_wait = 0.0
        probability_of_waiting = 1.0
        for offset in range(1, 25):
            move_probability = profile[(hour + offset) % 24]
            expected_wait += move_probability * offset * probability_of_waiting
            probability_of_waiting *= 1 - move_probability
        # Each missed day restarts the same wait, so include all subsequent days.
        waits.append((expected_wait + probability_of_waiting * 24) / (1 - probability_of_waiting))
    return sum(waits) / 24


def expected_game_duration(profiles):
    """Score sequential and simultaneous response waits with weights (1, 21)."""
    if not profiles:
        return 0.0

    single_waits = [expected_response_wait(profile) for profile in profiles]
    group_wait_terms = single_waits[:]
    # Inclusion-exclusion turns waits for the first response in each subset into
    # the wait for everyone's response: add singles, subtract pairs, add triples, etc.
    for subset_size in range(2, len(profiles) + 1):
        sign = 1 if subset_size % 2 else -1
        for subset in itertools.combinations(profiles, subset_size):
            first_response_profile = tuple(
                1 - math.prod(1 - profile[hour] for profile in subset)
                for hour in range(24)
            )
            group_wait_terms.append(sign * expected_response_wait(first_response_profile))
    simultaneous_wait = math.fsum(group_wait_terms)

    return sum(single_waits) + 21 * simultaneous_wait


def build_matchup_counts(tpda):
    matchup_counts = defaultdict(int)
    for round_data in tpda:
        for game_data in round_data:
            if game_data[0] == "BYEPLAYERS":
                continue
            for pair in itertools.combinations(game_data[0], 2):
                matchup_counts[frozenset(pair)] += 1
    return matchup_counts


def _group_score(group, profiles, matchup_counts, duration_cache):
    group_key = frozenset(group)
    if group_key not in duration_cache:
        duration_cache[group_key] = expected_game_duration([profiles[player] for player in group])
    rematches = sum(matchup_counts.get(frozenset(pair), 0) for pair in itertools.combinations(group, 2))
    return duration_cache[group_key] + REMATCH_PENALTY * rematches


def _schedule_score(groups, profiles, matchup_counts, duration_cache):
    return max((_group_score(group, profiles, matchup_counts, duration_cache) for group in groups), default=0.0)


def _stable_seed(seed):
    if isinstance(seed, int):
        return seed
    return sum((index + 1) * byte for index, byte in enumerate(str(seed).encode("utf-8")))


def _anneal(initial_state, make_groups, profiles, matchup_counts, seed, swap_slots):
    rng = random.Random(_stable_seed(seed))
    current = initial_state[:]
    best = current[:]
    duration_cache = {}
    started = time.monotonic()
    current_score = _schedule_score(make_groups(current), profiles, matchup_counts, duration_cache)
    best_score = current_score
    initial_temperature = max(1.0, current_score * 0.08)
    cycle_step = 0

    while time.monotonic() - started < ANNEALING_TIME_LIMIT_SECONDS:
        # Repeat the benchmarked cooling cycle from the best schedule found.
        if cycle_step == ANNEALING_CYCLE_STEPS:
            current = best[:]
            current_score = best_score
            initial_temperature = max(1.0, current_score * 0.08)
            cycle_step = 0

        candidate = current[:]
        first_slot, second_slot = swap_slots(rng, candidate)
        candidate[first_slot], candidate[second_slot] = candidate[second_slot], candidate[first_slot]
        candidate_score = _schedule_score(make_groups(candidate), profiles, matchup_counts, duration_cache)
        temperature = initial_temperature * (1 - cycle_step / ANNEALING_CYCLE_STEPS) ** 2

        if candidate_score < current_score or (temperature > 0 and rng.random() < math.exp((current_score - candidate_score) / temperature)):
            current = candidate
            current_score = candidate_score
        if candidate_score < best_score:
            best = candidate
            best_score = candidate_score
        cycle_step += 1

    return best


def optimize_disjoint_groups(groups, profiles, matchup_counts, seed):
    """Swap players between standard tournament games while retaining game sizes."""
    if len(groups) < 2:
        return groups

    group_sizes = [len(group) for group in groups]
    state = [player for group in groups for player in group]

    def make_groups(players):
        result = []
        offset = 0
        for size in group_sizes:
            result.append(players[offset:offset + size])
            offset += size
        return result

    def choose_slots(rng, players):
        first_group, second_group = rng.sample(range(len(groups)), 2)
        first_slot = sum(group_sizes[:first_group]) + rng.randrange(group_sizes[first_group])
        second_slot = sum(group_sizes[:second_group]) + rng.randrange(group_sizes[second_group])
        return first_slot, second_slot

    optimized = _anneal(state, make_groups, profiles, matchup_counts, seed, choose_slots)
    return make_groups(optimized)


def optimize_multigame_order(players, game_indices, profiles, matchup_counts, seed):
    """Optimize player placement in a fixed MG schedule without changing its design."""
    if not game_indices:
        return players

    def make_groups(order):
        return [[order[index] for index in game] for game in game_indices]

    def choose_slots(rng, order):
        return tuple(rng.sample(range(len(order)), 2))

    return _anneal(players, make_groups, profiles, matchup_counts, seed, choose_slots)


def multigame_round_two_indices():
    group_games = [
        [0, 1, 2, 4],
        [0, 1, 3, 5],
        [0, 2, 3, 6],
        [0, 4, 5, 6],
        [1, 2, 5, 6],
        [1, 3, 4, 6],
        [2, 3, 4, 5],
    ]
    return group_games + [[index + 7 for index in game] for game in group_games]


def multigame_round_one_indices(player_count):
    return [[(offset + difference) % player_count for difference in (0, 1, 3, 7)] for offset in range(player_count)]
