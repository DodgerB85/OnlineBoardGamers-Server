# Needs to be inside the root folder of the project, IE with manage.py
import os, re, lzstring
import base64, zlib
import sys
import time
from pathlib import Path
from decouple import config
from django.db.models import Q
import json
import django
from django.conf import settings
from datetime import datetime, timedelta
import lzstring
import requests
from django.contrib.sites.shortcuts import get_current_site
from django.http import HttpRequest
import gzip
from django.utils.translation import gettext
from unittest.mock import MagicMock
import msgpack

from collections import defaultdict

# import matplotlib.pyplot as plt
# import plotly.graph_objects as go
import codecs

DEBUG = config("DEBUG", default=False, cast=bool)


# Because the live and dev servers are in different folder names, we need to go up one from that
ROOT_DIR = Path(__file__).resolve().parents[2]

if DEBUG:
    # os.environ["LOCAL_DB_NAME"] = "obg_db"
    os.environ["LOCAL_DB_NAME"] = "online_mirror_db"
    os.environ["LOCAL_DB_USER"] = "root"
    os.environ["LOCAL_DB_PWD"] = "onlineb0@rdgamers"
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

from django.contrib.sites.models import Site

from Lobby.models import (
    User,
    Profile,
    Mini_Tournaments,
    Game,
    Main_Tournament,
    Mini_Tournaments,
)

#from Lobby.sharedFunctions.sharedFunctions import (
#    SF_endAnyTournament,
#)  # (request, mainORmini, tournamentObj, _currentGame, _winnerArray, _finalPositionNamesAndScore):


#allKFWgames = Game.objects.filter(gameCode="KFW")
#$allMiniTs = Mini_Tournaments.objects.all()

# game = HLC_Game.objects.last()
# for game in allTGZgames:
#    game.statsExcludeConsent = "0" * game.maxPlayers


# games = ["FCM"]

# reminder_start_time = int((datetime.now() - timedelta(minutes=118)).timestamp() * 1000)
# reminder_finish_time = int((datetime.now() - timedelta(minutes=182)).timestamp() * 1000)
remaining_start_time = 60 * 118 * 1  # 2hours
remaining_finish_time = 60 * 182 * 1  # 3hours

remaining_start_time_expired = -60 * 60 * 24 * 365 * 5
remaining_finish_time_expired = -60 * 60 * 24 * 30  # Now

PRINT_TIME = True

LZD = lzstring.LZString()

start_calc_time = time.perf_counter()
count = 0

TARGET_CODE = "Bus" 

allBusFinishedGames = Game.objects.filter(gameCode="BUS", gameStatus="FINISHED")

# print the number of games
print(f"Number of games: {allBusFinishedGames.count()}")

errorCount = 0
for game in allBusFinishedGames:
    try:
        # 1. Decode the Base64 string back to binary
        compressed_bytes = base64.b64decode(game.gameData)

        # 2. Decompress the Gzip binary data
        # gzip.decompress is the modern, direct way to do this in Python 3
        msgpacked_data = gzip.decompress(compressed_bytes)

        # 3. Unpack the MessagePack binary into a Python object
        # raw=False ensures strings are decoded as UTF-8 instead of bytes
        original_data = msgpack.unpackb(msgpacked_data, raw=False)
    except Exception as e:
        errorCount += 1

print(f"Error count: {errorCount}")










calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print("****** calc time: " + str(calc_time))

print(f"Count: {count}")
