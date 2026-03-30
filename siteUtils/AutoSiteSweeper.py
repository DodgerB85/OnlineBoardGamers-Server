# This is a general utility to sweep the DB and remove abandoned games / Mini Tournaments, and check for stalled games
import os
import sys
import time
import math
from pathlib import Path

# from itertools import chain
from django.db.models import Count, Q, IntegerField, Case, When
from unittest.mock import MagicMock
from decouple import config  # , Csv
from django.db import OperationalError, transaction
# from django.db import connections

import django


###### SET UP PARAMS HERE
ACTUALLY_DELETE_ITEMS = True
DAYS_TO_DELETE_GAME = 35

DEBUG = config("DEBUG", default=False, cast=bool)
PRINT_TIME = True

# Configure Django settings based on environment
# This gets the folder containing the current file, then goes 2 levels up
# Because the live and dev servers are in different folder names, we need to go up one from that
BASE_DIR = Path(__file__).resolve().parent.parent.parent

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

from django.conf import settings

# Import models after Django setup to avoid import errors


from Lobby.models import (
    Game,
    Mini_Tournaments,
)  # Unused; consider removing unless needed
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

GAME_CODES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

start_calc_time = time.perf_counter()
deleted_games = 0  # Unused; consider removing unless used elsewhere
deleted_practice_games = 0
stalled_games = 0
deleted_tournaments = 0

# Calculate the cutoff timestamp once in MS (to match your DB storage)
cutoff_ms = (int(time.time()) - (DAYS_TO_DELETE_GAME * 24 * 60 * 60)) * 1000


def daysSinceLastMove(latestUpdate):
    elapsedTotalSeconds = int(time.time()) - (int(latestUpdate) / 1000)
    elapsedTotalDays = math.floor(elapsedTotalSeconds / 60 / 60 / 24)
    return elapsedTotalDays


# 1. Process Games (Combined monitored and active logic)
for gameCode in GAME_CODES:
    # FETCH: Only games that are either old OR stalled (Single query per model)
    # Prefetch allPlayers so we check "SHADOW" in memory, not via SQL
    MONITORED_STATUSES = ["ACTIVE", "PRIVATE", "AVAILABLE", "WAITING"]

    # games_to_check = Game.objects.filter(
    #    # Condition A: Old and in a specific state
    #    Q(latestUpdate__lt=cutoff_ms, gameStatus__in=MONITORED_STATUSES)
    #    |
    #    # Condition B: Stalled (ACTIVE with no players) - regardless of age
    #    Q(gameStatus="ACTIVE", currentPlayers="")
    # ).prefetch_related("allPlayers")

    # FETCH: Annotate with a count of players where is_current is True
    games_to_check = (
        Game.objects.annotate(
            current_player_count=Count("players", filter=Q(players__is_current=True))
        )
        .filter(
            # Group everything else inside one set of parentheses
            Q(gameCode=gameCode)
            & (
                Q(latestUpdate__lt=cutoff_ms, gameStatus__in=MONITORED_STATUSES)
                | Q(gameStatus="ACTIVE", current_player_count=0)
            )
        )
        .prefetch_related("players__player")
    )

    # Group IDs for bulk deletion to avoid N-queries
    ids_to_delete = []

    for game in games_to_check:
        days_since_update = daysSinceLastMove(game.latestUpdate)

        # CHECK FOR DELETION
        if days_since_update > DAYS_TO_DELETE_GAME:
            deleted_games += 1

            # Use prefetched data: check usernames in memory (0 DB hits)
            # usernames = [p.username for p in game.allPlayers.all()]
            usernames = [gp.player.username for gp in game.players.all() if gp.player]
            if any(name in ["SHADOW", "FcmAI"] for name in usernames):
                deleted_practice_games += 1

            if ACTUALLY_DELETE_ITEMS:
                ids_to_delete.append(game.id)
            else:
                print(
                    f"WOULD DELETE: {gameCode} - ID: {game.id} ({days_since_update} days old)"
                )

        # CHECK FOR STALLED (ACTIVE but no current player)
        elif game.gameStatus == "ACTIVE" and game.current_player_count == 0:
            stalled_games += 1
            mock_request = MagicMock()
            mock_request.site = Site.objects.get_current()
            message = f"NO CP: {gameCode} - ID: {game.id}"
            print(message)
            SN_sendAdminErrorMessage(mock_request, message)

    # BULK DELETE: One query for all old games in this model
    if ids_to_delete and ACTUALLY_DELETE_ITEMS:
        DELETE_BATCH_SIZE = 5
        for i in range(0, len(ids_to_delete), DELETE_BATCH_SIZE):
            batch = ids_to_delete[i : i + DELETE_BATCH_SIZE]
            # Retry Logic: Handle Deadlocks (Error 1213)
            for attempt in range(3):
                try:
                    # Using atomic ensures the transaction is clean on retry
                    with transaction.atomic():
                        Game.objects.filter(id__in=batch).delete()
                        print(f"Deleted {gameCode} batch: {batch}")
                    break  # Success, move to next chunk
                except OperationalError as e:
                    if "1213" in str(e) and attempt < 2:
                        time.sleep(2)  # Wait 2 seconds for other locks to clear
                        continue
                    print(f"Permanent DB Error deleting {gameCode} batch: {e}")
                    break

    else:
        for game_id in ids_to_delete:
            print(f"WOULD DELETE: {gameCode} - ID: {game_id}")

# 2. Process Mini Tournaments (Bulk)
mt_cutoff = (
    cutoff_ms  # Assuming 'created' is also in MS; adjust if it's a DateTimeField
)
old_tournaments = Mini_Tournaments.objects.filter(
    tournamentStatus__in=["OP", "PR"], created__lt=mt_cutoff
)

deleted_tournaments = old_tournaments.count()
if ACTUALLY_DELETE_ITEMS and deleted_tournaments > 0:
    for attempt in range(3):
        try:
            with transaction.atomic():
                old_tournaments.delete()
            break
        except OperationalError as e:
            if "1213" in str(e) and attempt < 2:
                time.sleep(2)
                continue
            print(f"Error deleting Tournaments: {e}")
            break
else:
    for mt in old_tournaments:
        print(f"WOULD DELETE MT: {mt.gameCode} - ID: {mt.id}")

print(
    f"****** \nDeleted Tota: {deleted_games}\nDeleted NON practice games: {deleted_games - deleted_practice_games}\nDeleted practice games: {deleted_practice_games} \n{stalled_games} stalled games\nDeleted tournaments: {deleted_tournaments}"
)


# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print(f"****** Execution time: {calc_time:.2f} seconds")
