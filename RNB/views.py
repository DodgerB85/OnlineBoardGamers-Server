import base64
import gzip
import json
import time
import uuid
from datetime import timedelta
from typing import TYPE_CHECKING, cast

from decouple import config

# from django.contrib import messages
# from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Max
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render  # get_object_or_404,
from django.utils import timezone
from django.utils.translation import gettext
from django_q.tasks import schedule

import Lobby.sharedFunctions.constants as rf
from Lobby.gameViewHelpers import (
    build_show_game_data,
    process_game_with_mutex,
    shared_bug_entry,
    shared_cast_vote,
    shared_save_notes,
    shared_save_zoom,
)
from Lobby.models import Game, User

# from django.urls import reverse
# from django.db.models import Q
from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
)

from . import RNBconstants as rfRNB
from .common import create_rnb_game
from .models import RNBmap, RNBMapScore

RNB_DB_LOCK_NAME = "lockRNBgame_"

if TYPE_CHECKING:
    from Lobby.presenters import RNBpresenter


def index(request):
    return HttpResponse("Hello, world. You're at RNB")


def RNBhelp(request):
    return render(request, "RNB/RNBhelp.html")


def createRNBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_rnb_game(request)


def showRNBmap(request, game_id=0):
    try:
        currentGame = Game.objects.get(id=game_id, gameCode="RNB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    settings_debug = config("RNB_USE_SOURCE_CODE", default=False, cast=bool)

    # Get map data from the game
    startingMap = json.loads(currentGame.startingMap) if currentGame.startingMap else []

    mapName = "[No Name]"
    mapDescription = "[No description]"
    playerCount = 0
    uniqueID = startingMap[-1].get("UK", -1)

    if uniqueID >= 0:
        currentMap = RNBmap.objects.get(uniqueID=uniqueID)
        mapName = currentMap.name
        mapDescription = currentMap.description
        playerCount = currentMap.playerCount

    showPlayerCountWarning = playerCount != currentGame.maxPlayers

    returnData = {
        "settingsDebug": settings_debug,
        "startingMap": startingMap,  # Pass map data directly
        "gameID": game_id,
        "gameName": currentGame.gameName if currentGame.gameName else f"RNB Game {game_id}",
        "mapName": mapName,
        "mapDescription": mapDescription,
        "playerCount": playerCount,
        "showPlayerCountWarning": showPlayerCountWarning,
    }

    return render(request, "RNB/showRNBmapPage.html", returnData)


def RNBmapEditor(request, game_id=0):
    return render(
        request,
        "RNB/RNBmapEditor.html",
        {
            "gameID": game_id,
            "settingsDebug": config("RNB_USE_SOURCE_CODE", default=False, cast=bool),
            "username": request.user.username,
        },
    )


def showRNBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "RNB",
        default_zoom=24,
        settings_debug_key="RNB_USE_SOURCE_CODE",
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("RNBpresenter", currentGame.presenter())
    user_gp = result["user_gp"]
    username = request.user.username

    returnData = {**result["base_data"]}
    # RNB uses gameDataB64 instead of gameData
    returnData["gameDataB64"] = returnData.pop("gameData")
    currentPlayersArr = []
    if currentGame.phase in rfRNB.MAIN_PHASES:
        currentPlayersArr = json.dumps(currentGame.serverCurrentPlayerNamesInTurnOrder if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 else [presenter.getAllPlayersOrderedySeatInArray(False, True)[0]])
    elif currentGame.phase in rfRNB.ALL_PHASE_CONFLICTS:
        currentPlayersArr = json.dumps(presenter.getArrayOfIsCurrentPlayers())

    startingMap = json.loads(currentGame.startingMap) if currentGame.startingMap else []

    mapName = "[No map name found]"
    mapDescription = "[No map description found]"
    uniqueID = startingMap[-1].get("UK", -1) if startingMap else -1

    if uniqueID >= 0:
        try:
            currentMap = RNBmap.objects.get(uniqueID=uniqueID)
            mapName = currentMap.name
            mapDescription = currentMap.description
        except RNBmap.DoesNotExist:
            pass

    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(False, False)),
            "currentPlayers": currentPlayersArr,
            "startingMap": startingMap,
            "mapName": mapName,
            "mapDescription": mapDescription,
            "preferredRNBoptions": [-1, 1],
        }
    )

    if not result["is_authenticated"]:
        return render(request, "RNB/showRNBgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    profile_options = getattr(result["user_profile"], "preferredRNBoptions", "") or ""
    preferredRNBoptions = json.loads(profile_options) if profile_options else [-1, 1]
    if len(preferredRNBoptions) < 2:
        preferredRNBoptions.extend([-1] * (2 - len(preferredRNBoptions)))

    # Check the default for playerAid
    if preferredRNBoptions[1] == -1:
        preferredRNBoptions[1] = 1

    returnData["preferredRNBoptions"] = preferredRNBoptions

    # RNB uses presenter.removeChatNotification + currentGame.save()
    # Also check all players including kicked for chat notifications
    all_gps_including_kicked = list(currentGame.players.select_related("player").all())
    chat_notify_ids_all = {gp.player.id for gp in all_gps_including_kicked if gp.player and gp.has_chat_notification}
    if request.user.id in chat_notify_ids_all:
        returnData["chatNotification"] = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    if not result["is_involved"]:
        return render(request, "RNB/showRNBgame.html", returnData)

    returnData.update(result["involved_data"])
    returnData.update(
        {
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(username),
            "allStackData": getAllCurrentStackMoves(currentGame),
            "trade": currentGame.playerTradeData,
        }
    )

    # returnData.strictMyMove = presenter.getStrictIsMyMove(username)

    ### NEW GAME
    if not currentGame.gameData or currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
            returnData["notes"] = ""

        returnData["displayNames"] = displayNames

    return render(request, "RNB/showRNBgame.html", returnData)


def processRNBturn(request):
    return process_game_with_mutex(request, _processRNBturn, mutex_prefix="processTurn_")


@login_required()
def _processRNBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="RNB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("RNBpresenter", currentGame.presenter())

    #    if jsonData["action"] == "simpleSave":
    #        # Check if old version is older than DB version, and if so, return
    #        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
    #            turn = jsonData.get("turn", "N/A")
    #            phase = jsonData.get("phase", "N/A")
    #            message = (
    #                f"SYNC ERROR IN: RNB simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
    #                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
    #                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
    #            )
    #            SN_sendAdminErrorMessage(message)
    #            return JsonResponse({"syncError": True}, safe=False)
    #
    #        # currentGame.gameDataBLOB = jsonData["data"]
    #        currentGame.gameData = jsonData["data"]
    #        currentGame.turn = jsonData["turn"]
    #        currentGame.phase = jsonData["phase"]
    #
    #        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
    #        # currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
    #
    #        # SAVE BEFORE NOTIFICATIONS
    #        currentGame.save()
    #
    #        response_data = {
    #            "completed": True,
    #            # "latestUpdate": currentGame.latestUpdate,
    #        }
    #
    #        return JsonResponse(response_data, safe=False)

    # el
    if jsonData["action"] == "saveGame":
        return performSaveGame(request, currentGame, jsonData)

    # END SAVE / CREATE

    elif jsonData["action"] == "saveStackMove":
        time.sleep(7)
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = f"RNB saveStackMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        nameToUse = request.user.username
        if request.user.username == "BotKickStarter":
            nameToUse = jsonData["BKSN"]

        # Remove flex time
        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            currentGame.latestUpdate,
            int(time.time()) * 1000,
            nameToUse,
            currentGame.kickoutDuration,
        )

        # First, ALWAYS add the conflict preset move
        if jsonData["conflictPresetData"] != "":
            conflictPresetMoves = PdecompressData(jsonData["conflictPresetData"])
            for conflictPresetMove in conflictPresetMoves:
                conflictPresetMove["status"] = "pending"
                PaddMoveToPlayer(currentGame, nameToUse, conflictPresetMove)

        # Next, ALWAYS add in any phase skips
        for mainPhaseSkipData in jsonData["mainPhaseSkipsData"]:
            newMoveEntry = {
                "turn": mainPhaseSkipData[0],
                "phase": mainPhaseSkipData[1],
                "actionStack": "SKIP",
                "status": "pending",
                "knownArrayLengths": jsonData["knownArrayLengths"],
                "knownFinalHistoryidx": jsonData["knownFinalHistoryidx"],
                "playerIndex": jsonData["playerIndex"],
                "expectedResPreProduction": jsonData["expectedResPreProduction"],
            }
            PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

        # Next, we can clear out old data
        PclearPastMoveData(currentGame)

        # If the client and server both agree that this person is first, then the browser will only allow valid moves
        # So it must be a valid move. So update the game with the ALREADY PROCESSED game data, and move on
        if jsonData["isCurrent"] and (currentGame.serverCurrentPlayerNamesInTurnOrder is not None and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 and currentGame.serverCurrentPlayerNamesInTurnOrder[0] == nameToUse and int(currentGame.latestUpdate) == int(jsonData["latestUpdate"])):
            # Perform most of a normal save
            db_latest_update = currentGame.latestUpdate
            latest_update = jsonData.get("latestUpdate", 0)
            game_id = currentGame.id
            presenter = cast("RNBpresenter", currentGame.presenter())

            gameDataB64 = jsonData["gameDataB64"]
            # raw_binary = base64.b64decode(gameDataStr)
            # currentGame.gameDataBLOB = raw_binary
            currentGame.gameData = gameDataB64
            currentGame.turn = jsonData["turn"]
            currentGame.phase = jsonData["phase"]

            oldVer = db_latest_update
            newVer = (int(db_latest_update) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

            # NO! This sets ALL POSSIBLE player to is_current, which triggers emails.
            presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"])
            presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

            # Set transaction lock for client-side recovery
            transaction_id = uuid.uuid4().hex
            currentGame.transactionID = transaction_id

            # SAVE BEFORE NOTIFICATIONS
            currentGame.save()

            # If the client disconnects before completing stack processing,
            # notify the waiting players after a delay so the game doesn't freeze silently.
            schedule(
                "Lobby.sharedFunctions.sharedNotifications.SN_notifyStuckRNBTransaction",
                currentGame.id,
                transaction_id,
                request.user.username,
                next_run=timezone.now() + timedelta(minutes=5),
                repeats=-1,  # Neg repeats for delete
                schedule_type="O",
            )

            ################ REWIND EVERY SAVE #######################
            # Don't save rewind if all players have moved - wait for client to process phase
            if jsonData["saveRewind"] and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
                doSaveRewind(currentGame, jsonData)

            ################ END REWIND EVERY SAVE #######################

            currentGame.save()

            # time.sleep(10)
            # print(f"servNames: {currentGame.serverCurrentPlayerNamesInTurnOrder} len: {len(currentGame.serverCurrentPlayerNamesInTurnOrder)}")

            # Now get the NEXT set of moves -- and set the next player's stack to current
            if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
                setPlayerStackToCurrent(currentGame, currentGame.serverCurrentPlayerNamesInTurnOrder[0])

            response_data = {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "savingFromStackMove": True,
                "allStackData": getAllCurrentStackMoves(currentGame),
                # "nextPhase": len(currentGame.serverCurrentPlayerNamesInTurnOrder) == 0,
                "stackCurrentPlayers": currentGame.serverCurrentPlayerNamesInTurnOrder,
                "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
                "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
                "gameDataB64": currentGame.gameData,
                "transactionID": transaction_id,
            }

            return JsonResponse(response_data, safe=False)

        # Otherwise, You are not current in BOTH server and browser.
        # But if you are the current player on the SERVER, thenn proceed for immediate processing
        # If you are current player on SERVER, the client must have missed an update
        # So return the mvoe for immediate client-side verification
        if currentGame.serverCurrentPlayerNamesInTurnOrder is not None and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 and currentGame.serverCurrentPlayerNamesInTurnOrder[0] == nameToUse and int(currentGame.latestUpdate) == int(jsonData["latestUpdate"]):
            # First save the move in case the return somehow fails
            newMoveEntry = {
                "turn": jsonData["turn"],
                "phase": jsonData["phase"],
                "actionStack": jsonData["actionStack"],
                "status": "current",
                "knownArrayLengths": jsonData["knownArrayLengths"],
                "knownFinalHistoryidx": jsonData["knownFinalHistoryidx"],
                "playerIndex": jsonData["playerIndex"],
                "expectedResPreProduction": jsonData["expectedResPreProduction"],
            }
            PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

            response_data = {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "immediateProcess": True,
                "allStackData": getAllCurrentStackMoves(currentGame),
                # "gameDataB64": base64.b64encode(currentGame.gameDataBLOB or b"").decode("utf-8")
                "gameDataB64": currentGame.gameData,
            }

            return JsonResponse(response_data, safe=False)

        # Otherwise, you are not a current player. So just return confirmation of saved-for-later
        newMoveEntry = {
            "turn": jsonData["turn"],
            "phase": jsonData["phase"],
            "actionStack": jsonData["actionStack"],
            "status": "pending",
            "knownArrayLengths": jsonData["knownArrayLengths"],
            "knownFinalHistoryidx": jsonData["knownFinalHistoryidx"],
            "playerIndex": jsonData["playerIndex"],
            "expectedResPreProduction": jsonData["expectedResPreProduction"],
        }
        PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "savedMoveForLater": True,
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
            "gameDataB64": currentGame.gameData,
        }

        return JsonResponse(response_data, safe=False)

    # End stack move

    elif jsonData["action"] == "savePrePhaseMain":
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = f"RNB saveStackMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        nameToUse = request.user.username
        if request.user.username == "BotKickStarter":
            nameToUse = jsonData["BKSN"]

        # First, ALWAYS add the conflict preset move
        if jsonData["conflictPresetData"] != "":
            conflictPresetMoves = PdecompressData(jsonData["conflictPresetData"])
            for conflictPresetMove in conflictPresetMoves:
                conflictPresetMove["status"] = "pending"
                PaddMoveToPlayer(currentGame, nameToUse, conflictPresetMove)

        # Next, ALWAYS add in any phase skips
        for mainPhaseSkipData in jsonData["mainPhaseSkipsData"]:
            newMoveEntry = {
                "turn": mainPhaseSkipData[0],
                "phase": mainPhaseSkipData[1],
                "actionStack": "SKIP",
                "status": "pending",
                "knownArrayLengths": jsonData["knownArrayLengths"],
                "knownFinalHistoryidx": jsonData["knownFinalHistoryidx"],
                "playerIndex": jsonData["playerIndex"],
                "expectedResPreProduction": jsonData["expectedResPreProduction"],
            }
            PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

        # Next, we can clear out old data
        PclearPastMoveData(currentGame)

        # Now save the preset main phase
        newMoveEntry = {
            "turn": jsonData["futureTurn"],
            "phase": jsonData["futurePhase"],
            "actionStack": jsonData["actionStack"],
            "status": "pending",
            "knownArrayLengths": jsonData["knownArrayLengths"],
            "knownFinalHistoryidx": jsonData["knownFinalHistoryidx"],
            "playerIndex": jsonData["playerIndex"],
            "expectedResPreProduction": jsonData["expectedResPreProduction"],
        }
        PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "savedMoveForLater": True,
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
            "gameDataB64": currentGame.gameData,
        }

        return JsonResponse(response_data, safe=False)
    # End savePrePhaseMain

    elif jsonData["action"] == "saveConflictMove":
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            message = f"RNB saveConflictMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        nameToUse = request.user.username
        if request.user.username == "BotKickStarter":
            nameToUse = jsonData["BKSN"]

        # Remove flex time
        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            currentGame.latestUpdate,
            int(time.time()) * 1000,
            nameToUse,
            currentGame.kickoutDuration,
        )

        # First, ALWAYS add the conflict preset move, UNLESS saving into a main phase
        if jsonData["conflictPresetData"] != "" and jsonData["phase"] not in rfRNB.MAIN_PHASES:
            conflictPresetMove = PdecompressData(jsonData["conflictPresetData"])
            conflictPresetMove["status"] = "pending"
            PaddMoveToPlayer(currentGame, nameToUse, conflictPresetMove)

        # Next, we can clear out old data
        PclearPastMoveData(currentGame)

        # If you are saving INTO a conflict decision phase, then you must NOT be calling conflict.
        # So save your move, and return all moves for immediate client-side verification
        print(f"SAVING PHASE: {savingPhase}")
        if savingPhase in rfRNB.PHASE_CONFLICT_DECISIONS:
            presenter.reduceCurrentPlayersUsingArray(jsonData["clientNextPlayerNames"])

            response_data = {
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "checkAnyRemainingConflictDecicions": True,
                "allStackData": getAllCurrentStackMoves(currentGame),
                "isCurrentPlayersArr": presenter.getArrayOfIsCurrentPlayers(),
                # "gameDataB64": base64.b64encode(currentGame.gameDataBLOB or b"").decode("utf-8")
            }
            return JsonResponse(response_data, safe=False)

        # Else if we are saving INTO a PRAYIUNG / TO phase, it is a single player single move, single next
        if savingPhase in (rfRNB.PHASE_CONFLICT_PRAYINGS + rfRNB.PHASE_CONFLICT_TURN_ORDERS):
            # Set transaction lock for client-side recovery
            transaction_id = uuid.uuid4().hex
            currentGame.transactionID = transaction_id
            # Perform most of a normal save
            # (schedule() call added after save below)
            db_latest_update = currentGame.latestUpdate
            latest_update = jsonData.get("latestUpdate", 0)
            game_id = currentGame.id
            presenter = cast("RNBpresenter", currentGame.presenter())

            gameDataB64 = jsonData["gameDataB64"]
            # raw_binary = base64.b64decode(gameDataStr)
            # currentGame.gameDataBLOB = raw_binary
            currentGame.gameData = gameDataB64
            currentGame.turn = jsonData["turn"]
            currentGame.phase = jsonData["phase"]

            oldVer = db_latest_update
            newVer = (int(db_latest_update) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

            presenter.setCurrentPlayersFromArrInTurnOrder([jsonData["nextSinglePlayerUsername"]])
            presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

            # NO NOTIFICATIONS - COULD BE MORE STACK TO PROCESS

            ################ REWIND EVERY SAVE #######################
            # Don't save rewind if all players have moved - wait for client to process phase
            if jsonData["saveRewind"]:  # and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
                doSaveRewind(currentGame, jsonData)

            ################ END REWIND EVERY SAVE #######################

            currentGame.save()

            schedule(
                "Lobby.sharedFunctions.sharedNotifications.SN_notifyStuckRNBTransaction",
                currentGame.id,
                transaction_id,
                request.user.username,
                next_run=timezone.now() + timedelta(minutes=5),
                repeats=-1,  # Neg repeats for delete
                schedule_type="O",
            )

            response_data = {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "savingFromStackMove": True,
                "allStackData": getAllCurrentStackMoves(currentGame),
                # "nextPhase": len(currentGame.serverCurrentPlayerNamesInTurnOrder) == 0,
                "isCurrentPlayersArr": presenter.getArrayOfIsCurrentPlayers(),
                "transactionID": transaction_id,
            }

            return JsonResponse(response_data, safe=False)

        # Set transaction lock for client-side recovery
        transaction_id = uuid.uuid4().hex
        currentGame.transactionID = transaction_id

        # Otherwise, you are saving INTO the start of a new main phase
        # Perform most of a normal save
        db_latest_update = currentGame.latestUpdate
        latest_update = jsonData.get("latestUpdate", 0)
        game_id = currentGame.id
        presenter = cast("RNBpresenter", currentGame.presenter())

        gameDataB64 = jsonData["gameDataB64"]
        # raw_binary = base64.b64decode(gameDataStr)
        # currentGame.gameDataBLOB = raw_binary
        currentGame.gameData = gameDataB64
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = db_latest_update
        newVer = (int(db_latest_update) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        presenter.setCurrentPlayersFromArrInTurnOrder([jsonData["nextSinglePlayerUsername"]])
        presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

        # NO NOTIFICATIONS - COULD BE MORE STACK TO PROCESS

        ################ REWIND EVERY SAVE #######################
        # Don't save rewind if all players have moved - wait for client to process phase
        if jsonData["saveRewind"]:  # and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
            doSaveRewind(currentGame, jsonData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        schedule(
            "Lobby.sharedFunctions.sharedNotifications.SN_notifyStuckRNBTransaction",
            currentGame.id,
            transaction_id,
            request.user.username,
            next_run=timezone.now() + timedelta(minutes=5),
            repeats=-1,  # Neg repeats for delete
            schedule_type="O",
        )

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "savingFromStackMove": True,
            "allStackData": getAllCurrentStackMoves(currentGame),
            # "nextPhase": len(currentGame.serverCurrentPlayerNamesInTurnOrder) == 0,
            "isCurrentPlayersArr": presenter.getArrayOfIsCurrentPlayers(),
            "transactionID": transaction_id,
        }

        return JsonResponse(response_data, safe=False)

    # End conflict move

    elif jsonData["action"] == "saveConflictPreset":
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            message = f"RNB saveConflictMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        nameToUse = request.user.username
        if request.user.username == "BotKickStarter":
            nameToUse = jsonData["BKSN"]

        conflictPresetMove = PdecompressData(jsonData["conflictPresetData"])
        conflictPresetMove["status"] = "pending"
        PaddMoveToPlayer(currentGame, nameToUse, conflictPresetMove)

        currentGame.save()

        response_data = {
            "savedConflictPreset": True,
            "gameDataB64": currentGame.gameData,
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "saveAndUpdateNotifictionsAfterStack":
        db_latest_update = currentGame.latestUpdate
        latest_update = jsonData.get("latestUpdate", 0)
        game_id = currentGame.id
        presenter = cast("RNBpresenter", currentGame.presenter())
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(db_latest_update):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Clear transaction lock (idempotent: if already cleared, just proceed)
        client_transaction_id = jsonData.get("transactionID", "")
        if currentGame.transactionID and client_transaction_id and currentGame.transactionID == client_transaction_id:
            currentGame.transactionID = ""

        gameDataB64 = jsonData["gameDataB64"]
        # raw_binary = base64.b64decode(gameDataStr)
        # currentGame.gameDataBLOB = raw_binary
        currentGame.gameData = gameDataB64
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = db_latest_update
        newVer = (int(db_latest_update) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"])
        presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

        # Next, we can clear out old data
        PclearPastMoveData(currentGame)

        # If the current player needs to fix their move, clear out their future moves
        if jsonData["currentPlayerNeedsToFixMove"]:
            PdeleteAllOtherMovesForInterferedWithPlayer(currentGame, jsonData["allRemainingPlayersInTurnOrder"][0])

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                (jsonData.get("tournamentData") if jsonData.get("tournamentData") else []),
                jsonData["gameID"],
                jsonData["winningPlayerScore"],
            )

        # Only notify if game still running
        else:
            # Send Notifications
            # Next player either needs to move OR fix a move
            loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
            allIsCurrentPlayers = jsonData["allIsCurrentPlayers"]
            if len(allIsCurrentPlayers) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
                playerListToNotify = [p for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "RnbBot"}]
                if len(playerListToNotify) > 0:
                    if jsonData["currentPlayerNeedsToFixMove"]:
                        start_time = timezone.now() + timedelta(minutes=2)
                        schedule(
                            "Lobby.sharedFunctions.sharedNotifications.SN_sendFixNextTurnNotificationWithValidation",
                            "RNB",
                            playerListToNotify[0],
                            currentGame.id,
                            presenter.getGameName(),
                            currentGame.latestUpdate,
                            currentGame.turn,
                            currentGame.phase,
                            next_run=start_time,
                            repeats=-1,  # Neg repeats for delete
                            schedule_type="O",
                        )
                    else:
                        presenter.sendYourTurnNotification(
                            "RNB",
                            playerListToNotify,
                            currentGame.id,
                            presenter.getGameName(),
                            currentGame,
                            oldVer,
                        )
            # Pending players CAN pre-move -- but DON'T notify if a premove is already set
            pendingPlayersArr = jsonData["pendingPlayersArr"]
            if len(pendingPlayersArr) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
                pendingPlayersArrToNotify = [pName.strip() for pName in pendingPlayersArr if pName.strip() not in {request.user.username, "RnbBot"} and not presenter.playerHasPreMove(pName.strip())]

                if len(pendingPlayersArrToNotify) > 0:
                    pending_key = f"{currentGame.turn}:{currentGame.phase}"
                    if currentGame.autoMoves != pending_key:
                        currentGame.autoMoves = pending_key
                        currentGame.save()
                        start_time = timezone.now() + timedelta(minutes=10) 
                        schedule(
                            "Lobby.sharedFunctions.sharedNotifications.SN_sendPendingRNBturnNotificationWithValidation",
                            "RNB",
                            pendingPlayersArrToNotify,
                            currentGame.id,
                            presenter.getGameName(),
                            currentGame.latestUpdate,
                            currentGame.turn,
                            currentGame.phase,
                            next_run=start_time,
                            repeats=-1,  # Neg repeats for delete
                            schedule_type="O",
                        )

            ################ REWIND EVERY SAVE #######################

            doSaveRewind(currentGame, jsonData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        # time.sleep(10)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "savingFromStackMove": False,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "cancelPresetMoves":
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            message = f"RNB saveConflictMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        nameToUse = request.user.username
        if request.user.username == "BotKickStarter":
            nameToUse = jsonData["BKSN"]

        presenter.cancelPreMovesForPlayer(nameToUse, jsonData["startingTurn"], jsonData["startingPhase"])

        response_data = {
            "deletedMoves": True,
            "gameDataB64": currentGame.gameData,
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        if not currentGame.rewindData or currentGame.rewindData == "[]" or len(currentGame.rewindData) == 0:
            return JsonResponse(
                {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
                safe=False,
            )

        currentRewindDataArray = json.loads(currentGame.rewindData)

        if not currentRewindDataArray or len(currentRewindDataArray) == 0:
            return JsonResponse(
                {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
                safe=False,
            )

        # Firstly, wipe all move Data
        PwipeAllMoveData(currentGame)

        loadDatab64 = currentRewindDataArray.pop() if currentRewindDataArray else ""

        # Decode the Base64 string from the rewind list into raw bytes for the BLOB field
        # load_data_bytes = base64.b64decode(loadDatab64) if loadDatab64 != "" else b""
        # db_blob_bytes = (
        #    bytes(currentGame.gameDataBLOB) if currentGame.gameDataBLOB else b""
        # )

        while (
            len(currentRewindDataArray) > 0
            # and load_data_bytes == bytes(currentGame.gameDataBLOB)
            and loadDatab64 == currentGame.gameData
        ):
            loadDatab64 = currentRewindDataArray.pop()
            # load_data_bytes = base64.b64decode(loadDatab64)

        currentGame.gameData = loadDatab64 if loadDatab64 != "" else ""

        # currentGame.rewindTempData = json.dumps(loadDataArr)
        currentGame.rewindTempData = loadDatab64
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        # currentGame.actionRewindAlterConsent()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # rewindHostPossible = currentGame.getRewindHostPossible()

        currentGame.save()

        return JsonResponse(
            {
                "gameDataB64": loadDatab64,
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
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"])
        presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

        gameDataB64 = jsonData["gameDataB64"]
        # raw_binary = base64.b64decode(gameDataStr)
        # currentGame.gameDataBLOB = raw_binary
        currentGame.gameData = gameDataB64

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        nextPlayersArr = jsonData["allIsCurrentPlayers"]
        if len(nextPlayersArr) > 0 and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [p.strip() for p in nextPlayersArr if p.strip() not in {request.user.username, "RnbBot"}]

            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "RNB",
                    playerListToNotify,
                    currentGame.id,
                    presenter.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        pendingPlayersArr = jsonData["pendingPlayersArr"]
        if len(pendingPlayersArr) > 0 and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [p.strip() for p in pendingPlayersArr if p.strip() not in {request.user.username, "RnbBot"}]

            if len(playerListToNotify) > 0:
                pending_key = f"{currentGame.turn}:{currentGame.phase}"
                if currentGame.autoMoves != pending_key:
                    currentGame.autoMoves = pending_key
                    currentGame.save()
                    start_time = timezone.now() + timedelta(minutes=10)
                    schedule(
                        "Lobby.sharedFunctions.sharedNotifications.SN_sendPendingRNBturnNotificationWithValidation",
                        "RNB",
                        playerListToNotify,
                        currentGame.id,
                        presenter.getGameName(),
                        currentGame.latestUpdate,
                        currentGame.turn,
                        currentGame.phase,
                        next_run=start_time,
                        repeats=-1,  # Neg repeats for delete
                        schedule_type="O",
                    )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(latest_update) != str(currentGame.latestUpdate):  # and not jsonData["ignoreSync"]:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

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


def doSaveRewind(currentGame, jsonData):
    # Need this as intially it is totally empty
    # 1. Load existing history (safely handle empty string)
    currentRewindData = []
    if currentGame.rewindData:
        try:
            currentRewindData = json.loads(currentGame.rewindData)
        except json.JSONDecodeError:
            currentRewindData = []

    # 2. Prepare the new point (The B64 string from JS)
    new_b64_point = jsonData["gameDataB64"]

    # 3. Handle Temp Data (ensure it's also a B64 string)
    if currentGame.rewindTempData:
        # If temp exists and is different from last save, add it
        if not currentRewindData or currentRewindData[-1] != currentGame.rewindTempData:
            currentRewindData.append(currentGame.rewindTempData)
        currentGame.rewindTempData = ""  # Reset temp storage

    # 4. Add the current save to history if it's different from the last point
    # We store it as a nested list [b64_string] to match your existing structure
    if not currentRewindData or currentRewindData[-1] != new_b64_point:
        currentRewindData.append(new_b64_point)

        # 5. Maintain the 20-point limit
        if len(currentRewindData) > 20:
            currentRewindData = currentRewindData[-20:]

    currentGame.rewindData = json.dumps(currentRewindData)


def performSaveGame(request, currentGame, jsonData):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)
    game_id = currentGame.id
    presenter = cast("RNBpresenter", currentGame.presenter())
    # Check if old version is older than DB version, and if so, return
    if str(latest_update) != str(db_latest_update):
        turn = jsonData.get("turn", "N/A")
        phase = jsonData.get("phase", "N/A")
        message = (
            f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
        )
        SN_sendAdminErrorMessage(message)
        return JsonResponse({"syncError": True}, safe=False)

    gameDataB64 = jsonData["gameDataB64"]
    # raw_binary = base64.b64decode(gameDataStr)
    # currentGame.gameDataBLOB = raw_binary
    currentGame.gameData = gameDataB64
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

    presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"])
    presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

    # SAVE BEFORE NOTIFICATIONS
    currentGame.save()

    if jsonData["status"] == "FINISHED":
        presenter.endGame(
            request,
            jsonData["winnerUsername"],
            jsonData["finalPositions"],
            (jsonData.get("tournamentData") if jsonData.get("tournamentData") else []),
            jsonData["gameID"],
            jsonData["winningPlayerScore"],
        )

    # Only notify if game still running
    else:
        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        allIsCurrentPlayers = jsonData["allIsCurrentPlayers"]
        if len(allIsCurrentPlayers) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [p.strip() for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "RnbBot"}]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "RNB",
                    playerListToNotify,
                    currentGame.id,
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )
        pendingPlayersArr = jsonData["pendingPlayersArr"]
        if len(pendingPlayersArr) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [p.strip() for p in pendingPlayersArr if p.strip() not in {request.user.username, "RnbBot"}]

            if len(playerListToNotify) > 0:
                pending_key = f"{currentGame.turn}:{currentGame.phase}"
                if currentGame.autoMoves != pending_key:
                    currentGame.autoMoves = pending_key
                    currentGame.save()
                    start_time = timezone.now() + timedelta(minutes=10)
                    schedule(
                        "Lobby.sharedFunctions.sharedNotifications.SN_sendPendingRNBturnNotificationWithValidation",
                        "RNB",
                        playerListToNotify,
                        currentGame.id,
                        presenter.getGameName(),
                        currentGame.latestUpdate,
                        currentGame.turn,
                        currentGame.phase,
                        next_run=start_time,
                        repeats=-1,  # Neg repeats for delete
                        schedule_type="O",
                    )

    ################ REWIND EVERY SAVE #######################

    if jsonData["saveRewind"]:
        doSaveRewind(currentGame, jsonData)

    ################ END REWIND EVERY SAVE #######################

    currentGame.save()

    # time.sleep(10)

    response_data = {
        "latestUpdate": currentGame.latestUpdate,
        "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        "savingFromStackMove": False,
    }

    return JsonResponse(response_data, safe=False)


@login_required()
def sendChatMessageRNB(request):
    return process_game_with_mutex(request, _sendChatMessageRNB, mutex_prefix="processChat_")


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
        currentGame.presenter().addChatNotifications(currentGame.presenter().getAllPlayersOrderedySeatInArray(False, True))
        currentGame.presenter().removeChatNotification(request.user)

        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntryRNB(request):
    return shared_bug_entry(request, "RNB", extra_info_fn=lambda g: "Options: " + g.startingOptions)


@login_required()
def saveNotesRNB(request):
    return shared_save_notes(request, "RNB")


@login_required
def saveZoomRNB(request):
    return shared_save_zoom(request, "RNB")


@login_required
def saveRNBmap(request):
    """
    Save RNB map data to database
    Expects POST request with map name, description, and map data
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)

    try:
        # Get map data from request
        data = json.loads(request.body)
        map_name = data.get("mapName", "")
        map_description = data.get("mapDescription", "")
        map_data = data.get("mapData", [])
        map_playerCount = data.get("playerCount", 2)
        map_isVerified = data.get("isVerified", False) if request.user.username == "admin" else False

        # Validate required fields
        # if not map_name:
        #    return JsonResponse({'error': 'Map name is required'}, status=400)

        result = RNBmap.objects.aggregate(Max("uniqueID"))
        max_unique_key = result["uniqueID__max"] or 0

        # Increment UK for the new map
        max_unique_key = max_unique_key + 1

        # Ensure the incoming map_data has a metadata object at the end
        if isinstance(map_data[-1], dict):
            map_data[-1]["UK"] = max_unique_key
        else:
            # If for some reason the last entry isn't an object, push a new one
            map_data.append({"UK": max_unique_key})

        # Use transaction for atomic database operations
        with transaction.atomic():
            new_map = RNBmap.objects.create(
                name=map_name,
                description=map_description,
                playerCount=map_playerCount,
                hexData=map_data,
                uniqueID=max_unique_key,
                isVerified=map_isVerified,
                creator=request.user,
            )

        return JsonResponse({"success": True, "message": f'Map "{map_name}" saved successfully', "map_id": new_map.id})

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required
def replaceRNBmap(request):
    """
    Replace an existing RNB map in the database.
    Expects POST request with map id, name, description, player count, and map data.
    Only the creator can replace the map.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)

    try:
        data = json.loads(request.body)
        map_id = data.get("mapId")
        map_name = data.get("mapName", "")
        map_description = data.get("mapDescription", "")
        map_data = data.get("mapData", [])
        map_playerCount = data.get("playerCount", 2)
        map_isVerified = data.get("isVerified", False)

        # Find the existing map
        existing_map = RNBmap.objects.get(id=map_id)

        # Double-check the request user is the creator and map is not official
        # Admin user can replace any map, including official maps
        if existing_map.creator != request.user and request.user.username != "admin":
            return JsonResponse({"error": "Only the map creator can replace this map"}, status=403)
        if existing_map.isVerified and request.user.username != "admin":
            return JsonResponse({"error": "Verified maps cannot be replaced"}, status=403)

        # Ensure the incoming map_data has the correct uniqueID metadata at the end
        if isinstance(map_data[-1], dict):
            map_data[-1]["UK"] = existing_map.uniqueID
        else:
            map_data.append({"UK": existing_map.uniqueID})

        # Update the map fields
        existing_map.name = map_name
        existing_map.description = map_description
        existing_map.playerCount = map_playerCount
        existing_map.hexData = map_data
        # Only allow isVerified to be changed by admin
        if request.user.username == "admin":
            existing_map.isVerified = map_isVerified
        existing_map.save()

        return JsonResponse({"success": True, "message": f'Map "{map_name}" replaced successfully'})

    except RNBmap.DoesNotExist:
        return JsonResponse({"error": "Map not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required
def deleteRNBmap(request):
    """
    Delete an RNB map from the database.
    Only admin can delete maps.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)

    if request.user.username != "admin":
        return JsonResponse({"error": "Only admin can delete maps"}, status=403)

    try:
        data = json.loads(request.body)
        map_id = data.get("mapId")

        # Find the existing map
        existing_map = RNBmap.objects.get(id=map_id)
        map_name = existing_map.name

        # Delete the map
        existing_map.delete()

        return JsonResponse({"success": True, "message": f'Map "{map_name}" deleted successfully'})

    except RNBmap.DoesNotExist:
        return JsonResponse({"error": "Map not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required
def getRNBmaps(request):
    """
    Get RNB maps from database with optional isVerified filter
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    try:
        # Get filter parameters
        is_verified = request.GET.get("isVerified", "all")

        # Query maps based on filter
        maps_queryset = RNBmap.objects.all()

        if is_verified == "true":
            maps_queryset = maps_queryset.filter(isVerified=True)
        elif is_verified == "false":
            maps_queryset = maps_queryset.filter(isVerified=False)
        # 'all' means no filtering

        # Format response
        maps_data = []
        for map_obj in maps_queryset:
            maps_data.append(
                {
                    "id": map_obj.id,
                    "uniqueID": map_obj.uniqueID,
                    "name": map_obj.name,
                    "description": map_obj.description,
                    "playerCount": map_obj.playerCount,
                    "isVerified": map_obj.isVerified,
                    "hexData": map_obj.hexData,
                    "canReplace": (map_obj.creator == request.user and not map_obj.isVerified) or request.user.username == "admin",
                }
            )

        return JsonResponse({"success": True, "maps": maps_data})

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


def RNBhighScores(request, map_unique_id=None):
    """
    Display highscores page for solo RNB maps
    Optional map_unique_id parameter to pre-select a specific map
    """
    settings_debug = config("RNB_USE_SOURCE_CODE", default=False, cast=bool)
    context = {"settingsDebug": settings_debug, "selected_map_id": map_unique_id}
    return render(request, "RNB/RNBhighScores.html", context)


@login_required
def getSoloMaps(request):
    """
    Get solo RNB maps from database
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    try:
        # Query solo maps only (playerCount == 1)
        maps_queryset = RNBmap.objects.filter(playerCount=1)

        # Format response
        maps_data = []
        for map_obj in maps_queryset:
            maps_data.append({"id": map_obj.id, "uniqueID": map_obj.uniqueID, "name": map_obj.name, "description": map_obj.description, "playerCount": map_obj.playerCount, "isVerified": map_obj.isVerified, "hexData": map_obj.hexData})

        return JsonResponse({"success": True, "maps": maps_data})

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required
def RNBuserHighScores(request, username):
    """
    Display highscores page for a specific user
    Shows all scores for the specified username across all maps
    """
    settings_debug = config("RNB_USE_SOURCE_CODE", default=False, cast=bool)
    context = {"settingsDebug": settings_debug, "username": username}
    return render(request, "RNB/RNBuserHighScores.html", context)


@login_required
def getUserHighscores(request):
    """
    Get highscores for a specific user across all maps
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    try:
        username = request.GET.get("username")
        if not username:
            return JsonResponse({"error": "Username parameter required"}, status=400)

        # Get user
        from Lobby.models import User

        try:
            user_obj = request.user if request.user.username == username else None
            if not user_obj:
                user_obj = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)

        # Get all highscores for this user
        highscores = RNBMapScore.objects.filter(user=user_obj).select_related("map_ref").order_by("-score", "timeStamp")

        # Format highscores data
        highscores_data = []
        for score_entry in highscores:
            highscores_data.append(
                {
                    "mapName": score_entry.map_ref.name if score_entry.map_ref else "Unknown Map",
                    "date_timestamp": int(score_entry.timeStamp),
                    "game": score_entry.game_id,
                    "score": score_entry.score,
                }
            )

        return JsonResponse({"success": True, "username": username, "highscores": highscores_data})

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required
def getMapHighscores(request):
    """
    Get highscores for a specific map
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    try:
        map_id = request.GET.get("mapId")
        if not map_id:
            return JsonResponse({"error": "mapId parameter required"}, status=400)

        # Get the map
        map_obj = RNBmap.objects.get(id=map_id)

        # Get highscores from RNBMapScore model
        highscores = RNBMapScore.objects.filter(map_ref=map_obj).select_related("user").order_by("-score", "timeStamp")

        # Format highscores with user names
        highscores_data = []
        for score_entry in highscores:
            highscores_data.append({"name": score_entry.user.username, "date_timestamp": int(score_entry.timeStamp), "game": score_entry.game_id, "score": score_entry.score})

        return JsonResponse({"success": True, "mapName": map_obj.name, "mapDescription": map_obj.description, "highscores": highscores_data})

    except RNBmap.DoesNotExist:
        return JsonResponse({"error": "Map not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@login_required()
def RNBdata(request, dataType=1):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="RNB")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("RNBpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        # 1. Get the raw binary (Gzip + MsgPack)
        # raw_blob = currentGame.gameDataBLOB or b""
        # 2. Encode to Base64 so it can travel safely in HTML
        # gameDataB64 = base64.b64encode(raw_blob).decode("utf-8")
        gameDataB64 = currentGame.gameData
        returnData = {
            "gameDataB64": gameDataB64,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
            "transactionID": currentGame.transactionID,
            "allStackData": getAllCurrentStackMoves(currentGame),
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
        # 1. Get the raw binary (Gzip + MsgPack)
        # raw_blob = currentGame.gameDataBLOB or b""
        # 2. Encode to Base64 so it can travel safely in HTML
        # gameDataB64 = base64.b64encode(raw_blob).decode("utf-8")
        gameDataB64 = currentGame.gameData
        return JsonResponse(
            {
                "latest": False,
                "gameDataB64": gameDataB64,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
                "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
                "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
                "transactionID": currentGame.transactionID,
            }
        )

    return HttpResponse(status=204)  # No Content


#########################################################
#
#   SIMUL MOVE FUNCTIONS - MOVE TO PRESENTER LATER
#
#########################################################


def PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry):
    # If the entry is blank, ignore it
    if newMoveEntry == "":
        return

    newMoveEntry["username"] = nameToUse
    gp_player = currentGame.players.only("moveDataJSON").get(player__username=nameToUse)

    moves = gp_player.moveDataJSON or []
    turn, phase = newMoveEntry["turn"], newMoveEntry["phase"]

    # Check for an indentical move, and replace it with the new data
    for i, entry in enumerate(moves):
        if entry.get("turn") == turn and entry.get("phase") == phase:
            moves[i] = newMoveEntry
            break
    else:
        # 'else' on a loop only runs if no 'break' occurred
        moves.append(newMoveEntry)

    gp_player.moveDataJSON = moves
    gp_player.save(update_fields=["moveDataJSON"])  # ONLY save this field


def PdeleteAllOtherMovesForInterferedWithPlayer(currentGame, nameToUse):
    turn = currentGame.turn
    phase = currentGame.phase

    gp_player = currentGame.players.only("moveDataJSON").get(player__username=nameToUse)
    moves = gp_player.moveDataJSON or []
    gp_player.moveDataJSON = [m for m in moves if m.get("turn", 0) == turn and m.get("phase", 0) == phase]

    gp_player.save(update_fields=["moveDataJSON"])


def PclearPastMoveData(currentGame):
    turn = currentGame.turn
    phase = currentGame.phase
    # .all() is needed after .only() to iterate
    all_gp = currentGame.players.only("moveDataJSON")

    print(phase)

    for gp in all_gp:
        moves = gp.moveDataJSON or []

        # Rebuild the list with ONLY the moves that are NOT in the past
        gp.moveDataJSON = [
            m
            for m in moves
            if m.get("turn", 0) > turn or (m.get("turn") == turn and m.get("phase", 0) >= phase - rfRNB.PHASE_LOOKBACK_AMOUNT) or (m.get("turn") == turn and m.get("phase", 0) >= phase - rfRNB.PHASE_LOOKBACK_AMOUNT and m.get("username") in currentGame.serverCurrentPlayerNamesInTurnOrder)
        ]

        gp.save(update_fields=["moveDataJSON"])


def PwipeAllMoveData(currentGame):
    for gp in currentGame.players.all():
        gp.moveDataJSON = None
        gp.save(update_fields=["moveDataJSON"])


def PdecompressData(string_to_decompress):
    # return json.loads(gzip.decompress(base64.b64decode(string_to_decompress)).decode("utf-8"))
    return json.loads(gzip.decompress(bytearray(base64.b64decode(string_to_decompress))).decode("utf-8"))


def setPlayerStackToCurrent(currentGame, playerName):
    gp = currentGame.players.filter(player__username=playerName).first()
    gp_moveData = gp.moveDataJSON if gp.moveDataJSON else []
    # Find an entry matching the turn and phase
    for entry in gp_moveData:
        if entry["turn"] == currentGame.turn and entry["phase"] == currentGame.phase:
            entry["status"] = "current"
            gp.moveDataJSON = gp_moveData
            gp.save()
            break


##################### THIS IS NOT USED - Leave in case things change
def getAllCurrentStackPhaseMoves(currentGame):
    currentStackMoves = []
    for gp in currentGame.players.all():
        gp_moveData = gp.moveDataJSON
        # Find an entry matching the turn and phase
        for entry in gp_moveData:
            if entry["turn"] == currentGame.turn and entry["phase"] == currentGame.phase:
                entryToAdd = entry
                entryToAdd["username"] = gp.player.username
                currentStackMoves.append(entryToAdd)
                break

    return currentStackMoves


def getAllCurrentStackMoves(currentGame):
    currentStackMoves = []
    for gp in currentGame.players.all():
        gp_moveDataJSON = gp.moveDataJSON if gp.moveDataJSON else []
        for entry in gp_moveDataJSON:
            entry["username"] = gp.player.username
            currentStackMoves.append(entry)

    return currentStackMoves

@login_required()
def castVote(request):
    return process_game_with_mutex(request, shared_cast_vote, mutex_prefix="processTurn_")
