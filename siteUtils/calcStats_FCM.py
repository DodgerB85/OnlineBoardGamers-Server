# Needs to be inside the root folder of the project, IE with manage.py
import os
import sys
import time
from pathlib import Path
from decouple import config
from django.db import connection

# import time
from django.db.models import Q, Avg, Prefetch
import json
import django
import datetime
import base64
import gzip

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True

# Because the live and dev servers are in different folder names, we need to go up one from that
ROOT_DIR = Path(__file__).resolve().parents[2]

if DEBUG:
    os.environ["LOCAL_DB_NAME"] = str(
        config("LOCAL_DB_NAME", default="password", cast=str)
    )
    os.environ["LOCAL_DB_USER"] = str(
        config("LOCAL_DB_USER", default="password", cast=str)
    )
    os.environ["LOCAL_DB_PWD"] = str(
        config("LOCAL_DB_PWD", default="password", cast=str)
    )
    os.environ["LOCAL_DB_HOST"] = "127.0.0.1"

BASE_DIR = ROOT_DIR / "OnlineBoardGamers"

# 3. Now sys.path.append is much cleaner
sys.path.append(str(BASE_DIR))

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)

print(BASE_DIR)

django.setup()
start_calc_time = time.perf_counter()

from Lobby.models import Game, GamePlayer

NEW_MS = 21

RANDOM_MODULES = 200
DRAFT_MODULES = 300
HARD_CHOICES_OLD_MS = 8
SHORT_GAME = 1
NO_MS = 2
NO_CFO_MS = 3
NO_RADIO_MS = 6
KETCHUP_MS = 20
NEW_RESERVE_CARDS = 23
NEW_DISTRICTS = 18
LOBBYISTS = 22
COFFEE = 19
KIMCHI = 10
SUSHI = 11
NOODLES = 12
FRY_CHEFS = 9
MASS_MARKTERS = 15
GOURMET_FOOD_CRITIC = 13
RURAL_MARKETERS = 17
MOVIE_STARS = 14
NIGHT_SHIFT_MANAGER = 16

FIRST_RECRUITING_GIRL_USED = 28
FIRST_TRAINER_USED = 29
FIRST_MARKETING_TRAINEE_USED = 19

FIRST_HIRE_3 = 0
FIRST_TRAIN = 6

#################### TOTAL GAMES / AVG TURNS / MODULES USED
# Get the current UTC time
current_time = datetime.datetime.now(datetime.UTC)

# Format the time as a string
time_string = current_time.strftime("%H:%M GMT - %d %B %Y")

# Finished // NOT admin // NOT shadow // NOT stats exclude // NOT FcmAI
new_code_timestamp_ms = "1744974000000"
# This matches the old stats time for old code
# "old_ms_winner_t_and_rg": 1495, >> new calc is 1494
# "old_ms_winner_rg": 1242, >> new calc is 1241
# new_code_timestamp_ms = "1744972920000"

# 1. Define the prefetch for the specific GamePlayer who is the winner
winner_prefetch = Prefetch(
    "players",
    queryset=GamePlayer.objects.filter(winner=True)
    .select_related("player")
    .only(
        "game_id",
        "player__username",  # Always include the join field (game_id) in .only()
    ),
    to_attr="winner_record",  # Stores the result as an attribute on the Game object
)


query_old_code = (
    Q(gameStatus="FINISHED")
    & ~Q(players__player__username__in=["admin", "SHADOW", "FcmAI"])
    & ~Q(statsExcludedGame=True)
    & Q(created__lte=new_code_timestamp_ms)
    & Q(latestUpdate__lte=new_code_timestamp_ms)
    & ~Q(players__is_missing=True)
)
query_new_code = (
    Q(gameStatus="FINISHED")  # Corrected query
    & ~Q(players__player__username__in=["admin", "SHADOW", "FcmAI"])
    & ~Q(statsExcludedGame=True)
    & Q(created__gte=new_code_timestamp_ms)
    & ~Q(players__is_missing=True)
)

base_queryset = (
    Game.objects.filter(gameCode="FCM").prefetch_related(winner_prefetch)
    # .select_related("winner")
    .only("id", "gameData", "startingOptions", "turn", "gameStatus")
).distinct()

dataSet_old_code = base_queryset.filter(query_old_code)
dataSet_new_code = base_queryset.filter(query_new_code)

# dataSet_old_code = FCM_Game.objects.filter(query_old_code)
# dataSet_new_code = FCM_Game.objects.filter(query_new_code)

finishedGames_all = dataSet_old_code.count() + dataSet_new_code.count()


def filter_by_starting_options(queryset, new_ms_value, include):
    """Filters a queryset based on the presence of NEW_MS in startingOptions."""
    # This regex looks for your value:
    # 1. After a bracket or comma: [\[,]
    # 2. Followed by optional whitespace: \s*
    # 3. Followed by your value
    # 4. Followed by optional whitespace: \s*
    # 5. Followed by a comma or closing bracket: [,\\]]

    pattern = rf"[\[,]\s*{new_ms_value}\s*[,\\]]"

    # q = (
    #    Q(startingOptions=str(new_ms_value))
    #    | Q(startingOptions__startswith=str(new_ms_value) + ",")
    #    | Q(startingOptions__endswith="," + str(new_ms_value))
    #    | Q(startingOptions__contains="," + str(new_ms_value) + ",")
    # )
    # if include:
    #    return queryset.filter(q)
    # else:
    #    return queryset.exclude(q)
    if include:
        return queryset.filter(startingOptions__iregex=pattern)
    else:
        return queryset.exclude(startingOptions__iregex=pattern)


def calculate_average_turn(queryset):
    """Calculates the average turn for a given queryset, excluding null and zero values."""
    return (
        queryset.exclude(turn__isnull=True)
        .exclude(turn=0)
        .aggregate(avg_turn=Avg("turn"))["avg_turn"]
    )


# --- Filter by NEW_MS ---
dataset_oldMS_old_code = filter_by_starting_options(
    dataSet_old_code, NEW_MS, include=False
)
dataset_newMS_old_code = filter_by_starting_options(
    dataSet_old_code, NEW_MS, include=True
)

dataset_oldMS_new_code = filter_by_starting_options(
    dataSet_new_code, NEW_MS, include=False
)
dataset_newMS_new_code = filter_by_starting_options(
    dataSet_new_code, NEW_MS, include=True
)

finishedGames_oldMS = dataset_oldMS_old_code.count() + dataset_oldMS_new_code.count()
finishedGames_newMS = dataset_newMS_old_code.count() + dataset_newMS_new_code.count()


def analyze_ms_usage(queryset, is_old_ms, is_old_code):
    """
    Analyzes MS usage in a queryset of games.

    Args:
        queryset: The queryset of FCM_Game objects to analyze.
        is_old_ms (bool): True if analyzing old MS games, False for new MS games.
        is_old_code (bool): True if analyzing old code games, False for new code games.

    Returns:
        A dictionary containing statistics on MS usage.
    """
    results = {}
    results["winner_mkt"] = 0
    results["winner_rg"] = 0
    results["winner_t"] = 0
    results["winner_none"] = 0
    results["picked_mkt"] = 0
    results["picked_rg"] = 0
    results["picked_t"] = 0
    results["picked_none"] = 0

    results["winner_mkt_ids"] = []
    results["winner_rg_ids"] = []
    results["winner_t_ids"] = []
    results["winner_none_ids"] = []
    results["picked_mkt_ids"] = []
    results["picked_rg_ids"] = []
    results["picked_t_ids"] = []
    results["picked_none_ids"] = []

    if is_old_ms:
        results["winner_t_and_rg"] = 0
        results["picked_t_and_rg"] = 0
        results["winner_t_and_rg_ids"] = []
        results["picked_t_and_rg_ids"] = []

    # Initialize 2p-6p stats
    for num_players in range(2, 7):
        results[f"winner_mkt_{num_players}p"] = 0
        results[f"winner_rg_{num_players}p"] = 0
        results[f"winner_t_{num_players}p"] = 0
        results[f"winner_none_{num_players}p"] = 0
        results[f"picked_mkt_{num_players}p"] = 0
        results[f"picked_rg_{num_players}p"] = 0
        results[f"picked_t_{num_players}p"] = 0
        results[f"picked_none_{num_players}p"] = 0

        results[f"winner_mkt_{num_players}p_ids"] = []
        results[f"winner_rg_{num_players}p_ids"] = []
        results[f"winner_t_{num_players}p_ids"] = []
        results[f"winner_none_{num_players}p_ids"] = []
        results[f"picked_mkt_{num_players}p_ids"] = []
        results[f"picked_rg_{num_players}p_ids"] = []
        results[f"picked_t_{num_players}p_ids"] = []
        results[f"picked_none_{num_players}p_ids"] = []

        if is_old_ms:
            results[f"winner_t_and_rg_{num_players}p"] = 0
            results[f"picked_t_and_rg_{num_players}p"] = 0
            results[f"winner_t_and_rg_{num_players}p_ids"] = []
            results[f"picked_t_and_rg_{num_players}p_ids"] = []

    for game in queryset:
        # --- NEW WINNER LOOKUP LOGIC ---
        # Since we use Prefetch(to_attr="winner_record"), it's a list on the game object.
        winner_gp_list = getattr(game, "winner_record", [])
        winner_gp = winner_gp_list[0] if winner_gp_list else None
        
        if not winner_gp or not winner_gp.player:
            print(f"NO WINNER:: {getattr(game, 'id')}")
            continue
            
        winner_username = winner_gp.player.username
        # -------------------------------
        
        raw_data = []
        try:
            byte_array = bytearray(base64.b64decode(game.gameData))
            decompressed_data = gzip.decompress(byte_array)
            decompressed_string = decompressed_data.decode("utf-8")
            raw_data = json.loads(decompressed_string)
        except Exception as e:
            print(f"Game ERROR - COULD NOT DECOMPRESS: {getattr(game, 'id')} :: {e}")
            continue

        raw_player_index = 3
        raw_ms_index = 7
        # Need to find out if it's a new code game and has lobbyist data
        if not is_old_code:
            raw_player_index = 0
            raw_ms_index = 6
            # options = game.startingOptions.split(",")
            # options_int = [int(x) for x in options if x]
            options_int = (
                json.loads(game.startingOptions) if game.startingOptions else []
            )
            if LOBBYISTS in options_int:
                raw_player_index = 1
        if len(raw_data) > 0:
            playerData = raw_data[raw_player_index]
            for player in playerData:
                if player[raw_ms_index] is None:
                    player[raw_ms_index] = []

                # Determine MS used and update counts
                ms_type = None
                if is_old_ms:
                    if (
                        FIRST_HIRE_3 in player[raw_ms_index]
                        and FIRST_TRAIN in player[raw_ms_index]
                    ):
                        ms_type = "t_and_rg"
                    elif FIRST_HIRE_3 in player[raw_ms_index]:
                        ms_type = "rg"
                    elif FIRST_TRAIN in player[raw_ms_index]:
                        ms_type = "t"
                    else:
                        ms_type = "none"
                else:
                    if FIRST_MARKETING_TRAINEE_USED in player[raw_ms_index]:
                        ms_type = "mkt"
                    elif FIRST_RECRUITING_GIRL_USED in player[raw_ms_index]:
                        ms_type = "rg"
                    elif FIRST_TRAINER_USED in player[raw_ms_index]:
                        ms_type = "t"
                    else:
                        ms_type = "none"

                playerName = player[0]
                if not is_old_code:
                    playerName = player[0][0]
                is_winner = playerName == winner_username

                if is_winner:
                    results[f"winner_{ms_type}"] += 1
                    results[f"winner_{ms_type}_ids"].append(getattr(game, "id"))
                else:
                    results[f"picked_{ms_type}"] += 1
                    results[f"picked_{ms_type}_ids"].append(getattr(game, "id"))

                # Update player count specific stats
                num_players = len(playerData)
                if 2 <= num_players <= 6:
                    if is_winner:
                        results[f"winner_{ms_type}_{num_players}p"] += 1
                        results[f"winner_{ms_type}_{num_players}p_ids"].append(
                            getattr(game, "id")
                        )
                    else:
                        results[f"picked_{ms_type}_{num_players}p"] += 1
                        results[f"picked_{ms_type}_{num_players}p_ids"].append(
                            getattr(game, "id")
                        )

    return results


# --- Calculate Average Turns (after filtering for turn > 4) ---
##################################################
# query_turns_gt_4 = (
#    Q(gameStatus="FINISHED")
#    & ~Q(allPlayers__username="admin")
#    & ~Q(allPlayers__username="SHADOW")
#    & ~Q(statsExcludedGame=True)
#    & ~Q(allPlayers__username="FcmAI")
#    & Q(turn__gt=4)
#    & Q(missingPlayers__isnull=True)
# )
#
# dataset_old_code_turns_gt_4 = FCM_Game.objects.filter(query_turns_gt_4 & query_old_code)
# dataset_new_code_turns_gt_4 = FCM_Game.objects.filter(query_turns_gt_4 & query_new_code)
#
#
# dataset_oldMS_old_code_turns_gt_4 = filter_by_starting_options(
#    dataset_old_code_turns_gt_4, NEW_MS, include=False
# )
# dataset_newMS_old_code_turns_gt_4 = filter_by_starting_options(
#    dataset_old_code_turns_gt_4, NEW_MS, include=True
# )
#
# dataset_oldMS_new_code_turns_gt_4 = filter_by_starting_options(
#    dataset_new_code_turns_gt_4, NEW_MS, include=False
# )
# dataset_newMS_new_code_turns_gt_4 = filter_by_starting_options(
#    dataset_new_code_turns_gt_4, NEW_MS, include=True
# )
#
#
## --- Analyze MS Usage for all combinations ---
# old_code_old_ms_stats = analyze_ms_usage(
#    dataset_oldMS_old_code_turns_gt_4, is_old_ms=True, is_old_code=True
# )
# old_code_new_ms_stats = analyze_ms_usage(
#    dataset_newMS_old_code_turns_gt_4, is_old_ms=False, is_old_code=True
# )
#
# new_code_old_ms_stats = analyze_ms_usage(
#    dataset_oldMS_new_code_turns_gt_4, is_old_ms=True, is_old_code=False
# )
# new_code_new_ms_stats = analyze_ms_usage(
#    dataset_newMS_new_code_turns_gt_4, is_old_ms=False, is_old_code=False
# )
####################################################

query_turns_gt_4 = (
    Q(gameStatus="FINISHED")
    & ~Q(
        players__player__username__in=["admin", "SHADOW", "FcmAI"]
    )  # Updated to 'players' relation
    & ~Q(statsExcludedGame=True)
    & Q(turn__gt=4)
    & ~Q(
        players__is_missing=True
    )  # Replaced missingPlayers__isnull=True with the GamePlayer field
)


# 1. Define the MS filter logic as a Python helper to avoid extra DB queries
def has_new_ms(starting_options_str, new_ms_value):
    if not starting_options_str:
        return False
    options = json.loads(starting_options_str) if starting_options_str else []
    return new_ms_value in options


# 2. Fetch ALL relevant Old Code games in ONE hit
# We use select_related to solve the N+1 winner issue and .only() to save memory


old_code_games_t4 = list(
    Game.objects.filter(gameCode="FCM")
    .prefetch_related(winner_prefetch)
    .only("id", "gameData", "startingOptions", "turn")
    .filter(query_turns_gt_4 & query_old_code)
    .distinct()
)

# 3. Split the list in memory (0 DB hits)
dataset_newMS_old_code_turns_gt_4 = [
    g for g in old_code_games_t4 if has_new_ms(g.startingOptions, NEW_MS)
]
dataset_oldMS_old_code_turns_gt_4 = [
    g for g in old_code_games_t4 if not has_new_ms(g.startingOptions, NEW_MS)
]

# 4. Fetch ALL relevant New Code games in ONE hit
new_code_games_t4 = list(
    Game.objects.filter(gameCode="FCM")
    .prefetch_related(winner_prefetch)
    .only("id", "gameData", "startingOptions", "turn")
    .filter(query_turns_gt_4 & query_new_code)
    .distinct()
)


# 5. Split the list in memory (0 DB hits)
dataset_newMS_new_code_turns_gt_4 = [
    g for g in new_code_games_t4 if has_new_ms(g.startingOptions, NEW_MS)
]
dataset_oldMS_new_code_turns_gt_4 = [
    g for g in new_code_games_t4 if not has_new_ms(g.startingOptions, NEW_MS)
]

# 6. Run your analysis (Now using pre-fetched Python lists)
old_code_old_ms_stats = analyze_ms_usage(
    dataset_oldMS_old_code_turns_gt_4, is_old_ms=True, is_old_code=True
)
old_code_new_ms_stats = analyze_ms_usage(
    dataset_newMS_old_code_turns_gt_4, is_old_ms=False, is_old_code=True
)

new_code_old_ms_stats = analyze_ms_usage(
    dataset_oldMS_new_code_turns_gt_4, is_old_ms=True, is_old_code=False
)
new_code_new_ms_stats = analyze_ms_usage(
    dataset_newMS_new_code_turns_gt_4, is_old_ms=False, is_old_code=False
)


# Combine MS Stats and Calculate Ratios
combined_ms_stats = {}

# --- New MS Stats (combining old and new code) ---
combined_ms_stats["new_ms_winner_mkt"] = old_code_new_ms_stats.get(
    "winner_mkt", 0
) + new_code_new_ms_stats.get("winner_mkt", 0)
combined_ms_stats["new_ms_winner_rg"] = old_code_new_ms_stats.get(
    "winner_rg", 0
) + new_code_new_ms_stats.get("winner_rg", 0)
combined_ms_stats["new_ms_winner_t"] = old_code_new_ms_stats.get(
    "winner_t", 0
) + new_code_new_ms_stats.get("winner_t", 0)
combined_ms_stats["new_ms_winner_none"] = old_code_new_ms_stats.get(
    "winner_none", 0
) + new_code_new_ms_stats.get("winner_none", 0)
combined_ms_stats["new_ms_picked_mkt"] = old_code_new_ms_stats.get(
    "picked_mkt", 0
) + new_code_new_ms_stats.get("picked_mkt", 0)
combined_ms_stats["new_ms_picked_rg"] = old_code_new_ms_stats.get(
    "picked_rg", 0
) + new_code_new_ms_stats.get("picked_rg", 0)
combined_ms_stats["new_ms_picked_t"] = old_code_new_ms_stats.get(
    "picked_t", 0
) + new_code_new_ms_stats.get("picked_t", 0)
combined_ms_stats["new_ms_picked_none"] = old_code_new_ms_stats.get(
    "picked_none", 0
) + new_code_new_ms_stats.get("picked_none", 0)

# Combine the _ids arrays
combined_ms_stats["new_ms_winner_mkt_ids"] = old_code_new_ms_stats.get(
    "winner_mkt_ids", []
) + new_code_new_ms_stats.get("winner_mkt_ids", [])
combined_ms_stats["new_ms_winner_rg_ids"] = old_code_new_ms_stats.get(
    "winner_rg_ids", []
) + new_code_new_ms_stats.get("winner_rg_ids", [])
combined_ms_stats["new_ms_winner_t_ids"] = old_code_new_ms_stats.get(
    "winner_t_ids", []
) + new_code_new_ms_stats.get("winner_t_ids", [])
combined_ms_stats["new_ms_winner_none_ids"] = old_code_new_ms_stats.get(
    "winner_none_ids", []
) + new_code_new_ms_stats.get("winner_none_ids", [])
combined_ms_stats["new_ms_picked_mkt_ids"] = old_code_new_ms_stats.get(
    "picked_mkt_ids", []
) + new_code_new_ms_stats.get("picked_mkt_ids", [])
combined_ms_stats["new_ms_picked_rg_ids"] = old_code_new_ms_stats.get(
    "picked_rg_ids", []
) + new_code_new_ms_stats.get("picked_rg_ids", [])
combined_ms_stats["new_ms_picked_t_ids"] = old_code_new_ms_stats.get(
    "picked_t_ids", []
) + new_code_new_ms_stats.get("picked_t_ids", [])
combined_ms_stats["new_ms_picked_none_ids"] = old_code_new_ms_stats.get(
    "picked_none_ids", []
) + new_code_new_ms_stats.get("picked_none_ids", [])

# Calculate New MS Ratios
combined_ms_stats["new_ms_mkt_ratio"] = (
    combined_ms_stats["new_ms_winner_mkt"]
    / combined_ms_stats["new_ms_picked_mkt"]
    * 100
    if combined_ms_stats["new_ms_picked_mkt"] != 0
    else 0
)
combined_ms_stats["new_ms_rg_ratio"] = (
    combined_ms_stats["new_ms_winner_rg"] / combined_ms_stats["new_ms_picked_rg"] * 100
    if combined_ms_stats["new_ms_picked_rg"] != 0
    else 0
)
combined_ms_stats["new_ms_t_ratio"] = (
    combined_ms_stats["new_ms_winner_t"] / combined_ms_stats["new_ms_picked_t"] * 100
    if combined_ms_stats["new_ms_picked_t"] != 0
    else 0
)
combined_ms_stats["new_ms_none_ratio"] = (
    combined_ms_stats["new_ms_winner_none"]
    / combined_ms_stats["new_ms_picked_none"]
    * 100
    if combined_ms_stats["new_ms_picked_none"] != 0
    else 0
)

# --- Old MS Stats (combining old and new code) ---
combined_ms_stats["old_ms_winner_t_and_rg"] = old_code_old_ms_stats.get(
    "winner_t_and_rg", 0
) + new_code_old_ms_stats.get("winner_t_and_rg", 0)
combined_ms_stats["old_ms_winner_rg"] = old_code_old_ms_stats.get(
    "winner_rg", 0
) + new_code_old_ms_stats.get("winner_rg", 0)
combined_ms_stats["old_ms_winner_t"] = old_code_old_ms_stats.get(
    "winner_t", 0
) + new_code_old_ms_stats.get("winner_t", 0)
combined_ms_stats["old_ms_winner_none"] = old_code_old_ms_stats.get(
    "winner_none", 0
) + new_code_old_ms_stats.get("winner_none", 0)
combined_ms_stats["old_ms_picked_t_and_rg"] = old_code_old_ms_stats.get(
    "picked_t_and_rg", 0
) + new_code_old_ms_stats.get("picked_t_and_rg", 0)
combined_ms_stats["old_ms_picked_rg"] = old_code_old_ms_stats.get(
    "picked_rg", 0
) + new_code_old_ms_stats.get("picked_rg", 0)
combined_ms_stats["old_ms_picked_t"] = old_code_old_ms_stats.get(
    "picked_t", 0
) + new_code_old_ms_stats.get("picked_t", 0)
combined_ms_stats["old_ms_picked_none"] = old_code_old_ms_stats.get(
    "picked_none", 0
) + new_code_old_ms_stats.get("picked_none", 0)

# Combine the _ids arrays
combined_ms_stats["old_ms_winner_t_and_rg_ids"] = old_code_old_ms_stats.get(
    "winner_t_and_rg_ids", []
) + new_code_old_ms_stats.get("winner_t_and_rg_ids", [])
combined_ms_stats["old_ms_winner_rg_ids"] = old_code_old_ms_stats.get(
    "winner_rg_ids", []
) + new_code_old_ms_stats.get("winner_rg_ids", [])
combined_ms_stats["old_ms_winner_t_ids"] = old_code_old_ms_stats.get(
    "winner_t_ids", []
) + new_code_old_ms_stats.get("winner_t_ids", [])
combined_ms_stats["old_ms_winner_none_ids"] = old_code_old_ms_stats.get(
    "winner_none_ids", []
) + new_code_old_ms_stats.get("winner_none_ids", [])
combined_ms_stats["old_ms_picked_t_and_rg_ids"] = old_code_old_ms_stats.get(
    "picked_t_and_rg_ids", []
) + new_code_old_ms_stats.get("picked_t_and_rg_ids", [])
combined_ms_stats["old_ms_picked_rg_ids"] = old_code_old_ms_stats.get(
    "picked_rg_ids", []
) + new_code_old_ms_stats.get("picked_rg_ids", [])
combined_ms_stats["old_ms_picked_t_ids"] = old_code_old_ms_stats.get(
    "picked_t_ids", []
) + new_code_old_ms_stats.get("picked_t_ids", [])
combined_ms_stats["old_ms_picked_none_ids"] = old_code_old_ms_stats.get(
    "picked_none_ids", []
) + new_code_old_ms_stats.get("picked_none_ids", [])

# Calculate Old MS Ratios
combined_ms_stats["old_ms_t_and_rg_ratio"] = (
    combined_ms_stats["old_ms_winner_t_and_rg"]
    / combined_ms_stats["old_ms_picked_t_and_rg"]
    * 100
    if combined_ms_stats["old_ms_picked_t_and_rg"] != 0
    else 0
)
combined_ms_stats["old_ms_rg_ratio"] = (
    combined_ms_stats["old_ms_winner_rg"] / combined_ms_stats["old_ms_picked_rg"] * 100
    if combined_ms_stats["old_ms_picked_rg"] != 0
    else 0
)
combined_ms_stats["old_ms_t_ratio"] = (
    combined_ms_stats["old_ms_winner_t"] / combined_ms_stats["old_ms_picked_t"] * 100
    if combined_ms_stats["old_ms_picked_t"] != 0
    else 0
)
combined_ms_stats["old_ms_none_ratio"] = (
    combined_ms_stats["old_ms_winner_none"]
    / combined_ms_stats["old_ms_picked_none"]
    * 100
    if combined_ms_stats["old_ms_picked_none"] != 0
    else 0
)

# --- Loop for 2p to 6p stats ---
for num_players in range(2, 7):
    # New MS Stats for num_players (combining old and new code)
    combined_ms_stats[f"new_ms_winner_mkt_{num_players}p"] = old_code_new_ms_stats.get(
        f"winner_mkt_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"winner_mkt_{num_players}p", 0)
    combined_ms_stats[f"new_ms_winner_rg_{num_players}p"] = old_code_new_ms_stats.get(
        f"winner_rg_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"winner_rg_{num_players}p", 0)
    combined_ms_stats[f"new_ms_winner_t_{num_players}p"] = old_code_new_ms_stats.get(
        f"winner_t_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"winner_t_{num_players}p", 0)
    combined_ms_stats[f"new_ms_winner_none_{num_players}p"] = old_code_new_ms_stats.get(
        f"winner_none_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"winner_none_{num_players}p", 0)
    combined_ms_stats[f"new_ms_picked_mkt_{num_players}p"] = old_code_new_ms_stats.get(
        f"picked_mkt_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"picked_mkt_{num_players}p", 0)
    combined_ms_stats[f"new_ms_picked_rg_{num_players}p"] = old_code_new_ms_stats.get(
        f"picked_rg_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"picked_rg_{num_players}p", 0)
    combined_ms_stats[f"new_ms_picked_t_{num_players}p"] = old_code_new_ms_stats.get(
        f"picked_t_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"picked_t_{num_players}p", 0)
    combined_ms_stats[f"new_ms_picked_none_{num_players}p"] = old_code_new_ms_stats.get(
        f"picked_none_{num_players}p", 0
    ) + new_code_new_ms_stats.get(f"picked_none_{num_players}p", 0)

    # Combine the _ids arrays for num_players
    combined_ms_stats[f"new_ms_winner_mkt_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"winner_mkt_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"winner_mkt_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_winner_rg_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"winner_rg_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"winner_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_winner_t_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"winner_t_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"winner_t_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_winner_none_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"winner_none_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"winner_none_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_picked_mkt_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"picked_mkt_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"picked_mkt_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_picked_rg_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"picked_rg_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"picked_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_picked_t_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"picked_t_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"picked_t_{num_players}p_ids", [])
    )
    combined_ms_stats[f"new_ms_picked_none_{num_players}p_ids"] = (
        old_code_new_ms_stats.get(f"picked_none_{num_players}p_ids", [])
        + new_code_new_ms_stats.get(f"picked_none_{num_players}p_ids", [])
    )

    # Calculate New MS Ratios for num_players
    combined_ms_stats[f"new_ms_mkt_ratio_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_mkt_{num_players}p"]
        / combined_ms_stats[f"new_ms_picked_mkt_{num_players}p"]
        * 100
        if combined_ms_stats[f"new_ms_picked_mkt_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_rg_ratio_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_rg_{num_players}p"]
        / combined_ms_stats[f"new_ms_picked_rg_{num_players}p"]
        * 100
        if combined_ms_stats[f"new_ms_picked_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_t_ratio_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_t_{num_players}p"]
        / combined_ms_stats[f"new_ms_picked_t_{num_players}p"]
        * 100
        if combined_ms_stats[f"new_ms_picked_t_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_none_ratio_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_none_{num_players}p"]
        / combined_ms_stats[f"new_ms_picked_none_{num_players}p"]
        * 100
        if combined_ms_stats[f"new_ms_picked_none_{num_players}p"] != 0
        else 0
    )

    # Old MS Stats for num_players (combining old and new code)
    combined_ms_stats[f"old_ms_winner_t_and_rg_{num_players}p"] = (
        old_code_old_ms_stats.get(f"winner_t_and_rg_{num_players}p", 0)
        + new_code_old_ms_stats.get(f"winner_t_and_rg_{num_players}p", 0)
    )
    combined_ms_stats[f"old_ms_winner_rg_{num_players}p"] = old_code_old_ms_stats.get(
        f"winner_rg_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"winner_rg_{num_players}p", 0)
    combined_ms_stats[f"old_ms_winner_t_{num_players}p"] = old_code_old_ms_stats.get(
        f"winner_t_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"winner_t_{num_players}p", 0)
    combined_ms_stats[f"old_ms_winner_none_{num_players}p"] = old_code_old_ms_stats.get(
        f"winner_none_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"winner_none_{num_players}p", 0)
    combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p"] = (
        old_code_old_ms_stats.get(f"picked_t_and_rg_{num_players}p", 0)
        + new_code_old_ms_stats.get(f"picked_t_and_rg_{num_players}p", 0)
    )
    combined_ms_stats[f"old_ms_picked_rg_{num_players}p"] = old_code_old_ms_stats.get(
        f"picked_rg_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"picked_rg_{num_players}p", 0)
    combined_ms_stats[f"old_ms_picked_t_{num_players}p"] = old_code_old_ms_stats.get(
        f"picked_t_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"picked_t_{num_players}p", 0)
    combined_ms_stats[f"old_ms_picked_none_{num_players}p"] = old_code_old_ms_stats.get(
        f"picked_none_{num_players}p", 0
    ) + new_code_old_ms_stats.get(f"picked_none_{num_players}p", 0)

    # Combine the _ids arrays for num_players
    combined_ms_stats[f"old_ms_winner_t_and_rg_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"winner_t_and_rg_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"winner_t_and_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_winner_rg_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"winner_rg_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"winner_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_winner_t_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"winner_t_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"winner_t_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_winner_none_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"winner_none_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"winner_none_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"picked_t_and_rg_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"picked_t_and_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_picked_rg_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"picked_rg_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"picked_rg_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_picked_t_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"picked_t_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"picked_t_{num_players}p_ids", [])
    )
    combined_ms_stats[f"old_ms_picked_none_{num_players}p_ids"] = (
        old_code_old_ms_stats.get(f"picked_none_{num_players}p_ids", [])
        + new_code_old_ms_stats.get(f"picked_none_{num_players}p_ids", [])
    )

    # Calculate Old MS Ratios for num_players
    combined_ms_stats[f"old_ms_t_and_rg_ratio_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_t_and_rg_{num_players}p"]
        / combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p"]
        * 100
        if combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_rg_ratio_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_rg_{num_players}p"]
        / combined_ms_stats[f"old_ms_picked_rg_{num_players}p"]
        * 100
        if combined_ms_stats[f"old_ms_picked_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_t_ratio_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_t_{num_players}p"]
        / combined_ms_stats[f"old_ms_picked_t_{num_players}p"]
        * 100
        if combined_ms_stats[f"old_ms_picked_t_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_none_ratio_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_none_{num_players}p"]
        / combined_ms_stats[f"old_ms_picked_none_{num_players}p"]
        * 100
        if combined_ms_stats[f"old_ms_picked_none_{num_players}p"] != 0
        else 0
    )

# Now add the adjusted WR stats for each player count = (wins * player count) / (wins + picks)
for num_players in range(2, 7):
    combined_ms_stats[f"old_ms_ratio_t_and_rg_adjusted_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_t_and_rg_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"old_ms_winner_t_and_rg_{num_players}p"]
            + combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"old_ms_picked_t_and_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_ratio_rg_adjusted_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_rg_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"old_ms_winner_rg_{num_players}p"]
            + combined_ms_stats[f"old_ms_picked_rg_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"old_ms_picked_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_ratio_t_adjusted_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_t_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"old_ms_winner_t_{num_players}p"]
            + combined_ms_stats[f"old_ms_picked_t_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"old_ms_picked_t_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"old_ms_ratio_none_adjusted_{num_players}p"] = (
        combined_ms_stats[f"old_ms_winner_none_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"old_ms_winner_none_{num_players}p"]
            + combined_ms_stats[f"old_ms_picked_none_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"old_ms_picked_none_{num_players}p"] != 0
        else 0
    )
    # Do the same for new_ms
    combined_ms_stats[f"new_ms_ratio_mkt_adjusted_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_mkt_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"new_ms_winner_mkt_{num_players}p"]
            + combined_ms_stats[f"new_ms_picked_mkt_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"new_ms_picked_mkt_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_ratio_rg_adjusted_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_rg_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"new_ms_winner_rg_{num_players}p"]
            + combined_ms_stats[f"new_ms_picked_rg_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"new_ms_picked_rg_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_ratio_t_adjusted_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_t_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"new_ms_winner_t_{num_players}p"]
            + combined_ms_stats[f"new_ms_picked_t_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"new_ms_picked_t_{num_players}p"] != 0
        else 0
    )
    combined_ms_stats[f"new_ms_ratio_none_adjusted_{num_players}p"] = (
        combined_ms_stats[f"new_ms_winner_none_{num_players}p"]
        * num_players
        / (
            combined_ms_stats[f"new_ms_winner_none_{num_players}p"]
            + combined_ms_stats[f"new_ms_picked_none_{num_players}p"]
        )
        * 100
        if combined_ms_stats[f"new_ms_picked_none_{num_players}p"] != 0
        else 0
    )


def count_module_usage(queryset):
    """Counts the usage of different modules in a queryset of games."""
    module_counts = {}
    modules = {
        "RANDOM_MODULES": RANDOM_MODULES,
        "DRAFT_MODULES": DRAFT_MODULES,
        "HARD_CHOICES_OLD_MS": HARD_CHOICES_OLD_MS,
        "SHORT_GAME": SHORT_GAME,
        "NO_MS": NO_MS,
        "NO_CFO_MS": NO_CFO_MS,
        "NO_RADIO_MS": NO_RADIO_MS,
        "KETCHUP_MS": KETCHUP_MS,
        "NEW_RESERVE_CARDS": NEW_RESERVE_CARDS,
        "NEW_DISTRICTS": NEW_DISTRICTS,
        "LOBBYISTS": LOBBYISTS,
        "COFFEE": COFFEE,
        "KIMCHI": KIMCHI,
        "SUSHI": SUSHI,
        "NOODLES": NOODLES,
        "FRY_CHEFS": FRY_CHEFS,
        "MASS_MARKTERS": MASS_MARKTERS,
        "GOURMET_FOOD_CRITIC": GOURMET_FOOD_CRITIC,
        "RURAL_MARKETERS": RURAL_MARKETERS,
        "MOVIE_STARS": MOVIE_STARS,
        "NIGHT_SHIFT_MANAGER": NIGHT_SHIFT_MANAGER,
    }
    for module_name, module_value in modules.items():
        # module_counts[f"finished_games_{module_name}"] = filter_by_starting_options(
        #    queryset, module_value, include=True
        # ).count()
        filtered_queryset = filter_by_starting_options(
            queryset, module_value, include=True
        )
        module_counts[f"finished_games_{module_name}"] = filtered_queryset.count()
        module_counts[f"game_ids_{module_name}"] = list(
            filtered_queryset.values_list("id", flat=True)
        )  # Get a list of game IDs

    return module_counts


# --- Calculate Module Usage for Old and New Code ---
module_usage_old_code = count_module_usage(dataSet_old_code)
module_usage_new_code = count_module_usage(dataSet_new_code)

# Combine Module Usage
combined_module_usage = {}
for key in module_usage_old_code:
    combined_module_usage[key] = module_usage_old_code.get(
        key, 0
    ) + module_usage_new_code.get(key, 0)


# Evaluate the querysets to lists *before* unioning/filtering
oldMS_queryset = list(dataset_oldMS_old_code_turns_gt_4) + list(
    dataset_oldMS_new_code_turns_gt_4
)
newMS_queryset = list(dataset_newMS_old_code_turns_gt_4) + list(
    dataset_newMS_new_code_turns_gt_4
)


def calculate_average_turn_from_list(data_list):
    """Calculates the average turn from a list of FCM_Game objects."""
    valid_turns = [
        game.turn for game in data_list if game.turn is not None and game.turn > 0
    ]
    if not valid_turns:
        return 0  # Return 0 if no valid turns are found
    return sum(valid_turns) / len(valid_turns)


avg_turn_oldMS = calculate_average_turn_from_list(oldMS_queryset)
avg_turn_newMS = calculate_average_turn_from_list(newMS_queryset)


returnData = {
    "basicData": {
        "time_string": time_string,
        "finishedGames_all": finishedGames_all,
        "finishedGames_oldMS": finishedGames_oldMS,
        "finishedGames_newMS": finishedGames_newMS,
        "avg_turn_oldMS": avg_turn_oldMS,
        "avg_turn_newMS": avg_turn_newMS,
    },
    "modulesUsed": combined_module_usage,
    "rg_t_m_stats": combined_ms_stats,
}


# print(returnData)
file_path = BASE_DIR / "FCM" / "FCMstats" / "FCM_stats.json"

with open(file_path, mode="w") as filehandle:
    json.dump(returnData, filehandle)

print(f"DB hits: {len(connection.queries)}")

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
