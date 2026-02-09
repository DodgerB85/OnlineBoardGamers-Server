# Needs to be inside the root folder of the project, IE with manage.py
import os
import sys
import time
from decouple import config
from pathlib import Path

from django.db.models import Q, Count
import json
import django
from django.conf import settings
from datetime import datetime, timedelta

# from django.contrib.auth.models import User

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True
SAVE_ALL = True

# Because the live and dev servers are in different folder names, we need to go up one from that
ROOT_DIR = Path(__file__).resolve().parents[2]

if DEBUG:
    os.environ["LOCAL_DB_NAME"] = str(config("LOCAL_DB_NAME", default="name", cast=str))
    os.environ["LOCAL_DB_USER"] = str(
        config("LOCAL_DB_USER", default="username", cast=str)
    )
    os.environ["LOCAL_DB_PWD"] = str(
        config("LOCAL_DB_PWD", default="password", cast=str)
    )
    os.environ["LOCAL_DB_HOST"] = "127.0.0.1"

# sys.path.append(
#    os.path.join(BASE_DIR, "OnlineBoardGamers" if DEBUG else "OnlineGaming")
# )

BASE_DIR = ROOT_DIR / "OnlineBoardGamers"

# 3. Now sys.path.append is much cleaner
sys.path.append(str(BASE_DIR))


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)

print(BASE_DIR)

try:
    django.setup()

except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from Lobby.models import User, Game, GamePlayer


# These are the final output arrays, eg winArr - [ [game1tot, game 1%], [game2tot, game2%], etc]
fairPlayArr_E = []

winArr_E = []
win3mArr_E = []
win1mArr_E = []

winArr2p_E = []
win3mArr2p_E = []
win1mArr2p_E = []

winArr3p_E = []
win3mArr3p_E = []
win1mArr3p_E = []

winArr4p_E = []
win3mArr4p_E = []
win1mArr4p_E = []

winArr5p_E = []
win3mArr5p_E = []
win1mArr5p_E = []

winArr6p_E = []
win3mArr6p_E = []
win1mArr6p_E = []


GAME_CODES = [
    #"FCM",
    #"HC",
    #"Bus",
    #"TGZ",
    #"CNS",
    "AQY",
    "IND",
    "KFW",
    "WEB",
    #"RNB",
    #"BOB",
]

EXCLUDE_USERS = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5", "FcmAI"]

# one_month_ago = datetime.now() - timedelta(days=30)
# three_months_ago = datetime.now() - timedelta(days=90)
# one_year_ago = datetime.now() - timedelta(days=365)

one_month_ago = int((datetime.now() - timedelta(days=30)).timestamp() * 1000)
three_months_ago = int((datetime.now() - timedelta(days=90)).timestamp() * 1000)
one_year_ago = int((datetime.now() - timedelta(days=365)).timestamp() * 1000)

start_calc_time = time.perf_counter()

# Get all users
users = User.objects.all()


def get_finished_games(game_code, time_limit=None, player_count=None):
    """Get all finished games based on the provided game model and filters."""
    query = Q(game__gameCode=game_code, game__gameStatus="FINISHED") & ~Q(
        game__statsExcludedGame=True
    )

    if player_count:
        query &= Q(game__maxPlayers=player_count)
    if time_limit:
        query &= Q(game__latestUpdate__gte=time_limit)

    return (
        GamePlayer.objects.filter(query)
        .exclude(player__username__in=EXCLUDE_USERS)
        .values("player__id", "player__username")
        .annotate(total_games=Count("id"))
    )


def get_won_games(game_code, time_limit=None, player_count=None):
    """
    Counts total wins per user by querying GamePlayer entries where winner=True.
    """
    query = Q(
        game__gameCode=game_code, 
        game__gameStatus="FINISHED", 
        winner=True # BooleanField on GamePlayer
    ) & ~Q(game__statsExcludedGame=True)
    
    if player_count:
        query &= Q(game__maxPlayers=player_count)
    if time_limit:
        query &= Q(game__latestUpdate__gte=time_limit)

    return (
        GamePlayer.objects.filter(query)
        .exclude(player__username__in=EXCLUDE_USERS)
        .values("player__id", "player__username")
        .annotate(total_wins=Count("id"))
    )

# First, calculate each game serperately, and save the data
for gameCode in GAME_CODES:
    game_start_calc_time = time.perf_counter()
    print(f"Calculating stats for {gameCode}...")
    allFinishedGames1year_E = get_finished_games(gameCode, one_year_ago)

    allKickedGames1year_E = (
        GamePlayer.objects.filter(
            game__gameCode=gameCode,
            game__gameStatus="FINISHED",
            game__latestUpdate__gte=one_year_ago,
            is_kicked=True # BooleanField on GamePlayer
        )
        .exclude(player__username__in=EXCLUDE_USERS)
        .values("player__id", "player__username")
        .annotate(total_kicks=Count("id"))
    )

    finishedGamesByPlayerCount = []
    # All games played - All time
    allFinishedGames_E = get_finished_games(gameCode)
    allFinishedGames90days_E = get_finished_games(gameCode, three_months_ago)
    allFinishedGames30days_E = get_finished_games(gameCode, one_month_ago)

    finishedGamesByPlayerCount.append(
        [allFinishedGames_E, allFinishedGames90days_E, allFinishedGames30days_E]
    )

    # Calculate total games played per playerCount
    for i in range(2, 7):
        finishedGames = get_finished_games(gameCode, None, i)
        finishedGames_3m = get_finished_games(gameCode, three_months_ago, i)
        finishedGames_1m = get_finished_games(gameCode, one_month_ago, i)
        finishedGamesByPlayerCount.append(
            [finishedGames, finishedGames_3m, finishedGames_1m]
        )

    wonGamesByPlayerCount = []
    # Calculate total games won per playerCount
    allWinner_E = get_won_games(gameCode)
    allWinner3m_E = get_won_games(gameCode, three_months_ago)
    allWinner1m_E = get_won_games(gameCode, one_month_ago)

    wonGamesByPlayerCount.append([allWinner_E, allWinner3m_E, allWinner1m_E])

    for i in range(2, 7):
        wonGames = get_won_games(gameCode, None, i)
        wonGames_3m = get_won_games(gameCode, three_months_ago, i)
        wonGames_1m = get_won_games(gameCode, one_month_ago, i)
        wonGamesByPlayerCount.append([wonGames, wonGames_3m, wonGames_1m])

    # This gets us a whole load of querysets with [{'allPlayers': 1, 'total_games': 61},...]

    fairPlayLeague_E = []

    # All Players
    winPercentages_E = []
    winTotals_E = []
    winPercentagesMonth_E = []
    winTotalsMonth_E = []
    winPercentagesThreeMonths_E = []
    winTotalsThreeMonths_E = []

    # 2 Players
    winPercentages2p_E = []
    winTotals2p_E = []
    winPercentagesMonth2p_E = []
    winTotalsMonth2p_E = []
    winPercentagesThreeMonths2p_E = []
    winTotalsThreeMonths2p_E = []

    # 3 Players
    winPercentages3p_E = []
    winTotals3p_E = []
    winPercentagesMonth3p_E = []
    winTotalsMonth3p_E = []
    winPercentagesThreeMonths3p_E = []
    winTotalsThreeMonths3p_E = []

    # 4 Players
    winPercentages4p_E = []
    winTotals4p_E = []
    winPercentagesMonth4p_E = []
    winTotalsMonth4p_E = []
    winPercentagesThreeMonths4p_E = []
    winTotalsThreeMonths4p_E = []

    # 5 Players
    winPercentages5p_E = []
    winTotals5p_E = []
    winPercentagesMonth5p_E = []
    winTotalsMonth5p_E = []
    winPercentagesThreeMonths5p_E = []
    winTotalsThreeMonths5p_E = []

    # 6 Players
    winPercentages6p_E = []
    winTotals6p_E = []
    winPercentagesMonth6p_E = []
    winTotalsMonth6p_E = []
    winPercentagesThreeMonths6p_E = []
    winTotalsThreeMonths6p_E = []

    # Create dictionaries to store the results
    allFinishedGames1year_E_dict = {
        user["player__id"]: user["total_games"] for user in allFinishedGames1year_E
    }
    allKickedGames1year_E_dict = {
        user["player__id"]: user["total_kicks"] for user in allKickedGames1year_E
    }

    finishedGamesByPlayerCount_dict = []
    for row in finishedGamesByPlayerCount:
        finishedGamesByPlayerCount_dict.append(
            [
                {user["player__id"]: user["total_games"] for user in row[0]},
                {user["player__id"]: user["total_games"] for user in row[1]},
                {user["player__id"]: user["total_games"] for user in row[2]},
            ]
        )

    wonGamesByPlayerCount_dict = []
    for row in wonGamesByPlayerCount:
        wonGamesByPlayerCount_dict.append(
            [
                {user["player__id"]: user["total_wins"] for user in row[0]},
                {user["player__id"]: user["total_wins"] for user in row[1]},
                {user["player__id"]: user["total_wins"] for user in row[2]},
            ]
        )

    # Iterate over all users to retrieve the game statistics
    for user in users:
        # Calc fair play
        games_played_count = allFinishedGames1year_E_dict.get(user.id, 0)
        kicks_count = allKickedGames1year_E_dict.get(user.id, 0)
        if kicks_count > 0:
            kicks_count -= 1
        if games_played_count > 0:
            completedPc = round(
                (games_played_count - kicks_count) / games_played_count * 100, 2
            )
            if completedPc > 0:
                fairPlayLeague_E.append(
                    [user.username, completedPc, games_played_count]
                )

        for i in range(len(finishedGamesByPlayerCount_dict)):
            for j in range(len(finishedGamesByPlayerCount_dict[i])):
                games_played_count = finishedGamesByPlayerCount_dict[i][j].get(
                    user.id, 0
                )
                games_won_count = wonGamesByPlayerCount_dict[i][j].get(user.id, 0)

                if games_won_count > 0:
                    # All players
                    if i == 0 and j == 0:
                        winTotals_E.append([user.username, games_won_count])
                    if i == 0 and j == 1:
                        winTotalsThreeMonths_E.append([user.username, games_won_count])
                    if i == 0 and j == 2:
                        winTotalsMonth_E.append([user.username, games_won_count])
                    # 2p
                    if i == 1 and j == 0:
                        winTotals2p_E.append([user.username, games_won_count])
                    if i == 1 and j == 1:
                        winTotalsThreeMonths2p_E.append(
                            [user.username, games_won_count]
                        )
                    if i == 1 and j == 2:
                        winTotalsMonth2p_E.append([user.username, games_won_count])
                    # 3p
                    if i == 2 and j == 0:
                        winTotals3p_E.append([user.username, games_won_count])
                    if i == 2 and j == 1:
                        winTotalsThreeMonths3p_E.append(
                            [user.username, games_won_count]
                        )
                    if i == 2 and j == 2:
                        winTotalsMonth3p_E.append([user.username, games_won_count])
                    # 4p
                    if i == 3 and j == 0:
                        winTotals4p_E.append([user.username, games_won_count])
                    if i == 3 and j == 1:
                        winTotalsThreeMonths4p_E.append(
                            [user.username, games_won_count]
                        )
                    if i == 3 and j == 2:
                        winTotalsMonth4p_E.append([user.username, games_won_count])
                    # 5p
                    if i == 4 and j == 0:
                        winTotals5p_E.append([user.username, games_won_count])
                    if i == 4 and j == 1:
                        winTotalsThreeMonths5p_E.append(
                            [user.username, games_won_count]
                        )
                    if i == 4 and j == 2:
                        winTotalsMonth5p_E.append([user.username, games_won_count])
                    # 6p
                    if i == 5 and j == 0:
                        winTotals6p_E.append([user.username, games_won_count])
                    if i == 5 and j == 1:
                        winTotalsThreeMonths6p_E.append(
                            [user.username, games_won_count]
                        )
                    if i == 5 and j == 2:
                        winTotalsMonth6p_E.append([user.username, games_won_count])

                if games_played_count >= 5 and games_won_count > 0:
                    games_won_percent = round(
                        (games_won_count / games_played_count) * 100, 2
                    )
                    games_won_percent_str = str(games_won_percent)
                    # if no games in last 3 months, set to 80
                    if j == 0 and games_won_percent > 80:
                        games_played_count_three_months = (
                            finishedGamesByPlayerCount_dict[i][1].get(user.id, 0)
                        )
                        if games_played_count_three_months == 0:
                            games_won_percent = 80.00
                            games_won_percent_str = "80*"
                    # All players
                    if i == 0 and j == 0:
                        winPercentages_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 0 and j == 1:
                        winPercentagesThreeMonths_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 0 and j == 2:
                        winPercentagesMonth_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    # 2p
                    if i == 1 and j == 0:
                        winPercentages2p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 1 and j == 1:
                        winPercentagesThreeMonths2p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 1 and j == 2:
                        winPercentagesMonth2p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    # 3p
                    if i == 2 and j == 0:
                        winPercentages3p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 2 and j == 1:
                        winPercentagesThreeMonths3p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 2 and j == 2:
                        winPercentagesMonth3p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    # 4p
                    if i == 3 and j == 0:
                        winPercentages4p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 3 and j == 1:
                        winPercentagesThreeMonths4p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 3 and j == 2:
                        winPercentagesMonth4p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    # 5p
                    if i == 4 and j == 0:
                        winPercentages5p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 4 and j == 1:
                        winPercentagesThreeMonths5p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 4 and j == 2:
                        winPercentagesMonth5p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    # 6p
                    if i == 5 and j == 0:
                        winPercentages6p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 5 and j == 1:
                        winPercentagesThreeMonths6p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )
                    if i == 5 and j == 2:
                        winPercentagesMonth6p_E.append(
                            [
                                user.username,
                                games_won_percent_str
                                + " %  ( "
                                + str(games_won_count)
                                + " / "
                                + str(games_played_count)
                                + " )",
                                games_won_percent,
                            ]
                        )

    fairPlayLeague_E = sorted(fairPlayLeague_E, key=lambda x: x[2], reverse=True)
    fairPlayLeague_E = sorted(fairPlayLeague_E, key=lambda x: x[1], reverse=True)
    fairPlayLeague_E = fairPlayLeague_E[:50]
    fairPlayArr_E.append(fairPlayLeague_E)

    # Sort the totals
    winTotals_E = sorted(winTotals_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths_E = sorted(
        winTotalsThreeMonths_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth_E = sorted(winTotalsMonth_E, key=lambda x: x[1], reverse=True)[:10]

    winTotals2p_E = sorted(winTotals2p_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths2p_E = sorted(
        winTotalsThreeMonths2p_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth2p_E = sorted(winTotalsMonth2p_E, key=lambda x: x[1], reverse=True)[
        :10
    ]

    winTotals3p_E = sorted(winTotals3p_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths3p_E = sorted(
        winTotalsThreeMonths3p_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth3p_E = sorted(winTotalsMonth3p_E, key=lambda x: x[1], reverse=True)[
        :10
    ]

    winTotals4p_E = sorted(winTotals4p_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths4p_E = sorted(
        winTotalsThreeMonths4p_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth4p_E = sorted(winTotalsMonth4p_E, key=lambda x: x[1], reverse=True)[
        :10
    ]

    winTotals5p_E = sorted(winTotals5p_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths5p_E = sorted(
        winTotalsThreeMonths5p_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth5p_E = sorted(winTotalsMonth5p_E, key=lambda x: x[1], reverse=True)[
        :10
    ]

    winTotals6p_E = sorted(winTotals6p_E, key=lambda x: x[1], reverse=True)[:25]
    winTotalsThreeMonths6p_E = sorted(
        winTotalsThreeMonths6p_E, key=lambda x: x[1], reverse=True
    )[:20]
    winTotalsMonth6p_E = sorted(winTotalsMonth6p_E, key=lambda x: x[1], reverse=True)[
        :10
    ]

    # Sort the Percentages
    winPercentages_E = sorted(winPercentages_E, key=lambda x: x[2], reverse=True)[:25]
    winPercentagesThreeMonths_E = sorted(
        winPercentagesThreeMonths_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth_E = sorted(
        winPercentagesMonth_E, key=lambda x: x[2], reverse=True
    )[:10]

    winPercentages2p_E = sorted(winPercentages2p_E, key=lambda x: x[2], reverse=True)[
        :25
    ]
    winPercentagesThreeMonths2p_E = sorted(
        winPercentagesThreeMonths2p_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth2p_E = sorted(
        winPercentagesMonth2p_E, key=lambda x: x[2], reverse=True
    )[:10]

    winPercentages3p_E = sorted(winPercentages3p_E, key=lambda x: x[2], reverse=True)[
        :25
    ]
    winPercentagesThreeMonths3p_E = sorted(
        winPercentagesThreeMonths3p_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth3p_E = sorted(
        winPercentagesMonth3p_E, key=lambda x: x[2], reverse=True
    )[:10]

    winPercentages4p_E = sorted(winPercentages4p_E, key=lambda x: x[2], reverse=True)[
        :25
    ]
    winPercentagesThreeMonths4p_E = sorted(
        winPercentagesThreeMonths4p_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth4p_E = sorted(
        winPercentagesMonth4p_E, key=lambda x: x[2], reverse=True
    )[:10]

    winPercentages5p_E = sorted(winPercentages5p_E, key=lambda x: x[2], reverse=True)[
        :25
    ]
    winPercentagesThreeMonths5p_E = sorted(
        winPercentagesThreeMonths5p_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth5p_E = sorted(
        winPercentagesMonth5p_E, key=lambda x: x[2], reverse=True
    )[:10]

    winPercentages6p_E = sorted(winPercentages6p_E, key=lambda x: x[2], reverse=True)[
        :25
    ]
    winPercentagesThreeMonths6p_E = sorted(
        winPercentagesThreeMonths6p_E, key=lambda x: x[2], reverse=True
    )[:20]
    winPercentagesMonth6p_E = sorted(
        winPercentagesMonth6p_E, key=lambda x: x[2], reverse=True
    )[:10]

    # Add to the big final result
    winArr_E.append([winTotals_E, winPercentages_E])
    win3mArr_E.append([winTotalsThreeMonths_E, winPercentagesThreeMonths_E])
    win1mArr_E.append([winTotalsMonth_E, winPercentagesMonth_E])

    winArr2p_E.append([winTotals2p_E, winPercentages2p_E])
    win3mArr2p_E.append([winTotalsThreeMonths2p_E, winPercentagesThreeMonths2p_E])
    win1mArr2p_E.append([winTotalsMonth2p_E, winPercentagesMonth2p_E])

    winArr3p_E.append([winTotals3p_E, winPercentages3p_E])
    win3mArr3p_E.append([winTotalsThreeMonths3p_E, winPercentagesThreeMonths3p_E])
    win1mArr3p_E.append([winTotalsMonth3p_E, winPercentagesMonth3p_E])

    winArr4p_E.append([winTotals4p_E, winPercentages4p_E])
    win3mArr4p_E.append([winTotalsThreeMonths4p_E, winPercentagesThreeMonths4p_E])
    win1mArr4p_E.append([winTotalsMonth4p_E, winPercentagesMonth4p_E])

    winArr5p_E.append([winTotals5p_E, winPercentages5p_E])
    win3mArr5p_E.append([winTotalsThreeMonths5p_E, winPercentagesThreeMonths5p_E])
    win1mArr5p_E.append([winTotalsMonth5p_E, winPercentagesMonth5p_E])

    winArr6p_E.append([winTotals6p_E, winPercentages6p_E])
    win3mArr6p_E.append([winTotalsThreeMonths6p_E, winPercentagesThreeMonths6p_E])
    win1mArr6p_E.append([winTotalsMonth6p_E, winPercentagesMonth6p_E])

    if SAVE_ALL:
        # 1. Define the base path for this specific game's stats
        # This replaces the './' with your absolute BASE_DIR
        game_stats_base = os.path.join(BASE_DIR, gameCode, f"{gameCode}stats")

        # Ensure the directory exists before writing
        os.makedirs(game_stats_base, exist_ok=True)

        # 2. Define a mapping of filenames to their corresponding data objects
        # This eliminates the 50+ repetitive 'with open' blocks
        stats_map = {
            "data_fairPlayLeague_E.json": fairPlayLeague_E,
            "data_winPercentages_E.json": winPercentages_E,
            "data_winTotals_E.json": winTotals_E,
            "data_winPercentagesMonth_E.json": winPercentagesMonth_E,
            "data_winTotalsMonth_E.json": winTotalsMonth_E,
            "data_winPercentagesThreeMonths_E.json": winPercentagesThreeMonths_E,
            "data_winTotalsThreeMonths_E.json": winTotalsThreeMonths_E,
            # 2 Player stats
            "data_winPercentages2p_E.json": winPercentages2p_E,
            "data_winTotals2p_E.json": winTotals2p_E,
            "data_winPercentagesMonth2p_E.json": winPercentagesMonth2p_E,
            "data_winTotalsMonth2p_E.json": winTotalsMonth2p_E,
            "data_winPercentagesThreeMonths2p_E.json": winPercentagesThreeMonths2p_E,
            "data_winTotalsThreeMonths2p_E.json": winTotalsThreeMonths2p_E,
            # 3 Player stats
            "data_winPercentages3p_E.json": winPercentages3p_E,
            "data_winTotals3p_E.json": winTotals3p_E,
            "data_winPercentagesMonth3p_E.json": winPercentagesMonth3p_E,
            "data_winTotalsMonth3p_E.json": winTotalsMonth3p_E,
            "data_winPercentagesThreeMonths3p_E.json": winPercentagesThreeMonths3p_E,
            "data_winTotalsThreeMonths3p_E.json": winTotalsThreeMonths3p_E,
            # 4 Player stats
            "data_winPercentages4p_E.json": winPercentages4p_E,
            "data_winTotals4p_E.json": winTotals4p_E,
            "data_winPercentagesMonth4p_E.json": winPercentagesMonth4p_E,
            "data_winTotalsMonth4p_E.json": winTotalsMonth4p_E,
            "data_winPercentagesThreeMonths4p_E.json": winPercentagesThreeMonths4p_E,
            "data_winTotalsThreeMonths4p_E.json": winTotalsThreeMonths4p_E,
            # 5 Player stats
            "data_winPercentages5p_E.json": winPercentages5p_E,
            "data_winTotals5p_E.json": winTotals5p_E,
            "data_winPercentagesMonth5p_E.json": winPercentagesMonth5p_E,
            "data_winTotalsMonth5p_E.json": winTotalsMonth5p_E,
            "data_winPercentagesThreeMonths5p_E.json": winPercentagesThreeMonths5p_E,
            "data_winTotalsThreeMonths5p_E.json": winTotalsThreeMonths5p_E,
            # 6 Player stats
            "data_winPercentages6p_E.json": winPercentages6p_E,
            "data_winTotals6p_E.json": winTotals6p_E,
            "data_winPercentagesMonth6p_E.json": winPercentagesMonth6p_E,
            "data_winTotalsMonth6p_E.json": winTotalsMonth6p_E,
            "data_winPercentagesThreeMonths6p_E.json": winPercentagesThreeMonths6p_E,
            "data_winTotalsThreeMonths6p_E.json": winTotalsThreeMonths6p_E,
        }

        # 3. Write all files in a single loop
        for filename, data_obj in stats_map.items():
            file_path = os.path.join(game_stats_base, filename)
            with open(file_path, mode="w") as filehandle:
                json.dump(data_obj, filehandle)

    calc_time = time.perf_counter() - start_calc_time
    game_calc_time = time.perf_counter() - game_start_calc_time
    if PRINT_TIME:
        print(
            "****** "
            + gameCode
            + " calc time: "
            + str(game_calc_time)
            + "   TOTAL: "
            + str(calc_time)
        )

################################## END LOOP ############################

# Final Lobby directory save using BASE_DIR
lobby_stats_dir = os.path.join(BASE_DIR, "Lobby", "stats")
os.makedirs(lobby_stats_dir, exist_ok=True)

print(f"lobby stats directory: {lobby_stats_dir}")

# List of files to write
files_to_write = [
    ("fairPlayArr_E.json", fairPlayArr_E),
    ("winArr_E.json", winArr_E),
    ("win3mArr_E.json", win3mArr_E),
    ("win1mArr_E.json", win1mArr_E),
    ("winArr2p_E.json", winArr2p_E),
    ("win3mArr2p_E.json", win3mArr2p_E),
    ("win1mArr2p_E.json", win1mArr2p_E),
    ("winArr3p_E.json", winArr3p_E),
    ("win3mArr3p_E.json", win3mArr3p_E),
    ("win1mArr3p_E.json", win1mArr3p_E),
    ("winArr4p_E.json", winArr4p_E),
    ("win3mArr4p_E.json", win3mArr4p_E),
    ("win1mArr4p_E.json", win1mArr4p_E),
    ("winArr5p_E.json", winArr5p_E),
    ("win3mArr5p_E.json", win3mArr5p_E),
    ("win1mArr5p_E.json", win1mArr5p_E),
    ("winArr6p_E.json", winArr6p_E),
    ("win3mArr6p_E.json", win3mArr6p_E),
    ("win1mArr6p_E.json", win1mArr6p_E),
]

# Write data to JSON files
for filename, data in files_to_write:
    file_path = os.path.join(lobby_stats_dir, filename)
    try:
        with open(file_path, mode="w") as filehandle:
            json.dump(data, filehandle)
        # print(f"Saved data to {file_path}")
    except Exception as e:
        print(f"Error writing to {file_path}: {e}")

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
