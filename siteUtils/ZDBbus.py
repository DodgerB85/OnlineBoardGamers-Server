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
from django.db import transaction

from collections import defaultdict
#import matplotlib.pyplot as plt
#import plotly.graph_objects as go
import codecs

DEBUG = config("DEBUG", default=False, cast=bool)


# Because the live and dev servers are in different folder names, we need to go up one from that
ROOT_DIR  = Path(__file__).resolve().parents[2]

if DEBUG:
    #os.environ["LOCAL_DB_NAME"] = "obg_db"
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

from Lobby.models import User, Profile, Mini_Tournaments, Game, Main_Tournament


from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

#allMiniTs = Mini_Tournaments.objects.all()

#game = HC_Game.objects.last()
#for game in allTGZgames:
#    game.statsExcludeConsent = "0" * game.maxPlayers


#games = ["FCM"]

#reminder_start_time = int((datetime.now() - timedelta(minutes=118)).timestamp() * 1000)
#reminder_finish_time = int((datetime.now() - timedelta(minutes=182)).timestamp() * 1000)
remaining_start_time = 60 * 118 * 1 # 2hours
remaining_finish_time = 60 * 182 * 1 # 3hours

remaining_start_time_expired = -60 *60 * 24 * 365 * 5
remaining_finish_time_expired = -60 *60 * 24 * 30 # Now

PRINT_TIME = True

#LZD = lzstring.LZString()

start_calc_time = time.perf_counter()
count = 0

#games = ["FCM", "HC", "Bus", "TGZ"]

allUsers = User.objects.all()

count = 0

def transform_tpda(old_tpda_str, tournament_name):
    if not old_tpda_str:
        return ""
    
    try:
        old_data = json.loads(old_tpda_str)
        new_data = []

        for round_index, round_list in enumerate(old_data):
            new_round = []
            round_num = round_index + 1
            round_label = f"[{tournament_name}] Round {round_num}"

            for game in round_list:
                # Check if it's a standard game list or a BYE list
                # Bus format: [p1, p2, p3, p4, game_id, winner] (len 6)
                # Or Round 2+: [p1, p2, p3, p4, game_id] (len 5)
                if isinstance(game, list) and len(game) >= 4:
                    # In Bus, the game ID is always the second to last element
                    game_id = game[-2] if isinstance(game[-2], int) else None
                    
                    # The winner is the last element (if it exists)
                    winner = game[-1] if isinstance(game[-1], str) and game[-1] != "" else None
                    
                    # The players are everything before the game ID
                    players = game[:-2] if game_id is not None else game[:]
                    
                    # Construct the nested Main format: [[players], id, [winner], label]
                    new_game = [
                        players, 
                        game_id, 
                        [winner] if winner else [], 
                        round_label
                    ]
                    new_round.append(new_game)
                else:
                    # Handle BYEPLAYERS or malformed lists
                    new_round.append(game)
            
            new_data.append(new_round)
            
        return json.dumps(new_data)
    except Exception as e:
        print(f"Error converting data: {e}")
        return old_tpda_str

def migrate_bus_to_main():
    fcm_tourneys = FCM_Tournament.objects.all()
    
    with transaction.atomic():
        for fcm in fcm_tourneys:
            # Apply the specific index transformation
            converted_tpda = transform_tpda(fcm.tournamentProgressionData, fcm.tournamentName)
            
            main = Main_Tournament.objects.create(
                gameCode="FCM",
                tournamentName=fcm.tournamentName,
                tournamentStatus=fcm.tournamentStatus,
                tournamentType=fcm.tournamentType,
                startingOptions=fcm.startingOptions,
                maxTournamentPlayers=fcm.maxTournamentPlayers,
                maxGamePlayers=fcm.maxGamePlayers,
                roundsBeforeKnockout=fcm.roundsBeforeKnockout,
                winnersData=fcm.winnersData,
                created=fcm.created,
                tournamentProgressionData=converted_tpda,
                tournamentSideData=fcm.tournamentSideData,
                tournamentPointsData=fcm.tournamentPointsData,
            )

            # Copy Many-to-Many relationships
            main.startingPlayers.set(fcm.startingPlayers.all())
            main.nextRoundPlayers.set(fcm.nextRoundPlayers.all())

            print(f"Migrated and Formatted: {main.tournamentName}")

if __name__ == "__main__":
    migrate_bus_to_main()

calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print("****** calc time: " + str(calc_time))

print(f"Count: {count}")
