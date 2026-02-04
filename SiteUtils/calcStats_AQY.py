import os
import sys
import time
from pathlib import Path
from decouple import config
from collections import Counter

from django.db.models import Q
import json
import django
import datetime
import base64
import gzip
from typing import List, Union, Dict

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

# 3. Now sys.path.append is much cleaner
sys.path.append(str(BASE_DIR))

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)

# print(BASE_DIR)

django.setup()
start_calc_time = time.perf_counter()

from Lobby.models import Game

# Saints
SAINT_GIORGIO = 0
SAINT_BARBARA = 1
SAINT_CHRISTOFORI = 2
SAINT_NICOLO = 3
SAINT_MARIA = 4
SAINT_NONE = 5  ## NB THIS IS ACTUALLY -1 IN GAME

# Win history
GAME_WIN_LAST_MAN_STANING = 0
GAME_WIN_ONLY_SAINT_WINNER = 1
GAME_WIN_ONLY_POLLUTION_WINNER = 2
GAME_WIN_TIE = 4


##### UTILS
def merge_player_counts(data_dict, keys_to_combine, new_key):
    # Initialize the structure based on the format of your data
    combined = {"finishedGamesCount": 0, "avg_turns_overall": 0, "saint_stats": {}}

    total_weighted_turns = 0
    # Dictionary to keep track of total turns for won games per saint to calculate weighted avg
    saint_won_turns_accumulator = {}

    for k in keys_to_combine:
        if k not in data_dict:
            continue

        source = data_dict[k]
        count = source.get("finishedGamesCount", 0)
        combined["finishedGamesCount"] += count

        # Accumulate total turns (avg * count) to find the true weighted mean later
        total_weighted_turns += source.get("avg_turns_overall", 0) * count

        for saint, stats in source.get("saint_stats", {}).items():
            if saint not in combined["saint_stats"]:
                # Initialize saint entry
                combined["saint_stats"][saint] = {
                    "available": 0,
                    "picked": 0,
                    "picked_game_ids": [],
                    "won": 0,
                    "won_game_ids": [],
                    "lost": 0,
                    "lost_game_ids": [],
                    "not_picked": 0,
                    "not_picked_game_ids": [],
                    "picked_percentage": 0,
                    "won_percentage": 0,
                    "won_when_picked_percentage": 0,
                    "bar_chart_data": [0, 0, 0],
                    "avg_turns_when_won": 0,
                }
                saint_won_turns_accumulator[saint] = 0

            target = combined["saint_stats"][saint]

            # Weighted turns for this saint's wins: (avg_turns * number_of_wins)
            wins = stats.get("won", 0)
            saint_won_turns_accumulator[saint] += (
                stats.get("avg_turns_when_won", 0) * wins
            )

            # Aggregate totals
            target["available"] += stats.get("available", 0)
            target["picked"] += stats.get("picked", 0)
            target["won"] += stats.get("won", 0)
            target["lost"] += stats.get("lost", 0)
            target["not_picked"] += stats.get("not_picked", 0)

            # Merge ID lists
            target["picked_game_ids"].extend(stats.get("picked_game_ids", []))
            target["won_game_ids"].extend(stats.get("won_game_ids", []))
            target["lost_game_ids"].extend(stats.get("lost_game_ids", []))
            target["not_picked_game_ids"].extend(stats.get("not_picked_game_ids", []))

    # 1. Finalize Overall Average Turns
    if combined["finishedGamesCount"] > 0:
        combined["avg_turns_overall"] = round(
            total_weighted_turns / combined["finishedGamesCount"], 2
        )

    # Recalculate percentages and bar_chart_data for the new combined entry
    for saint, stats in combined["saint_stats"].items():
        # Avoid division by zero
        avail = stats["available"] if stats["available"] > 0 else 1
        pick = stats["picked"] if stats["picked"] > 0 else 1
        wins = stats["won"] if stats["won"] > 0 else 1

        stats["picked_percentage"] = round((stats["picked"] / avail) * 100)
        stats["won_percentage"] = round((stats["won"] / avail) * 100)
        stats["won_when_picked_percentage"] = round((stats["won"] / pick) * 100)
        stats["bar_chart_data"] = [stats["won"], stats["lost"], stats["not_picked"]]

        # Calculate weighted average for wins: (Total Won Turns / Total Wins)
        stats["avg_turns_when_won"] = round(
            saint_won_turns_accumulator[saint] / wins, 2
        )

    data_dict[new_key] = combined


## END UTILS


def analyze_games(player_count_index):
    """Analyzes game data for a given player count."""
    NUM_SAINT_OPTIONS = 6
    SAINTS_PICKED: Dict[int, List[int]] = {i: [] for i in range(NUM_SAINT_OPTIONS)}
    SAINTS_WON: Dict[int, List[int]] = {i: [] for i in range(NUM_SAINT_OPTIONS)}
    SAINTS_NOT_PICKED: Dict[int, List[int]] = {i: [] for i in range(NUM_SAINT_OPTIONS)}
    SAINTS_LOST: Dict[int, List[int]] = {i: [] for i in range(NUM_SAINT_OPTIONS)}
    SAINTS_WON_TURNS: Dict[int, List[int]] = {
        i: [] for i in range(6)
    }  # Track turns for wins
    total_turns_list = []

    playerCount = player_count_index

    query = Q(
        gameStatus="FINISHED",
        statsExcludedGame=False,  
        turn__gte=4,
        maxPlayers=playerCount,
        gameCode="AQY",  # Added directly here
    )
    # (use ~ separately for clarity)
    query &= ~Q(players__player__username="SHADOW")
    query &= ~Q(players__is_missing=True)
    

    # if player_count_index == 4.5:
    #    query = query & Q(externalTournamentGame=True)

    # Fetch the initial queryset based on the query
    # queryset = AQY_Game.objects.filter(query)  # Define queryset here

    # Apply values_list to the queryset directly
    dataSet = Game.objects.filter(query).values_list("gameData", "id", "turn")

    finishedGamesCount = len(dataSet)

    for game_data_encoded, game_id, game_turn in dataSet:
        try:
            byte_array = bytearray(base64.b64decode(game_data_encoded))
            decompressed_data = gzip.decompress(byte_array)
            decompressed_string = decompressed_data.decode("utf-8")
            raw_data = json.loads(decompressed_string)
        except Exception as e:
            print(f"Game ERROR - COULD NOT DECOMPRESS: {e}")
            continue

        # TRACK WHICH SAINTS ARE PICKED IN THIS SPECIFIC GAME
        saints_picked_in_this_game = set()

        total_turns_list.append(game_turn)
        playerData = raw_data[1]
        history = raw_data[3]
        # find the last history entry
        last_history = history[-1]
        # get the last turn
        last_entry3 = last_history[3]
        # get the last turn winner_reason
        winner_reason = last_entry3[0]
        if winner_reason == GAME_WIN_LAST_MAN_STANING:
            print(f"ERROR: LAST MAN STANDING WIN FOUND IN GAME {game_id}")
            pass
        winners_arr = last_entry3[1]

        for playedIdx, player in enumerate(playerData):
            player_saint = player[3]

            # -1 is no saint, but change to 5 for east of use
            if player_saint == -1:
                player_saint = 5

            SAINTS_PICKED[player_saint].append(game_id)
            saints_picked_in_this_game.add(player_saint)

            # print(f"{player_name} picked saint {player_saint} winners_arr {winners_arr} player_name in winners_arr {player_name in winners_arr}")
            is_winner = playedIdx in winners_arr

            # Update stats for winner
            if is_winner:
                SAINTS_WON[player_saint].append(game_id)
                SAINTS_WON_TURNS[player_saint].append(game_turn)
            else:
                SAINTS_LOST[player_saint].append(game_id)

        for s_id in range(NUM_SAINT_OPTIONS):
            if s_id not in saints_picked_in_this_game:
                SAINTS_NOT_PICKED[s_id].append(game_id)

    # if player_count_index == 3:
    #    print(finishedGamesCount)
    #    print(SAINTS_PICKED[SAINT_MARIA])
    #    print(len(SAINTS_PICKED[SAINT_MARIA]))

    return (
        finishedGamesCount,
        SAINTS_NOT_PICKED,
        SAINTS_PICKED,
        SAINTS_WON,
        SAINTS_LOST,
        # SPEC_WON,
        playerCount,
        # seat_wins_4p,
        # seat_wins_4p_ids,
        # seat_wins_4pT,
        # seat_wins_4pT_ids,
        total_turns_list,
        SAINTS_WON_TURNS,
    )


def calculate_stats(
    SAINTS_NOT_PICKED,
    SAINTS_PICKED,
    SAINTS_WON,
    SAINTS_LOST,
    # SPEC_WON,
    finishedGamesCount,
    playerCount,
    # schism_games,
    total_turns_list,
    SAINTS_WON_TURNS,
):
    """Calculates statistics based on the game data."""
    SAINT_NAMES = [
        "San Giorgio",  # NB_GIORGIO",
        "Santa Barbara",  # NB_BARBARA",
        "San Christofori",  # NB_CHRISTOFORI",
        "San Nicolo",  # NB_NICOLO",
        "Santa Maria",
        "None",
    ]

    # Calculate overall average for this player count
    avg_turns_overall = (
        sum(total_turns_list) / len(total_turns_list) if total_turns_list else 0
    )

    SAINT_STATS_DATA = {}
    # all_game_ids = list(set(SAINTS_AVAILABLE[0] + SAINTS_AVAILABLE[1] + SAINTS_AVAILABLE[2] + SAINTS_AVAILABLE[3] + SAINTS_AVAILABLE[4] + SAINTS_AVAILABLE[5]))

    for i in range(len(SAINT_NAMES)):
        saint_name = SAINT_NAMES[i]
        # if saint_name == "None":
        #    not_picked_game_ids = []
        #    not_picked_count = 0  # placeholder 0
        # else:

        win_turns = SAINTS_WON_TURNS[i]
        avg_turns_when_won = sum(win_turns) / len(win_turns) if win_turns else 0

        not_picked_game_ids = list(
            set(SAINTS_NOT_PICKED[i])
        )  # - set(SAINTS_PICKED[i]))  # Available but not picked
        not_picked_count = len(not_picked_game_ids)

        picked_count = len(SAINTS_PICKED[i])
        picked_game_ids = SAINTS_PICKED[i]
        won_count = len(SAINTS_WON[i])
        won_game_ids = SAINTS_WON[i]
        lost_game_ids = SAINTS_LOST[i]
        lost_count = len(lost_game_ids)

        available_count = finishedGamesCount

        picked_percentage = (
            round(picked_count / (available_count * playerCount) * 100)
            if available_count != 0
            else 0
        )
        won_percentage = (
            round(won_count / available_count * 100) if available_count != 0 else 0
        )
        won_when_picked_percentage = (
            round(won_count / picked_count * 100) if picked_count != 0 else 0
        )

        SAINT_STATS_DATA[saint_name] = {
            "available": available_count,
            # "available_game_ids": not_picked_game_ids,
            "picked": picked_count,
            "picked_game_ids": picked_game_ids,
            "won": won_count,
            "won_game_ids": won_game_ids,
            "lost": lost_count,
            "lost_game_ids": lost_game_ids,
            "not_picked": not_picked_count,
            "not_picked_game_ids": not_picked_game_ids,
            "picked_percentage": picked_percentage,
            "won_percentage": won_percentage,
            "won_when_picked_percentage": won_when_picked_percentage,
            "bar_chart_data": [won_count, lost_count, not_picked_count],
            "avg_turns_when_won": round(avg_turns_when_won, 2),
        }

    return SAINT_STATS_DATA, round(avg_turns_overall, 2)


def generate_stats_data():
    """Generates the stats data for all player counts."""
    ALL_DATA: Dict[str, Union[str, int, object]] = {}

    # Get the current UTC time
    current_time = datetime.datetime.now(datetime.UTC)
    time_string = current_time.strftime("%H:%M GMT - %d %B %Y")
    ALL_DATA["time_string"] = time_string

    ALL_DATA["player_counts"] = {}

    for playerCountIndex in [2, 3, 4]:
        (
            finishedGamesCount,
            SAINTS_NOT_PICKED,
            SAINTS_PICKED,
            SAINTS_WON,
            SAINTS_LOST,
            # SPEC_WON,
            playerCount,
            # seat_wins_4p,
            # seat_wins_4p_ids,
            # seat_wins_4pT,
            # seat_wins_4pT_ids,
            total_turns_list,
            SAINTS_WON_TURNS,
        ) = analyze_games(playerCountIndex)

        SAINT_STATS_DATA, avg_turns_overall = calculate_stats(
            SAINTS_NOT_PICKED,
            SAINTS_PICKED,
            SAINTS_WON,
            SAINTS_LOST,
            # SPEC_WON,
            finishedGamesCount,
            playerCount,
            # schism_games,
            total_turns_list,
            SAINTS_WON_TURNS,
        )

        player_data = {
            "finishedGamesCount": finishedGamesCount,
            "avg_turns_overall": avg_turns_overall,
            "saint_stats": SAINT_STATS_DATA,
            # "spec_stats": S_STATS_DATA,
        }

        ALL_DATA["player_counts"][playerCount] = player_data

    # Now combined playercounts 2,3,4 into a combined data set under 9 players

    # ALL_DATA["player_counts"]["9"] = {
    #    "finishedGamesCount": ALL_DATA["player_counts"][2]["finishedGamesCount"] + ALL_DATA["player_counts"][3]["finishedGamesCount"] + ALL_DATA["player_counts"][4]["finishedGamesCount"],
    #    "saint_stats": ALL_DATA["player_counts"][2]["saint_stats"] + ALL_DATA["player_counts"][3]["saint_stats"] + ALL_DATA["player_counts"][4]["saint_stats"],
    # }
    # Convert your dicts to Counters and add them
    merge_player_counts(ALL_DATA["player_counts"], [2, 3, 4], "combined_2_3_4")

    #### END OF 2/3/4 PLAYERS

    return ALL_DATA


# Generate regular stats
ALL_DATA = generate_stats_data()

file_path = BASE_DIR / "AQY" / "AQYstats" / "AQY_stats.json"

with open(file_path, mode="w") as filehandle:
    json.dump(ALL_DATA, filehandle, indent=4)

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
