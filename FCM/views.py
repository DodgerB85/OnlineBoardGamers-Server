import json
import time
import re
import base64

import gzip

from decouple import config
from typing import TYPE_CHECKING, cast

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.shortcuts import render
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required

from django.contrib import messages

from django.urls import reverse
from random import randint

from contextlib import contextmanager

from django.db import connection
from django.db.models import Q  # , Avg
from django.utils.translation import gettext  # , get_language

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)

from .common import create_fcm_game

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.sharedFunctions.constants import (
    STATS_EXCLUDE_VOTE_TOPIC,
    DELETE_VOTE_TOPIC,
    REWIND_CONSENT_VOTE_TOPIC,
)

if TYPE_CHECKING:
    from Lobby.presenters import FCMpresenter 

# import requests  # Keep this to broadcase on WSS when it is uncommented
FCMsuperUsers = ["BotKickStarter"]
USE_NEW_CODE = False

FCM_DB_LOCK_NAME = "lockFCMgame_"


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
        gameIDs_page = paginator.page(
            page
        ).object_list  # Get the gameIDs for the current page
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = Paginator(gameIDs, items_per_page).page(1).object_list
        page = 1
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = (
            Paginator(gameIDs, items_per_page)
            .page(Paginator(gameIDs, items_per_page).num_pages)
            .object_list
        )
        page = Paginator(gameIDs, items_per_page).num_pages

    # Filter the games for the current page ONLY
    # Try to find games by id first, then fall back to original_id for old game references
    finishedGames = (
        Game.objects.filter(id__in=gameIDs_page, gameCode='FCM')
        .order_by("-latestUpdate")
        .select_related("creator__profile", "creator")
        .prefetch_related(
            "players__player",
            "invitedPlayers",
        )
    )
    if not finishedGames.exists():
        finishedGames = (
            Game.objects.filter(original_id__in=gameIDs_page, gameCode='FCM')
            .order_by("-latestUpdate")
            .select_related("creator__profile", "creator")
            .prefetch_related(
                "players__player",
                "invitedPlayers",
            )
        )

    # Serialize ONLY the games for the current page
    finishedGamesListJson = [
        SF_fastSerializeGame(game, request.user) for game in finishedGames
    ]

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
    return create_fcm_game(request)


def showGame(request, game_id):
    try:
        currentGame = (
            Game.objects.select_related("host")
            .prefetch_related(
                "players__player",
                "invitedPlayers",
            )
            .get(id=game_id, gameCode='FCM')
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('FCMpresenter', currentGame.presenter())

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_player_gps = list(currentGame.players.all().select_related("player"))
    all_player_ids = {gp.player.id for gp in all_player_gps if gp.player}
    # start_time = time.time()
    user = request.user
    user_id = user.id
    # show_timestamps = user.username in ["admin", "DodgerB"]

    # def print_timestamp(label):
    #    if show_timestamps:
    #        print(f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}")

    finishedGame = False
    if currentGame.gameStatus == "FINISHED":
        finishedGame = True

    # THIS IS STILL NEEDED TO DISPLAY OLD GAMES
    USE_NEW_CODE = False
    if int(currentGame.created) > 1744974000000:
        USE_NEW_CODE = True

    if currentGame.relatedMainTournament and request.user.username == "FCMtourneyAdmin":
        FCMsuperUsers.append("FCMtourneyAdmin")

    startingOptionsHTML = SR_getFCMstartingOptionsHTML(
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )
    gameCreationTimestamp = currentGame.created

    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)

    # print_timestamp("Step 1: initial setup done")
    OOBpreference = 0
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
                "gameName": presenter.getGameName(),
                "myMove": False,
                "startingOptionsHTML": startingOptionsHTML,
                "gameCreationTimestamp": gameCreationTimestamp,
                "KickoutFlexiDataArray": KickoutFlexiDataArray,
                "USE_NEW_CODE": USE_NEW_CODE,
                "finishedGame": finishedGame,
                "startingOptionsLiteral": currentGame.startingOptions,
                "startingMap": currentGame.startingMap,
                "pov": -99,
                "statsExcludeVotesData": json.dumps(
                    presenter.getFullSetOfVoteResults(
                        STATS_EXCLUDE_VOTE_TOPIC,
                        presenter.getAllPlayersOrderedySeat(True),
                        False,
                    )
                ),
                "deleteVotesData": json.dumps(
                    presenter.getFullSetOfVoteResults(
                        DELETE_VOTE_TOPIC,
                        presenter.getAllPlayersOrderedySeat(True),
                        False,
                    )
                ),
                "preferredColour": -1,
                "settingsDebug": config(
                    "FCM_USE_SOURCE_CODE", default=False, cast=bool
                ),
                "OOBpreference": OOBpreference,
            },
        )

    # If person is logged in, may or may not be in game
    user_profile = Profile.objects.get(user=request.user)
    missing_player_ids = {gp.player.id for gp in all_player_gps if gp.player and gp.is_missing}
    chat_notify_ids = {gp.player.id for gp in all_player_gps if gp.player and gp.has_chat_notification}

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
    allPlayerListBySeat = presenter.getAllPlayersOrderedySeat()
    kickoutRequired = 0
    chatNotification = False

    myMove = False
    myZoomLevel = 200
    liveNotification = 1

    rewindPanelType = 0
    rewindHostHTML = ""
    rewindHostPossible = False
    currentRewindConsent = 0
    currentPlayers = presenter.getStringOfIsCurrentPlayers(True) # for string MUST be single comma separated only
    statsExcludedGame = currentGame.statsExcludedGame
    displayNames = ""

    # Do Chat notification separately, as could be kicked out, and so not involoved
    if is_in_all and user_id in chat_notify_ids:
        chatNotification = True
        presenter.removeChatNotification(request.user)

    # print_timestamp("Step 2: Before nextURL")

    ## Get the next URL
    nextURL = f"/nextGame?current_id={game_id}&current_code=FCM"

    # print_timestamp("Step 4: nextURL obtained")

    # If person is logged in and in the game
    if involvedPlayer:
        if currentGame.relatedMainTournament:
            tournamentGame = True
        rewindPanelType = 1
        if currentGame.host == request.user:
            rewindPanelType = 2
            rewindHostPossible = presenter.getRewindHostPossible()
            rewindHostHTML = presenter.getRewindHostHTML()

        if request.user.username in FCMsuperUsers:
            rewindPanelType = 2
            rewindHostPossible = True
            rewindHostHTML = presenter.getRewindHostHTML()

        # print_timestamp("Step 4.5: Involved player")

        pov = presenter.seatPosition(request.user.username)
        if request.user.username in FCMsuperUsers:
            involvedPlayer = True
        currentRewindConsent = presenter.getCurrentRewindConsent(
            request.user.username
        )

        preferredRestaurantColour = user_profile.preferredRestaurantColour
        liveNotification = user_profile.liveNotification

        currentMove = ""
        if presenter.hasValidActualMoveData(
            request.user.username
        ) or presenter.hasValidActualCleanupPreset(request.user.username):
            currentMove = presenter.getCompressedMoveArr(request.user.username, True)

        # print_timestamp("Step 4.6: currentMove obtained")

        # Get notes from GamePlayer
        player_gp = currentGame.players.filter(player=request.user).first()
        currentNotes = player_gp.notes if player_gp else ""

        # Check for kickout
        kickoutRequired = presenter.kickoutRequired()
        # print_timestamp("Step 4.7: currentNotes obtained")

        # Get OOBpreference
        OOBpreference = presenter.getOOBpreference(request.user.username)
        allPlayerListBySeat = presenter.getAllPlayersOrderedySeat(False, False)
        myMove = presenter.isMyMove(request.user.username)

        myZoomLevel = currentGame.zoomLevels[pov * 3 : pov * 3 + 3]
        if (
            currentGame.gameData == ""
            and "SHADOW" in presenter.getAllPlayersOrderedySeat(False, False)
        ):
            displayNames = player_gp.notes if player_gp else ""
            if player_gp:
                player_gp.notes = ""
                player_gp.save()
            currentNotes = ""

    # print_timestamp("Step 5: involvedPlayer processing done")

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
            "moveData": currentMove,
            # used for global.players AND if includes SHADOW
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentNotes": currentNotes,
            "kickoutRequired": kickoutRequired,
            "involvedPlayer": involvedPlayer,
            "gameName": presenter.getGameName(),
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
            "currentRewindConsent": currentRewindConsent,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "tournamentGame": tournamentGame,
            "highContrastBoardItems": highContrastBoardItems,
            "startingOptionsHTML": startingOptionsHTML,
            "statsExcludedGame": statsExcludedGame,
            "displayNames": displayNames,
            "nextURL": nextURL,
            "KickoutFlexiDataArray": KickoutFlexiDataArray,
            "USE_NEW_CODE": USE_NEW_CODE,
            "startingOptionsLiteral": currentGame.startingOptions,
            "startingMap": currentGame.startingMap,
            "OOBpreference": OOBpreference,
            "statsExcludeVotesData": json.dumps(
                presenter.getFullSetOfVoteResults(
                    STATS_EXCLUDE_VOTE_TOPIC,
                    presenter.getAllPlayersOrderedySeat(True),
                    False,
                )
            ),
            "deleteVotesData": json.dumps(
                presenter.getFullSetOfVoteResults(
                    DELETE_VOTE_TOPIC,
                    presenter.getAllPlayersOrderedySeat(True),
                    False,
                )
            ),
            "settingsDebug": config("FCM_USE_SOURCE_CODE", default=False, cast=bool),
        },
    )


@contextmanager
def db_mutex(gameID, timeout=10):
    mutex_name = FCM_DB_LOCK_NAME + str(gameID)
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
                print(
                    f"ERROR-FCM: Failed to release lock {mutex_name}: {e}"
                )  # Log error


# This is used for HTMX update
def checkNewData(request, game_id):
    if request.method == "GET":
        try:
            currentGame = Game.objects.get(id=game_id, gameCode='FCM')
        except Game.DoesNotExist:
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
def endGame(
    request, _winnerUsername, _finalScores, _tournamentData, _gameID, currentGame
):
    with db_mutex(str(_gameID)):
        return currentGame.presenter().endGame(
            request, _winnerUsername, _finalScores, _tournamentData, _gameID
        )


def processTurn(request):
    # time.sleep(5)
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _processTurn(request)


@login_required()
def _processTurn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('FCMpresenter', currentGame.presenter())

    if currentGame.relatedMainTournament and request.user.username == "FCMtourneyAdmin":
        FCMsuperUsers.append("FCMtourneyAdmin")

    # loads the latest game and updates latest-Update
    if jsonData["action"] == "loadNew":
        currentMove = ""
        # Use to stop actions showing when there's already move Data
        if presenter.hasValidActualMoveData(request.user.username):
            currentMove = presenter.getCompressedMoveArr(request.user.username)

        OOBpreference = presenter.getOOBpreference(request.user.username)
        return JsonResponse(
            {
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "specialData": currentMove,
                "latestUpdate": currentGame.latestUpdate,
                "startingMap": currentGame.startingMap,
                "OOBpreference": OOBpreference,
            },
            safe=False,
        )

    # Reset move data to blank
    elif (
        jsonData["action"] == "unlockRestructure"
        or jsonData["action"] == "unlockPayday"
    ):
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM unlockRestructure - gameID: {getattr(currentGame,'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # Wipe the move data
        presenter.deleteSinglePlayersMove(request.user.username)

        # Update current players
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        if request.user.username not in currentPlayersArr:
            currentPlayersArr.append(request.user.username) # This updates the list directly
            presenter.setCurrentPlayersFromArrInTurnOrder(currentPlayersArr)
        currentGame.save()
        return JsonResponse({"unlockStatus": True}, safe=False)

    # save OOB preference
    elif jsonData["action"] == "saveOOBpreference":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveOOBpreference - gameID: {getattr(currentGame,'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # Wipe the move data
        setCorrectly = presenter.setOOBpreference(request.user.username, jsonData["OOBpreference"])

        
        currentGame.save()
        return JsonResponse({"OOBsaved": setCorrectly}, safe=False)
    
    elif jsonData["action"] == "deleteMoveData":
        phase = jsonData["phase"]
        # This is the "new phase" you are just moving into
        # If moving into TO, don't clear the moves (save pre-selectiongs), EXCEPT on turn 1 when there's no pre-selection
        # If moving into cleanup, don't clear the moves
        if phase == 9 or (phase == 4 and currentGame.turn != 1):
            return JsonResponse(
                {
                    "result": 2,
                },
                safe=False,
            )
        presenter.clearAllMoveDataV2()
        currentGame.save()
        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    elif jsonData["action"] == "saveInProgressMap":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveInProgressMap - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
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

        presenter.setCurrentPlayers(jsonData["nextPlayer"])

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
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "FcmBot"
            and jsonData["nextPlayer"] != "FcmAI"
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            for player in playerListToNotify:
                ppov = presenter.seatPosition(player)
                playerNotificationSuppression = currentGame.FCMnotificationSuppression[
                    ppov : ppov + 1
                ]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.FCMnotificationSuppression = (
                        currentGame.FCMnotificationSuppression[:ppov]
                        + "0"
                        + currentGame.FCMnotificationSuppression[ppov + 1 :]
                    )

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": (
                    currentGame.startingOptions if currentGame.startingOptions else "[]"
                ),
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(
                    (
                        json.loads(currentGame.startingOptions)
                        if currentGame.startingOptions
                        else []
                    ),
                ),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "saveModuleSelection":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveModuleSelection - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
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

        presenter.setCurrentPlayers(jsonData["nextPlayer"])

        # Update module selections
        starting_options = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        starting_options.append(int(jsonData["SM"]))

        # If staying in module selection, don't save a rewind
        if currentGame.phase == 13:
            currentGame.rewindData = ""
        else:
            # You are moving into the game proper
            currentGame.rewindData = currentGame.gameData
            # Move '300' to the end
            if 300 in starting_options:
                starting_options.remove(300)
                starting_options.append(300)

        currentGame.startingOptions = json.dumps(
            starting_options, separators=(",", ":")
        )

        currentGame.save()

        # Send Notifications - MODULE SELECTION
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "FcmBot"
            and jsonData["nextPlayer"] != "FcmAI"
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            for player in playerListToNotify:
                ppov = presenter.seatPosition(player)
                playerNotificationSuppression = currentGame.FCMnotificationSuppression[
                    ppov : ppov + 1
                ]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.FCMnotificationSuppression = (
                        currentGame.FCMnotificationSuppression[:ppov]
                        + "0"
                        + currentGame.FCMnotificationSuppression[ppov + 1 :]
                    )

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": (
                    currentGame.startingOptions if currentGame.startingOptions else "[]"
                ),
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(
                    (
                        json.loads(currentGame.startingOptions)
                        if currentGame.startingOptions
                        else []
                    ),
                ),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    # NEW
    elif jsonData["action"] == "saveNormal":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveNormal - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if currentGame.gameStatus == "FINISHED":
            return JsonResponse({"syncError": True}, safe=False)

        if (
            "mapTiles" in jsonData
            and jsonData["mapTiles"]
            and currentGame.startingMap != ""
        ):
            incomingTiles = jsonData["mapTiles"]
            currentTiles = json.loads(currentGame.startingMap)
            if len(incomingTiles) != len(currentTiles):
                turn = jsonData.get(
                    "turn", "N/A"
                )  # Get the value for 'turn' or 'N/A' if not present
                phase = jsonData.get(
                    "phase", "N/A"
                )  # Get the value for 'phase' or 'N/A' if not present
                message = (
                    f"MAP TILES LENGTH OUT OF SYNC - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                    f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                    f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
                )
                SN_sendAdminErrorMessage(request, message)
                return JsonResponse({"syncError": True}, safe=False)
            for i in range(len(incomingTiles)):
                if incomingTiles[i] != currentTiles[i]:
                    turn = jsonData.get(
                        "turn", "N/A"
                    )  # Get the value for 'turn' or 'N/A' if not present
                    phase = jsonData.get(
                        "phase", "N/A"
                    )  # Get the value for 'phase' or 'N/A' if not present
                    message = (
                        f"MAP TILES CONTENT OUT OF SYNC - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - DB Tiles: {currentTiles} - IN Tiles: {incomingTiles} - JSON_LU: {jsonData['latestUpdate']} "
                        f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                        f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
                    )
                    SN_sendAdminErrorMessage(request, message)
                    return JsonResponse(
                        {"syncError": True},
                        safe=False,
                    )

        if (
            "mapTiles" in jsonData
            and jsonData["mapTiles"]
            and currentGame.startingMap == ""
        ):
            currentGame.startingMap = json.dumps(
                jsonData["mapTiles"], separators=(",", ":")
            )

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
            print(
                f" -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            print(jsonData)
            message = (
                f"******** PHASE NOT FOUND IN JSONDATA ********* - jsonData: {jsonData} - User: {request.user.username} - "
                f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
                f" -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)

        starting_options = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )

        if oldPhase == 7 and jsonData["phase"] == 7 and 101 not in starting_options:
            print(
                "*********************************************** Key 'phase'  PHASE 7 ERROR   "
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE PAYDAY (ok with kickout) ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)

        if oldPhase == 9 and jsonData["phase"] == 9 and 101 not in starting_options:
            print(
                "*********************************************** Key 'phase'  PHASE 9 ERROR   "
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE CLEANUP ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
        ###########

        starting_options = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        trainingGame = False
        if 102 in starting_options:
            trainingGame = True

        if jsonData["checksum"] or trainingGame:
            presenter.clearAllMoveDataV2()

        # If you are saving into turn order, return all players OOB preferences
        if oldPhase == 4 and jsonData["phase"] == 4 and 101 not in starting_options:
            returnOOBpreferences = True

        # If the stored game is not payday, and the new data IS payday, then we need to return payday preturns
        if oldPhase != 7 and jsonData["phase"] == 7 and 101 not in starting_options:
            returnPaydayPreturns = True
        # Same for cleanup
        if oldPhase != 9 and jsonData["phase"] == 9 and 101 not in starting_options:
            returnFridgePreturns = True

        # Remove move data at start of reatruc
        if currentGame.phase != 3 and jsonData["phase"] == 3:
            presenter.clearAllMoveDataV2()
            # Emergency check; make sure all players except bots are in currentPlayers
            missing_players = set(
                currentGame.players.filter(is_missing=True)
                .values_list("player__username", flat=True)
            )
            current_players = [
                gp.player.username
                for gp in currentGame.players.all().select_related("player")
                if gp.player and gp.player.username not in missing_players
            ]
            presenter.setCurrentPlayers(",".join(current_players))
            currentGame.save()

        # Remove move data at start of working day
        if currentGame.phase != 5 and jsonData["phase"] == 5:
            presenter.clearAllMoveDataV2()

        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.save()

        # reset notifs - SAVE NORMAL
        if jsonData["phase"] == 5 or oldPhase == 5:
            currentGame.FCMnotificationSuppression = "0" * currentGame.maxPlayers

        # If it WAS a working day save the side data (pre moves) - UNLESS it is now working day again
        # So also check you're not coming from Turn Order
        if (
            not trainingGame
            and nameToUse != ""
            and oldPhase != 4
            and jsonData["phase"] != 3
            and (jsonData["phase"] == 5 or oldPhase == 5)
        ):
            if jsonData["sideData"] and jsonData["sideData"] != "":
                preMoveArray = json.loads(
                    gzip.decompress(
                        bytearray(base64.b64decode(jsonData["sideData"]))
                    ).decode("utf-8")
                )
                # currentGame.updateWholeMoveData(nameToUse, json.dumps(preMoveArray, separators=(",", ":")))
                presenter.insertPlayerMoveData(
                    nameToUse, [5, 6, 7, 8, 9, 11, 12, 15], preMoveArray
                )

        # Use for rewind save check
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
        presenter.setCurrentPlayers(jsonData["nextPlayer"])

        # Before sending notifications, update the currentPlayers
        # If saving into phase 2/7/9, then update for simul players
        if jsonData["phase"] == 2 or jsonData["phase"] == 7 or jsonData["phase"] == 9:
            presenter.setCurrentPlayers(presenter.getCurrentSimulPlayersV2())

        # Send Notifications - payday/fridge with moves are already removd
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        if (
            len(currentPlayersArr) > 0
            and currentPlayersArr[0] != "FcmBot"
            and currentPlayersArr[0] != "FcmAI"
            and not jsonData["status"] == "FINISHED"
        ):
            playerListToNotify = currentPlayersArr
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # If you are saving into phase 4, and the next player has OOB, remove them from notifications
            if jsonData["phase"] == 4:
                if presenter.hasValidActualMoveData(jsonData["nextPlayer"]):
                    playerListToNotify.remove(jsonData["nextPlayer"])

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
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

                while (
                    loadData == currentGame.gameData and len(currentRewindDataArray) > 0
                ):
                    loadData = currentRewindDataArray.pop()

                currentGame.rewindTempData = ""
                currentGame.rewindData = "'SPLIT'".join(currentRewindDataArray)
                currentGame.save()

        if jsonData[
            "saveRewind"
        ]:  # and not jsonData["IPM"]:  # and jsonData["phase"] != 9:
            currentRewindData = currentGame.rewindData
            currentRewindDataArray = currentRewindData.split("'SPLIT'")

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if (
                    currentRewindDataArray[-1] != currentGame.rewindTempData
                    and jsonData["gameData"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData = (
                        currentRewindData + "'SPLIT'" + currentGame.rewindTempData
                    )
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
            endGame(
                request,
                jsonData["winner"],
                jsonData["finalScores"],
                jsonData["tournamentData"],
                jsonData["gameID"],
                currentGame,
            )

        presenter.removeSingleRewindPermission()

        currentGame.save()

        returnResponse = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        if returnPaydayPreturns or returnFridgePreturns or returnOOBpreferences:
            playersMoveDataArr = presenter.getOrScaffoldAllMoveData()
            compressedData = (
                base64.b64encode(
                    gzip.compress(
                        json.dumps(playersMoveDataArr, separators=(",", ":")).encode(
                            "utf-8"
                        )
                    )
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
        notRequiedPlayerNames = (
            jsonData["notRequiedPlayerNames"]
            if "notRequiedPlayerNames" in jsonData
            else []
        )
        continueFromStalledGame = (
            jsonData["continueFromStalledGame"]
            if "continueFromStalledGame" in jsonData
            else False
        )

        if (
            str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate)
            or jsonData["phase"] != currentGame.phase
            or jsonData["turn"] != currentGame.turn
        ):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveSimulMove - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if not continueFromStalledGame:
            currentGame.turn = jsonData["turn"]
            currentGame.phase = jsonData["phase"]

            nameToUpdate = request.user.username
            if request.user.username in FCMsuperUsers:
                nameToUpdate = jsonData["BKSN"]
                if nameToUpdate.startswith("FCMtourneyAdmin/"):
                    name_parts = nameToUpdate.split("/", 1)
                    nameToUse = name_parts[1] if len(name_parts) > 1 else nameToUpdate
            phaseArr = [-1]
            if (
                currentGame.phase == 0
                or currentGame.phase == 1
                or currentGame.phase == 2
            ):
                phaseArr = [0, 1, 2]
            elif currentGame.phase == 3:
                phaseArr = [3, 4]
            elif currentGame.phase in [5, 6, 7, 8, 9, 11, 12, 15]:
                phaseArr = [5, 6, 7, 8, 9, 11, 12, 15]
            # Decompress the incoming data
            decompressedData = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(jsonData["moveData"]))
                ).decode("utf-8")
            )

            presenter.insertPlayerMoveData(nameToUpdate, phaseArr, decompressedData)

            if currentGame.phase != 0 and currentGame.phase != 1:
                presenter.setCurrentPlayers(presenter.getCurrentSimulPlayers())

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

        response = presenter.getJsonMoveResponseV2(notRequiedPlayerNames)

        currentGame.save()
        return JsonResponse(response, safe=False)

    ################### PRE TURN
    elif jsonData["action"] == "preTurn":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - preTurn: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # decompress the move data array
        preMoveArray = json.loads(
            gzip.decompress(bytearray(base64.b64decode(jsonData["data"]))).decode(
                "utf-8"
            )
        )

        # FIX THIS TO ALLOW NAME CHECK (or just don't do pre turns with FCMtA)
        presenter.insertPlayerMoveData(
            request.user.username, [5, 6, 7, 8, 9, 11, 12, 15], preMoveArray
        )

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    ################### END PRE TURN

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        # Otherwise, resigned from restruc, so delete move data, allow everyone to move, generate latest update, send notifications

        # Delete move data
        presenter.clearAllMoveDataV2()

        # Add all players into currentPlayers
        presenter.addAllPlayersToCurrentPlayers()

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
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveAfterKickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        # Clears data and saves record
        presenter.clearAllMoveDataV2()

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # WHY WAS THIS COMMENTED OUT????
        presenter.setCurrentPlayers(jsonData["nextPlayer"])
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
                        presenter.getGameName(),
                        currentGame,
                        oldVer,
                    )

        # End Game
        if jsonData["phase"] == 10:
            endGame(
                request,
                jsonData["winner"],
                jsonData["finalScores"],
                jsonData["tournamentData"],
                jsonData["gameID"],
                currentGame,
            )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        presenter.clearAllMoveDataV2()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        # If working day, clear move data now, to get rid of pre-prepared SALARY phase
        if jsonData["phase"] == 5:
            presenter.clearAllMoveDataV2()
        currentRewindData = currentGame.rewindData
        if len(currentRewindData) == 0:
            return JsonResponse(
                {
                    "message": "<b>"
                    + gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                    + " </b>"
                },
                safe=False,
            )

        allowAnyRewind = False
        if "latency" in jsonData and jsonData["latency"] == 20:
            allowAnyRewind = True

        if (
            not allowAnyRewind
            and not presenter.getRewindHostPossible()
            and request.user.username not in FCMsuperUsers
        ):
            return JsonResponse(
                {
                    "message": "<b>"
                    + gettext(
                        "Permissions missing. Please reload the page and check again"
                    )
                    + "</b>"
                },
                safe=False,
            )

        currentRewindDataArray = currentRewindData.split("'SPLIT'")
        # If there is any move data, simply clear it out and go back to the game
        if presenter.hasAnyPlayerMovedThisPhase(currentGame.phase):
            # This saves it anyway
            presenter.clearAllMoveDataV2()
            rewindHostPossible = presenter.getRewindHostPossible()
            # add all players back into currentPlayers
            presenter.addAllPlayersToCurrentPlayers()

            if currentGame.rewindTempData != "":
                loadData = currentGame.rewindTempData
            else:
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
                    "missingPlayers": presenter.getMissingPlayersNamesArray(),
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

        if jsonData["RSRP"]:
            presenter.removeSingleRewindPermission()

        presenter.clearAllMoveDataV2()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        rewindHostPossible = presenter.getRewindHostPossible()

        return JsonResponse(
            {
                "loadData": loadData,
                "rewindHostPossible": rewindHostPossible,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        presenter.setCurrentPlayers(jsonData["nextPlayer"])
        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "FcmBot"
            and jsonData["nextPlayer"] != "FcmAI"
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
                    presenter.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "adminKickout":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM adminKickout - gameID: {getattr(currentGame, 'id')} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)

        # Add FCM tourney admin player
        fcm_tourney_admin = User.objects.get(username="FCMtourneyAdmin")
        GamePlayer.objects.get_or_create(
            game=currentGame, player=fcm_tourney_admin,
            defaults={'seat_order': currentGame.maxPlayers}
        )

        # Change host to FCM tourney admin
        currentGame.host = fcm_tourney_admin

        # Delete Rewind Data
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        presenter.clearAllMoveDataV2()

        currentGame.save()
        response_data = {
            "result": 2,
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

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

        starting_options = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        trainingGame = False
        if 102 in starting_options:
            trainingGame = True

        # Send Notifications - and remove pre-data for players with illegal moves
        playerIndexesToNotify = jsonData["playerIndexesToNotify"]
        playerNames = presenter.getAllPlayersOrderedySeat(False, False)
        playerListToNotify = []
        for playerIndex in playerIndexesToNotify:
            playerListToNotify.append(playerNames[playerIndex])
        for playerName in playerListToNotify:
            if not trainingGame:
                presenter.insertPlayerMoveData(playerName, [-1], [])

        # Add players to currentPlayers
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        for player in playerListToNotify:
            if player not in currentPlayersArr:
                currentPlayersArr.append(player)

        presenter.setCurrentPlayers(",".join(currentPlayersArr))

        currentGame.save()

        if request.user.username in playerListToNotify:
            playerListToNotify.remove(request.user.username)

        # SAVE UPDATE NOTIFICATION
        for player in playerListToNotify:
            ppov = presenter.seatPosition(player)
            playerNotificationSuppression = currentGame.FCMnotificationSuppression[
                ppov : ppov + 1
            ]
            if playerNotificationSuppression == "1":
                playerListToNotify.remove(player)
                currentGame.FCMnotificationSuppression = (
                    currentGame.FCMnotificationSuppression[:ppov]
                    + "0"
                    + currentGame.FCMnotificationSuppression[ppov + 1 :]
                )

        if len(playerListToNotify) > 0:
            SN_sendNextTurnNotification(
                request,
                "FCM",
                playerListToNotify,
                jsonData["gameID"],
                presenter.getGameName(),
                currentGame,
                currentGame.latestUpdate,
            )

        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    print(
        "***************************************************************************************************** ERROR"
    )
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
        currentGame = Game.objects.get(id=gameID, gameCode='FCM')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    bug_info = f"{currentGame.startingMap}   Options: {json.loads(currentGame.startingOptions) if currentGame.startingOptions else ""}"

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "FCM",
        gameID,
        gameData,
        bugDescription,
        currentGame.rewindData,
        f"{currentGame.startingMap} Options: {currentGame.startingOptions if currentGame.startingOptions else ''}",
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

        currentGame = Game.objects.get(id=game_id, gameCode='FCM')
        presenter = cast('FCMpresenter', currentGame.presenter())

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
        all_usernames = [gp.player.username for gp in currentGame.players.all().select_related("player") if gp.player and gp.player.username != request.user.username]
        presenter.addChatNotifications(all_usernames)

        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    player_gp = currentGame.players.filter(player=request.user).first()
    if player_gp:
        player_gp.notes = jsonData["note"]
        player_gp.save()

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
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
        except Game.DoesNotExist:
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


@login_required()
def gameAdmin(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    return render(
        request,
        "FCM/gameAdmin.html",
        {
            "gameID": 21,
            "settingsDEBUG": config("FCM_USE_SOURCE_CODE", default=False, cast=bool),
        },
    )


@login_required()
def gameAdminGetMoveData(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
    except Game.DoesNotExist:
        return render(request, "FCM/gameAdmin.html", {"gameID": 21})

    presenter = cast('FCMpresenter', currentGame.presenter())

    names = presenter.getAllPlayersOrderedySeat(True)

    playersMoveDataArr = json.loads(currentGame.FCMplayersMoveData) if currentGame.FCMplayersMoveData else []

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
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
    except Game.DoesNotExist:
        #raise Http404(gettext("Game does not exist"))
        raise Http404(f"Game {jsonData.get('gameID')} does not exist (Code: FCM)")

    presenter = cast('FCMpresenter', currentGame.presenter())

    USE_NEW_CODE = False
    if int(currentGame.created) > 1744974000000:
        USE_NEW_CODE = True

    # if dataType == 1:
    # Send game data
    #    return JsonResponse({"gameData": currentGame.gameData,
    #                        "secondsToNextKickout": presenter.getSecondsToNextKickout()} )
    if dataType == 2:
        # Remove user from notifications
        presenter.removeChatNotification(request.user)
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
        try:
            gameUpdate = int(jsonData["latestUpdate"])
            latestUpdate = int(currentGame.latestUpdate)
        except Exception as e:
            SN_sendAdminErrorMessage(
                request, f"ERROR IN FCMdata: gameID: {jsonData["gameID"]} Error: {e}"
            )
            # NB this might need to be changed if the above msg is getting triggered
            specialData = False

            # Use to stop actions showing when there's already move Data
            if presenter.hasValidActualMoveData(request.user.username):
                specialData = True
            return JsonResponse(
                {
                    "latest": False,
                    "loadData": currentGame.gameData,
                    # Not used at the moment, in // comment
                    "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                    "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                    "specialData": specialData,
                    "latestUpdate": currentGame.latestUpdate,
                },
                safe=False,
            )
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        specialData = False

        # Use to stop actions showing when there's already move Data
        if presenter.hasValidActualMoveData(request.user.username):
            specialData = True
        return JsonResponse(
            {
                "latest": False,
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "specialData": specialData,
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _castVote(request)


# ALTER THIS ONCE FCM IS A GENERAL GAME -- COMPARE WITH EG CNS _CASEVOTE
@login_required
def _castVote(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='FCM')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('FCMpresenter', currentGame.presenter())

    # player = request.user  # Assuming the logged-in user is voting
    playerName = request.user.username  # Get the player's username
    topic = jsonData["topic"]
    choice = jsonData["choice"]

    success = presenter.castVote(
        topic, playerName, choice
    )  # Pass playerName to addDeleteVote

    if success:
        currentGame.save()
        # Check if all players have voted to delete
        all_voted = True
        votesData = presenter.getFullSetOfVoteResults(
            topic, presenter.getAllPlayersOrderedySeat(True), False
        )

        missingPlayers = presenter.getMissingPlayersNamesArray()
        for player, vote in votesData.items():
            if not vote and player not in missingPlayers:
                all_voted = False
                break

        if all_voted:
            votesData = json.dumps(
                presenter.getFullSetOfVoteResults(
                    topic, presenter.getAllPlayersOrderedySeat(True), False
                )
            )
            # Delete the game
            if topic == DELETE_VOTE_TOPIC:
                currentGame.delete()
                # Add a success message
                messages.success(request, gettext("Game successfully deleted"))

            if topic == STATS_EXCLUDE_VOTE_TOPIC:
                currentGame.statsExcludedGame = True
                currentGame.save()
                # Add a success message
                messages.success(request, gettext("Game stats excluded"))

            # Redirect to the index page
            return JsonResponse(
                {
                    "voteChanged": True,
                    "votesData": votesData,
                    "redirect_url": reverse("index"),
                }
            )

        return JsonResponse(
            {
                "voteChanged": True,
                "votesData": json.dumps(
                    presenter.getFullSetOfVoteResults(
                        topic, presenter.getAllPlayersOrderedySeat(True), False
                    )
                ),
            },
            safe=False,
        )

    return JsonResponse({"voteChanged": False})
