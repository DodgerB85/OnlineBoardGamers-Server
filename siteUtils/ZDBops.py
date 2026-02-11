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

from HC.models import HC_Game
from Bus.models import Bus_Game
from FCM.models import FCM_Game
from FCM.models import FCM_Tournament
from KFW.models import KFW_Game
from Lobby.models import User, Profile, Mini_Tournaments, Game, Main_Tournament

from Lobby.sharedFunctions.sharedFunctions import SF_endAnyTournament#(request, mainORmini, tournamentObj, _currentGame, _winnerArray, _finalPositionNamesAndScore):

from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

allFCMgames = FCM_Game.objects.all()
allHCgames = HC_Game.objects.all()
allBUSgames = Bus_Game.objects.all()
allKFWgames = KFW_Game.objects.all()
allMiniTs = Mini_Tournaments.objects.all()

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

LZD = lzstring.LZString()

start_calc_time = time.perf_counter()
count = 0

#games = ["FCM", "HC", "Bus", "TGZ"]

allUsers = User.objects.all()

games = allHCgames
count = 0

TARGET_CODE = "Bus"

def update_ids_recursive(data, id_map):
    """Recursively wanders through lists to replace old IDs with new ones."""
    if isinstance(data, list):
        for i, item in enumerate(data):
            # If item is an integer and exists in our map, swap it
            if isinstance(item, int) and item in id_map:
                data[i] = id_map[item]
            else:
                update_ids_recursive(item, id_map)

# 1. Collect all old IDs across all relevant tournaments
tournamentsToConvert = Main_Tournament.objects.filter(
    gameCode=TARGET_CODE,
    id__gte=9
)
old_ids = set()

for tourny in tournamentsToConvert:
    try:
        data = json.loads(tourny.tournamentProgressionData)
        # Flatten the list to find all integers
        def extract_ints(lst):
            for x in lst:
                if isinstance(x, int): old_ids.add(x)
                elif isinstance(x, list): extract_ints(x)
        extract_ints(data)
    except (json.JSONDecodeError, TypeError):
        continue

# 2. Build the Mapping {original_id: new_id} in one query
id_map = {
    g.original_id: g.id 
    for g in Game.objects.filter(original_id__in=old_ids, gameCode=TARGET_CODE).only("id", "original_id")
}

print(f"id_map: {id_map}")

# 3. Update and Save
for tourny in tournamentsToConvert:
    data = json.loads(tourny.tournamentProgressionData)
    update_ids_recursive(data, id_map)
    
    tourny.tournamentProgressionData = json.dumps(data)
    tourny.save()

print(f"Successfully updated {len(tournamentsToConvert)} tournaments.")

#for game in allFCMgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#
#for game in allHCgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allBUSgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allTGZgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allCNSgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allINDgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allAQYgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allKFWgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")
#
#for game in allWEBgames:
#    if game.allPlayers.all().count() == game.maxPlayers:
#        if game.gameStatus != "FINISHED" and game.gameStatus != "ACTIVE":
#            print(f"Game: {game.getGameCode()} id: {game.id} ")



################################################ GET INACTIVE USER EMAILS
## Calculate the date for one month ago
#one_month_ago = datetime.now() - timedelta(days=30)
#
## Filter users who joined in the last month and are not active
#inactive_recent_users = User.objects.filter(
#    date_joined__gte=one_month_ago,
#    is_active=False
#)
#
## Extract email addresses
#emails = [user.email for user in inactive_recent_users]
#
## Save to z_email_list.txt (comma-separated)
#try:
#    with open('z_email_list.txt', 'w') as f:
#        f.write(','.join(emails))
#    print(f"Saved {len(emails)} emails to z_email_list.txt")
#except Exception as e:
#    print(f"Error writing to z_email_list.txt: {e}")
#
## Save to z_email_line.txt (one email per line)
#try:
#    with open('z_email_line.txt', 'w') as f:
#        f.write('\n'.join(emails))
#    print(f"Saved {len(emails)} emails to z_email_line.txt")
#except Exception as e:
#    print(f"Error writing to z_email_line.txt: {e}")
#
## Optional: Print the number of users found for verification
#print(f"Found {len(emails)} inactive users who joined in the last month")

######### DATA CONVERSION
#for game in allFCMgames:
#    if game.gameData == "":
#        pass
#    else:
#        try:
#            gameData = json.loads(gzip.decompress(bytearray(base64.b64decode(game.gameData))).decode("utf-8"))
#
#            # 17,18 are logs and TS
#            # so remove the first entry from both
#            print(f"gameID: {game.id} gameData: 17[1]: {gameData[17][1]}")
#            if len(gameData[17]) >= 1:
#                gameData[17].pop(1)
#                gameData[18].pop(0)
#
#                #game.gameData = base64.b64encode(gzip.compress(json.dumps(gameData).encode("utf-8"))).decode("utf-8")
#                #game.save()
#                print(f"SAVED GAME ID: {game.id}")
#        except Exception as e:
#            print(f"GAME NOT CHANGED: {game.id} - {e}")
#
################ MULTI - GAME DATA CONVERSION

#for game in allFCMgames:
#    try:
#        raw_data = json.loads(LZD.decompressFromEncodedURIComponent(game.gameData))
#
#        print(f"GAME: {game.id} IS IN LZS FORMAT")
#
#        # Step 1: Convert obj to a JSON string
#        json_string = json.dumps(raw_data)
#
#        # Step 2: Compress the JSON string using zlib
#        ## WARNING THIS WAS zlib WHICH MAY CAUSE ERRORS
#        compressed_data = gzip.compress(json_string.encode('utf-8'))
#
#        # Step 3: Convert the compressed data to a base64-encoded string
#        base64_data = base64.b64encode(compressed_data).decode('utf-8')
#        #game.gameData = base64_data
#        #game.save()
#        print("SAVED")
#    except:
#        print(f"GAME: {game.id} has pako")




calc_time = time.perf_counter() - start_calc_time

if PRINT_TIME:
    print("****** calc time: " + str(calc_time))

print(f"Count: {count}")

#for user in allUsers:
#    relatedProfile = Profile.objects.get(user=user)
#    FCMtournamentTrophies = relatedProfile.FCMtournamentTrophies
#    FCMtournamentTrophies = FCMtournamentTrophies.strip('"')

#    relatedProfile.FCMtournamentTrophies = FCMtournamentTrophies
#    relatedProfile.save()
#    print(user.id)

    #gold = int(FCMtournamentTrophies[0])
    #silver = int(FCMtournamentTrophies[1])
    #bronze = int(FCMtournamentTrophies[2])
#
    #dataInsert = []
    #dataInsert.append([gold, silver, bronze])
    #relatedProfile.FCMtournamentTrophies = json.dumps(dataInsert)
    #relatedProfile.save()
    #print(user.id)

#for game in allFCMgames:
#for game in allHCgames:
#    game_id = game.id
#    currentChat = game.chatData

#    currentChat = re.sub(r'"timestamp":\d+', '"timestamp":100', currentChat)

    #chatData = chatData.replace('{"name":"WelcomeBot","timestamp":100,"message":"Welcome to Food Chain Magnate Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"},', '')
#    currentChat = currentChat.replace('{"name":"WelcomeBot","timestamp":100,"message":"Welcome to Horseless Carriage Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"},', '')
    # WORKS
    # chatData = chatData.replace('{"name":"WelcomeBot","timestamp":1703564901000,"message":"Welcome to Food Chain Magnate Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"},', '')

#    game.chatData = currentChat
#    game.save()
#    print(game_id)


#for game in allHCgames:
#    if game.gameStatus == "FINISHED":
#        game.rewindData = ""
#        game.rewindTempData = ""
#        game.save()

# CHANGE THIS
#tourny = FCM_Tournament.objects.get(id=31)
#tourny = FCM_Tournament.objects.get(id=4)


#url = 'https://www.onlineboardgamers.com'  # Replace with your desired URL
#username = 'admin'  # Replace with your desired username

# Create a dictionary or JSON object containing the username
#data = {'username': username}

# Create a request object with the URL and data
#request = requests.Request('POST', url, data=data)
#request = HttpRequest()
#request.META['HTTP_HOST'] = 'www.onlineboardgamers.com'



#print(tourny.getByedPlayersList())

#for game in allGames:
#    creator = game.creator
#    game.host = creator
#    game.save()

#game = FCM_Game.objects.get(id=539)
#gameData = game.gameData
#print(gameData)

#x = lzstring.LZString()
#print(x.decompressFromEncodedURIComponent(gameData))


#tourn = FCM_Tournament.objects.get(id=2)
#tourn.tournamentStatus = "FN"
#print(tourn.tournamentStatus)
#print(tourn.get_tournamentStatus_display())
#tourn.save()






#for game in allGames:
#    game.tournamentGame = False
#    game.statsExcludedGame = False
#    game.save()

# Get all finished games that don't include shadow
#minus90days = int((datetime.now() - timedelta(days=90)).timestamp() * 1000)
#minus30days = int((datetime.now() - timedelta(days=30)).timestamp() * 1000)
#minus1year = int((datetime.now() - timedelta(days=365)).timestamp() * 1000)

#allFinishedGames = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11))
#allFinishedGames1year = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(latestUpdate__gte=minus1year))#.filter(latestUpdate__gte=date_from)
#allFinishedGames90days = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(latestUpdate__gte=minus90days))#.filter(latestUpdate__gte=date_from)
#allFinishedGames30days = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(latestUpdate__gte=minus30days))#.filter(latestUpdate__gte=date_from)

#2 player
#allFinishedGames2p = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(maxPlayers=2))
#allFinishedGames90days2p = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(maxPlayers=2), Q(latestUpdate__gte=minus90days))#.filter(latestUpdate__gte=date_from)
#allFinishedGames30days2p = FCM_Game.objects.all().filter(Q(gameStatus="FINISHED"), ~Q(allPlayers=11), Q(maxPlayers=2), Q(latestUpdate__gte=minus30days))#.filter(latestUpdate__gte=date_from)




