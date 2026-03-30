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

start_calc_time = time.perf_counter()


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


django.setup()

from Lobby.models import Game

# from Lobby.sharedFunctions.sharedFunctions import *
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendReminderEmail,
    SN_sendReminderExpiredEmail,
)

# sys.exit()
GAME_CODES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB"]

# reminder_start_time = int((datetime.now() - timedelta(minutes=118)).timestamp() * 1000)
# reminder_finish_time = int((datetime.now() - timedelta(minutes=182)).timestamp() * 1000)
remaining_start_time = 60 * 118 * 1  # 2hours
remaining_finish_time = 60 * 182 * 1  # 3hours

remaining_start_time_expired = 60 * -61  # * 69120000  # -1hr
remaining_finish_time_expired = 0  # Now


for gameCode in GAME_CODES:
    game_start_calc_time = time.perf_counter()

    # Query the game_in_use_model to get the players who will timeout within the specified time range
    # players = game_in_use_model.objects.filter(timeout__gt=timeout_threshold_start, timeout__lt=timeout_threshold_end)
    query = Q(gameCode=gameCode) & Q(gameStatus="ACTIVE") & ~Q(players__player__username="SHADOW") & ~Q(players__player__username="FcmAI")

    allGames = Game.objects.filter(query).all()
    for singleGame in allGames:
        timeRemaining = singleGame.presenter().getSecondsToNextKickout()
        if timeRemaining >= remaining_start_time and timeRemaining <= remaining_finish_time:
            print(f"{gameCode}: 2hr: {singleGame.id}")
            playersToNotify = singleGame.presenter().getArrayOfIsCurrentPlayers()
            for playerName in playersToNotify:
                print(f"2hr Email: {playerName}")
                SN_sendReminderEmail(
                    playerName,
                    gameCode,
                    singleGame.id,
                    singleGame.presenter().getGameName(),
                )

        if timeRemaining >= remaining_start_time_expired and timeRemaining <= remaining_finish_time_expired:
            # print(singleGame.getArrayOfIsCurrentPlayers())
            print(f"{gameCode}: exp: {singleGame.id}")
            playersToNotify = singleGame.presenter().getArrayOfIsCurrentPlayers()
            for playerName in playersToNotify:
                print(f"Expired Email: {playerName}")
                SN_sendReminderExpiredEmail(
                    playerName,
                    gameCode,
                    singleGame.id,
                    singleGame.presenter().getGameName(),
                )

            if gameCode == "FCM" and singleGame.relatedMainTournament:
                try:
                    message = "===========================\n"
                    message += "GAME EXPIRY AUTO-DETECTED\n"
                    message += f"Player: {singleGame.presenter().getArrayOfIsCurrentPlayers()}\n"
                    message += "[Click here to view the game](https://www.OnlineBoardGamers.com/FCM/" + str(singleGame.id) + "/show/)"
                    requests.post(
                        f"https://discordapp.com/api/webhooks/{config('WEBHOOK_FCM_TOURNAMENT_ADMIN')}",
                        data={"content": message},
                    )
                except Exception as e:
                    print(e)

            if gameCode == "TGZ" and singleGame.relatedMainTournament:
                try:
                    message = "===========================\n"
                    message += "GAME EXPIRY AUTO-DETECTED\n"
                    message += f"Player: {singleGame.presenter().getArrayOfIsCurrentPlayers()}\n"
                    message += "[Click here to view the game](https://www.OnlineBoardGamers.com/TGZ/" + str(singleGame.id) + "/show/)"
                    requests.post(
                        f"https://discordapp.com/api/webhooks/{config('WEBHOOK_TGZ_TOURNAMENT_ADMIN')}",
                        data={"content": message},
                    )
                except Exception as e:
                    print(e)

    calc_time = time.perf_counter() - start_calc_time
    game_calc_time = time.perf_counter() - game_start_calc_time
    if PRINT_TIME:
        print("****** " + gameCode + " calc time: " + str(game_calc_time) + "   TOTAL: " + str(calc_time))

calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print("****** calc time: " + str(calc_time))
    print(f"DB hits: {len(connection.queries)}")
