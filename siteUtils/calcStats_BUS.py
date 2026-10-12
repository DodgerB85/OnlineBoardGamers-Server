import base64
import datetime
import gzip
import json
import math
import os
import sys
import time
from pathlib import Path
from statistics import mean, median

import django
import msgpack
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

from Lobby.models import Game, GamePlayer  # noqa: E402
from Lobby.sharedFunctions.constants import SHADOW_USERNAMES  # noqa: E402

PLAYER_COUNTS = [3, 4, 5]
COMBINED_KEY = "combined"

# History types/ids as used by the client (BUSreference.js). A history entry is
# [type, playerIndex, secondsSinceGameStart, payload].
HIST_NEW_TURN = 0
HIST_RESIGN = 3
HIST_KICKOUT = 4
HIST_ADD_BLDG = 10
HIST_CHOOSE_ACTION = 12
HIST_ADD_BUS = 13
HIST_ALTER_TIME = 15
HIST_VROM = 20

# The seven chosen actions, in the order the client's action board shows them (ActionSelection.vue).
# Choosing 10 ("stop here") or 11 ("pass the rest") costs no action point, so they are not counted.
ACTION_NAMES = ["Line Expansion", "New Bus", "Passengers", "New Building", "Stop Time", "Vrrooomm!", "Change Start Player"]

STARTING_ACTIONS = 20
STARTING_BUSES = 1

# 3 player games start with one time stone fewer (BUSmodel.js initGame)
TIME_STONES_BY_PLAYERS = {3: 4, 4: 5, 5: 5}

END_TIME_STONES = "Time stones ran out"
END_ACTIONS = "Players ran out of actions"
END_OTHER = "No building spots / unknown"

SEAT_TITLES = ["1st", "2nd", "3rd", "4th", "5th"]


def fetch_games_to_analyse():
    """Fetches every finished BUS game with a winner, plus a {game_id: {seat: isWinner}} lookup.

    Player names inside gameData go stale when a user renames themselves, so seats (which the
    gameData player array is ordered by) are the reliable link to the winner flag.
    """
    query = (
        Q(gameCode="BUS")
        & Q(gameStatus="FINISHED")
        & ~Q(players__player__username__in=SHADOW_USERNAMES)
        & Q(statsExcludedGame=False)
        & Q(maxPlayers__in=PLAYER_COUNTS)
    )

    games = list(
        Game.objects.filter(query)
        .filter(players__winner=True)  # Ensures game has a winner & picks that specific user
        .exclude(players__is_missing=True)  # Drops game if ANY player is missing
        .values_list("id", "maxPlayers", "gameData")
        .distinct()
        .order_by("id")
    )

    seats_by_game = {}
    for game_id, seat_order, is_winner in GamePlayer.objects.filter(game_id__in=[game[0] for game in games]).values_list("game_id", "seat_order", "winner"):
        seats_by_game.setdefault(game_id, {})[seat_order] = is_winner

    return games, seats_by_game


def decode_game_data(game_data):
    # Old/hand-copied games may still hold plain JSON rather than base64 gzipped msgpack
    if game_data.lstrip().startswith(("[", "{")):
        return json.loads(game_data)
    return msgpack.unpackb(gzip.decompress(base64.b64decode(game_data)), raw=False)


def parse_game(game_id, game_data, seats):
    """Turns one finished game export into the per-player end-of-game state used by the stats.

    Layout of a finished export: [players, junctions, lines, actionArea, history, desiredBuilding]
    Player: [name(, displayName), colour, score, maxScore]. Score carries tie-break decimals, so
    the actual points are its floor. Everything else (turns, buses, time stones, actions) is
    rebuilt by replaying the history, exactly like the client does when loading a finished game.
    """
    data = decode_game_data(game_data)
    history = data[4]

    # A game where someone resigned or was kicked out never finished properly
    if any(entry[0] in (HIST_RESIGN, HIST_KICKOUT) for entry in history):
        return None

    # A few games have gameData with more players than there are GamePlayer rows
    if len(seats) != len(data[0]):
        return None

    turns = sum(1 for entry in history if entry[0] == HIST_NEW_TURN)

    # 2 - lines, compressed to {player index (as a string): [line ids]}
    lines_by_player = {int(player_index): line_ids for player_index, line_ids in data[2].items()}

    players = []
    for seat, player_data in enumerate(data[0]):
        action_counts = [0] * len(ACTION_NAMES)
        buildings = 0
        buses = STARTING_BUSES
        time_stones = 0
        deliveries = 0

        for entry in history:
            if entry[1] != seat:
                continue
            if entry[0] == HIST_CHOOSE_ACTION:
                # Very old saves used a richer payload here; the client ignores those too
                action = entry[3][0] if entry[3] else None
                if isinstance(action, int) and 0 <= action < len(action_counts):
                    action_counts[action] += 1
            elif entry[0] == HIST_ADD_BLDG:
                buildings += 1
            elif entry[0] == HIST_ADD_BUS:
                buses += 1
            elif entry[0] == HIST_ALTER_TIME and len(entry[3]) > 1 and entry[3][1] != 0:
                time_stones += 1
            elif entry[0] == HIST_VROM:
                # [fromJunction, toJunction, building] is a delivered passenger. Shorter entries
                # are no-op markers, longer ones are Pittsburgh designers (not stats-included).
                deliveries += sum(1 for item in entry[3] if isinstance(item, list) and len(item) == 3)

        players.append(
            {
                "seat": seat,
                "is_winner": seats[seat],
                "score": math.floor(player_data[2]),
                "action_counts": action_counts,
                "lines_placed": len(lines_by_player.get(seat, [])),
                "buildings": buildings,
                "buses": buses,
                "time_stones": time_stones,
                "deliveries": deliveries,
                "actions_left": STARTING_ACTIONS - sum(action_counts),
            }
        )

    remaining_time_stones = TIME_STONES_BY_PLAYERS.get(len(players), 5) - sum(player["time_stones"] for player in players)
    if remaining_time_stones <= 0:
        end_reason = END_TIME_STONES
    elif sum(1 for player in players if player["actions_left"] > 0) <= 1:
        end_reason = END_ACTIONS
    else:
        end_reason = END_OTHER

    return {"game_id": game_id, "turn": turns, "end_reason": end_reason, "players": players}


def mean_or_zero(values):
    return round(mean(values), 2) if values else 0


def median_or_zero(values):
    return round(median(values), 2) if values else 0


def calculate_stats(games):
    """Calculates the stats for one bucket of games (a single player count, or all combined)."""
    winners = [player for game in games for player in game["players"] if player["is_winner"]]
    others = [player for game in games for player in game["players"] if not player["is_winner"]]

    finished_games_count = len(games)
    game_ids = [game["game_id"] for game in games]

    def used_action_in_game(game, action_idx, is_winner):
        return any(player["is_winner"] == is_winner and player["action_counts"][action_idx] > 0 for player in game["players"])

    # Chosen actions: the average times each group spent an action point on that action, plus the
    # win rate of every player (winner or not) who used the action at least once
    action_stats = {}
    chart = {"labels": [], "winner_avg": [], "other_avg": []}
    for action_idx, action_name in enumerate(ACTION_NAMES):
        winner_users = [player for player in winners if player["action_counts"][action_idx] > 0]
        other_users = [player for player in others if player["action_counts"][action_idx] > 0]
        users = winner_users + other_users

        used_game_ids = [game["game_id"] for game in games if used_action_in_game(game, action_idx, True) or used_action_in_game(game, action_idx, False)]

        action_stats[action_name] = {
            "winner_avg": mean_or_zero([player["action_counts"][action_idx] for player in winners]),
            "other_avg": mean_or_zero([player["action_counts"][action_idx] for player in others]),
            "used_win_pct": round(len(winner_users) / len(users) * 100) if users else 0,
            "used_game_ids": used_game_ids,
            "used_game_count": len(used_game_ids),
        }

        chart["labels"].append(action_name)
        chart["winner_avg"].append(action_stats[action_name]["winner_avg"])
        chart["other_avg"].append(action_stats[action_name]["other_avg"])

    def delivered_in_game(game, is_winner):
        return any(player["is_winner"] == is_winner and player["deliveries"] > 0 for player in game["players"])

    def player_summary(players):
        return {
            "avg_score": mean_or_zero([player["score"] for player in players]),
            "median_score": median_or_zero([player["score"] for player in players]),
            "avg_time_stones": mean_or_zero([player["time_stones"] for player in players]),
            "avg_buses": mean_or_zero([player["buses"] for player in players]),
            "avg_actions_used": mean_or_zero([STARTING_ACTIONS - player["actions_left"] for player in players]),
            "avg_lines_placed": mean_or_zero([player["lines_placed"] for player in players]),
            "avg_buildings": mean_or_zero([player["buildings"] for player in players]),
            "avg_deliveries": mean_or_zero([player["deliveries"] for player in players]),
            "delivered_pct": round(len([player for player in players if player["deliveries"] > 0]) / len(players) * 100) if players else 0,
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

    # Why the games ended
    end_reasons = {}
    for reason in [END_TIME_STONES, END_ACTIONS, END_OTHER]:
        reason_game_ids = [game["game_id"] for game in games if game["end_reason"] == reason]
        end_reasons[reason] = {
            "game_count": len(reason_game_ids),
            "pct": round(len(reason_game_ids) / finished_games_count * 100) if finished_games_count else 0,
            "game_ids": reason_game_ids,
        }

    winner_delivered_game_ids = [game["game_id"] for game in games if delivered_in_game(game, True)]
    other_delivered_game_ids = [game["game_id"] for game in games if delivered_in_game(game, False)]

    turns = [game["turn"] for game in games]

    return {
        "finishedGamesCount": finished_games_count,
        "game_ids": game_ids,
        "avg_turns": mean_or_zero(turns),
        "median_turns": median_or_zero(turns),
        "action_stats": action_stats,
        "end_reasons": end_reasons,
        "player_summary": {
            "winner": {**player_summary(winners), "delivered_game_ids": winner_delivered_game_ids, "delivered_game_count": len(winner_delivered_game_ids)},
            "other": {**player_summary(others), "delivered_game_ids": other_delivered_game_ids, "delivered_game_count": len(other_delivered_game_ids)},
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

    games, seats_by_game = fetch_games_to_analyse()

    # One pass over all games; each game goes into its player count bucket and the combined bucket
    buckets = {player_count: [] for player_count in PLAYER_COUNTS}
    buckets[COMBINED_KEY] = []

    for game_id, max_players, game_data in games:
        try:
            game = parse_game(game_id, game_data, seats_by_game[game_id])
        except Exception as e:
            print(f"Game ERROR - COULD NOT READ {game_id}: {e}")
            continue
        if game is None:
            continue
        buckets[max_players].append(game)
        buckets[COMBINED_KEY].append(game)

    ALL_DATA["player_counts"] = {}
    for player_count in PLAYER_COUNTS + [COMBINED_KEY]:
        ALL_DATA["player_counts"][player_count] = calculate_stats(buckets[player_count])

    return ALL_DATA


ALL_DATA = generate_stats_data()

file_path = BASE_DIR / "BUS" / "BUSstats" / "BUS_stats.json"

with open(file_path, mode="w") as filehandle:
    json.dump(ALL_DATA, filehandle, indent=4)

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
