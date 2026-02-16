import json
import time
import base64
import gzip

from decouple import config
from typing import TYPE_CHECKING, cast

from contextlib import contextmanager

from django.contrib import messages
from django.conf import settings

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render, get_object_or_404, redirect
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.db import transaction, connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow


from .models import RNB_Game
from .common import create_rnb_game

from Lobby.models import User, Profile, Game

from Lobby.sharedFunctions.constants import DELETE_VOTE_TOPIC, STATS_EXCLUDE_VOTE_TOPIC

RNB_DB_LOCK_NAME = "lockRNBgame_"

ALLOWED_USERS_RNB = [
        "admin",
        "DodgerB",
        "durendal",
        "Benkyo",
        "vraid",
        "JoshuaAcosta",
        "massibull",
        "phil",
        "timmymayes",
        "SaintJason",
        "h",
]

if TYPE_CHECKING:
    from Lobby.presenters import RnbPresenter 

def index(request):
    return HttpResponse("Hello, world. You're at RNB")

def RNBhelp(request):
    return render(request, "RNB/RNBhelp.html")

def createRNBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_rnb_game(request)

def showRNBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    #ALLOWED_USERS = ["admin", "ha.steven", "massibull", "durendal", 'DodgerB', 'BotKickStarter','Rastko','Benkyo', 'vraid', "F1087", "krieg90", "gdc", "enavico", 'PhasingPlayer']
    #["admin", "ha.steven", "Kawlos", "Jasonbartfast", "Batch", "Juni", "TDUBZ", "BigBad", "massibull", "durendal", 'DodgerB', 'BotKickStarter', '33', 'Rastko', 'Burmer', 'phil', 'Benkyo', 'Steveth', "F1087", "krieg90", "gdc"]
    #                 #'looogic', 'Burmer',
    #                 #'pgh_gamer', , 'huddyrx', 'user1', 'craggybackhand', 'Strange8ractor', ]
    ##print("******************************************************************************************************** IND ACCESS: =================================================:  " + request.user.username)
    #ALLOWED_USERS = ['admin', 'DodgerB', 'durendal', 'Benkyo', 'vraid', 'JoshuaAcosta', "massibull", "phil", "timmymayes", "SaintJason"]
    
    if request.user.username not in ALLOWED_USERS_RNB:
        return redirect('index')
 
    try:
        currentGame = (
            Game.objects.select_related("host", "creator")
            .prefetch_related(
                "players__player", "invitedPlayers"
            )
            .get(id=game_id, gameCode='RNB')
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    presenter = cast('RnbPresenter', currentGame.presenter())

    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {gp.player.id for gp in currentGame.players.all() if gp.player}
    userObj = request.user
    username = userObj.username

    # No2 it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = presenter.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = (
        json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    )
    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )

    allPlayerListBySeat = presenter.getAllPlayersOrderedySeat(False, False)

    # Logged out
    returnData = {
        "gameID": gameID,
        "pov": -99,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 24,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "allPlayerListBySeat": json.dumps(allPlayerListBySeat),
        "currentPlayers": presenter.getCurrentPlayers(),
        #"preferredAQYoptions": [-1, 1, 0, 0, 1, 1, 0],
        "statsExcludeVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                STATS_EXCLUDE_VOTE_TOPIC, presenter.getAllPlayersOrderedySeat(True), False
            )
        ),
        "deleteVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                DELETE_VOTE_TOPIC, presenter.getAllPlayersOrderedySeat(True), False
            )
        ),
        "settingsDebug": config("RNB_USE_SOURCE_CODE", default=False, cast=bool),
    }

    if not request.user.is_authenticated:
        return render(request, "RNB/showRNBgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)

    # Get user game player object
    user_gp = currentGame.players.filter(player=userObj).first()

    is_in_all = user_gp is not None
    is_missing = user_gp.is_missing if user_gp else False
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code=RNB"

    #preferredAQYoptions = (
    #    json.loads(user_profile.preferredAQYoptions)
    #    if user_profile.preferredAQYoptions != ""
    #    else [-1, 1, 0, 0, 1, 1, 0]
    #)

    # preferredAQYoptions
    # colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes,showPollutionUnderRes, housesInNumberOrder

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    returnData.update(
        {
            "name": username,
            "pov": -9,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            #"preferredAQYoptions": preferredAQYoptions,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "RNB/showRNBgame.html", returnData)

    pov = presenter.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(username)

    ## Get the Notes for the user
    notes = user_gp.notes if user_gp else ""

    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    move = presenter.getMoveData(username)
    trade = currentGame.playerTradeData

    ## Involved Player
    returnData.update(
        {
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "yourTurnAudioType": liveNotification,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "move": move,
            "trade": trade,
        }
    )

    ## pre move
    #if (
    #    currentGame.phase == 4
    #    or currentGame.phase == 5
    #    or currentGame.phase == 6
    #    or currentGame.phase == 7
    #    or currentGame.phase == 8
    #    or currentGame.phase == 9
    #):
    #    if presenter.getMoveDataTime(username) == "PRE_MOVE":
    #        returnData.update({"preMove": presenter.getMoveData(username)})

    # TODO: also send any current player pre moves in case action failed.

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
            notes = ""
        # allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())
        if currentGame.startingMap != "":
            returnData.update({"startingMap": json.loads(currentGame.startingMap)})

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                # "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "RNB/showRNBgame.html", returnData)



#@login_required()
#def bugEntry(request):
#    if request.method != "POST":
#        return JsonResponse({"error": "POST request required."}, status=400)
#
#    jsonData = json.loads(request.body)
#    gameID = jsonData["gameID"]
#
#    #try:
#    #    currentGame = RNB_Game.objects.get(id=gameID)
#    #except RNB_Game.DoesNotExist:
#    #    raise Http404(gettext("Game does not exist"))
#
#    gameData = jsonData["gameData"]
#    bugDescription = jsonData["description"]
#
#    #extraInfo = "Options: " + currentGame.startingOptions
#    extraInfo = ""
#
#    # email data to myself
#    SN_sendBugReportEmail(
#        request,
#        "RNB",
#        gameID,
#        gameData,
#        bugDescription,
#        #currentGame.rewindData, 
#        "",
#        extraInfo,
#    )
#
#    return JsonResponse({"bugEntrySuccess": True})


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = RNB_DB_LOCK_NAME + name
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
            print("ERROR-RNB: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(
                    f"ERROR-RNB: Failed to release lock {mutex_name}: {e}"
                )  # Log error


def processRNBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _processRNBturn(request)


@login_required()
def _processRNBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode='RNB')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('RnbPresenter', currentGame.presenter())

    if jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join(presenter.getCurrentPlayersArray())
            message = (
                f"SYNC ERROR IN: RNB simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        response_data = {
            "completed": True,
            # "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "saveGame":
        db_latest_update = currentGame.latestUpdate
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(db_latest_update):
            print(
                f"Sync Error: {latest_update} != {db_latest_update} Game: RNB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        currentGame.gameData = jsonData["gameData"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        check_name = jsonData.get("checkName", request.user.username)
        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            db_latest_update,
            int(time.time()) * 1000,
            check_name,
            currentGame.kickoutDuration,
        )
        oldVer = db_latest_update
        newVer = (int(db_latest_update) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        presenter.setCurrentPlayers(jsonData["nextPlayer"])

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Only notify if game still running
        else:
            # Send Notifications
            loadedStartingOptions = (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            )
            current_players = presenter.getCurrentPlayersArray()
            if (
                len(current_players) > 0
                and not any(p.startswith("RnbBot") for p in current_players)
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [
                    player.strip() for player in current_players
                ]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "RNB",
                        playerListToNotify,
                        getattr(currentGame, "id"),
                        presenter.getGameName(),
                        currentGame,
                        oldVer,
                    )

        ################ REWIND EVERY SAVE #######################

        if jsonData["saveRewind"]:
            currentRewindData = []
            # Need this as intially it is totally empty
            if currentGame.rewindData != "":
                currentRewindData = json.loads(currentGame.rewindData)
            # currentRewindDataArray = currentRewindData.split("'SPLIT'")

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if len(currentRewindData) == 0 or (
                    currentRewindData[-1] != currentGame.rewindTempData
                    and jsonData["gameData"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData.append(json.loads(currentGame.rewindTempData))
                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if not currentRewindData:
                currentRewindData.append([jsonData["gameData"]])
            else:
                # else check last one isn't same as current, and if not then add
                if currentRewindData[-1][0] != jsonData["gameData"]:
                    currentRewindData.append([jsonData["gameData"]])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        # time.sleep(10)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "saveEndGame":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and str(latest_update) != str(
            currentGame.latestUpdate
        ):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        presenter.endGame(
            request,
            jsonData["winner"],
            jsonData["finalPositions"],
            jsonData["gameID"],
        )

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE END GAME

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        # currentGame.enableStatsExclude(request.user.username)

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, loadRewind -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        if len(currentGame.rewindData) == 0:
            return JsonResponse(
                {
                    "errorMessage": gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                },
                safe=False,
            )

        currentRewindDataArray = json.loads(currentGame.rewindData)

        if len(currentRewindDataArray) == 0:
            return JsonResponse(
                {
                    "errorMessage": gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                },
                safe=False,
            )

        loadDataArr = []
        if len(currentRewindDataArray) > 0:
            loadDataArr = currentRewindDataArray.pop()

        while (
            len(loadDataArr) > 0
            and loadDataArr[0] == currentGame.gameData
            and len(currentRewindDataArray) > 0
        ):
            loadDataArr = currentRewindDataArray.pop()

        currentGame.gameData = loadDataArr[0]

        currentGame.rewindTempData = json.dumps(loadDataArr)
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        # currentGame.actionRewindAlterConsent()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # rewindHostPossible = currentGame.getRewindHostPossible()

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadDataArr[0],
                # "rewindHostPossible": rewindHostPossible,
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
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        next_players = jsonData["nextPlayer"].split(",")
        if (
            jsonData["nextPlayer"] != ""
            and not any(p.startswith("RnbBot") for p in next_players)
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = next_players
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "RNB",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    presenter.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(latest_update) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, kickout -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        # currentGame.enableStatsExclude(_missingPlayer.username)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                # "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content

@login_required()
def sendChatMessageRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _sendChatMessageRNB(request)



@login_required()
def _sendChatMessageRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = Game.objects.get(id=game_id, gameCode="RNB")

        currentChatData = []
        base64_data = currentGame.chatData if currentGame.chatData else ""
        if len(base64_data) > 0:
            compressed_data = base64.b64decode(base64_data)
            unzipped = gzip.decompress(compressed_data).decode("utf-8")
            currentChatData = json.loads(unzipped)
        currentChatData.insert(0, new_entry)

        json_string = json.dumps(currentChatData)
        compressed_data = gzip.compress(json_string.encode("utf-8"))
        compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user     
        currentGame.presenter().addChatNotifications(currentGame.presenter().getAllPlayersOrderedySeat(False, True))
        currentGame.presenter().removeChatNotification(request.user)
        
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content



@login_required()
def bugEntryRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode='RNB')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    extraInfo = "Options: " + currentGame.startingOptions

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "RNB",
        gameID,
        gameData,
        bugDescription,
        currentGame.rewindData,
        extraInfo,
    )

    return JsonResponse({"bugEntrySuccess": True})

@login_required()
def saveNotesRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]
    try:
        currentGame = Game.objects.get(id=game_id, gameCode='RNB')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # This directly saves the notes
    currentGame.players.filter(player=request.user).update(notes=notes)

    return JsonResponse({"notePosted": True})

@login_required
def saveZoomRNB(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="RNB")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        zoomLevels = json.loads(currentGame.zoomLevels)

        if jsonData.get("allPlayers"):
            for i in range(len(zoomLevels)):
                zoomLevels[i] = int(jsonData["zoomLevel"])
        else:
            zoomLevels[jsonData["playerNumber"]] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def RNBdata(request, dataType=1):
    if not request.user.is_authenticated:
        # User is not logged in, redirect to login page
        return redirect(reverse("myLogin"))

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='RNB')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('RnbPresenter', currentGame.presenter())

    if dataType == 1:
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
        }
        # Send game data
        return JsonResponse(returnData)
    elif dataType == 2:
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
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    return HttpResponse(status=204)  # No Content

