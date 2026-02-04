# Needs to be inside the root folder of the project, IE with manage.py
import os
import sys
import time
from django.db.models import Q  # , Count
from pathlib import Path

from django.db import connection
from decouple import config

# import json
import django
import requests
# from django.conf import settings
# from datetime import datetime, timedelta
# from django.contrib.auth.models import User

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

sys.path.append(
    os.path.join(BASE_DIR, "OnlineBoardGamers")
)
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "OnlineBoardGamers.settings",
)


django.setup()

from FCM.models import FCM_Game
from HC.models import HC_Game
from Bus.models import Bus_Game
from IND.models import IND_Game
from RNB.models import RNB_Game
from KFW.models import KFW_Game

# from Lobby.models import User

# from Lobby.sharedFunctions.sharedFunctions import *
from Lobby.sharedFunctions.sharedNotifications import SN_sendReminderEmail, SN_sendReminderExpiredEmail

# sys.exit()
games = ["FCM", "HC", "BUS", "IND", "RNB", "KFW"]

# reminder_start_time = int((datetime.now() - timedelta(minutes=118)).timestamp() * 1000)
# reminder_finish_time = int((datetime.now() - timedelta(minutes=182)).timestamp() * 1000)
remaining_start_time = 60 * 118 * 1  # 2hours
remaining_finish_time = 60 * 182 * 1  # 3hours

remaining_start_time_expired = 60 * -61  # * 69120000  # -1hr
remaining_finish_time_expired = 0  # Now

start_calc_time = time.perf_counter()

for game in games:
    game_start_calc_time = time.perf_counter()

    game_in_use_model = FCM_Game
    if game == "HC":
        game_in_use_model = HC_Game
    if game == "Bus":
        game_in_use_model = Bus_Game
    if game == "IND":
        game_in_use_model = IND_Game
    if game == "RNB":
        game_in_use_model = RNB_Game

    if game == "KFW":
        game_in_use_model = KFW_Game

    # Query the game_in_use_model to get the players who will timeout within the specified time range
    # players = game_in_use_model.objects.filter(timeout__gt=timeout_threshold_start, timeout__lt=timeout_threshold_end)
    query = Q(gameStatus="ACTIVE") & ~Q(allPlayers__username="SHADOW") & ~Q(allPlayers__username="FcmAI")

    allGames = game_in_use_model.objects.filter(query).all()
    for singleGame in allGames:
        # print(singleGame.id)
        timeRemaining = singleGame.getSecondsToNextKickout()
        if timeRemaining >= remaining_start_time and timeRemaining <= remaining_finish_time:
            print(game + ": 2hr: " + str(singleGame.id))
            playersToNotify = singleGame.getCurrentPlayersArrayForReminderEmail()
            for playerName in playersToNotify:
                print("2hr: " + playerName)
                SN_sendReminderEmail(playerName, game, singleGame.id, singleGame.getGameName())

        if timeRemaining >= remaining_start_time_expired and timeRemaining <= remaining_finish_time_expired:
            # print(singleGame.getCurrentPlayersArray())
            print(game + ": exp: " + str(singleGame.id))
            playersToNotify = singleGame.getCurrentPlayersArrayForReminderEmail()
            for playerName in playersToNotify:
                print("KO: " + playerName)
                SN_sendReminderExpiredEmail(playerName, game, singleGame.id, singleGame.getGameName())

            if game == "FCM" and singleGame.relatedTournament:
                try:
                    message = "===========================\n"
                    message += "GAME EXPIRY AUTO-DETECTED\n"
                    message += "Player: " + singleGame.currentPlayers + "\n"
                    message += "[Click here to view the game](https://www.OnlineBoardGamers.com/FCM/" + str(singleGame.id) + "/)"
                    requests.post(f'https://discordapp.com/api/webhooks/{config("WEBHOOK_FCM_TOURNAMENT_ADMIN")}', data={"content": message})
                except Exception as e:
                    print(e)

            if game == "TGZ" and singleGame.externalTournamentGame:
                try:
                    message = "===========================\n"
                    message += "GAME EXPIRY AUTO-DETECTED\n"
                    message += "Player: " + singleGame.currentPlayers + "\n"
                    message += "[Click here to view the game](https://www.OnlineBoardGamers.com/TGZ/" + str(singleGame.id) + "/)"
                    requests.post(f'https://discordapp.com/api/webhooks/{config("WEBHOOK_TGZ_TOURNAMENT_ADMIN")}', data={"content": message})
                except Exception as e:
                    print(e)

    calc_time = time.perf_counter() - start_calc_time
    game_calc_time = time.perf_counter() - game_start_calc_time
    if PRINT_TIME:
        print("****** " + game + " calc time: " + str(game_calc_time) + "   TOTAL: " + str(calc_time))

calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
    print(F'DB hits: {len(connection.queries)}')