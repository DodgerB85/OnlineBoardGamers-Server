# Needs to be inside the root folder of the project, IE with manage.py
import datetime
import os
import random
import sys
import time
from pathlib import Path

import django
import requests
from decouple import config
from django.conf import settings
from django.db import connection
from django.http import HttpRequest

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

from Lobby.models import Tournament, User
from Lobby.sharedFunctions.sharedFunctions import SF_startAnyTournament
from Lobby.sharedFunctions.sharedNotifications import SN_sendTournamentOpen
from Lobby.sharedFunctions.sharedRefs import OPEN, PENDING

# HLC 3-5 players
# Bus 3-5 players
# AQY 2-4 players
# IND 3-4 players

myDate = datetime.datetime.today()

dayNumber = myDate.day
monthNumber = myDate.month

# _tournamentType = random.choice(["RR", "KO", "TL"])
# _tournamentType = random.choice(["RR", "TL"])

############# HARD CODE NEXT TOURNY
# _maxGamePlayers = 4
# _tournamentType = "TL"
############# HARD CODE NEXT TOURNY

# Unified tournament schedule with dates (month, day) and game config
TOURNAMENT_SCHEDULE = [
    {
        "gameCode": "AQY",
        "boxName": "Antiquity",
        "dates": [(2, 1), (8, 1)],
        "minPlayers": 2,
        "maxPlayers": 4,
    },
    {
        "gameCode": "IND",
        "boxName": "Indonesia",
        "dates": [(3, 1), (9, 1)],
        "minPlayers": 3,
        "maxPlayers": 5,
    },
    {
        "gameCode": "HLC",
        "boxName": "Horseless Carriage",
        "dates": [(4, 1), (10, 1)],
        "minPlayers": 3,
        "maxPlayers": 5,
    },
    {
        "gameCode": "BUS",
        "boxName": "Bus",
        "dates": [(5, 1), (11, 1)],
        "minPlayers": 3,
        "maxPlayers": 5,
    },
    {
        "gameCode": "FCM",
        "boxName": "Food Chain Magnate",
        "dates": [(5, 15), (10, 15), (12, 1)],
        "minPlayers": 3,
        "maxPlayers": 5,
    },
]


def get_tournament_name(target_date, game_code):
    return f"{target_date.strftime('%B')} {target_date.year} {game_code} Tournament"


def create_pending_tournament_if_missing(tournament, tournament_date):
    box_name = tournament["boxName"]
    game_code = tournament["gameCode"]
    tournament_name = get_tournament_name(tournament_date, game_code)

    existing_pending = (
        Tournament.objects.filter(
            tournamentCategory="Main",
            tournamentStatus=PENDING,
            gameCode=game_code,
            tournamentName=tournament_name,
        )
        .order_by("-id")
        .first()
    )
    if existing_pending:
        print(f"Pending tournament already exists for {box_name}: {existing_pending.id}")
        return existing_pending

    max_game_players = random.randrange(tournament["minPlayers"], tournament["maxPlayers"] + 1, 1)
    tournament_type = random.choice(["RR", "TL"])

    max_tournament_players = 30
    if max_game_players == 4:
        max_tournament_players = 32

    new_tournament = Tournament.objects.create(
        tournamentCategory="Main",
        tournamentStatus=PENDING,
        gameCode=game_code,
        tournamentName=tournament_name,
        maxTournamentPlayers=max_tournament_players,
        maxGamePlayers=max_game_players,
        tournamentType=tournament_type,
    )
    new_tournament.save()
    print(f"Created pending tournament {new_tournament.id} for {box_name}")
    return new_tournament


############################################
#   CREATE PENDING TOURNAMENTS 7 DAYS EARLY
############################################

current_date = datetime.datetime.now()

for tournament in TOURNAMENT_SCHEDULE:
    for tournament_month, tournament_day in tournament["dates"]:
        tournament_date = datetime.datetime(current_date.year, tournament_month, tournament_day)
        days_until = (tournament_date - current_date).days
        if days_until == 7:
            print(f"It is 7 days until {tournament['boxName']} tournament on {tournament_day}/{tournament_month}")
            create_pending_tournament_if_missing(tournament, tournament_date)
            message = (
                f"New {tournament['boxName']} Tournament Opens for Signup in 7 days!\n"
                "[Click here to Play](https://www.OnlineBoardGamers.com/)"
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

############################################
#   OPEN PENDING TOURNMENT
############################################
for tournament in TOURNAMENT_SCHEDULE:
    for tournament_month, tournament_day in tournament["dates"]:
        if dayNumber == tournament_day and monthNumber == tournament_month:
            print(f"Today is {tournament_day}/{tournament_month} - Opening {tournament['gameCode']} tournament")
            box_name = tournament["boxName"]
            gameCode = tournament["gameCode"]
            tournament_date = datetime.datetime(current_date.year, tournament_month, tournament_day)
            tournament_name = get_tournament_name(tournament_date, gameCode)

            new_tournament = (
                Tournament.objects.filter(
                    tournamentCategory="Main",
                    tournamentStatus=PENDING,
                    gameCode=gameCode,
                    tournamentName=tournament_name,
                )
                .order_by("-id")
                .first()
            )
            if not new_tournament:
                print(f"No pending tournament found for {box_name}; skipping open step safely.")
                continue

            new_tournament.tournamentStatus = OPEN
            new_tournament.openedForSignupAt = str(int(time.time()) * 1000)
            new_tournament.save()

            # Add message to Discord
            tournament_type_string = "Rounds"
            if new_tournament.tournamentType == "KO":
                tournament_type_string = "Knockout"
            if new_tournament.tournamentType == "TL":
                tournament_type_string = "Two Lives"
            if new_tournament.tournamentType == "PT":
                tournament_type_string = "Points"
            if new_tournament.tournamentType == "RR":
                tournament_type_string = "Rounds"
            if new_tournament.tournamentType == "MG":
                tournament_type_string = "Multi-Game"

            message = (
                f"New {box_name} Tournament!\n"
                "================================\n"
                f"Name: {tournament_name}\n"
                f"Players per Game: {new_tournament.maxGamePlayers}\n"
                f"Format: {tournament_type_string}\n"
                f"[Click here to Join](https://www.OnlineBoardGamers.com/MainTournament/{new_tournament.id}/)"
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

############################################
#   START NEW TOURNMENT
############################################
# TOURNAMENT_MODELS = [HLC_Tournament, Bus_Tournament, AQY_Tournament, IND_Tournament]
## CHECK FOR TOURNY START
# for tournament_model in TOURNAMENT_MODELS:
#
#    box_name = "box_name"
#    INNER_URL = "URL"
#    gameCode = "XXX"
#    if tournament_model == HLC_Tournament:
#        box_name = "Horseless Carriage"
#        INNER_URL = "HLCtournament/HLC"
#        gameCode = "HLC"
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

GAME_CODES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

# for model, config in TOURNAMENT_CONFIG.items():
for gameCode in GAME_CODES:
    # 1. OPTIMIZATION: Filter for "OP" status immediately in the DB.
    # If no open tournament exists, this returns None and skips the rest of the hits.
    newTourny = (
        Tournament.objects.filter(tournamentStatus=OPEN, gameCode=gameCode)
        .order_by("-id")
        .first()
    )

    # 2. Add an early exit check for dayNumber
    if not newTourny or dayNumber < 7:
        continue

    print("There is an open tourny, and day > 7")

    # But if it's not an auto-tourny, continue
    if gameCode in ["HLC", "BUS", "TGZ", "AQY", "IND"]:
        continue

    # Now we only hit the DB further if we actually have a candidate to start
    startTime = int(newTourny.openedForSignupAt) if newTourny.openedForSignupAt else int(newTourny.created)
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
                SF_startAnyTournament(request, newTourny)
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
