# Needs to be inside the root folder of the project, IE with manage.py
import os
import sys
import time
from pathlib import Path

from django.db.models import Q, Prefetch  # , Count
from django.db import connection
import math
from itertools import chain
from decouple import config

import django

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True

# Configure Django settings based on environment
# This gets the folder containing the current file, then goes 2 levels up
# Because the live and dev servers are in different folder names, we need to go up one from that
BASE_DIR = Path(__file__).resolve().parent.parent.parent

if DEBUG:
    # CAREFUL! AN ONLINE MIRROR DB COULD NOTIFY EVERYONE. MAKE SURE DEBUG TRUE SUPRESSES WEBHOOKS
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

sys.path.append(os.path.join(BASE_DIR, "OnlineBoardGamers"))
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)

try:
    django.setup()
    from django.contrib.sites.models import Site

except Exception as e:
    print(f"Error setting up Django: {e}")
    sys.exit(1)

from Lobby.models import User, Game, GamePlayer  # noqa: E402

from Lobby.sharedFunctions.sharedNotifications import (
    SN_send24HourTimedOutReminderEmail,
)  # noqa: E402

GAME_CODES = ["FCM", "HC", "Bus", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

start_calc_time = time.perf_counter()
email_counter = 0


def daysSinceLastMove(latestUpdate):
    elapsedTotalSeconds = int(time.time()) - (int(latestUpdate) / 1000)
    elapsedTotalDays = math.floor(elapsedTotalSeconds / 60 / 60 / 24)
    return elapsedTotalDays


# allUsers = User.objects.all()
# allUsers_count = len(allUsers)

# Fetch all active games in a single query
# active_games_query = Q(gameStatus="ACTIVE") & ~Q(allPlayers__username="SHADOW") & ~Q(allPlayers__username="FcmAI")
# allActiveGames = list(chain.from_iterable(game_model.objects.filter(active_games_query).all() for game_model in GAME_NAMES_MODELS.values()))

# 1. Fetch all active games with their players in one go per model
active_games_query = (
    Q(gameStatus="ACTIVE")
    & ~Q(players__player__username="SHADOW")
    & ~Q(players__player__username="FcmAI")
)

# 2. Use select_related inside prefetch_related for maximum efficiency
# This fetches the GamePlayer and the User (player) in one go for each game.
#allActiveGames = list(
#    Game.objects.filter(active_games_query)
#    .prefetch_related("players__player")
#    .distinct()
#)
allActiveGames = list(
    Game.objects.filter(active_games_query)
    .prefetch_related(
        # Only prefetch the specific player whose turn it is
        Prefetch('players', queryset=GamePlayer.objects.filter(is_current=True).select_related('player'))
    )
    .distinct()
)

# High-speed alternative: gets only usernames from the database
# current_players_set = set(
#    GamePlayer.objects.filter(game__gameStatus="ACTIVE")
#    .exclude(player__username__in=["SHADOW", "FcmAI"])
#    .values_list('player__username', flat=True)
# )

# 2. Build a map of { username: [(game, days_elapsed)] } in memory
# This replaces the nested loop that was hitting the DB repeatedly
user_to_games_map = {}

for game in allActiveGames:
    days_elapsed = daysSinceLastMove(game.latestUpdate)

    if 1 <= days_elapsed <= 6:
        # NEW LOGIC: Extract usernames from the intermediate GamePlayer model
        # Use .all() on the prefetched manager to avoid new DB hits
        current_game_usernames = [
            gp.player.username
            for gp in game.players.all()
            if gp.is_current
            and gp.player
            and gp.player.username not in ["SHADOW", "FcmAI"]
        ]

        for username in current_game_usernames:
            if username not in user_to_games_map:
                user_to_games_map[username] = []
            user_to_games_map[username].append((game, days_elapsed))


# 3. Sort the game lists for each user
for username in user_to_games_map:
    user_to_games_map[username].sort(key=lambda x: -x[1])

timed_out_usernames = list(user_to_games_map.keys())
print(f"Timed out usernames: {len(timed_out_usernames)} LIST: {timed_out_usernames}")

# DB HIT 1: Fetch all users and their profiles at once
users_with_profiles = User.objects.filter(
    username__in=timed_out_usernames
).select_related("profile")

# Map them for O(1) access
user_data_map = {u.username: u for u in users_with_profiles}

for username in timed_out_usernames:
    if email_counter >= 100:
        break

    user_obj = user_data_map.get(username)
    if not user_obj or not hasattr(user_obj, "profile"):
        print(
            f"Error: could not find user object in Auto24HourTimeoutSummary: {username} << 1"
        )
        continue

    profile_obj = getattr(
        user_obj, "profile", None
    )  # No DB hit because of select_related
    user_games = user_to_games_map[username]

    # Pass the objects directly
    SN_send24HourTimedOutReminderEmail(user_obj, profile_obj, user_games)
    email_counter += 1

## 4. Process emails using the pre-built map
# for username in timed_out_usernames:
#    if email_counter >= 100:
#        break
#
#    user_games = user_to_games_map[username]
#
#    # This now uses the local list instead of querying allActiveGames again
#    SN_send24HourTimedOutReminderEmail(username, user_games)
#
#    email_counter += 1
#    if PRINT_TIME and email_counter % 10 == 0:
#        print(f"Sent {email_counter} emails...")

# timed_out_not_unique = []
# for game in allActiveGames:
#    if 1 <= daysSinceLastMove(game.latestUpdate) <= 6:
#        timed_out_not_unique += game.getArrayOfIsCurrentPlayers()

# timed_out_usernames = set(timed_out_not_unique)
# timed_out_usernames = list(timed_out_usernames)
# print(f"Timed out usernames: {len(timed_out_usernames)} LIST: {timed_out_usernames}")
#
# timed_out_usernames_count = len(timed_out_usernames)
#
## Send emails to timed out usernames
# for username in timed_out_usernames:
#    if PRINT_TIME and email_counter % 10 == 0:
#        print(f"Timed out Player Iterations: {email_counter}/{timed_out_usernames_count} {username}")
#    if email_counter > 100:
#        print("Exiting loop. Reached 100 emails sent.")
#        break
#
#    allPlayerMyMoveGamesList = [(game, daysSinceLastMove(game.latestUpdate)) for game in allActiveGames if username in game.getArrayOfIsCurrentPlayers()]
#
#    # Sort games by least time remaining
#    allPlayerMyMoveGamesList.sort(key=lambda x: -x[1])
#    #print(allPlayerMyMoveGamesList)
#    SN_send24HourTimedOutReminderEmail(username, allPlayerMyMoveGamesList)
#    email_counter += 1

calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print(
        "****** "
        + ""
        + " email count: "
        + str(email_counter)
        + "   TOTAL: "
        + str(calc_time)
    )
    print(f"DB hits: {len(connection.queries)}")
