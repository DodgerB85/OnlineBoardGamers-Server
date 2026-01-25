import json
import time

# import lzstring
import base64
import gzip

from contextlib import contextmanager

from django.contrib import messages
from django.conf import settings
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.db import connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)

from .common import create_aqy_game

from .models import AQY_Game
from Lobby.models import User, Profile

from Lobby.sharedFunctions.constants import DELETE_VOTE_TOPIC, STATS_EXCLUDE_VOTE_TOPIC


AQYsuperUsers = ["BotKickStarter"]
AQY_DB_LOCK_NAME = "lockAQYgame_"


def index(request):
    return HttpResponse("Hello, world. You're at AQY")


def AQYhelp(request):
    return render(request, "AQY/AQYhelp.html")


@login_required
def createAQYgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_aqy_game(request)


def showAQYgame(request, game_id=1, spoilerFree=False, replayStep=1):
    try:
        currentGame = (
            AQY_Game.objects.select_related("host", "relatedTournament", "creator")
            .prefetch_related(
                "allPlayers", "missingPlayers", "playersWithChatNotification"
            )
            .get(id=game_id)
        )
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {p.id for p in currentGame.allPlayers.all()}
    userObj = request.user
    username = userObj.username

    # No2 it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = currentGame.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = (
        json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    )
    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )

    allPlayerListBySeat = currentGame.getAllPlayersOrderedySeat(False)

    # Logged out
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 16,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "allPlayerListBySeat": json.dumps(allPlayerListBySeat),
        "currentPlayers": currentGame.getCurrentPlayers(),
        "preferredAQYoptions": [-1, 1, 0, 0, 1, 1, 0],
        "statsExcludeVotesData": json.dumps(
            currentGame.tempPresenter().getFullSetOfVoteResults(
                STATS_EXCLUDE_VOTE_TOPIC, currentGame.getAllPlayersOrderedySeat(True), False
            )
        ),
        "deleteVotesData": json.dumps(
            currentGame.tempPresenter().getFullSetOfVoteResults(
                DELETE_VOTE_TOPIC, currentGame.getAllPlayersOrderedySeat(True), False
            )
        ),
        "settingsDebug": settings.DEBUG,
        # "settingsDebug": False,
    }

    if not request.user.is_authenticated:
        return render(request, "AQY/showAQYgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)
    missing_player_ids = {p.id for p in currentGame.missingPlayers.all()}
    chat_notify_ids = {p.id for p in currentGame.playersWithChatNotification.all()}

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={currentGame.getGameCode()}"

    preferredAQYoptions = (
        json.loads(user_profile.preferredAQYoptions)
        if user_profile.preferredAQYoptions != ""
        else [-1, 1, 0, 0, 1, 1, 0]
    )

    # preferredAQYoptions
    # colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes,showPollutionUnderRes, housesInNumberOrder

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if user_id in chat_notify_ids:
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            "preferredAQYoptions": preferredAQYoptions,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "AQY/showAQYgame.html", returnData)

    pov = currentGame.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = currentGame.getSecondsToNextKickout()

    kickoutRequired = currentGame.kickoutRequired()

    myMove = currentGame.isMyMove(username)

    ## Get the Notes for the user
    notes_mapping = {
        0: currentGame.player0notes,
        1: currentGame.player1notes,
        2: currentGame.player2notes,
        3: currentGame.player3notes,
    }
    notes = notes_mapping.get(pov, "")

    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    move = currentGame.getMoveData(username)
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
    if (
        currentGame.phase == 4
        or currentGame.phase == 5
        or currentGame.phase == 6
        or currentGame.phase == 7
        or currentGame.phase == 8
        or currentGame.phase == 9
    ):
        if currentGame.getMoveDataTime(username) == "PRE_MOVE":
            returnData.update({"preMove": currentGame.getMoveData(username)})

    # TODO: also send any current player pre moves in case action failed.

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
            currentGame.player0notes = ""
            notes = ""
            currentGame.save()
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

    return render(request, "AQY/showAQYgame.html", returnData)


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = AQY_DB_LOCK_NAME + name
    cursor = connection.cursor()
    # timeout returns with error
    cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
    ((got,),) = cursor.fetchall()
    if got:
        yield
        cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
        cursor.fetchall()
    else:
        # time out or can't open?
        print("ERROR-AQY: Not running, %s mutex not available" % (mutex_name))


@login_required()
def processAQYturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _processAQYturn(request)


@login_required()
def _processAQYturn(request):
    # processing a turn must be via POST

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = AQY_Game.objects.get(id=game_id)
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: Aqy save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData:
            currentGame.startingMap = json.dumps(jsonData["mapTiles"])

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        if "checkName" in jsonData:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                jsonData["checkName"],
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

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.playerTradeData = ""

        if currentGame.phase == 1 or currentGame.phase == 2:
            currentGame.deleteAllPreMoves()

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        # CHECK FOR PRE-MOVE
        preTurnDataCompressed = ""
        moveDataTime = currentGame.getMoveDataTime(jsonData["nextPlayer"])
        if moveDataTime == "PRE_MOVE":
            moveData = currentGame.getMoveData(jsonData["nextPlayer"])
            # decompress the move data
            preTurnArray = json.loads(
                gzip.decompress(bytearray(base64.b64decode(moveData))).decode("utf-8")
            )
            preTurnIndex = next(
                (
                    index
                    for index, entry in enumerate(preTurnArray)
                    if entry.get("phase") == jsonData["phase"] + 10
                ),
                None,
            )
            if preTurnIndex is not None:
                preTurnData = preTurnArray[preTurnIndex]
                preTurnDataCompressed = base64.b64encode(
                    gzip.compress(json.dumps(preTurnData).encode("utf-8"))
                ).decode("utf-8")

        if jsonData["status"] == "FINISHED":
            currentGame.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Only notify if no pre-move found
        elif preTurnDataCompressed == "":
            # Send Notifications
            loadedStartingOptions = (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            )
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "AqyBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [
                    player.strip() for player in jsonData["nextPlayer"].split(",")
                ]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "AQY",
                        playerListToNotify,
                        currentGame.id,
                        currentGame.getGameName(),
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
                    and jsonData["data"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData.append(currentGame.rewindTempData)
                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if not currentRewindData:
                currentRewindData.append(jsonData["data"])
            else:
                # else check last one isn't same as current, and if not then add
                if currentRewindData[-1] != jsonData["data"]:
                    currentRewindData.append(jsonData["data"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        # time.sleep(10)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        if preTurnDataCompressed != "":
            response_data.update({"preMove": preTurnDataCompressed})

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "sendNotification":
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.playerTradeData = ""

        # Delete pre moves for current player
        currentGame.updateSingleMove(jsonData["nextPlayer"], "", True)

        if currentGame.phase == 1 or currentGame.phase == 2:
            currentGame.deleteAllPreMoves()

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()
        # Send Notifications
        loadedStartingOptions = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "AqyBot"
            and jsonData["status"] != "FINISHED"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = [
                player.strip() for player in jsonData["nextPlayer"].split(",")
            ]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "AQY",
                    playerListToNotify,
                    currentGame.id,
                    currentGame.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    ################### PRE TURN
    elif jsonData["action"] == "preTurn":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy preTurn - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # decompress the move data array
        moveDataArray = json.loads(
            gzip.decompress(bytearray(base64.b64decode(jsonData["data"]))).decode(
                "utf-8"
            )
        )
        # add / replace the current phase move data. # recompress and save.
        currentGame.updatePreMove(
            request.user.username, jsonData["prePhase"], moveDataArray
        )

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "data": currentGame.getMoveData(request.user.username),
        }

        return JsonResponse(response_data, safe=False)

    ################### END PRE TURN

    elif jsonData["action"] == "proposeTrade":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy proposeTrade - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        opponentsPlayerIndex = jsonData["selectedOpponent"]
        yourResources = jsonData["yourResources"]
        opponentsResources = jsonData["opponentsResources"]
        yourPromise = jsonData["yourPromise"]
        opponentsPromise = jsonData["opponentsPromise"]
        BKSN = jsonData["BKSN"]
        moveData = jsonData["moveData"]

        allPlayersOrderedySeat = currentGame.getAllPlayersOrderedySeat(False)

        yourPlayerIndex = allPlayersOrderedySeat.index(BKSN)

        # You are at least both on the same version of city building initial start.
        # So first check the opponent has not ended their turn (or you, which is impossible)
        if (
            currentGame.hasMoveEndData(BKSN)
            or currentGame.hasMoveEndData(
                currentGame.getAllPlayersOrderedySeat()[opponentsPlayerIndex]
            )
            or currentGame.hasMoveEndData(
                currentGame.getAllPlayersOrderedySeat()[yourPlayerIndex]
            )
        ):
            return JsonResponse({"endMoveError": True}, safe=False)

        # Now check the trade WOULD still be valid IF your opponent has done nothing since the last fix
        # playerTradeData[0] contains a possible update to the player's data
        opponentsAvailableResources = []
        if currentGame.playerTradeData != "":
            playerTradeData = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(currentGame.playerTradeData))
                ).decode("utf-8")
            )
            if len(playerTradeData["playerCityLockedData"][opponentsPlayerIndex]) > 0:
                # This is already compressed. So need to also decompress it
                opponentData = json.loads(
                    gzip.decompress(
                        bytearray(
                            base64.b64decode(
                                playerTradeData["playerCityLockedData"][
                                    opponentsPlayerIndex
                                ]
                            )
                        )
                    ).decode("utf-8")
                )
                opponentsAvailableResources = opponentData[4]
            else:
                raw_data = json.loads(
                    gzip.decompress(
                        bytearray(base64.b64decode(currentGame.gameData))
                    ).decode("utf-8")
                )
                opponentData = raw_data[1][opponentsPlayerIndex]
                opponentsAvailableResources = opponentData[6]
        else:
            raw_data = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(currentGame.gameData))
                ).decode("utf-8")
            )
            opponentData = raw_data[1][opponentsPlayerIndex]
            opponentsAvailableResources = opponentData[6]
        for res in opponentsResources:
            opponentsAvailableResources[res] -= 1
        for i in range(len(opponentsAvailableResources)):
            if opponentsAvailableResources[i] < 0:
                return JsonResponse({"resourceError": True}, safe=False)

        # Now the resource trades are valid and both people are in the game
        # So save the trade
        playerTradeData = []
        if currentGame.playerTradeData != "":
            playerTradeData = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(currentGame.playerTradeData))
                ).decode("utf-8")
            )
        else:
            # first_entry = [[] for _ in range(currentGame.maxPlayers)]
            # playerTradeData = [first_entry, []]
            playerTradeData = {
                "playerTrades": [],
                "playerCityVersions": [0] * currentGame.maxPlayers,
                "playerCityLockedData": [[] for _ in range(currentGame.maxPlayers)],
                "playersRequiringHardReset": [],
                "tradeHistory": [],
            }

        # [youIndece, opponentIndex, yourResources, yourPromise, opponentsResources, opponentsPromise, yourMoveData]
        tradeEntry = [
            yourPlayerIndex,
            opponentsPlayerIndex,
            yourResources,
            yourPromise,
            opponentsResources,
            opponentsPromise,
            moveData,
        ]
        # playerTradeData[1].append(tradeEntry)
        playerTradeData["playerTrades"].append(tradeEntry)
        # Now convert to gzip
        currentGame.playerTradeData = base64.b64encode(
            gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
        ).decode("utf-8")

        currentGame.save()
        return JsonResponse(
            {"success": True, "playerTradeData": currentGame.playerTradeData},
            safe=False,
        )

    elif jsonData["action"] == "acceptTrade":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy acceptTrade - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        BKSN = jsonData["BKSN"]
        moveData = jsonData["moveData"]
        entry = jsonData["entry"]

        allPlayersOrderedySeat = currentGame.getAllPlayersOrderedySeat(False)

        fromPlayerIndex = entry[0]
        toPlayerIndex = entry[1]

        # You are at least both on the same version of city building initial start.
        # So first check the opponent has not ended their turn
        if (
            currentGame.hasMoveEndData(BKSN)
            or currentGame.hasMoveEndData(
                currentGame.getAllPlayersOrderedySeat()[fromPlayerIndex]
            )
            or currentGame.hasMoveEndData(
                currentGame.getAllPlayersOrderedySeat()[toPlayerIndex]
            )
        ):
            # DELETE THE TRADE
            currentGame.removePlayerTrade(entry)
            currentGame.save()
            return JsonResponse({"endMoveError": True}, safe=False)

        playerTradeData = json.loads(
            gzip.decompress(
                bytearray(base64.b64decode(currentGame.playerTradeData))
            ).decode("utf-8")
        )

        # Check trade is still valid
        if currentGame.playerTradeData == "":
            return JsonResponse({"tradeExistError": True}, safe=False)
        # Find and remove the entry from playerTradeData
        tradeFound = False
        # Find and remove the entry from playerTradeData
        for subarray in playerTradeData["playerTrades"]:
            if subarray == entry:
                tradeFound = True

        if not tradeFound:
            return JsonResponse({"tradeExistError": True}, safe=False)

        # Now check the trade IS still be valid for sender
        # playerTradeData contains a possible update to the player's data
        # The reset will occur to when they had the res. So just checked locked data
        # fromAvailableResources = []
        # if currentGame.playerTradeData != "":
        #
        #    if len(playerTradeData['playerCityLockedData'][fromPlayerIndex]) > 0:
        #        # This is already compressed. So need to also decompress it
        #        #raw_opponentData = raw_data[0][fromPlayerIndex]
        #        opponentData = json.loads(gzip.decompress(bytearray(base64.b64decode(playerTradeData['playerCityLockedData'][fromPlayerIndex]))).decode('utf-8'))
        #        fromAvailableResources = opponentData[4]
        #    else:
        #        raw_data = json.loads(gzip.decompress(bytearray(base64.b64decode(currentGame.gameData))).decode('utf-8'))
        #        opponentData = raw_data[1][fromPlayerIndex]
        #        fromAvailableResources = opponentData[6]
        # else:
        #    raw_data = json.loads(gzip.decompress(bytearray(base64.b64decode(currentGame.gameData))).decode('utf-8'))
        #    opponentData = raw_data[1][opponentsPlayerIndex]
        #    fromAvailableResources = opponentData[6]
        # if len(fromAvailableResources) > 0:
        #    for res in entry[2]:
        #        fromAvailableResources[res] -= 1
        #    for i in range(len(fromAvailableResources)):
        #        if fromAvailableResources[i] < 0:
        #            return JsonResponse({"resourceError": True}, safe=False)

        # Now the resource trades are valid and both people are in the game
        # So process the trade
        # [yourIndex, opponentIndex, yourResources, yourPromise, opponentsResources, opponentsPromise, yourMoveData]
        yourIndex = entry[0]
        opponentIndex = entry[1]
        yourMoveDataCompressed = entry[6]
        opponentsMoveDataCompressed = moveData
        yourAvailableResources = []
        opponentsAvailableResources = []

        byte_array = bytearray(base64.b64decode(yourMoveDataCompressed))
        decompressed_data = gzip.decompress(byte_array)
        decompressed_string = decompressed_data.decode("utf-8")
        yourMoveData = json.loads(decompressed_string)
        yourAvailableResources = yourMoveData[4]
        byte_array = bytearray(base64.b64decode(opponentsMoveDataCompressed))
        decompressed_data = gzip.decompress(byte_array)
        decompressed_string = decompressed_data.decode("utf-8")
        opponentsMoveData = json.loads(decompressed_string)
        opponentsAvailableResources = opponentsMoveData[4]

        # Process the resource swap
        for yourRes in entry[2]:
            yourAvailableResources[yourRes] -= 1
            opponentsAvailableResources[yourRes] += 1
        for opponentRes in entry[4]:
            opponentsAvailableResources[opponentRes] -= 1
            yourAvailableResources[opponentRes] += 1

        yourMoveData[4] = yourAvailableResources
        opponentsMoveData[4] = opponentsAvailableResources
        if entry[3][0] != "":
            promiseEntry = [opponentIndex, yourIndex, entry[3][0], entry[3][1]]
            yourMoveData[8].append(promiseEntry)
            opponentsMoveData[8].append(promiseEntry)
        if entry[5][0] != "":
            promiseEntry = [yourIndex, opponentIndex, entry[5][0], entry[5][1]]
            yourMoveData[8].append(promiseEntry)
            opponentsMoveData[8].append(promiseEntry)

        playerTradeData["playerCityLockedData"][yourIndex] = base64.b64encode(
            gzip.compress(json.dumps(yourMoveData).encode("utf-8"))
        ).decode("utf-8")
        playerTradeData["playerCityLockedData"][opponentIndex] = base64.b64encode(
            gzip.compress(json.dumps(opponentsMoveData).encode("utf-8"))
        ).decode("utf-8")

        # Remove the trade from the options
        playerTradeData["playerTrades"].remove(entry)

        # Flag the players or update
        playerTradeData["playersRequiringHardReset"].append(yourIndex)
        playerTradeData["playersRequiringHardReset"].append(opponentIndex)

        # Add a history
        gameCreationTimestamp = int(currentGame.created) / 1000
        current_time_seconds = int(time.time())
        time_difference = int(current_time_seconds - gameCreationTimestamp)
        HIST_CITY_PLAYER_TRADE = 13
        # [youIndece, opponentIndex, yourResources, yourPromise, opponentsResources, opponentsPromise, yourMoveData]
        entry3 = [
            (
                [entry[0], entry[2], entry[3]]
                if entry[3][0] != ""
                else [entry[0], entry[2]]
            ),
            (
                [entry[1], entry[4], entry[5]]
                if entry[5][0] != ""
                else [entry[1], entry[4]]
            ),
        ]
        histEntry = [HIST_CITY_PLAYER_TRADE, -1, time_difference, entry3]
        playerTradeData["tradeHistory"].append(histEntry)

        # remove all trades involving either player
        # for subarray in playerTradeData['playerTrades']:
        # playerTradeData['playerTrades'] = [subarray for subarray in playerTradeData['playerTrades'] if not (subarray[0] == yourIndex or subarray[1] == yourIndex or subarray[0] == opponentIndex or subarray[1] == opponentIndex)]    if subarray[0] == yourIndex or subarray[1] == yourIndex or subarray[0] == opponentIndex or subarray[1] == opponentIndex:
        # playerTradeData['playerTrades'] = [subarray for subarray in playerTradeData['playerTrades'] if not (subarray[0] == yourIndex or subarray[1] == yourIndex or subarray[0] == opponentIndex or subarray[1] == opponentIndex)]        playerTradeData['playerTrades'].remove(subarray)
        playerTradeData["playerTrades"] = [
            subarray
            for subarray in playerTradeData["playerTrades"]
            if not (
                subarray[0] == yourIndex
                or subarray[1] == yourIndex
                or subarray[0] == opponentIndex
                or subarray[1] == opponentIndex
            )
        ]
        # Finally, recompress ans save
        currentGame.playerTradeData = base64.b64encode(
            gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
        ).decode("utf-8")

        currentGame.save()
        return JsonResponse(
            {"success": True, "playerTradeData": currentGame.playerTradeData},
            safe=False,
        )

    elif jsonData["action"] == "rejectTrade":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy rejectTrade - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        BKSN = jsonData["BKSN"]
        entry = jsonData["entry"]

        allPlayersOrderedySeat = currentGame.getAllPlayersOrderedySeat(False)
        # yourPlayerIndex = allPlayersOrderedySeat.index(BKSN)

        currentGame.removePlayerTrade(entry)
        currentGame.save()

        return JsonResponse(
            {"success": True, "playerTradeData": currentGame.playerTradeData},
            safe=False,
        )

    elif jsonData["action"] == "markPromiseComplete":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy markPromiseComplete - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        BKSN = jsonData["BKSN"]
        # playerIndex = jsonData["idx"]
        promise = jsonData["promise"]

        # allPlayersOrderedySeat = currentGame.getAllPlayersOrderedySeat(False)
        # yourPlayerIndex = allPlayersOrderedySeat.index(BKSN)

        currentGame.markPromiseComplete(promise)
        currentGame.save()

        return JsonResponse(
            {
                "success": True,
                # "playerTradeData": currentGame.playerTradeData
            },
            safe=False,
        )

    elif jsonData["action"] == "removePlayerFromHardTradeReset":
        playerIndex = jsonData["playerIndex"]

        playerTradeData = json.loads(
            gzip.decompress(
                bytearray(base64.b64decode(currentGame.playerTradeData))
            ).decode("utf-8")
        )

        if playerIndex in playerTradeData["playersRequiringHardReset"]:
            playerTradeData["playersRequiringHardReset"].remove(playerIndex)

        currentGame.playerTradeData = base64.b64encode(
            gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
        ).decode("utf-8")

        currentGame.save()

        return JsonResponse(
            {
                "success": True,
            },
            safe=False,
        )

    elif jsonData["action"] == "saveSimulMove":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy saveSimulMove - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        if request.user.username not in AQYsuperUsers:
            currentGame.updateSingleMove(request.user.username, jsonData["moveData"])
        else:
            currentGame.updateSingleMove(jsonData["BKSN"], jsonData["moveData"])

        currentGame.currentPlayers = currentGame.getCurrentPlayers()

        if request.user.username in AQYsuperUsers:
            SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                jsonData["BKSN"],
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

        # Remove your trades
        if currentGame.playerTradeData != "":
            seat = currentGame.seatPosition(jsonData["BKSN"])
            byte_array = bytearray(base64.b64decode(currentGame.playerTradeData))
            decompressed_data = gzip.decompress(byte_array)
            decompressed_string = decompressed_data.decode("utf-8")
            playerTradeData = json.loads(decompressed_string)
            # Find and remove the entry from playerTradeData
            for subarray in playerTradeData["playerTrades"]:
                if subarray[0] == seat or subarray[1] == seat:
                    playerTradeData["playerTrades"].remove(subarray)

            json_string = json.dumps(playerTradeData)
            # Step 2: Compress the JSON string using zlib
            compressed_data = gzip.compress(json_string.encode("utf-8"))
            # Step 3: Convert the compressed data to a base64-encoded string
            base64_data = base64.b64encode(compressed_data).decode("utf-8")
            currentGame.playerTradeData = base64_data

        response = currentGame.getJsonMoveResponse()

        currentGame.save()
        return JsonResponse(response, safe=False)

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)

        # Delete move data
        currentGame.clearAllMoveData()

        # Add all players into currentPlayers OVERWRITTEN BY SAVE
        # currentGame.letAllPlayersMove()

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

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

        loadData = currentGame.gameData
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        # currentGame.actionRewindAlterConsent()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # rewindHostPossible = currentGame.getRewindHostPossible()

        # Delete move data
        currentGame.clearAllMoveData()

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                # "rewindHostPossible": rewindHostPossible,
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
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "AqyBot"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "AQY",
                    playerListToNotify,
                    currentGame.id,
                    currentGame.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: Aqy kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)

        # Clears data and saves record - DONT DELETE FAC MOVES
        # currentGame.clearAllMoveData()

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

    return HttpResponse(status=204)  # No Content


@login_required
def AQYdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = AQY_Game.objects.get(id=jsonData["gameID"])
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 1:
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            "latestUpdate": currentGame.latestUpdate,
        }
        # Check for any premoves
        if (
            currentGame.phase == 4
            or currentGame.phase == 5
            or currentGame.phase == 6
            or currentGame.phase == 7
            or currentGame.phase == 8
            or currentGame.phase == 9
        ):
            if currentGame.getMoveDataTime(request.user.username) == "PRE_MOVE":
                returnData.update(
                    {"preMove": currentGame.getMoveData(request.user.username)}
                )
        # Send game data
        return JsonResponse(returnData)
    elif dataType == 2:
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
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    # Check for update comparison, and update or do nothing
    if dataType == 4:
        # Else Send game data
        return JsonResponse(
            {
                "playerTradeData": currentGame.playerTradeData,
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = AQY_Game.objects.get(id=gameID)
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "AQY",
        gameID,
        gameData,
        bugDescription,
        currentGame.rewindData,
        currentGame.startingMap,
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

        currentGame = AQY_Game.objects.get(id=game_id)

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
        currentGame.playersWithChatNotification.set(
            currentGame.allPlayers.exclude(username=request.user.username)
        )
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]
    try:
        currentGame = AQY_Game.objects.get(id=game_id)
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    seat_position = currentGame.seatPosition(request.user.username)

    if seat_position in range(5):
        player_notes_field = f"player{seat_position}notes"
        setattr(currentGame, player_notes_field, notes)
        currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required
def saveZoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = AQY_Game.objects.get(id=jsonData["gameID"])
        except AQY_Game.DoesNotExist:
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
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _castVote(request)


@login_required
def _castVote(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = AQY_Game.objects.get(id=jsonData["gameID"])
    except AQY_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    
    # Delegate all logic to the presenter
    result = currentGame.tempPresenter().processVoteLogic(
        topic=jsonData["topic"],
        username=request.user.username,
        choice=True,
    ) 

    # If an action occurred that requires a user message, add it here
    msg = result.get("message")
    if isinstance(msg, str):  # This clarifies the type for the type checker
        messages.success(request, msg)
        
    return JsonResponse(result)
    
@login_required
def AQYstats(request):
    # Load regular stats
    with open("./AQY/AQYstats/AQY_stats.json", "r") as f:
        data = json.load(f)

    timeString = data["time_string"]

    all_data = {}
    for playerCount in ["2", "3", "4", "combined_2_3_4"]:
        player_data = data["player_counts"].get(str(playerCount))
        playerCountLabel = playerCount
        if player_data:
            all_data[playerCountLabel] = {
                "finishedGamesCount": player_data["finishedGamesCount"],
                "avg_turns_overall": player_data["avg_turns_overall"],
                "saint_stats": player_data["saint_stats"],
            }

    return render(
        request,
        "AQY/AQYstats.html",
        {
            "timeString": timeString,
            "all_data": all_data,
        },
    )


@login_required
def AQYstatGames(request):
    # Post is required
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Get the game ids
    gameIDs = json.loads(request.POST["game_ids"])

    total_games_count = len(gameIDs)
    unique_gameIDs = list(set(gameIDs))

    # gameIDs.reverse()
    unique_gameIDs.reverse()

    # Pagination settings
    page = request.POST.get("page", 1)  # Get the current page number from the request
    items_per_page = 20  # Number of games to display per page

    # Get the total count of games BEFORE slicing gameIDs
    total_games_count_unique = len(unique_gameIDs)

    # Initialize paginator and related variables outside the try block
    paginator = Paginator(unique_gameIDs, items_per_page)
    gameIDs_page = []
    num_pages = 1  # Default to 1 page if there are no games

    # Slice gameIDs for the current page
    try:
        gameIDs_page = paginator.page(
            page
        ).object_list  # Get the gameIDs for the current page
        num_pages = paginator.num_pages
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = paginator.page(1).object_list
        page = 1
        num_pages = paginator.num_pages
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = paginator.page(paginator.num_pages).object_list
        page = paginator.num_pages
        num_pages = paginator.num_pages

    # Filter the games for the current page ONLY
    finishedGames = (
        AQY_Game.objects.filter(id__in=gameIDs_page)
        .order_by("-latestUpdate")
        .select_related("creator__profile", "creator")
        .prefetch_related(
            "allPlayers",
            "missingPlayers",
            "invitedPlayers",
            "playersWithChatNotification",
        )
    )

    # Serialize ONLY the games for the current page
    finishedGamesListJson = [
        SF_fastSerializeGame(game, request.user) for game in finishedGames
    ]

    return render(
        request,
        "AQY/AQYstatGames.html",
        {
            "finishedGamesList": finishedGamesListJson,
            "page": int(page),
            "num_pages": num_pages,
            "total_games_count_unique": total_games_count_unique,  # Pass the total count to the template
            "total_games_count": total_games_count,
            "game_ids_json": request.POST["game_ids"],  # Pass the game_ids back to the
        },
    )
