# This is a general utility to sweep the DB and remove abandoned games / Mini Tournaments, and check for stalled games
import math
import os
import sys
import time
from datetime import timedelta
from pathlib import Path
from unittest.mock import MagicMock

import django
from decouple import config
from django.db import OperationalError, transaction
from django.db.models import Count, Q
from django.utils import timezone

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
    os.environ["LOCAL_DB_NAME"] = str(config("LOCAL_DB_NAME", default="password", cast=str))
    os.environ["LOCAL_DB_USER"] = str(config("LOCAL_DB_USER", default="password", cast=str))
    os.environ["LOCAL_DB_PWD"] = str(config("LOCAL_DB_PWD", default="password", cast=str))
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


# Import models after Django setup to avoid import errors


from Lobby.models import (
    Game,
    Tournament,
)  # Unused; consider removing unless needed
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage
from user_visit.models import UserVisit

GAME_CODES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

start_calc_time = time.perf_counter()
deleted_games = 0  # Unused; consider removing unless used elsewhere
deleted_practice_games = 0
stalled_games = 0
deleted_tournaments = 0
deleted_user_visits = 0

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
        Game.objects.annotate(current_player_count=Count("players", filter=Q(players__is_current=True)))
        .filter(
            # Group everything else inside one set of parentheses
            Q(gameCode=gameCode) & (Q(latestUpdate__lt=cutoff_ms, gameStatus__in=MONITORED_STATUSES) | Q(gameStatus="ACTIVE", current_player_count=0))
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
                print(f"WOULD DELETE: {gameCode} - ID: {game.id} ({days_since_update} days old)")

        # CHECK FOR STALLED (ACTIVE but no current player)
        elif game.gameStatus == "ACTIVE" and game.current_player_count == 0:
            stalled_games += 1
            mock_request = MagicMock()
            mock_request.site = Site.objects.get_current()
            game_url = f"https://www.onlineboardgamers.com/{gameCode}/{game.id}/show/"
            message = f"NO CP: {gameCode} - ID: {game.id}\n<{game_url}>"
            print(message)
            if not DEBUG:
                SN_sendAdminErrorMessage(message)

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

# 3. Check FINISHED games for proper winner marking
SINGLE_WINNER_GAMES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "IND"]
AT_LEAST_ONE_WINNER_GAMES = ["AQY", "KFW", "RNB", "WEB"]

finished_games = Game.objects.filter(gameStatus="FINISHED").prefetch_related("players")
winner_check_issues = 0

for game in finished_games:
    winner_count = game.players.filter(winner=True).count()

    if game.gameCode in SINGLE_WINNER_GAMES:
        if winner_count != 1:
            winner_check_issues += 1
            game_url = f"https://www.onlineboardgamers.com/{game.gameCode}/{game.id}/show/"
            message = f"WINNER CHECK FAILED: {game.gameCode} - ID: {game.id} has {winner_count} winner(s), expected exactly 1\n<{game_url}>"
            print(message)
            if not DEBUG:
                SN_sendAdminErrorMessage(message)
    elif game.gameCode in AT_LEAST_ONE_WINNER_GAMES and winner_count < 1:
        winner_check_issues += 1
        game_url = f"https://www.onlineboardgamers.com/{game.gameCode}/{game.id}/show/"
        message = f"WINNER CHECK FAILED: {game.gameCode} - ID: {game.id} has {winner_count} winner(s), expected at least 1\n<{game_url}>"
        print(message)
        if not DEBUG:
            SN_sendAdminErrorMessage(message)

    # Check that cleared fields are blank/empty
    field_check_issues = []
    if game.rewindData != "":
        field_check_issues.append(f"rewindData='{game.rewindData[:50]}...'")
    if game.rewindTempData != "":
        field_check_issues.append(f"rewindTempData='{game.rewindTempData[:50]}...'")
    if game.kickoutFlexiData != "":
        field_check_issues.append(f"kickoutFlexiData='{game.kickoutFlexiData[:50]}...'")
    if game.activeVotes is not None:
        field_check_issues.append(f"activeVotes={game.activeVotes}")
    if game.transactionID != "":
        field_check_issues.append(f"transactionID='{game.transactionID[:50]}...'")

    # Game-specific field checks (check all fields regardless of gameCode)
    if game.autoMoves is not None:
        field_check_issues.append(f"autoMoves={game.autoMoves}")
    if game.playerTradeData != "":
        field_check_issues.append(f"playerTradeData='{game.playerTradeData[:50]}...'")
    if game.playersPreMoveData != "":
        field_check_issues.append(f"playersPreMoveData='{game.playersPreMoveData[:50]}...'")
    if game.FCMplayersMoveData != "":
        field_check_issues.append(f"FCMplayersMoveData='{game.FCMplayersMoveData[:50]}...'")
    if game.currentPlayersInTurnOrder is not None:
        field_check_issues.append(f"currentPlayersInTurnOrder={game.currentPlayersInTurnOrder}")
    if game.serverCurrentPlayerNamesInTurnOrder is not None:
        field_check_issues.append(f"serverCurrentPlayerNamesInTurnOrder={game.serverCurrentPlayerNamesInTurnOrder}")

    # Check GamePlayer objects for cleared fields
    for gp in game.players.all():
        if gp.moveDataJSON not in [None, [], {}]:
            field_check_issues.append(f"GP {gp.id} moveDataJSON={gp.moveDataJSON}")
        if gp.currentMoveTime != "":
            field_check_issues.append(f"GP {gp.id} currentMoveTime='{gp.currentMoveTime}'")
        if gp.currentMoveData != "":
            field_check_issues.append(f"GP {gp.id} currentMoveData='{gp.currentMoveData[:50]}...'")

    if field_check_issues:
        game_url = f"https://www.onlineboardgamers.com/{game.gameCode}/{game.id}/show/"
        message = f"FIELD CHECK FAILED: {game.gameCode} - ID: {game.id} has non-blank fields: {', '.join(field_check_issues)}\n<{game_url}>"
        print(message)
        #if not DEBUG:
        #    SN_sendAdminErrorMessage(message)

        # Fix the fields if ACTUALLY_DELETE_ITEMS is True
        if ACTUALLY_DELETE_ITEMS:
            game.rewindData = ""
            game.rewindTempData = ""
            game.kickoutFlexiData = ""
            game.activeVotes = None
            game.transactionID = ""
            game.autoMoves = None
            game.playerTradeData = ""
            game.playersPreMoveData = ""
            game.FCMplayersMoveData = ""
            game.currentPlayersInTurnOrder = None
            game.serverCurrentPlayerNamesInTurnOrder = None
            game.save()

            # Fix GamePlayer fields
            for gp in game.players.all():
                if gp.moveDataJSON not in [None, [], {}]:
                    gp.moveDataJSON = None
                if gp.currentMoveTime != "":
                    gp.currentMoveTime = ""
                if gp.currentMoveData != "":
                    gp.currentMoveData = ""
                gp.save()

            print(f"FIXED: {game.gameCode} - ID: {game.id}")

# 4. Process Mini Tournaments (Bulk)
mt_cutoff = cutoff_ms  # Assuming 'created' is also in MS; adjust if it's a DateTimeField
old_tournaments = Tournament.objects.filter(tournamentStatus__in=["OP", "PR"], tournamentCategory="Mini", created__lt=mt_cutoff)

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

# 5. Delete UserVisits older than 7 days
USER_VISIT_DAYS_TO_DELETE = 7

# This creates a native Django datetime object instead of an integer
user_visit_cutoff = timezone.now() - timedelta(days=USER_VISIT_DAYS_TO_DELETE)

# The filter will now work perfectly without crashing
old_user_visits_qs = UserVisit.objects.filter(timestamp__lt=user_visit_cutoff)
deleted_user_visits = old_user_visits_qs.count()

rows_deleted_total = 0
if ACTUALLY_DELETE_ITEMS and deleted_user_visits > 0:
    chunk_size = 5000  # Smaller chunks prevent MySQL 1213 deadlocks

    print(f"Starting deletion of {deleted_user_visits} user visits...")

    while True:
        # Fetch just the primary keys of the first X items to keep locks minimal
        pk_list = list(old_user_visits_qs.values_list("pk", flat=True)[:chunk_size])
        if not pk_list:
            break  # No more rows left to delete

        for attempt in range(3):
            try:
                with transaction.atomic():
                    # Delete exactly that specific ID chunk
                    # ._raw_delete() or a direct filter delete works best here
                    deleted_count, _ = UserVisit.objects.filter(pk__in=pk_list).delete()
                    rows_deleted_total += deleted_count
                break  # Success! Break the retry loop and get next chunk
            except OperationalError as e:
                if "1213" in str(e) and attempt < 2:
                    time.sleep(2)
                    continue  # Retry this exact chunk
                print(f"Error deleting UserVisits chunk: {e}")
                break
else:
    print(f"WOULD DELETE {deleted_user_visits} user_visits older than {USER_VISIT_DAYS_TO_DELETE} days")

# Print Summary (Ensure other variables exist in your main script context)
print("******")
print(f"Deleted user_visits: {deleted_user_visits if not ACTUALLY_DELETE_ITEMS else rows_deleted_total}")

# Calculate and print execution time
calc_time = time.perf_counter() - start_calc_time
if PRINT_TIME:
    print(f"****** Execution time: {calc_time:.2f} seconds")
