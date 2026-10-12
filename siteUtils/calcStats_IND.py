import base64
import datetime
import gzip
import json
import os
import sys
import time
from pathlib import Path
from statistics import mean, median

import django
from decouple import config
from django.db.models import Q

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True

# Because the live and dev servers are in different folder names, we need to go up one from that
ROOT_DIR = Path(__file__).resolve().parents[2]

if DEBUG:
    os.environ["LOCAL_DB_NAME"] = str(config("LOCAL_DB_NAME", default="password", cast=str))
    os.environ["LOCAL_DB_USER"] = str(config("LOCAL_DB_USER", default="password", cast=str))
    os.environ["LOCAL_DB_PWD"] = str(config("LOCAL_DB_PWD", default="password", cast=str))
    os.environ["LOCAL_DB_HOST"] = "127.0.0.1"

BASE_DIR = ROOT_DIR / "OnlineBoardGamers"

sys.path.append(str(BASE_DIR))

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)

django.setup()
start_calc_time = time.perf_counter()

from Lobby.models import Game  # noqa: E402
from Lobby.sharedFunctions.constants import SHADOW_USERNAMES  # noqa: E402

PLAYER_COUNTS = [2, 3, 4, 5]
COMBINED_KEY = "combined"

# RnD indices/names as used by the client (INDreference.js). Subsidy tracks only exist in games
# that were created with the matching option, so not every player array has 6 or 7 entries.
RND_TRACK_NAMES = ["Bid Multiplier", "Slots", "Mergers", "Expansion", "Hull Capacity", "Merger Subsidy", "Shipping Subsidy"]

# Company id -> type, for the original map only (the only map that is stats-included)
COMPANY_TYPES = {
    0: "Shipping",
    1: "Shipping",
    2: "Shipping",
    3: "Shipping",
    4: "Rice",
    5: "Rice",
    6: "Spice",
    7: "Spice",
    10: "Shipping",
    11: "Shipping",
    12: "Rice",
    13: "Rice",
    14: "Spice",
    15: "Spice",
    16: "Rubber",
    17: "Rubber",
    18: "Rubber",
    20: "Rice",
    21: "Spice",
    22: "Rubber",
    23: "Oil",
    24: "Oil",
    25: "Oil",
    26: "Oil",
}
COMPANY_TYPE_NAMES = ["Shipping", "Rice", "Spice", "Rubber", "Oil"]

SEAT_TITLES = ["1st", "2nd", "3rd", "4th", "5th"]


def fetch_games_to_analyse():
    """Fetches every finished IND game to analyse in one pass (winner rows only, so one row per game)."""
    query = (
        Q(gameCode="IND")
        & Q(gameStatus="FINISHED")
        & ~Q(players__player__username__in=SHADOW_USERNAMES)
        & Q(statsExcludedGame=False)
        & Q(turn__gte=4)
        & Q(maxPlayers__in=PLAYER_COUNTS)
    )

    return list(
        Game.objects.filter(query)
        .filter(players__winner=True)  # Ensures game has a winner & picks that specific user
        .exclude(players__is_missing=True)  # Drops game if ANY player is missing
        .values_list("id", "players__player__username", "maxPlayers", "gameData")
        .distinct()
        .order_by("id")
    )


def decode_game_data(game_data):
    # Old/hand-copied games may still hold plain JSON rather than base64 gzipped data
    if game_data.lstrip().startswith(("[", "{")):
        return json.loads(game_data)
    return json.loads(gzip.decompress(base64.b64decode(game_data)))


def parse_game(game_id, game_data, winner_username):
    """Turns one finished game export into the per-player end-of-game state used by the stats.

    Layout of a finished IND export: [players, cities, gameflow, history, activeCompanies]
    Player: [name, displayName, colour, moneyCash, moneyBank, slots, RnD]
    """
    data = decode_game_data(game_data)

    game_turn = int(data[2][0])

    players = []
    for seat, player_data in enumerate(data[0]):
        slots = player_data[5]
        rnd = [level for level in player_data[6]]

        company_counts = dict.fromkeys(COMPANY_TYPE_NAMES, 0)
        mergers = 0
        for slot in slots:
            if len(slot) > 1:
                mergers += 1
            for company_id in slot:
                company_type = COMPANY_TYPES.get(company_id)
                if company_type:
                    company_counts[company_type] += 1

        players.append(
            {
                "name": player_data[0],
                "is_winner": player_data[0] == winner_username,
                "seat": seat,
                "score": player_data[3] + player_data[4],
                "rnd": rnd,
                "slots_used": len([slot for slot in slots if len(slot) > 0]),
                "companies": sum(len(slot) for slot in slots),
                "mergers": mergers,
                "company_counts": company_counts,
            }
        )

    return {"game_id": game_id, "turn": game_turn, "players": players}


def mean_or_zero(values):
    return round(mean(values), 2) if values else 0


def median_or_zero(values):
    return round(median(values), 2) if values else 0


def calculate_stats(games):
    """Calculates the stats for one bucket of games (a single player count, or all combined)."""
    winners = [player for game in games for player in game["players"] if player["is_winner"]]
    others = [player for game in games for player in game["players"] if not player["is_winner"]]
    all_players = winners + others

    finished_games_count = len(games)
    game_ids = [game["game_id"] for game in games]

    def upgraded_in_game(game, track_idx, is_winner):
        return any(player["is_winner"] == is_winner and track_idx < len(player["rnd"]) and player["rnd"][track_idx] >= 2 for player in game["players"])

    def merged_in_game(game, is_winner):
        return any(player["is_winner"] == is_winner and player["mergers"] > 0 for player in game["players"])

    def owned_type_in_game(game, company_type, is_winner):
        return any(player["is_winner"] == is_winner and player["company_counts"][company_type] > 0 for player in game["players"])

    # R&D ("tech") tracks: levels start at 1, so upgrades = level - 1. A -1 subsidy entry means
    # that track was not part of the game and is skipped.
    num_tracks = max((len(player["rnd"]) for player in all_players), default=0)
    rnd_stats = {}
    chart = {"labels": [], "winner_median_upgrades": [], "other_median_upgrades": []}

    for track_idx in range(num_tracks):
        track_name = RND_TRACK_NAMES[track_idx]

        # Only players whose game actually has this track (a subsidy track is -1 when not used)
        winners_with_track = [player for player in winners if track_idx < len(player["rnd"]) and player["rnd"][track_idx] >= 1]
        others_with_track = [player for player in others if track_idx < len(player["rnd"]) and player["rnd"][track_idx] >= 1]

        winner_upgrades = [player["rnd"][track_idx] - 1 for player in winners_with_track]
        other_upgrades = [player["rnd"][track_idx] - 1 for player in others_with_track]

        winner_upgraded = [player for player in winners_with_track if player["rnd"][track_idx] >= 2]
        other_upgraded = [player for player in others_with_track if player["rnd"][track_idx] >= 2]

        # Win rate of every player (winner or not) who upgraded this track at least once
        upgraded_players = winner_upgraded + other_upgraded

        rnd_stats[track_name] = {
            "winner_avg_upgrades": mean_or_zero(winner_upgrades),
            "winner_median_upgrades": median_or_zero(winner_upgrades),
            "winner_upgraded_pct": round(len(winner_upgraded) / len(winners_with_track) * 100) if winners_with_track else 0,
            "other_avg_upgrades": mean_or_zero(other_upgrades),
            "other_median_upgrades": median_or_zero(other_upgrades),
            "other_upgraded_pct": round(len(other_upgraded) / len(others_with_track) * 100) if others_with_track else 0,
            "upgraded_players": len(upgraded_players),
            "upgraded_win_pct": round(len(winner_upgraded) / len(upgraded_players) * 100) if upgraded_players else 0,
            "winner_upgraded_game_ids": [game["game_id"] for game in games if upgraded_in_game(game, track_idx, True)],
            "other_upgraded_game_ids": [game["game_id"] for game in games if upgraded_in_game(game, track_idx, False)],
            "upgraded_game_ids": [game["game_id"] for game in games if upgraded_in_game(game, track_idx, True) or upgraded_in_game(game, track_idx, False)],
        }

        chart["labels"].append(track_name)
        chart["winner_median_upgrades"].append(rnd_stats[track_name]["winner_median_upgrades"])
        chart["other_median_upgrades"].append(rnd_stats[track_name]["other_median_upgrades"])

    # Companies owned at game end, by type (and the games where the role owned at least one)
    company_stats = {}
    for company_type in COMPANY_TYPE_NAMES:
        winner_type_game_ids = [game["game_id"] for game in games if owned_type_in_game(game, company_type, True)]
        other_type_game_ids = [game["game_id"] for game in games if owned_type_in_game(game, company_type, False)]
        company_stats[company_type] = {
            "winner_avg": mean_or_zero([player["company_counts"][company_type] for player in winners]),
            "other_avg": mean_or_zero([player["company_counts"][company_type] for player in others]),
            "winner_game_count": len(winner_type_game_ids),
            "winner_game_ids": winner_type_game_ids,
            "other_game_count": len(other_type_game_ids),
            "other_game_ids": other_type_game_ids,
        }

    def total_rnd_upgrades(player):
        return sum(max(level - 1, 0) for level in player["rnd"] if level >= 0)

    def player_summary(players):
        return {
            "avg_rnd_upgrades": mean_or_zero([total_rnd_upgrades(player) for player in players]),
            "median_rnd_upgrades": median_or_zero([total_rnd_upgrades(player) for player in players]),
            "avg_slots_used": mean_or_zero([player["slots_used"] for player in players]),
            "avg_companies": mean_or_zero([player["companies"] for player in players]),
            "avg_mergers": mean_or_zero([player["mergers"] for player in players]),
            "avg_score": mean_or_zero([player["score"] for player in players]),
            "median_score": median_or_zero([player["score"] for player in players]),
            "merged_pct": round(len([player for player in players if player["mergers"] > 0]) / len(players) * 100) if players else 0,
        }

    # Wins by starting turn position (player array order = seat order at game start)
    seat_wins = {}
    seat_games = {}
    seat_win_ids = {}
    for game in games:
        for player in game["players"]:
            seat_games[player["seat"]] = seat_games.get(player["seat"], 0) + 1
            if player["is_winner"]:
                seat_wins[player["seat"]] = seat_wins.get(player["seat"], 0) + 1
                seat_win_ids.setdefault(player["seat"], []).append(game["game_id"])

    seats = []
    for seat in sorted(seat_games):
        wins = seat_wins.get(seat, 0)
        seats.append([SEAT_TITLES[seat], wins, round(wins / seat_games[seat] * 100), seat_games[seat], seat_win_ids.get(seat, [])])

    turns = [game["turn"] for game in games]

    return {
        "finishedGamesCount": finished_games_count,
        "game_ids": game_ids,
        "avg_turns": mean_or_zero(turns),
        "median_turns": median_or_zero(turns),
        "win_pct_baseline": round(len(winners) / len(all_players) * 100) if all_players else 0,
        "rnd_stats": rnd_stats,
        "company_stats": company_stats,
        "player_summary": {
            "winner": {**player_summary(winners), "merged_game_ids": [game["game_id"] for game in games if merged_in_game(game, True)]},
            "other": {**player_summary(others), "merged_game_ids": [game["game_id"] for game in games if merged_in_game(game, False)]},
        },
        "seat_wins": seats,
        "chart": chart,
    }


def generate_stats_data():
    """Generates the stats data for every player count plus all games combined."""
    ALL_DATA: dict[str, str | int | object] = {}

    # Get the current UTC time
    current_time = datetime.datetime.now(datetime.UTC)
    time_string = current_time.strftime("%H:%M GMT - %d %B %Y")
    ALL_DATA["time_string"] = time_string

    # One pass over all games; each game goes into its player count bucket and the combined bucket
    buckets = {player_count: [] for player_count in PLAYER_COUNTS}
    buckets[COMBINED_KEY] = []

    for game_id, winner_username, max_players, game_data in fetch_games_to_analyse():
        try:
            game = parse_game(game_id, game_data, winner_username)
        except Exception as e:
            print(f"Game ERROR - COULD NOT READ {game_id}: {e}")
            continue
        buckets[max_players].append(game)
        buckets[COMBINED_KEY].append(game)

    ALL_DATA["player_counts"] = {}
    for player_count in PLAYER_COUNTS + [COMBINED_KEY]:
        ALL_DATA["player_counts"][player_count] = calculate_stats(buckets[player_count])

    return ALL_DATA


ALL_DATA = generate_stats_data()

file_path = BASE_DIR / "IND" / "INDstats" / "IND_stats.json"

with open(file_path, mode="w") as filehandle:
    json.dump(ALL_DATA, filehandle, indent=4)

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
