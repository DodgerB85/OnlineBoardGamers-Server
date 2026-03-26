# Needs to be inside the root folder of the project, IE with manage.py
import django


import os
import sys
import time
from pathlib import Path

from decouple import config
from django.db import connection

from django.conf import settings
import datetime
import requests
from django.http import HttpRequest
import random

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

from Lobby.models import User, Main_Tournament

from Lobby.sharedFunctions.sharedFunctions import SF_startAnyTournament
from Lobby.sharedFunctions.sharedNotifications import SN_sendTournamentOpen


# HC 3-5 players
# Bus 3-5 players
# AQY 2-4 players
# IND 3-4 players

myDate = datetime.datetime.today()

dayNumber = myDate.day
monthNumber = myDate.month
monthName = myDate.strftime("%B")

# _tournamentType = random.choice(["RR", "KO", "TL"])
# _tournamentType = random.choice(["RR", "TL"])

############# HARD CODE NEXT TOURNY
# _maxGamePlayers = 4
# _tournamentType = "TL"
############# HARD CODE NEXT TOURNY

MONTHS_FOR_AQY = [2, 8]
MONTHS_FOR_IND = [3, 9]
MONTHS_FOR_HC = [4, 10]
MONTHS_FOR_BUS = [5, 11]


############################################
#   ANNOUNCE NEW TOURNMENT
############################################

# First, send message to Discord if tournament start in 7 days:
# Get the current date
current_date = datetime.datetime.now()
# Calculate the date 7 days from now
current_date_plus_7d = current_date + datetime.timedelta(days=7)
# Check if the next month is different
if current_date.month != current_date_plus_7d.month:
    days_until_next_month = (current_date_plus_7d.replace(day=1) - current_date).days
    next_month_number = current_date_plus_7d.month
    if days_until_next_month == 7 and (
        next_month_number in MONTHS_FOR_AQY
        or next_month_number in MONTHS_FOR_IND
        or next_month_number in MONTHS_FOR_HC
        or next_month_number in MONTHS_FOR_BUS
    ):
        print(
            f"It is 7 days until the next month starts. Next mo num: {next_month_number}"
        )
        # Send message to Discord
        box_name = "Antiquity"
        game = "AQY"
        if next_month_number in MONTHS_FOR_AQY:
            box_name = "Antiquity"
            game = "AQY"
        if next_month_number in MONTHS_FOR_IND:
            box_name = "Indonesia"
            game = "IND"
        if next_month_number in MONTHS_FOR_HC:
            box_name = "Horseless Carriage"
            game = "HC"
        if next_month_number in MONTHS_FOR_BUS:
            box_name = "Bus"
            game = "BUS"
        message = (
            f"New {box_name} Tournament Opens for Signup in 7 days!\n"
            f"[Click here to Play](https://www.OnlineBoardGamers.com/)"
        )
        if settings.DEBUG:
            requests.post(
                f"https://discordapp.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
                data={"content": message},
            )
        else:
            requests.post(
                f"https://discordapp.com/api/webhooks/{config('WEBHOOK_DISCORD_TOURNAMENTS')}",
                data={"content": message},
            )
else:
    print(
        f"Next month is the same month as the current month - NOT sending notification. Current mo num: {current_date_plus_7d.month}"
    )

############################################
#   OPEN NEW TOURNMENT
############################################
if dayNumber == 1 and (
    monthNumber in MONTHS_FOR_AQY
    or monthNumber in MONTHS_FOR_IND
    or monthNumber in MONTHS_FOR_HC
    or monthNumber in MONTHS_FOR_BUS
):
    box_name = "box_name"
    maxGamePlayers = random.randrange(3, 5, 1)
    gameCode = "AQY"
    if monthNumber in MONTHS_FOR_AQY:
        box_name = "Antiquity"
        maxGamePlayers = random.randrange(2, 5, 1)
        gameCode = "AQY"
    if monthNumber in MONTHS_FOR_IND:
        box_name = "Indonesia"
        maxGamePlayers = random.randrange(3, 5, 1)
        gameCode = "IND"
    if monthNumber in MONTHS_FOR_HC:
        box_name = "Horseless Carriage"
        maxGamePlayers = random.randrange(3, 6, 1)
        gameCode = "HC"
    if monthNumber in MONTHS_FOR_BUS:
        box_name = "Bus"
        maxGamePlayers = random.randrange(3, 6, 1)
        gameCode = "BUS"

    tournamentType = random.choice(["RR", "TL"])
    if maxGamePlayers >= 3:
        tournamentType = random.choice(["RR", "TL"])  # , "PT"])

    # 2,3,5, 6 players
    maxTournamentPlayers = 30
    # 4p
    if maxGamePlayers == 4:
        maxTournamentPlayers = 32

    new_tournament = Main_Tournament.objects.create(
        gameCode=gameCode,
        tournamentName=monthName + " Tournament",
        maxTournamentPlayers=maxTournamentPlayers,
        maxGamePlayers=maxGamePlayers,
        tournamentType=tournamentType,
    )

    new_tournament.save()

    # Add message to Discord
    tournament_type_string = "Rounds"
    if tournamentType == "KO":
        tournament_type_string = "Knockout"
    if tournamentType == "TL":
        tournament_type_string = "Two Lives"
    if tournamentType == "PT":
        tournament_type_string = "Points"
    if tournamentType == "RR":
        tournament_type_string = "Rounds"

    message = (
        f"New {box_name} Tournament!\n"
        "================================\n"
        f"Name: {monthName} Tournament\n"
        f"Players per Game: {maxGamePlayers}\n"
        f"Format: {tournament_type_string}\n"
        f"[Click here to Join](https://www.OnlineBoardGamers.com/MainTournament/{getattr(new_tournament, 'id')}/)"
    )
    if settings.DEBUG:
        requests.post(
            f"https://discordapp.com/api/webhooks/{config('WEBHOOK_ADMIN_ERROR_MSG')}",
            data={"content": message},
        )
    else:
        requests.post(
            f"https://discordapp.com/api/webhooks/{config('WEBHOOK_DISCORD_TOURNAMENTS')}",
            data={"content": message},
        )

    SN_sendTournamentOpen(new_tournament, gameCode)
else:
    print("It is not day 1, or not a tournament month, NOT opening a tourny")

############################################
#   START NEW TOURNMENT
############################################
# TOURNAMENT_MODELS = [HC_Tournament, Bus_Tournament, AQY_Tournament, IND_Tournament]
## CHECK FOR TOURNY START
# for tournament_model in TOURNAMENT_MODELS:
#
#    box_name = "box_name"
#    INNER_URL = "URL"
#    gameCode = "XXX"
#    if tournament_model == HC_Tournament:
#        box_name = "Horseless Carriage"
#        INNER_URL = "HCtournament/HC"
#        gameCode = "HC"
#    if tournament_model == BUS_Tournament:
#        box_name = "BUS"
#        INNER_URL = "BUStournament/BUS"
#        gameCode = "BUS"
#    if tournament_model == AQY_Tournament:
#        box_name = "Antiquity"
#        INNER_URL = "AQYtournament/AQY"
#        gameCode = "AQY"
#    if tournament_model == IND_Tournament:
#        box_name = "Indonesia"
#        INNER_URL = "INDtournament/IND"
#        gameCode = "IND"
#
#    if tournament_model.objects.exists():
#        newTourny = tournament_model.objects.order_by('-id').first()
#    else:
#        newTourny = None
#
#    # Now check to see if a tournament needs to be started
#    if newTourny and dayNumber >= 7 and newTourny.tournamentStatus == "OP":
#        print(f"{box_name}: Checking to see if tournament should start.....")
#        startTime = int(newTourny.created)
#        now = int(time.time())*1000
#        diff_in_s = (now - startTime) // 1000
#        # Must have been open at least 7 days (may not start on 1st of the month)
#        if diff_in_s > 60400:
#            # Open tourny, enough time, so check if enough players, then start
#            totalPlayers = newTourny.startingPlayers.count()
#            minimumPlayers = False
#            if totalPlayers > 25:
#                minimumPlayers = True
#            elif totalPlayers >= (newTourny.maxGamePlayers * newTourny.maxGamePlayers) - newTourny.maxGamePlayers + 1:
#                minimumPlayers = True
#            elif newTourny.tournamentType == "TL" and totalPlayers >= (newTourny.maxGamePlayers * 3):
#                minimumPlayers = True
#            elif newTourny.tournamentType == "RR" and totalPlayers >= (newTourny.maxGamePlayers * 2):
#                minimumPlayers = True
#            elif newTourny.tournamentType == "PT" and totalPlayers >= (newTourny.maxGamePlayers * 2):
#                minimumPlayers = True
#            elif dayNumber >= 28 and totalPlayers >= newTourny.maxGamePlayers:
#                minimumPlayers = True
#
#            if not minimumPlayers:
#                print(f"{box_name}: Not enough players")
#            elif minimumPlayers:
#                print(f"{box_name}: Minimum Players met - setting maxPlayers")
#
#                # Calculate the smallest multiple of maxGamePlayers >= totalPlayers
#                maxGamePlayers = newTourny.maxGamePlayers
#                if maxGamePlayers == 0:
#                    print(f"{box_name}: Error - maxGamePlayers is 0")
#                    exit()
#
#                # Use ceiling division to get the next multiple
#                next_highest_multiple = ((totalPlayers + maxGamePlayers - 1) // maxGamePlayers) * maxGamePlayers
#
#                # Set maxTournamentPlayers
#                newTourny.maxTournamentPlayers = next_highest_multiple
#                newTourny.save()
#
#                # Start a Tourny
#                if newTourny.maxTournamentPlayers == totalPlayers:
#                    print(f"{box_name}: Starting Tournament, multiple matches total")
#                    # Create a request object with the URL and data
#                    #request = requests.Request('POST', url, data=data)
#                    request = HttpRequest()
#                    # Create a user object
#                    user = User.objects.get(username='admin')
#
#                    # Assign the user object to the request's user attribute
#                    request.user = user
#
#                    request.META['HTTP_HOST'] = 'www.onlineboardgamers.com'
#
#                    newTourny.maxTournamentPlayers = totalPlayers
#                    SF_startTournament(request, newTourny, gameCode)
#                    newTourny.save()

GAME_CODES = ["FCM", "HC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

# for model, config in TOURNAMENT_CONFIG.items():
for gameCode in GAME_CODES:
    # 1. OPTIMIZATION: Filter for "OP" status immediately in the DB.
    # If no open tournament exists, this returns None and skips the rest of the hits.
    newTourny = (
        Main_Tournament.objects.filter(tournamentStatus="OP", gameCode=gameCode)
        .order_by("-id")
        .first()
    )

    # 2. Add an early exit check for dayNumber
    if not newTourny or dayNumber < 7:
        continue

    print("There is an open tourny, and day > 7")

    # But if it's not an auto-tourny, continue
    if gameCode in ["HC", "BUS", "TGZ", "AQY", "IND"]:
        continue

    # Now we only hit the DB further if we actually have a candidate to start
    startTime = int(newTourny.created)
    now = int(time.time()) * 1000
    diff_in_s = (now - startTime) // 1000

    # Must have been open at least 7 days
    if diff_in_s > 604800:  # Note: 7 days is 604800, not 60400
        # 3. OPTIMIZATION: Cache the count to avoid re-querying it later
        totalPlayers = newTourny.startingPlayers.count()

        # Determine minimumPlayers logic
        maxGP = newTourny.maxGamePlayers

        # Determine the "Threshold Multiple"
        # This is the smallest perfect multiple that satisfies min players
        threshold = 0
        if totalPlayers > 25:
            threshold = 25
        elif totalPlayers >= (maxGP * maxGP) - maxGP + 1:
            threshold = (maxGP * maxGP) - maxGP + 1
        elif newTourny.tournamentType in ["TL", "RR", "PT"]:
            threshold = maxGP * (3 if newTourny.tournamentType == "TL" else 2)
        elif dayNumber >= 28:
            threshold = maxGP

        # Calculate the NEXT Perfect Multiple above that threshold
        # This ensures signups are capped at a valid starting number
        if threshold > 0:
            # Round the threshold UP to the nearest multiple of maxGP
            target_start_size = ((threshold + maxGP - 1) // maxGP) * maxGP

            if totalPlayers > target_start_size:
                target_start_size = ((totalPlayers + maxGP - 1) // maxGP) * maxGP

            newTourny.maxTournamentPlayers = target_start_size
            newTourny.save()

            # START TRIGGER: Only if we hit that specific perfect multiple
            if totalPlayers >= target_start_size and totalPlayers % maxGP == 0:
                print(
                    f"{gameCode}: Starting Tournament, perfect multiple total: {totalPlayers}"
                )
                # Use the admin ID directly if possible to avoid a User.objects.get hit
                # Or fetch once outside the 'for' loop to save 4 hits
                admin_user = User.objects.get(username="admin")

                request = HttpRequest()
                request.user = admin_user
                request.META["HTTP_HOST"] = "www.onlineboardgamers.com"

                # Set and Start
                newTourny.maxTournamentPlayers = totalPlayers
                SF_startAnyTournament(request, newTourny, gameCode)
                newTourny.save()
            else:
                print(
                    f"{gameCode}: Not starting tournament, not at perfect multiple total - max Players set to: {target_start_size}"
                )

print(f"DB hits: {len(connection.queries)}")

# Calculate and print execution time
if PRINT_TIME:
    calc_time = time.perf_counter() - start_calc_time
    print("****** calc time: " + str(calc_time))
