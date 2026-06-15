import itertools
from collections import Counter, defaultdict


def multiGamePlayers4p(players):
    # THIS REQUIRES A PRE-SHUFFLED PLAYER LIST
    """
    THE TRUE UNIVERSAL GENERATOR — BASED ON YOUR BRILLIANT INSIGHT
    Uses the difference set {0, 1, 3, 7} modulo n
    Works perfectly for n where this set generates a (v,4,1)-design
    → ZERO repeated partners
    → Exactly n games
    → Every player plays exactly 4 games
    → Matches your 16, 17, 18, 20 examples perfectly
    """
    total_players = len(players)
    if total_players < 4:
        return [1, "Need at least 4 players"]
    if total_players < 15:
        return [1, "Need at least 15 players"]

    # The magic difference set: {0, 1, 3, 7}
    base_differences = [0, 1, 3, 7]

    games = []
    seen_pairs = set()

    for offset in range(total_players):
        game = [(offset + diff) % total_players for diff in base_differences]
        game_players = [players[i] for i in game]
        games.append(game_players)

        # Optional: verify no repeats (will pass when design exists)
        for a, b in __import__("itertools").combinations(sorted(game), 2):
            pair = tuple(sorted((a, b)))
            if pair in seen_pairs:
                print(
                    f"Warning: repeat detected at offset {offset}: {pair} -- len(players): {len(players)}"
                )
            seen_pairs.add(pair)

    # Final check
    from collections import Counter

    count = Counter(p for game in games for p in game)
    if any(count.get(p, 0) != 4 for p in players):
        return [2, "Balance failed!"]

    return games


# You must pass in 14 players from round 1
# First 7 should be in group A, second 7 should be in group B
def multiGamePlayersRound2(players):

    assert len(players) == 14

    # Snake into two groups of 7
    # A = players[0::2]   # 0,2,4,6,8,10,12
    # B = players[1::2]   # 1,3,5,7,9,11,13
    # Split into 2 groups of 7
    A = players[:7]
    B = players[7:]

    games = [
        # Group A
        [A[0], A[1], A[2], A[4]],
        [A[0], A[1], A[3], A[5]],
        [A[0], A[2], A[3], A[6]],
        [A[0], A[4], A[5], A[6]],
        [A[1], A[2], A[5], A[6]],
        [A[1], A[3], A[4], A[6]],
        [A[2], A[3], A[4], A[5]],
        # Group B
        [B[0], B[1], B[2], B[4]],
        [B[0], B[1], B[3], B[5]],
        [B[0], B[2], B[3], B[6]],
        [B[0], B[4], B[5], B[6]],
        [B[1], B[2], B[5], B[6]],
        [B[1], B[3], B[4], B[6]],
        [B[2], B[3], B[4], B[5]],
    ]

    return games


def _build_matchup_counts(tpda):
    matchupCounts = defaultdict(int)
    for round in tpda:
        for game in round:
            if game[0] != "BYEPLAYERS":
                players = game[0]
                for pair in itertools.combinations(players, 2):
                    matchupCounts[frozenset(pair)] += 1
    return matchupCounts


def _candidate_score(matchupCounts, currentPlayers, candidate):
    return max(matchupCounts[frozenset({player, candidate})] for player in currentPlayers)


def _simulate_best_next_game_scores(players_list, matchupCounts, max_game_players):
    if len(players_list) < max_game_players:
        return []

    remainingPlayers = players_list[:]
    currentPlayers = [remainingPlayers.pop(0)]
    selectedScores = []

    while len(currentPlayers) < max_game_players and remainingPlayers:
        candidateScores = {}
        for candidate in remainingPlayers:
            candidateScores[candidate] = _candidate_score(matchupCounts, currentPlayers, candidate)

        minScore = min(candidateScores.values())
        selectedCandidate = next(candidate for candidate in remainingPlayers if candidateScores[candidate] == minScore)

        selectedScores.append(minScore)
        currentPlayers.append(selectedCandidate)
        remainingPlayers.remove(selectedCandidate)

    return selectedScores


def _next_game_would_be_all_rematches(currentPlayers, candidate, players_list, matchupCounts, max_game_players):
    hypotheticalRemainingPlayers = players_list[:]
    hypotheticalRemainingPlayers.remove(candidate)
    hypotheticalCurrentPlayers = currentPlayers[:] + [candidate]

    while len(hypotheticalCurrentPlayers) < max_game_players and hypotheticalRemainingPlayers:
        candidateScores = {}
        for nextCandidate in hypotheticalRemainingPlayers:
            candidateScores[nextCandidate] = _candidate_score(matchupCounts, hypotheticalCurrentPlayers, nextCandidate)

        minScore = min(candidateScores.values())
        selectedCandidate = next(nextCandidate for nextCandidate in hypotheticalRemainingPlayers if candidateScores[nextCandidate] == minScore)
        hypotheticalCurrentPlayers.append(selectedCandidate)
        hypotheticalRemainingPlayers.remove(selectedCandidate)

    if len(hypotheticalRemainingPlayers) < max_game_players:
        return False

    nextGameScores = _simulate_best_next_game_scores(hypotheticalRemainingPlayers, matchupCounts, max_game_players)
    return bool(nextGameScores) and all(score > 0 for score in nextGameScores)


def _compute_game_groups(players_list, tpda, max_game_players):
    # players_list: list of usernames, strongest-first, byes already removed (mutated in place)
    # tpda: list of rounds (tournamentProgressionData already parsed)
    # max_game_players: int
    # Returns: list of groups (each group is a list of usernames)
    matchupCounts = _build_matchup_counts(tpda)

    gamesPlayers = []
    while len(players_list) >= max_game_players:
        currentPlayers = [players_list.pop(0)]
        candidates = players_list.copy()

        while len(currentPlayers) < max_game_players and candidates:
            candidateScores = {}
            for candidate in candidates:
                candidateScores[candidate] = _candidate_score(matchupCounts, currentPlayers, candidate)

            orderedCandidates = [candidate for _, candidate in sorted(enumerate(candidates), key=lambda item: (candidateScores[item[1]], item[0]))]
            selectedCandidate = orderedCandidates[0]

            futurePlayersAfterThisGame = len(players_list) - (max_game_players - len(currentPlayers))
            if futurePlayersAfterThisGame >= max_game_players and _next_game_would_be_all_rematches(currentPlayers, selectedCandidate, players_list, matchupCounts, max_game_players):
                for alternateCandidate in orderedCandidates[1:]:
                    if not _next_game_would_be_all_rematches(currentPlayers, alternateCandidate, players_list, matchupCounts, max_game_players):
                        selectedCandidate = alternateCandidate
                        break

            currentPlayers.append(selectedCandidate)
            players_list.remove(selectedCandidate)
            candidates.remove(selectedCandidate)

        while len(currentPlayers) < max_game_players and players_list:
            currentPlayers.append(players_list.pop(0))

        gamesPlayers.append(currentPlayers)

    return gamesPlayers


def show_pair_counts(schedule, players):
    """
    Shows how many times each pair of players sits at the same table.
    Perfect for checking balance in 4-player games.
    """
    pair_count = Counter()

    # Count every pair in every game
    for game in schedule:
        # All unique pairs in this game (there are C(4,2)=6 per game)
        for p1, p2 in itertools.combinations(sorted(game), 2):
            pair_count[(p1, p2)] += 1

    # Print nicely
    print(f"\nPAIR FREQUENCY (out of {len(schedule)} games):")
    print("-" * 50)

    # Group by frequency
    freq = Counter(pair_count.values())
    for times in sorted(freq):
        count = freq[times]
        print(f"{times} time(s) together → {count} pairs")

    print("-" * 50)

    # Optional: show worst/best cases
    if pair_count:
        max_times = max(pair_count.values())
        min_times = min(pair_count.values())
        max_pairs = [f"{a}-{b}" for (a, b), c in pair_count.items() if c == max_times]
        min_pairs = [f"{a}-{b}" for (a, b), c in pair_count.items() if c == min_times]

        print(
            f"Most frequent together ({max_times}x): {', '.join(max_pairs[:5])}{'...' if len(max_pairs) > 5 else ''}"
        )
        print(
            f"Least frequent together ({min_times}x): {', '.join(min_pairs[:5])}{'...' if len(min_pairs) > 5 else ''}"
        )

    return pair_count


# TEST WITH 14 PLAYERS — NOW WORKS EVERY TIME
if __name__ == "__main__":
    players_14 = [f"P{i:02d}" for i in range(1, 15)]
    games = multiGamePlayersRound2(players_14)
    print(games)
    # Show the pair analysis
    pair_data = show_pair_counts(games, players_14)

    exit()

    for i in range(16, 100):
        players_14 = [f"P{j:02d}" for j in range(1, i)]
        schedule = multiGamePlayers4p(players_14)
        if len(schedule) == 2:
            print(f"Found solution for {i} players!")
            print(schedule[1])
            break

    # print("\n14-Player Perfect Schedule:\n")
    # for i, game in enumerate(schedule, 1):
    #    print(f"Table {i:2d}: {', '.join(game)}")

    # Verification
    # count = Counter()
    # for game in schedule:
    #    count.update(game)
    # print("\nVerification — all must be 4:")
    # for p in sorted(count):
    #    print(f"{p}: {count[p]}")
