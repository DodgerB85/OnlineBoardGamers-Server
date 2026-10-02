import base64
import datetime
import gzip
import json
import os
import sys
import time
from pathlib import Path

import django
from decouple import config
from django.db.models import Q

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True

# comment to force and test update
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

print(BASE_DIR)

django.setup()
start_calc_time = time.perf_counter()

from Lobby.models import Game, GamePlayer, User  # noqa: E402

# gods
NO_god = -1
SHADIPINYI = 0
ELEGUA = 1
DZIVA = 2
ESHU = 3
GU = 4
OBATALA = 5
ATETE = 6
TSUI_GOAB = 7
ANANSI = 8
QAMATA = 9
ENGAI = 10
XANGO = 11

# schism
AGWU_NSI = 12
AJA = 13
AJE_SHALUGA = 14
ALAJIRE = 15
ANYANWU = 16
EKWENSU = 17
OGUN = 18
OVIA = 19
OYA = 20
SIMBI = 21
TIURAKH = 22
YEMOJA = 23

# specs
HERD = 0
NOMADS = 1
RAIN_CEREMONY = 2
SHAMAN = 3
BUILDER = 4

# seat/starting position titles, sliced to the player count of a stats block
POSITION_TITLES = ["1st", "2nd", "3rd", "4th", "5th", "6th"]


# Every game is fetched once per run (all player counts at once) rather than once per player count
FETCHED_GAMES = {}  # {schism_games: (rows, game_data, winner_seats)}


def is_schism_game(starting_options):
    """A schism game has a top-level 7, 8 or 9 in startingOptions."""
    try:
        loaded_options = json.loads(starting_options) if starting_options else []
    except (json.JSONDecodeError, TypeError):
        return False
    return isinstance(loaded_options, list) and any(option in (7, 8, 9) for option in loaded_options)


def fetch_games_to_analyse(schism_games):
    """Fetches every game to analyse for a run in one pass, shared by all player counts (each query is a full scan of the finished TGZ games)."""

    if schism_games in FETCHED_GAMES:
        return FETCHED_GAMES[schism_games]

    shadowUser = User.objects.get(username="SHADOW")

    query = (
        Q(gameCode="TGZ") & Q(gameStatus="FINISHED") & ~Q(players__player=shadowUser) & ~Q(statsExcludedGame=True) & Q(turn__gte=4)  # Add the turns >= 4 condition
        # & Q(missingPlayers__isnull=True)
    )

    if schism_games:
        query = (
            Q(gameCode="TGZ") & Q(gameStatus="FINISHED") & ~Q(players__player=shadowUser) & Q(turn__gte=4) & Q(created__gte="1742571597000")
            # & Q(missingPlayers__isnull=True)
        )

    # Fetch the initial queryset based on the query
    # Remove any game with missing players here
    # Only small columns here (no gameData), so this join & DISTINCT stays cheap - gameData is fetched separately below
    rows = list(
        Game.objects.filter(query)
        .filter(players__winner=True)  # Ensures game has a winner & picks that specific user
        .exclude(players__is_missing=True)  # Drops game if ANY player is missing
        .values_list("id", "players__player__username", "maxPlayers", "startingOptions", "externalTournamentGame", "relatedMainTournament_id")
        .distinct()
        .order_by("id")
    )

    if schism_games:
        # Filter to schism games: a top-level 7, 8 or 9 in startingOptions
        rows = [row for row in rows if is_schism_game(row[3])]

    all_game_ids = {row[0] for row in rows}

    game_data = dict(Game.objects.filter(id__in=all_game_ids).values_list("id", "gameData"))

    # {game_id: winning seat} for every analysed game, fetched in one go instead of per game
    winner_seats = {}
    for gp in GamePlayer.objects.filter(game_id__in=all_game_ids, winner=True).exclude(is_kicked=True).order_by("id"):
        winner_seats.setdefault(gp.game_id, gp.seat_order)

    FETCHED_GAMES[schism_games] = (rows, game_data, winner_seats)

    return FETCHED_GAMES[schism_games]


def analyze_games(player_count_index, schism_games=False, external_tournament_or_4p_tournament=False):
    """Analyzes game data for a given player count."""

    num_gods = 25 if schism_games else 13  # Determine number of gods based on schism
    G_AVAILABLE: dict[int, list[int]] = {i: [] for i in range(num_gods)}  # {god_index: [game_id1, game_id2, ...]}
    G_PICKED: dict[int, list[int]] = {i: [] for i in range(num_gods)}
    G_WON: dict[int, list[int]] = {i: [] for i in range(num_gods)}
    SPEC_LOST: dict[int, list[int]] = {i: [] for i in range(6)}  # {spec_index: [game_id1, game_id2, ...]}
    SPEC_WON: dict[int, list[int]] = {i: [] for i in range(6)}

    playerCount = player_count_index
    ## NB THIS WILL NEVER HAPPEN - USE external_tournament_or_4p_tournament flag instead
    if playerCount == 4.5:
        playerCount = 4

    seat_wins = [0] * playerCount  # Initialize array to track seat wins
    seat_wins_ids = [[] for _ in range(playerCount)]  # Initialize array to store game IDs for each seat
    seat_wins_4pT = [0] * playerCount  # Initialize array to track seat wins (tournament games)
    seat_wins_4pT_ids = [[] for _ in range(playerCount)]  # Initialize array to store game IDs for each seat (tournament games)

    rows, game_data, winner_seats = fetch_games_to_analyse(schism_games)

    # Pick this player count's games out of the single fetch - the same conditions as before, applied in Python
    dataSet = []
    for row in rows:
        maxPlayers, externalTournamentGame, relatedMainTournament_id = row[2], row[4], row[5]
        if external_tournament_or_4p_tournament:
            if schism_games:
                if relatedMainTournament_id is None or maxPlayers != 4:
                    continue
            elif not (externalTournamentGame or (relatedMainTournament_id is not None and maxPlayers == 4)):
                continue
        elif maxPlayers != playerCount:
            continue
        dataSet.append(row)

    finishedGamesCount = len(dataSet)
    all_game_ids = [row[0] for row in dataSet]

    for row in dataSet:
        game_id, winner_username = row[0], row[1]
        game_data_encoded = game_data[game_id]
        try:
            byte_array = bytearray(base64.b64decode(game_data_encoded))
            decompressed_data = gzip.decompress(byte_array)
            decompressed_string = decompressed_data.decode("utf-8")
            raw_data = json.loads(decompressed_string)
        except Exception as e:
            print(f"Game ERROR - COULD NOT DECOMPRESS: {e}")
            continue

        playerData = raw_data[0]

        # Add unpicked gods
        for god_index in raw_data[10]:
            try:
                G_AVAILABLE[god_index].append(game_id)
            except (IndexError, KeyError):
                print(f"ERROR: God index out of range: {god_index} in game {game_id}")
        for player in playerData:
            player_god = player[7][0] if isinstance(player[7][0], (int, float)) else player[7][0][0]
            player_specs = player[8]
            num_specs = len(player_specs)

            if player_god == -1:
                player_god = 12
                if schism_games:
                    player_god = 24

            G_PICKED[player_god].append(game_id)
            G_AVAILABLE[player_god].append(game_id)  # Add picked into available

            is_winner = player[0] == winner_username

            # Update stats for winner
            if is_winner:
                G_WON[player_god].append(game_id)
                for spec in player_specs:
                    SPEC_WON[spec[0]].append(game_id)
                if num_specs == 0:
                    SPEC_WON[5].append(game_id)

                # Update the starting position (seat) data for the winner
                winner_seat = winner_seats.get(game_id, -1)
                if not isinstance(winner_seat, int) or not 0 <= winner_seat < playerCount:
                    print("Error: Winner's seat not found")
                elif external_tournament_or_4p_tournament:
                    # Increment the seat wins
                    seat_wins_4pT[winner_seat] += 1

                    # Add the game ID to the corresponding seat's game IDs
                    seat_wins_4pT_ids[winner_seat].append(game_id)
                else:
                    # Increment the seat wins
                    seat_wins[winner_seat] += 1

                    # Add the game ID to the corresponding seat's game IDs
                    seat_wins_ids[winner_seat].append(game_id)

            else:

                for spec in player_specs:
                    SPEC_LOST[spec[0]].append(game_id)
                if num_specs == 0:
                    SPEC_LOST[5].append(game_id)

    return (
        finishedGamesCount,
        G_AVAILABLE,
        G_PICKED,
        G_WON,
        SPEC_LOST,
        SPEC_WON,
        playerCount,
        seat_wins,
        seat_wins_ids,
        seat_wins_4pT,
        seat_wins_4pT_ids,
        all_game_ids,
    )


def calculate_stats(
    G_AVAILABLE,
    G_PICKED,
    G_WON,
    SPEC_LOST,
    SPEC_WON,
    finishedGamesCount,
    playerCount,
    schism_games,
    all_game_ids=None,
):
    """Calculates statistics based on the game data."""
    if schism_games:
        G_NAMES = [
            "Shadipinyi",
            "Elegua",
            "Dziva",
            "Eshu",
            "Gu",
            "Obatala",
            "Atete",
            "Tsui-Goab",
            "Anansi",
            "Qamata",
            "Engai",
            "Xango",
            "Agwu Nsi",
            "Aja",
            "Aje Shaluga",
            "Alajire",
            "Anyanwu",
            "Ekwensu",
            "Ogun",
            "Ovia",
            "Oya",
            "Simbi",
            "Tiurakh",
            "Yemoja",
            "None",
        ]
    else:
        G_NAMES = [
            "Shadipinyi",
            "Elegua",
            "Dziva",
            "Eshu",
            "Gu",
            "Obatala",
            "Atete",
            "Tsui-Goab",
            "Anansi",
            "Qamata",
            "Engai",
            "Xango",
            "None",
        ]

    G_STATS_DATA = {}

    for i in range(len(G_NAMES)):
        god_name = G_NAMES[i]
        if god_name == "None":
            available_count = finishedGamesCount
            available_game_ids = all_game_ids if all_game_ids is not None else list(range(1, finishedGamesCount + 1))
            not_chosen_game_ids = []
            not_chosen_count = 0  # placeholder 0
        else:
            available_count = len(G_AVAILABLE[i])
            available_game_ids = G_AVAILABLE[i]
            not_chosen_game_ids = list(set(available_game_ids) - set(G_PICKED[i]))  # Available but not picked
            not_chosen_count = len(not_chosen_game_ids)

        picked_count = len(G_PICKED[i])
        picked_game_ids = G_PICKED[i]
        won_count = len(G_WON[i])
        won_game_ids = G_WON[i]
        lost_count = picked_count - won_count
        lost_game_ids = list(set(picked_game_ids) - set(won_game_ids))

        picked_percentage = round(picked_count / available_count * 100) if available_count != 0 else 0
        won_percentage = round(won_count / available_count * 100) if available_count != 0 else 0
        won_when_picked_percentage = round(won_count / picked_count * 100) if picked_count != 0 else 0

        G_STATS_DATA[god_name] = {
            "available": available_count,
            "available_game_ids": available_game_ids,
            "picked": picked_count,
            "picked_game_ids": picked_game_ids,
            "won": won_count,
            "won_game_ids": won_game_ids,
            "lost": lost_count,
            "lost_game_ids": lost_game_ids,
            "not_chosen": not_chosen_count,
            "not_chosen_game_ids": not_chosen_game_ids,
            "picked_percentage": picked_percentage,
            "won_percentage": won_percentage,
            "won_when_picked_percentage": won_when_picked_percentage,
            "bar_chart_data": [
                won_count,
                picked_count - won_count,
                available_count - picked_count,
            ],
        }

    S_STATS_DATA = {}

    S_NAMES = ["Herd", "Nomads", "Rain Ceremony", "Shaman", "Builder", "None"]

    for i in range(len(S_NAMES)):
        spec_name = S_NAMES[i]
        lost_count = len(SPEC_LOST[i])
        lost_game_ids = SPEC_LOST[i]
        won_count = len(SPEC_WON[i])
        won_game_ids = SPEC_WON[i]

        lost_percentage = (round(lost_count / finishedGamesCount / (playerCount - 1) * 100) if finishedGamesCount != 0 else 0) if spec_name == "None" else (round(lost_count / finishedGamesCount * 100) if finishedGamesCount != 0 else 0)

        won_percentage = round(won_count / finishedGamesCount * 100) if finishedGamesCount != 0 else 0
        win_loss_ratio = round(won_count / lost_count * 100) if lost_count != 0 else 0

        S_STATS_DATA[spec_name] = {
            "lost": lost_count,
            "lost_game_ids": lost_game_ids,
            "won": won_count,
            "won_game_ids": won_game_ids,
            "lost_percentage": lost_percentage,
            "won_percentage": won_percentage,
            "win_loss_ratio": win_loss_ratio,
            "bar_chart_data": [
                won_count,
                lost_count,
                (0 if spec_name == "None" else finishedGamesCount - won_count - lost_count),
            ],
        }

    return G_STATS_DATA, S_STATS_DATA


def generate_stats_data(schism_games=False):
    """Generates the stats data for all player counts."""
    ALL_DATA: dict[str, str | int | object] = {}

    # Get the current UTC time
    current_time = datetime.datetime.now(datetime.UTC)
    time_string = current_time.strftime("%H:%M GMT - %d %B %Y")
    ALL_DATA["time_string"] = time_string

    ALL_DATA["player_counts"] = {}

    for playerCountIndex in [2, 3, 4, 5]:  # Remove 4.5 from here
        (
            finishedGamesCount,
            G_AVAILABLE,
            G_PICKED,
            G_WON,
            SPEC_LOST,
            SPEC_WON,
            playerCount,
            seat_wins,
            seat_wins_ids,
            seat_wins_4pT,
            seat_wins_4pT_ids,
            all_game_ids,
        ) = analyze_games(playerCountIndex, schism_games)

        G_STATS_DATA, S_STATS_DATA = calculate_stats(
            G_AVAILABLE,
            G_PICKED,
            G_WON,
            SPEC_LOST,
            SPEC_WON,
            finishedGamesCount,
            playerCount,
            schism_games,
            all_game_ids,
        )

        player_data = {
            "finishedGamesCount": finishedGamesCount,
            "god_stats": G_STATS_DATA,
            "spec_stats": S_STATS_DATA,
        }

        # Add seat win data for every player count
        player_data["seat_wins"] = [[POSITION_TITLES[i], seat_wins[i], seat_wins_ids[i]] for i in range(playerCount)]  # Added title

        ALL_DATA["player_counts"][playerCount] = player_data

    #### END OF 2/3/4/5 PLAYERS

    # Handle external tournament games separately
    (
        finishedGamesCount,
        G_AVAILABLE,
        G_PICKED,
        G_WON,
        SPEC_LOST,
        SPEC_WON,
        playerCount,
        seat_wins,
        seat_wins_ids,
        seat_wins_4pT,
        seat_wins_4pT_ids,
        all_game_ids,
    ) = analyze_games(4, schism_games=schism_games, external_tournament_or_4p_tournament=True)

    G_STATS_DATA, S_STATS_DATA = calculate_stats(
        G_AVAILABLE,
        G_PICKED,
        G_WON,
        SPEC_LOST,
        SPEC_WON,
        finishedGamesCount,
        4,
        schism_games,
        all_game_ids,
    )

    # ALL_DATA["player_counts"]["4.5"] = {
    #    "finishedGamesCount": finishedGamesCount,
    #    "god_stats": G_STATS_DATA,
    #    "spec_stats": S_STATS_DATA,
    # }

    player_data = {
        "finishedGamesCount": finishedGamesCount,
        "god_stats": G_STATS_DATA,
        "spec_stats": S_STATS_DATA,
    }

    # Tournament games are always 4p
    player_data["seat_wins"] = [[POSITION_TITLES[i], seat_wins_4pT[i], seat_wins_4pT_ids[i]] for i in range(4)]  # Added title

    # player_data["seat_wins_4pT"] = seat_wins_4pT
    # player_data["seat_wins_4pT_ids"] = seat_wins_4pT_ids

    ALL_DATA["player_counts"]["4.5"] = player_data

    return ALL_DATA


# Generate regular stats

ALL_DATA = generate_stats_data(schism_games=False)

file_path = BASE_DIR / "TGZ" / "TGZstats" / "TGZ_stats.json"

with open(file_path, mode="w") as filehandle:
    json.dump(ALL_DATA, filehandle, indent=4)


# Generate schism stats
ALL_DATA_SCHISM = generate_stats_data(schism_games=True)

file_path_schism = BASE_DIR / "TGZ" / "TGZstats" / "TGZ_stats_schism.json"

with open(file_path_schism, mode="w") as filehandle:
    json.dump(ALL_DATA_SCHISM, filehandle, indent=4)

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
