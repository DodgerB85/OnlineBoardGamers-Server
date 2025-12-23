import json
import time
import re
import base64

# import zlib
# import pako
# import lzstring
import gzip

# from random import seed

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.conf import settings

from django.shortcuts import render  # , redirect
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required

# from django.contrib.sites.shortcuts import get_current_site
from django.contrib import messages
from django.shortcuts import get_object_or_404

# from django.template.loader import render_to_string
from django.urls import reverse
from random import randint

# from datetime import datetime

from contextlib import contextmanager

# from django.conf import settings
from django.db import transaction, connection
from django.db.models import Q  # , Avg
from django.utils.translation import gettext  # , get_language

# from django.utils import translation

# from contextlib import connection
# import requests

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML  # , SR_getTimeNow
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)

from .common import create_fcm_game

from Lobby.models import User, Profile
from .models import FCM_Game

# import requests  # Keep this to broadcase on WSS when it is uncommented
FCMsuperUsers = ["BotKickStarter"]
USE_NEW_CODE = False


def index(request):
    return HttpResponse(
        'Hello! Psssssssssssst...... Start a Practice Game of FCM and click on "Connected" in the top right 5 times!'
    )


def FCMhelp(request):
    return render(request, "FCM/FCMhelp.html")

def FCMchinaHelp(request):
    return render(request, "FCM/FCMchinaHelp.html")

def coffeeHelp(request):
    return render(request, "FCM/coffeeHelp.html")


@login_required
def FCMstats(request):
    f = open("./FCM/FCMstats/FCM_stats.json")
    data = json.load(f)

    return render(
        request,
        "FCM/FCMstats.html",
        {
            "basicData": data["basicData"],
            "modulesUsed": data["modulesUsed"],
            "rg_t_m_stats": data["rg_t_m_stats"],
        },
    )


@login_required
def FCMstatGames(request):
    # Post is required
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Get the game ids
    gameIDs = json.loads(request.POST["game_ids"])
    
    gameIDs.reverse()

    # Pagination settings
    page = request.POST.get("page", 1)  # Get the current page number from the request
    items_per_page = 20  # Number of games to display per page

    # Get the total count of games BEFORE slicing gameIDs
    total_games_count = len(gameIDs)

    # Slice gameIDs for the current page
    paginator = Paginator(gameIDs, items_per_page)  # Initialize the paginator here
    try:
        gameIDs_page = paginator.page(page).object_list  # Get the gameIDs for the current page
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = Paginator(gameIDs, items_per_page).page(1).object_list
        page = 1
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = Paginator(gameIDs, items_per_page).page(Paginator(gameIDs, items_per_page).num_pages).object_list
        page = Paginator(gameIDs, items_per_page).num_pages

    # Filter the games for the current page ONLY
    finishedGames = FCM_Game.objects.filter(id__in=gameIDs_page).order_by("-latestUpdate")

#    def serializeLocal(game):
#        winner = game.winner.username if game.winner else None  # Handle cases where there is no winner
#
#        latestUpdateString = str(game.latestUpdate)
#
#        startingOptionsHTML = SR_getFCMstartingOptionsHTML(game.startingOptions)
#
#        return {
#            "gameID": game.id,
#            "gameName": game.getGameName(),
#            "creator": game.creator.username,
#            "allPlayers": [user.username for user in game.allPlayers.all()],
#            "currentTurn": game.currentTurnString(),
#            "latestUpdate": latestUpdateString,
#            "startingOptions": startingOptionsHTML,
#            "maxPlayers": game.maxPlayers,
#            "winner": winner,  # Used for Finished Games
#            "game": "FCM",
#        }
#
    # Serialize ONLY the games for the current page
    finishedGamesListJson = [SF_fastSerializeGame(game, request.user) for game in finishedGames]

    return render(
        request,
        "FCM/FCMstatGames.html",
        {
            "finishedGamesList": finishedGamesListJson,
            "page": int(page),
            "num_pages": paginator.num_pages,
            "total_games_count": total_games_count,  # Pass the total count to the template
            "game_ids_json": request.POST["game_ids"],  # Pass the game_ids back to the
        },
    )


@login_required()
def createFCMgame(request):
    # Example usage in your views.py:
    return create_fcm_game(request)
    #    # Creating a game must be via POST
    #    if request.method != "POST":
    #        return JsonResponse({"error": "POST request required."}, status=400)
    #    if (
    #        "enableAdvancedOptions" in request.POST
    #        and "randomModules" not in request.POST
    #        and "draftModules" not in request.POST
    #        and "fcmAI" not in request.POST
    #    ):
    #        messages.error(request, gettext("Please Select an Expert Option"))
    #        return HttpResponseRedirect(reverse("createFCMpage"))
    #
    #    players = ["player2", "player3", "player4", "player5", "player6"]
    #    usernames = []
    #    for player in players:
    #        username = request.POST.get(player)
    #        if username:
    #            usernames.append(username)
    #
    #    if "trainingGame" not in request.POST:
    #        existing_users = User.objects.filter(username__in=usernames)
    #        existing_usernames = set(user.username for user in existing_users)
    #
    #        for username in usernames:
    #            if username not in existing_usernames:
    #                messages.error(request, gettext(f"Error: {username} does not exist"))
    #                return HttpResponseRedirect(reverse("createFCMpage"))
    #            if username == request.user.username:
    #                messages.error(request, gettext("Error: You cannot add yourself"))
    #                return HttpResponseRedirect(reverse("createFCMpage"))
    #
    #    _gameName = ""
    #    if "scenario" in request.POST:
    #        _gameName = "[" + request.POST["scenario"] + "] "
    #
    #    _gameName += request.POST["gameName"]
    #
    #    _gameDescription = request.POST["gameDescription"]
    #
    #    _maxPlayers = 2
    #    if "playerNumber" in request.POST:
    #        _maxPlayers = int(request.POST["playerNumber"])
    #    else:
    #        tilesList = request.POST["mapData"].split(",")
    #        if len(tilesList) == 18:
    #            _maxPlayers = 2
    #        if len(tilesList) == 24:
    #            _maxPlayers = 3
    #        if len(tilesList) == 32:
    #            _maxPlayers = 4
    #        if len(tilesList) == 40:
    #            _maxPlayers = 5
    #        if len(tilesList) == 48:
    #            _maxPlayers = 6
    #
    #    _playerSeatOffset = randint(0, _maxPlayers - 1)
    #
    #    _startingOptions = ""
    #
    #    # TRAINING GAME NEEDS TO COME BEFORE DRAFT MODULES
    #    if "trainingGame" in request.POST:
    #        _startingOptions += "101," + request.POST["trainingGame"] + ","
    #    if "fcmAI" in request.POST:
    #        # Trg Game, Strict payday,
    #        _startingOptions += "101,102" + ","
    #
    #    def add_options(starting_options, *option_names):
    #        for option_name in option_names:
    #            if option_name in request.POST:
    #                starting_options += "" + str(request.POST[option_name]) + ","
    #        return starting_options
    #
    #    if "enableAdvancedOptions" in request.POST:
    #        if "randomModules" in request.POST:
    #            if request.POST["random_MS"] == "202":
    #                _startingOptions += "21,"
    #            _startingOptions += "200,"
    #            minModules = request.POST["minModules"]
    #            maxModules = request.POST["maxModules"]
    #            if len(minModules) == 1:
    #                minModules = "0" + minModules
    #            if len(maxModules) == 1:
    #                maxModules = "0" + maxModules
    #            _startingOptions += "210" + minModules + ","
    #            _startingOptions += "211" + maxModules + ","
    #        if "draftModules" in request.POST:
    #            if request.POST["draft_MS"] == "302":
    #                _startingOptions += "21,"
    #            if "newDistrictsDraft" in request.POST:
    #                _startingOptions += "18,"
    #            if "newDistrictsAppDraft" in request.POST:
    #                _startingOptions += "181,"
    #            if "newDistrictsParkDraft" in request.POST:
    #                _startingOptions += "183,"
    #            _startingOptions += "300,"
    #
    #    _startingOptions = add_options(
    #        _startingOptions,
    #        "short",
    #        "noMilestones",
    #        "noCeoMilestone",
    #        "noRadioMilestone",
    #        "hardChoices",
    #        "fryChefs",
    #        "kimchi",
    #        "sushi",
    #        "noodles",
    #        "gourmet",
    #        "movieStars",
    #        "massMarketers",
    #        "nightShift",
    #        "ruralMarketers",
    #        "newDistricts",
    #        "newDistrictsApp",
    #        "newDistrictsPark",
    #        "newDistrictsAll",
    #        "coffee",
    #        "ketchupMilestone",
    #        "newMilestones",
    #        "lobbyists",
    #        "reservePrice",
    #        "strictPaydayFridge",
    #        "sandboxMode",
    #        "learningGame",
    #        "experiencedGame",
    #    )
    #
    #    if len(_startingOptions) > 0:
    #        _startingOptions = _startingOptions.rstrip(_startingOptions[-1])
    #
    #    _created = SR_getTimeNow()
    #    _pace = request.POST["pace"]
    #
    #    with transaction.atomic():
    #        newGame = FCM_Game(
    #            gameName=_gameName,
    #            gameDescription=_gameDescription,
    #            creator=request.user,
    #            host=request.user,
    #            gamePace=_pace,
    #            turn=0,
    #            phase=0,
    #            created=_created,
    #            latestUpdate=_created,
    #            seatOffset=_playerSeatOffset,
    #            startingOptions=_startingOptions,
    #            maxPlayers=_maxPlayers,
    #            gameStatus="AVAILABLE",
    #        )
    #        newGame.save()
    #
    #        if "allowRewind" in request.POST:
    #            newGame.rewindConsent = "2" * (_maxPlayers)
    #
    #        _player1 = request.user
    #        newGame.allPlayers.add(_player1)
    #
    #        if "fcmAI" in request.POST:
    #            newGame.gameStatus = "ACTIVE"
    #            _newPlayer1 = User.objects.get(username="FcmAI")
    #            newGame.allPlayers.add(_newPlayer1)
    #            newGame.rewindConsent = "22"
    #            newGame.statsExcludeConsent = "1" * _maxPlayers
    #            newGame.statsExcludedGame = True
    #
    #        elif "trainingGame" in request.POST:
    #            newGame.gameStatus = "ACTIVE"
    #            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
    #            shadow_players = []
    #
    #            for i in range(1, _maxPlayers):
    #                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
    #                newGame.allPlayers.add(shadow_player)
    #
    #                if request.POST[f"player{i + 1}"]:
    #                    display_name = request.POST[f"player{i + 1}"]
    #                else:
    #                    display_name = f"{shadow_names[i - 1]}"
    #                shadow_players.append(display_name)
    #
    #            newGame.rewindConsent = "2" * (_maxPlayers)
    #            newGame.player0notes = json.dumps(shadow_players, separators=(",", ":"))
    #            newGame.startGame(request)
    #            newGame.statsExcludeConsent = "1" * _maxPlayers
    #            newGame.statsExcludedGame = True
    #
    #        elif "learningGame" in request.POST:
    #            newGame.rewindConsent = "2" * (_maxPlayers)
    #            newGame.statsExcludeConsent = "1" * _maxPlayers
    #            newGame.statsExcludedGame = True
    #
    #        else:
    #            usernamesToNotify = []
    #            for i in range(2, _maxPlayers + 1):
    #                player_username = request.POST.get(f"player{i}", "")
    #                if player_username:
    #                    newPlayer = get_object_or_404(User, username=player_username)
    #                    newGame.gameStatus = "WAITING"
    #                    newGame.invitedPlayers.add(newPlayer)
    #                    usernamesToNotify.append(newPlayer.username)
    #
    #            SN_sendInviteNotifications(request, usernamesToNotify, newGame.getGameName(), _maxPlayers, "FCM")
    #            newGame.statsExcludeConsent = "0" * _maxPlayers
    #
    #        newGame.kickoutDuration = request.POST["kickoutDuration"]
    #
    #        newGame.zoomLevels = "200" * _maxPlayers
    #
    #        if "sandboxMode" in request.POST:
    #            newGame.statsExcludeConsent = "1" * _maxPlayers
    #            newGame.statsExcludedGame = True
    #
    #        if request.POST["mapData"] != "":
    #            # The TRY works for REMATCHES. THe EXCEPT handles FCM MAP EDITOR map format
    #            try:
    #                tilesList = json.loads(request.POST["mapData"])
    #            except:
    #                tilesList = request.POST["mapData"].split(",")
    #                for i in range(len(tilesList)):
    #                    tilesList[i] = int(tilesList[i])
    #
    #            newGame.startingMap = json.dumps(tilesList, separators=(",", ":"))
    #
    #        if "privateGame" in request.POST:
    #            newGame.gameStatus = "PRIVATE"
    #
    #        newGame.save()
    #
    #        # END transaction.atomic()

    if "trainingGame" in request.POST:
        messages.success(request, (gettext("Your Practice game has been started")))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    elif "fcmAI" in request.POST:
        messages.success(request, (gettext("Your AI game has been started")))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("FCM", getattr(newGame, "id"))))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


def showGame(request, game_id):
    try:
        currentGame = FCM_Game.objects.select_related(
            "host", "relatedTournament"
        ).prefetch_related(
            "allPlayers", 
            "missingPlayers", 
            "playersWithChatNotification"
        ).get(id=game_id)
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    
    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {p.id for p in currentGame.allPlayers.all()}
    #start_time = time.time()
    user = request.user
    user_id = user.id
    #show_timestamps = user.username in ["admin", "DodgerB"]
    
    #def print_timestamp(label):
    #    if show_timestamps:
    #        print(f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}")


    finishedGame = False
    if currentGame.gameStatus == "FINISHED":
        finishedGame = True

    # THIS IS STILL NEEDED TO DISPLAY OLD GAMES
    USE_NEW_CODE = False
    if int(currentGame.created) > 1744974000000:
        USE_NEW_CODE = True

    if currentGame.relatedTournament and request.user.username == "FCMtourneyAdmin":
        FCMsuperUsers.append("FCMtourneyAdmin")

    startingOptionsHTML = SR_getFCMstartingOptionsHTML(currentGame.startingOptions)
    gameCreationTimestamp = currentGame.created

    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)

    #print_timestamp("Step 1: initial setup done")

    # If not logged in, return now
    if not request.user.is_authenticated:
        return render(
            request,
            "FCM/GameTemplate.html",
            {
                "gameData": currentGame.gameData,
                "gameID": game_id,
                "showAssistance": "true",
                "latestUpdateLiteral": currentGame.latestUpdate,
                "involvedPlayer": False,
                "gameName": currentGame.getGameName(),
                "myMove": False,
                "startingOptionsHTML": startingOptionsHTML,
                "gameCreationTimestamp": gameCreationTimestamp,
                "KickoutFlexiDataArray": KickoutFlexiDataArray,
                "USE_NEW_CODE": USE_NEW_CODE,
                "finishedGame": finishedGame,
                "startingOptionsLiteral": currentGame.startingOptions,
                "startingMap": currentGame.startingMap,
                "pov": -99,
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
                "preferredColour": -1,
                "settingsDebug": settings.DEBUG,
            },
        )

    # If person is logged in, may or may not be in game
    user_profile = Profile.objects.get(user=request.user) 
    missing_player_ids = {p.id for p in currentGame.missingPlayers.all()}
    chat_notify_ids = {p.id for p in currentGame.playersWithChatNotification.all()}

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    involvedPlayer = is_in_all and not is_missing
    if request.user.username in FCMsuperUsers:
        involvedPlayer = True
    
    tournamentGame = False
    highContrastBoardItems = user_profile.highContrastBoardItems
    showAssistance = "true" if user_profile.showAssistance else "false"
    now = int(time.time()) * 1000

    chatData = currentGame.chatData
    if not USE_NEW_CODE:
        c = bytes(chatData, "utf-8")
        chatData = c.decode("unicode-escape")

    currentMove = ""
    currentNotes = ""
    pov = -9
    preferredRestaurantColour = -1
    allPlayerListBySeat = currentGame.getAllPlayersOrderedySeat()
    kickoutRequired = 0
    chatNotification = False

    myMove = False
    myZoomLevel = 200
    myStatsExcludeConsent = 0
    liveNotification = 1

    rewindPanelType = 0
    rewindHostHTML = ""
    rewindHostPossible = False
    currentRewindConsent = "0"
    currentPlayers = currentGame.currentPlayers
    statsExcludedGame = currentGame.statsExcludedGame
    displayNames = ""

    # Do Chat notification separately, as could be kicked out, and so not involoved
    if is_in_all and user_id in chat_notify_ids:
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

    #print_timestamp("Step 2: Before nextURL")

    ## Get the next URL
    nextURL = f"/nextGame?current_id={game_id}&current_code={currentGame.getGameCode()}"
    
    #print_timestamp("Step 4: nextURL obtained")

    # If person is logged in and in the game
    if involvedPlayer:
        if currentGame.relatedTournament:
            tournamentGame = True
        rewindPanelType = 1
        if currentGame.host == request.user:
            rewindPanelType = 2
            rewindHostPossible = currentGame.getRewindHostPossible()
            rewindHostHTML = currentGame.getRewindHostHTML()

        if request.user.username in FCMsuperUsers:
            rewindPanelType = 2
            rewindHostPossible = True
            rewindHostHTML = currentGame.getRewindHostHTML()

        #print_timestamp("Step 4.5: Involved player")

        pov = currentGame.seatPosition(request.user.username)
        if request.user.username in FCMsuperUsers:
            involvedPlayer = True
        currentRewindConsent = currentGame.getCurrentRewindConsent(request.user.username)

        preferredRestaurantColour = user_profile.preferredRestaurantColour
        liveNotification = user_profile.liveNotification

        currentMove = ""
        if currentGame.hasValidActualMoveData(request.user.username) or currentGame.hasValidActualCleanupPreset(
            request.user.username
        ):
            currentMove = currentGame.getCompressedMoveArr(request.user.username, True)

        #print_timestamp("Step 4.6: currentMove obtained")
               
        # Mapping for notes
        notes_mapping = {
            0: currentGame.player0notes,
            1: currentGame.player1notes,
            2: currentGame.player2notes,
            3: currentGame.player3notes,
            4: currentGame.player4notes,
            5: currentGame.player5notes,
        }
        currentNotes = notes_mapping.get(pov, "")

        # Check for kickout
        kickoutRequired = currentGame.kickoutRequired()

        #print_timestamp("Step 4.7: currentNotes obtained")

        allPlayerListBySeat = currentGame.getAllPlayersOrderedySeat(False, USE_NEW_CODE)
        myMove = currentGame.isMyMove(request.user.username)
        myZoomLevel = currentGame.zoomLevels[pov * 3 : pov * 3 + 3]
        myStatsExcludeConsent = currentGame.statsExcludeConsent[pov : pov + 1]
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat(False, USE_NEW_CODE) and currentGame.gameData == "":
            displayNames = ["test"]
            try:
                displayNames = json.loads(currentGame.player0notes)
            except Exception as e:
                displayNames = ["SHADOW"]
                print(f"Failed to load displayNames, {e} ")
            currentNotes = ""
            currentGame.player0notes = ""
            currentGame.save()

    #print_timestamp("Step 5: involvedPlayer processing done")

    #######
    #   Check if SHADOW in currentGame.allPlayers
    #   Check currentGame.involvedPlayer
    #   Use currentGame.gameName
    #   Use if currentGame.startingOptionsLiteral
    #   Use currentGame.startingMap
    #   use currentGame.gameID
    #   Use currentGame.currentPlayers
    #   Use currentGame.latestUpdateLiteral
    #   Use currentGame.myMove to prevent self kickout
    # tournamentGame = False
    return render(
        request,
        "FCM/GameTemplate.html",
        {
            "gameCreationTimestamp": gameCreationTimestamp,
            "now": now,
            "gameData": currentGame.gameData,
            "pov": pov,
            "preferredColour": preferredRestaurantColour,
            "name": request.user.username,
            "chatData": chatData,
            "showAssistance": showAssistance,
            "chatNotification": chatNotification,
            "moveData": currentMove,  # Used for Move Data
            # user for global.players AND if includes SHADOW
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentNotes": currentNotes,
            "kickoutRequired": kickoutRequired,
            "involvedPlayer": involvedPlayer,
            "gameName": currentGame.getGameName(),
            "phase": currentGame.phase,  # Used for module draft to inject starting options
            "gameID": getattr(currentGame, "id"),
            "currentPlayers": currentPlayers,
            "latestUpdateLiteral": currentGame.latestUpdate,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "liveNotification": liveNotification,
            "finishedGame": finishedGame,
            "rewindPanelType": rewindPanelType,
            "rewindHostHTML": rewindHostHTML,
            "rewindHostPossible": rewindHostPossible,
            "currentRewindConsent": int(currentRewindConsent),
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            "tournamentGame": tournamentGame,
            "highContrastBoardItems": highContrastBoardItems,
            "startingOptionsHTML": startingOptionsHTML,
            "myStatsExcludeConsent": myStatsExcludeConsent,
            "statsExcludedGame": statsExcludedGame,
            "displayNames": displayNames,
            "nextURL": nextURL,
            "KickoutFlexiDataArray": KickoutFlexiDataArray,
            "USE_NEW_CODE": USE_NEW_CODE,
            "startingOptionsLiteral": currentGame.startingOptions,
            "startingMap": currentGame.startingMap,
            "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
            "settingsDebug": settings.DEBUG,
        },
    )


# @contextmanager
# def db_mutex(name, timeout=10):
#    mutex_name = "dbmutex_" + name
#    cursor = connection.cursor()
#    # timeout returns with error
#    cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
#    ((got,),) = cursor.fetchall()
#    if got:
#        yield
#        cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
#        cursor.fetchall()
#    else:
#        # time out or can't open?
#        print("ERROR-FCM: Not running, %s mutex not available" % (mutex_name))


@contextmanager
def db_mutex(gameID, timeout=10):
    mutex_name = "lockFCMgame_" + str(gameID)
    cursor = connection.cursor()
    got_lock = False  # Initialize got_lock to False
    try:
        # timeout returns with error
        cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
        ((got,),) = cursor.fetchall()
        got_lock = bool(got)  # Convert to boolean for clarity

        if got_lock:
            yield  # Execute the code within the 'with' block
        else:
            # time out or can't open?
            print("ERROR-FCM: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(f"ERROR-FCM: Failed to release lock {mutex_name}: {e}")  # Log error


# This is used for HTMX update
def checkNewData(request, game_id):
    if request.method == "GET":
        try:
            currentGame = FCM_Game.objects.get(id=game_id)
        except FCM_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
            # pass
        return HttpResponse(currentGame.latestUpdate)

    return HttpResponse(status=204)  # No Content


def test(request):
    # return HttpResponse("You're looking at game %s." % 1)
    # currentGame = FCM_Game.objects.get(id=23)

    # requests.post("https://wss.s3.sitereview.io/post/allFCMchannels/",
    #    json={"somekey":"someval"
    # })

    # requests.post("https://wss.s3.sitereview.io/post/allFCMchannels/",
    #    "MESSAGEFROMADIN=Thank you for playing FCM Online"
    # )
    # currentGame = FCM_Game.objects.get(id=game_id)
    return render(request, "FCM/test.html", {"gameID": 21})


#    currentGame.endGame(request, jsonData["winner"], jsonData["finalScores"], jsonData["gameID"], currentGame)
def endGame(request, _winner, _finalScores, _gameID, currentGame):
    with db_mutex(str(_gameID)):
        return currentGame.endGame(request, _winner, _finalScores, _gameID)


def processTurn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        # get rid of decorator on processTurn
        # do more stuff
        # return render(request, "somefile.html")
        return _processTurn(request)


@login_required()
def _processTurn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.relatedTournament and request.user.username == "FCMtourneyAdmin":
        FCMsuperUsers.append("FCMtourneyAdmin")

    # time.sleep(3)  # Pause execution for 3 seconds

    # loads the latest game and updates latest-Update
    if jsonData["action"] == "loadNew":
        currentMove = ""
        # Use to stop actions showing when there's already move Data
        if currentGame.hasValidActualMoveData(request.user.username):
            currentMove = currentGame.getCompressedMoveArr(request.user.username)
        return JsonResponse(
            {
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": currentGame.getCurrentPlayersArray(),
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "specialData": currentMove,
                "latestUpdate": currentGame.latestUpdate,
                "startingMap": currentGame.startingMap,
            },
            safe=False,
        )

    # Reset move data to blank
    elif jsonData["action"] == "unlockRestructure" or jsonData["action"] == "unlockPayday":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM unlockRestructure - gameID: {getattr(currentGame,'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # Wipe the move data
        currentGame.deleteSinglePlayersMove(request.user.username)

        # Update current playes
        if request.user.username not in currentGame.currentPlayers:
            # currentGame.currentPlayers = jsonData["nextPlayer"]
            currentGame.currentPlayers = currentGame.currentPlayers + "," + request.user.username
        currentGame.save()
        return JsonResponse({"unlockStatus": True}, safe=False)


    
    elif jsonData["action"] == "saveInProgressMap":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveInProgressMap - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]

        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            currentGame.latestUpdate,
            int(time.time()) * 1000,
            request.user.username,
            currentGame.kickoutDuration,
        )

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # Update module selections
        currentGame.startingMap = jsonData["tiles"]

        # If staying in module selection, don't save a rewind
        if currentGame.phase == 14:
            currentGame.rewindData = ""
        else:
            # You are moving into the game proper
            currentGame.rewindData = currentGame.gameData

        currentGame.save()

        # Send Notifications - MODULE SELECTION
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "FcmBot" and jsonData["nextPlayer"] != "FcmAI":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            for player in playerListToNotify:
                ppov = currentGame.seatPosition(player)
                playerNotificationSuppression = currentGame.notificationSuppression[ppov : ppov + 1]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.notificationSuppression = (
                        currentGame.notificationSuppression[:ppov]
                        + "0"
                        + currentGame.notificationSuppression[ppov + 1 :]
                    )

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    currentGame.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": currentGame.startingOptions,
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(currentGame.startingOptions),
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )
    
    elif jsonData["action"] == "saveModuleSelection":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveModuleSelection - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.phase = jsonData["phase"]

        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            currentGame.latestUpdate,
            int(time.time()) * 1000,
            request.user.username,
            currentGame.kickoutDuration,
        )

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # Update module selections
        currentGame.startingOptions += "," + str(jsonData["SM"])

        # If staying in module selection, don't save a rewind
        if currentGame.phase == 13:
            currentGame.rewindData = ""
        else:
            # You are moving into the game proper
            currentGame.rewindData = currentGame.gameData
            startingOptionsArr = currentGame.startingOptions.split(",")
            # Convert the list of strings to a list of integers
            startingOptionsArr = [int(item) for item in startingOptionsArr]
            startingOptionsArr.remove(300)  # Remove the integer from its current position
            startingOptionsArr.append(300)  # Append the integer to the end of the list
            startingOptionsArr = [str(item) for item in startingOptionsArr]
            currentGame.startingOptions = ",".join(
                startingOptionsArr
            )  # Join the list back into a comma-separated string

        currentGame.save()

        # Send Notifications - MODULE SELECTION
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "FcmBot" and jsonData["nextPlayer"] != "FcmAI":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            for player in playerListToNotify:
                ppov = currentGame.seatPosition(player)
                playerNotificationSuppression = currentGame.notificationSuppression[ppov : ppov + 1]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.notificationSuppression = (
                        currentGame.notificationSuppression[:ppov]
                        + "0"
                        + currentGame.notificationSuppression[ppov + 1 :]
                    )

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    currentGame.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": currentGame.startingOptions,
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(currentGame.startingOptions),
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    # NEW
    elif jsonData["action"] == "saveNormal":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveNormal - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if currentGame.gameStatus == "FINISHED":
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData and jsonData["mapTiles"] and currentGame.startingMap != "":
            incomingTiles = jsonData["mapTiles"]
            currentTiles = json.loads(currentGame.startingMap)
            if len(incomingTiles) != len(currentTiles):
                turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
                phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
                message = (
                    f"MAP TILES LENGTH OUT OF SYNC - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                    f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                    f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
                )
                SN_sendAdminErrorMessage(request, message)
                return JsonResponse({"syncError": True}, safe=False)
            for i in range(len(incomingTiles)):
                if incomingTiles[i] != currentTiles[i]:
                    turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
                    phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
                    message = (
                        f"MAP TILES CONTENT OUT OF SYNC - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - DB Tiles: {currentTiles} - IN Tiles: {incomingTiles} - JSON_LU: {jsonData['latestUpdate']} "
                        f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                        f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
                    )
                    SN_sendAdminErrorMessage(request, message)
                    return JsonResponse(
                        {"syncError": True},
                        safe=False,
                    )

        if "mapTiles" in jsonData and jsonData["mapTiles"] and currentGame.startingMap == "":
            currentGame.startingMap = json.dumps(jsonData["mapTiles"], separators=(",", ":"))

        nameToUse = request.user.username
        if request.user.username in FCMsuperUsers:
            nameToUse = jsonData["BKSN"]
            if nameToUse.startswith("FCMtourneyAdmin/"):
                name_parts = nameToUse.split("/", 1)
                nameToUse = name_parts[1] if len(name_parts) > 1 else nameToUse

        currentGame.gameData = jsonData["gameData"]

        returnOOBpreferences = False
        returnPaydayPreturns = False
        returnFridgePreturns = False

        oldPhase = currentGame.phase

        ###########

        if "phase" not in jsonData:
            print(
                "*********************************************** Key 'phase' not found in jsonData. jsonData contents:"
            )
            print(jsonData["gameID"])
            print(f"DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} ")
            print(f" -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}")
            print(jsonData)
            message = (
                f"******** PHASE NOT FOUND IN JSONDATA ********* - jsonData: {jsonData} - User: {request.user.username} - "
                f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
                f" -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)

        if oldPhase == 7 and jsonData["phase"] == 7 and "101" not in currentGame.startingOptions:
            print("*********************************************** Key 'phase'  PHASE 7 ERROR   ")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE PAYDAY (ok with kickout) ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)

        if oldPhase == 9 and jsonData["phase"] == 9 and "101" not in currentGame.startingOptions:
            print("*********************************************** Key 'phase'  PHASE 9 ERROR   ")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE CLEANUP ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
        ###########

        if jsonData["checksum"]:
            currentGame.clearAllMoveDataV2()

        # If you are saving into turn order, return all players OOB preferences
        if oldPhase == 4 and jsonData["phase"] == 4 and "101" not in currentGame.startingOptions:
            returnOOBpreferences = True

        # If the stored game is not payday, and the new data IS payday, then we need to return payday preturns
        if oldPhase != 7 and jsonData["phase"] == 7 and "101" not in currentGame.startingOptions:
            returnPaydayPreturns = True
        # Same for cleanup
        if oldPhase != 9 and jsonData["phase"] == 9 and "101" not in currentGame.startingOptions:
            returnFridgePreturns = True

        # Remove move data at start of reatruc
        if currentGame.phase != 3 and jsonData["phase"] == 3:
            currentGame.clearAllMoveDataV2()
            # Emergency check; make sure all players except bots are in currentPlayers
            missing_players = set(currentGame.missingPlayers.values_list("username", flat=True))
            current_players = [
                user.username for user in currentGame.allPlayers.all() if user.username not in missing_players
            ]
            currentGame.currentPlayers = ",".join(current_players)
            currentGame.save()

        # Remove move data at start of working day
        if currentGame.phase != 5 and jsonData["phase"] == 5:
            currentGame.clearAllMoveDataV2()

        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.save()

        # reset notifs - SAVE NORMAL
        if jsonData["phase"] == 5 or oldPhase == 5:
            currentGame.notificationSuppression = "0" * currentGame.maxPlayers

        # If it WAS a working day save the side data (pre moves) - UNLESS it is now working day again
        # So also check you're not coming from Turn Order
        if nameToUse != "" and oldPhase != 4 and jsonData["phase"] != 3 and (jsonData["phase"] == 5 or oldPhase == 5):
            if jsonData["sideData"] and jsonData["sideData"] != "":
                preMoveArray = json.loads(
                    gzip.decompress(bytearray(base64.b64decode(jsonData["sideData"]))).decode("utf-8")
                )
                # currentGame.updateWholeMoveData(nameToUse, json.dumps(preMoveArray, separators=(",", ":")))
                currentGame.insertPlayerMoveData(nameToUse, [5, 6, 7, 8, 9, 11, 12, 15], preMoveArray)

        # Use for rewind save check
        # elapsedTotalSeconds = int(time.time()) - int(currentGame.latestUpdate)//1000
        if nameToUse != "":
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                nameToUse,
                currentGame.kickoutDuration,
            )

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # First, save the currentPlayers from the jsonData
        currentGame.currentPlayers = jsonData["nextPlayer"]

        # Remove players at start of setup reserve, if they moved during resto phase
        # if jsonData["phase"] == 2 and currentGame.startingOptions and 102 not in [int(x.strip()) for x in currentGame.startingOptions.split(",")]:
        #    currentGame.currentPlayers = currentGame.getCurrentSimulPlayers()
        # currentGame.save()

        # If starting payday / fridge, check for pre moves
        # if returnPaydayPreturns or returnFridgePreturns:
        #    currentGame.currentPlayers = currentGame.getCurrentSimulPlayers()

        # Before sending notifications, update the currentPlayers
        # If saving into phase 2/7/9, then update for simul players
        if jsonData["phase"] == 2 or jsonData["phase"] == 7 or jsonData["phase"] == 9:
            currentGame.currentPlayers = currentGame.getCurrentSimulPlayersV2()

        # Send Notifications - payday/fridge with moves are already removd
        if (
            currentGame.currentPlayers != ""
            and currentGame.currentPlayers != "FcmBot"
            and currentGame.currentPlayers != "FcmAI"
            and not jsonData["status"] == "FINISHED"
        ):
            playerListToNotify = currentGame.currentPlayers.split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # If you are saving into phase 4, and the next player has OOB, remove them from notifications
            if jsonData["phase"] == 4:
                if currentGame.hasValidActualMoveData(jsonData["nextPlayer"]):
                    playerListToNotify.remove(jsonData["nextPlayer"])

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    currentGame.getGameName(),
                    currentGame,
                    oldVer,
                )

        ################ REWIND EVERY SAVE #######################
        # Don't save during cleanup as it messes up some training games
        # [[[Don't save if less than 5 seconds elapsed, to allow to rewind past skipped phases]]]

        # You always want to save a rewind, even at the END of a pointless move
        # But if it is pointless, you want to delete the PREVIOUS rewind point
        # So first check if the move was pointless, and then remove the PREVIOUS rewind point
        if jsonData["IPM"]:
            currentRewindData = currentGame.rewindData
            if len(currentRewindData) > 0:
                currentRewindDataArray = currentRewindData.split("'SPLIT'")
                loadData = ""
                if len(currentRewindDataArray) > 0:
                    loadData = currentRewindDataArray.pop()

                while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
                    loadData = currentRewindDataArray.pop()

                currentGame.rewindTempData = ""
                currentGame.rewindData = "'SPLIT'".join(currentRewindDataArray)
                currentGame.save()

        if jsonData["saveRewind"]:  # and not jsonData["IPM"]:  # and jsonData["phase"] != 9:
            currentRewindData = currentGame.rewindData
            currentRewindDataArray = currentRewindData.split("'SPLIT'")

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if (
                    currentRewindDataArray[-1] != currentGame.rewindTempData
                    and jsonData["gameData"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData = currentRewindData + "'SPLIT'" + currentGame.rewindTempData
                    currentRewindDataArray.append(currentGame.rewindTempData)

                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if len(currentRewindData) == 0:
                currentRewindData = jsonData["gameData"]
            else:
                # else check last one isn't same as cufrent, and if not then add
                if currentRewindDataArray[-1] != jsonData["gameData"]:
                    currentRewindDataArray.append(jsonData["gameData"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindDataArray) > 20:
                        currentRewindDataArray.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????
                currentRewindData = "'SPLIT'".join(currentRewindDataArray)
            currentGame.rewindData = currentRewindData

        ################ END REWIND EVERY SAVE #######################

        if jsonData["status"] == "FINISHED":
            endGame(request, jsonData["winner"], jsonData["finalScores"], jsonData["gameID"], currentGame)

        currentGame.removeSingleRewindPermission()

        currentGame.save()

        returnResponse = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        if returnPaydayPreturns or returnFridgePreturns or returnOOBpreferences:
            playersMoveDataArr = currentGame.getOrScaffoldAllMoveData()
            compressedData = (
                base64.b64encode(
                    gzip.compress(json.dumps(playersMoveDataArr, separators=(",", ":")).encode("utf-8"))
                ).decode("utf-8"),
            )
            returnResponse.update({"sideData": compressedData})

        return JsonResponse(
            returnResponse,
            safe=False,
        )
    # END SAVE-NORM

    # NEW
    elif jsonData["action"] == "saveSimulMove":
        movedPlayers = jsonData["movedPlayers"]

        if (
            str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate)
            or jsonData["phase"] != currentGame.phase
            or jsonData["turn"] != currentGame.turn
        ):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveSimulMove - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        nameToUpdate = request.user.username
        if request.user.username in FCMsuperUsers:
            nameToUpdate = jsonData["BKSN"]
            if nameToUpdate.startswith("FCMtourneyAdmin/"):
                name_parts = nameToUpdate.split("/", 1)
                nameToUse = name_parts[1] if len(name_parts) > 1 else nameToUpdate

        phaseArr = [-1]
        if currentGame.phase == 0 or currentGame.phase == 1 or currentGame.phase == 2:
            phaseArr = [0, 1, 2]
        elif currentGame.phase == 3:
            phaseArr = [3, 4]
        elif currentGame.phase in [5, 6, 7, 8, 9, 11, 12, 15]:
            phaseArr = [5, 6, 7, 8, 9, 11, 12, 15]
        # Decompress the incoming data
        decompressedData = json.loads(
            gzip.decompress(bytearray(base64.b64decode(jsonData["moveData"]))).decode("utf-8")
        )

        currentGame.insertPlayerMoveData(nameToUpdate, phaseArr, decompressedData)

        if currentGame.phase != 0 and currentGame.phase != 1:
            currentGame.currentPlayers = currentGame.getCurrentSimulPlayers()

        if request.user.username in FCMsuperUsers:
            flexName = jsonData["BKSN"]
            if flexName.startswith("FCMtourneyAdmin/"):
                name_parts = flexName.split("/", 1)
                flexName = name_parts[1] if len(name_parts) > 1 else flexName
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                flexName,
                currentGame.kickoutDuration,
            )
        else:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                request.user.username,
                currentGame.kickoutDuration,
            )

        response = currentGame.getJsonMoveResponseV2(movedPlayers)

        currentGame.save()
        return JsonResponse(response, safe=False)

    ################### PRE TURN
    elif jsonData["action"] == "preTurn":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - preTurn: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # decompress the move data array
        preMoveArray = json.loads(gzip.decompress(bytearray(base64.b64decode(jsonData["data"]))).decode("utf-8"))

        # FIX THIS TO ALLOW NAME CHECK (or just don't do pre turns with FCMtA)
        currentGame.insertPlayerMoveData(request.user.username, [5, 6, 7, 8, 9, 11, 12, 15], preMoveArray)

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    ################### END PRE TURN

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(request.user.username)
        currentGame.save()
        # Otherwise, resigned from restruc, so delete move data, allow everyone to move, generate latest update, send notifications

        # Delete move data
        currentGame.clearAllMoveDataV2()

        # Add all players into currentPlayers
        currentGame.addAllPlayersToCurrentPlayers()

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()

        # DOES A SAVE DATA, SO NO NEED THIS

        # playerListToNotify = currentGame.currentPlayers
        # if request.user.username in playerListToNotify:
        #    playerListToNotify.remove(request.user.username)
        # if len(playerListToNotify) > 0:
        #    sendNextTurnNotification(
        #        request, playerListToNotify, currentGame.id)

        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

        # use this return only to wipe data if resigining during work day and there is payday skip data
        # not used for anything else yet.

    elif jsonData["action"] == "saveAfterKickout":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveAfterKickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        # Clears data and saves record
        currentGame.clearAllMoveDataV2()

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # WHY WAS THIS COMMENTED OUT????
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.save()

        # Send notification s
        if not jsonData["noNotification"]:
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "FcmBot"
                and jsonData["nextPlayer"] != "FcmAI"
                and not jsonData["phase"] == 10
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "FCM",
                        playerListToNotify,
                        jsonData["gameID"],
                        currentGame.getGameName(),
                        currentGame,
                        oldVer,
                    )
            # time.sleep(5)

        # End Game
        if jsonData["phase"] == 10:
            endGame(request, jsonData["winner"], jsonData["finalScores"], jsonData["gameID"], currentGame)

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        currentGame.clearAllMoveDataV2()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        # If working day, clear move data now, to get rid of pre-prepared SALARY phase
        if jsonData["phase"] == 5:
            currentGame.clearAllMoveDataV2()
        currentRewindData = currentGame.rewindData
        if len(currentRewindData) == 0:
            return JsonResponse(
                {
                    "message": "<b>"
                    + gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")
                    + " </b>"
                },
                safe=False,
            )

        allowAnyRewind = False
        if "latency" in jsonData and jsonData["latency"] == 20:
            allowAnyRewind = True

        if (
            not allowAnyRewind
            and not currentGame.getRewindHostPossible()
            and request.user.username not in FCMsuperUsers
        ):
            return JsonResponse(
                {"message": "<b>" + gettext("Permissions missing. Please reload the page and check again") + "</b>"},
                safe=False,
            )

        currentRewindDataArray = currentRewindData.split("'SPLIT'")
        # If there is any move data, simply clear it out and go back to the game
        if currentGame.hasAnyPlayerMovedThisPhase(currentGame.phase):
            # This saves it anyway
            currentGame.clearAllMoveDataV2()
            rewindHostPossible = currentGame.getRewindHostPossible()
            # add all players back into currentPlayers
            currentGame.addAllPlayersToCurrentPlayers()

            if currentGame.rewindTempData != "":
                loadData = currentGame.rewindTempData
            else:
                # loadData = currentRewindDataArray[-1]
                loadData = currentRewindDataArray.pop()

            ####################################
            # But this load data needs to be moved to temp
            currentGame.rewindData = "'SPLIT'".join(currentRewindDataArray)

            ####################################

            newVer = (int(currentGame.latestUpdate) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
            currentGame.save()

            return JsonResponse(
                {
                    "loadData": loadData,
                    "rewindHostPossible": rewindHostPossible,
                    "latestUpdate": currentGame.latestUpdate,
                    "missingPlayers": currentGame.getMissingPlayersNamesArray(),
                },
                safe=False,
            )

        # ELSE if there is not any current move data
        loadData = ""
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = "'SPLIT'".join(currentRewindDataArray)

        if jsonData["RSRP"] and currentGame.rewindConsent != "":
            currentGame.removeSingleRewindPermission()
        currentGame.clearAllMoveDataV2()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        rewindHostPossible = currentGame.getRewindHostPossible()

        return JsonResponse(
            {
                "loadData": loadData,
                "rewindHostPossible": rewindHostPossible,
                # "latestUpdate": str(int(time.time())*1000),
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": currentGame.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "FcmBot" and jsonData["nextPlayer"] != "FcmAI":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    currentGame.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "adminKickout":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM adminKickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # _missingPlayer = User.objects.get(username=jsonData["usernameToKick"])
        # currentGame.missingPlayers.add(_missingPlayer)
        # currentGame.kickedPlayers.add(_missingPlayer)
        # currentGame.checkForHostChange(_missingPlayer)
        # currentGame.enableStatsExclude(_missingPlayer.username)
        #
        # currentGame.save()

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)

        # Add FCM tourney admin player
        currentGame.allPlayers.add(User.objects.get(username="FCMtourneyAdmin"))

        # Change host to FCM tourney admin
        currentGame.host = User.objects.get(username="FCMtourneyAdmin")

        # currentGame.currentPlayers = jsonData["nextPlayer"]

        # Delete Rewind Data
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.clearAllMoveDataV2()

        currentGame.save()
        response_data = {
            "result": 2,
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

        # return JsonResponse({"result": 2,
        #                     }, safe=False)

    elif jsonData["action"] == "simpleSave":
        currentGame.gameData = jsonData["data"]
        currentGame.save()
        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    elif jsonData["action"] == "saveAndUpdateNotifictions":
        currentGame.gameData = jsonData["data"]
        referringPhase = jsonData["referringPhase"]

        # Send Notifications - and remove pre-data for players with illegal moves
        playerIndexesToNotify = jsonData["playerIndexesToNotify"]
        playerNames = currentGame.getAllPlayersOrderedySeat(False, True)
        playerListToNotify = []
        for playerIndex in playerIndexesToNotify:
            playerListToNotify.append(playerNames[playerIndex])
        for playerName in playerListToNotify:
            currentGame.insertPlayerMoveData(playerName, [-1], [])

        # Add players to currentPlayers
        currentPlayersArr = currentGame.currentPlayers.split(",")
        for player in playerListToNotify:
            if player not in currentPlayersArr:
                currentPlayersArr.append(player)

        currentGame.currentPlayers = ",".join(currentPlayersArr)

        currentGame.save()

        if request.user.username in playerListToNotify:
            playerListToNotify.remove(request.user.username)

        # SAVE UPDATE NOTIFICATION
        for player in playerListToNotify:
            ppov = currentGame.seatPosition(player)
            playerNotificationSuppression = currentGame.notificationSuppression[ppov : ppov + 1]
            if playerNotificationSuppression == "1":
                playerListToNotify.remove(player)
                currentGame.notificationSuppression = (
                    currentGame.notificationSuppression[:ppov] + "0" + currentGame.notificationSuppression[ppov + 1 :]
                )

        if len(playerListToNotify) > 0:
            SN_sendNextTurnNotification(
                request,
                "FCM",
                playerListToNotify,
                jsonData["gameID"],
                currentGame.getGameName(),
                currentGame,
                currentGame.latestUpdate,
            )

        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    print("***************************************************************************************************** ERROR")
    print(jsonData["action"])
    print(currentGame.gameName)
    print(getattr(currentGame, "id"))
    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = FCM_Game.objects.get(id=gameID)
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "FCM",
        gameID,
        gameData,
        bugDescription,
        currentGame.rewindData,
        currentGame.startingMap + "   Options: " + currentGame.startingOptions,
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = FCM_Game.objects.get(id=game_id)

        currentChatData = []
        base64_data = currentGame.chatData if currentGame.chatData else ""
        if len(base64_data) > 0:
            compressed_data = base64.b64decode(base64_data)
            unzipped = gzip.decompress(compressed_data).decode("utf-8")
            currentChatData = json.loads(unzipped)
        currentChatData.insert(0, new_entry)

        json_string = json.dumps(currentChatData, separators=(",", ":"))
        compressed_data = gzip.compress(json_string.encode("utf-8"))
        compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        currentGame.playersWithChatNotification.set(currentGame.allPlayers.exclude(username=request.user.username))

        # currentGame.save(update_fields=["chatData", "playersWithChatNotification"])
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.seatPosition(request.user.username) == 0:
        currentGame.player0notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 1:
        currentGame.player1notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 2:
        currentGame.player2notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 3:
        currentGame.player3notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 4:
        currentGame.player4notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 5:
        currentGame.player5notes = jsonData["note"]
    currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required
def changeAssistance(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "assistance":
        try:
            profile = Profile.objects.get(user=request.user)
            profile.showAssistance = jsonData["changeAssistance"]
            profile.save()
        except Exception:
            print(
                "**************************************************** CHANGE ASSISTANCE ERROR:  "
                + request.user.username
            )
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    elif jsonData["action"] == "zoom":
        try:
            currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
        except FCM_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        if len(currentGame.zoomLevels) < 3 * currentGame.maxPlayers:
            currentGame.zoomLevels = "200" * currentGame.maxPlayers
        currentGame.zoomLevels = (
            currentGame.zoomLevels[: jsonData["playerNumber"] * 3]
            + jsonData["zoomLevel"]
            + currentGame.zoomLevels[jsonData["playerNumber"] * 3 + 3 :]
        )
        if jsonData["allPlayers"]:
            currentGame.zoomLevels = jsonData["zoomLevel"] * 2
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required
def processRewindConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    if currentGame.rewindConsent == "":
        currentGame.setupRewindConsent()
    # Set current person to 1 pr 2.
    seatToChange = jsonData["playerNumber"]
    rewindConsentList = list(currentGame.rewindConsent)
    rewindConsentList[seatToChange] = jsonData["consentLevel"]
    rewindConsentString = "".join(rewindConsentList)
    currentGame.rewindConsent = rewindConsentString
    currentGame.save()
    return JsonResponse(
        {
            "newPermission": jsonData["consentLevel"],
        }
    )


@login_required
def processStatsExcludeConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    currentGame.enableStatsExclude(request.user.username)
    return JsonResponse({"statsExcludedGame": currentGame.statsExcludedGame})


@login_required()
def gameAdmin(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    return render(request, "FCM/gameAdmin.html", {"gameID": 21, "settingsDEBUG": settings.DEBUG})


@login_required()
def gameAdminGetMoveData(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        return render(request, "FCM/gameAdmin.html", {"gameID": 21})

    names = currentGame.getAllPlayersOrderedySeat(True)

    playersMoveDataArr = json.loads(currentGame.playersMoveData)

    allMoveData = []
    for row in playersMoveDataArr:
        if 3 in row[1]:
            allMoveData.append([row[3], row[0]])

    return JsonResponse({"allMoveData": allMoveData})


@login_required
def FCMdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    USE_NEW_CODE = False
    if int(currentGame.created) > 1744974000000:
        USE_NEW_CODE = True

    # if dataType == 1:
    # Send game data
    #    return JsonResponse({"gameData": currentGame.gameData,
    #                        "secondsToNextKickout": currentGame.getSecondsToNextKickout()} )
    if dataType == 2:
        # Remove user from notifications
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()
        return JsonResponse(
            {
                "chatData": currentGame.chatData
                # }, safe=False)
            },
            safe=True,
        )

    # Check for update comparison, and update or do nothing
    if dataType == 3:
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        specialData = False

        # Use to stop actions showing when there's already move Data
        if currentGame.hasValidActualMoveData(request.user.username):
            specialData = True
        return JsonResponse(
            {
                "latest": False,
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": currentGame.getCurrentPlayersArray(),
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "specialData": specialData,
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def voteToDelete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _voteToDelete(request)


@login_required
def _voteToDelete(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = FCM_Game.objects.get(id=jsonData["gameID"])
    except FCM_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    # player = request.user  # Assuming the logged-in user is voting
    playerName = request.user.username  # Get the player's username

    success = currentGame.addDeleteVote(playerName)  # Pass playerName to addDeleteVote

    if success:
        # Check if all players have voted to delete
        all_voted = True
        delete_votes_data = currentGame.getDeleteVotesData()
        missingPlayers = currentGame.getMissingPlayersNamesArray()
        for player, vote in delete_votes_data.items():
            if not vote and player not in missingPlayers:
                all_voted = False
                break

        if all_voted:
            # Delete the game
            currentGame.delete()
            # Add a success message
            messages.success(request, gettext("Game successfully deleted"))
            # Redirect to the index page
            return JsonResponse(
                {
                    "voteChanged": True,
                    "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
                    "redirect_url": reverse("index"),
                }
            )

        return JsonResponse(
            {
                "voteChanged": True,
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
            },
            safe=False,
        )

    return JsonResponse({"voteChanged": False})
