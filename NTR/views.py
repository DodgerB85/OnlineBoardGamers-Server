import base64
import gzip
import json
import time
from typing import TYPE_CHECKING, cast

from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.utils.translation import gettext

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
from Lobby.sharedFunctions.permissions import can_act_in_game
from Lobby.sharedFunctions.safeCompression import safe_gzip_decompress
from Lobby.sharedFunctions.sharedFunctions import SF_updateFlexiTime
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

if TYPE_CHECKING:
    from Lobby.presenters import NTRpresenter

from . import NTRconstants as rfNTR


def index(request):
    return HttpResponse("Hello, world. You're at Napoleon's Triumph")


def NTRhelp(request):
    return render(request, "NTR/NTRhelp.html")


@login_required
def createNTRgame(request):
    from NTR.common import create_ntr_game
    return create_ntr_game(request)


def showNTRgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "NTR",
        default_zoom=16,
        settings_debug_key="NTR_USE_SOURCE_CODE",
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("NTRpresenter", currentGame.presenter())
    user_gp = result["user_gp"]

    returnData = {**result["base_data"]}
    returnData["settingsDEBUG"] = returnData.pop("settingsDebug")

    # Determine current players for display
    currentPlayersArr = []
    if currentGame.phase in rfNTR.MAIN_PHASES:
        currentPlayersArr = json.dumps(presenter.getArrayOfIsCurrentPlayers())

    startingMap = currentGame.startingMap

    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(False, False)),
            "currentPlayers": currentPlayersArr,
            "startingMap": startingMap,
        }
    )

    if not result["is_authenticated"]:
        return render(request, "NTR/showNTRgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    if not result["is_involved"]:
        return render(request, "NTR/showNTRgame.html", returnData)

    returnData.update(result["involved_data"])
    returnData.update(
        {
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
        }
    )

    # NEW GAME
    if not currentGame.gameData or currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
                returnData["notes"] = ""
            currentGame.save()

        returnData["displayNames"] = displayNames

    return render(request, "NTR/showNTRgame.html", returnData)


def processNTRturn(request):
    return process_game_with_mutex(request, _processNTRturn, mutex_prefix="processTurn_")


@login_required()
def _processNTRturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="NTR")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("NTRpresenter", currentGame.presenter())

    if not can_act_in_game(request.user, currentGame):
        return JsonResponse({"error": gettext("You are not a player in this game")}, status=403)

    if jsonData["action"] == "saveGame":
        return performSaveGame(request, currentGame, jsonData, presenter)

    elif jsonData["action"] == "resign":
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        return JsonResponse({"latestUpdate": currentGame.latestUpdate}, safe=False)

    elif jsonData["action"] == "loadRewind":
        return loadRewind(request, currentGame, jsonData, presenter)

    return HttpResponse(status=204)


def performSaveGame(request, currentGame, jsonData, presenter):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)

    if str(latest_update) != str(db_latest_update):
        turn = jsonData.get("turn", "N/A")
        phase = jsonData.get("phase", "N/A")
        message = (
            f"SYNC ERROR IN: NTR save - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
        )
        SN_sendAdminErrorMessage(message)
        return JsonResponse({"syncError": True}, safe=False)

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

    presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"], acting_username=request.user.username, old_latest_update=oldVer)

    # SAVE BEFORE NOTIFICATIONS
    currentGame.save()

    if jsonData["status"] == "FINISHED":
        presenter.endGame(
            request,
            jsonData.get("winner", []),
            jsonData.get("finalPositions", []),
            jsonData["gameID"],
        )

    else:
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        current_players = presenter.getArrayOfIsCurrentPlayers()
        if len(current_players) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [player.strip() for player in current_players]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            # Filter out bots
            playerListToNotify = [p for p in playerListToNotify if not p.startswith("NtrBot")]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "NTR",
                    playerListToNotify,
                    currentGame.id,
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

    # REWIND
    if jsonData["saveRewind"]:
        currentRewindData = []
        if currentGame.rewindData != "":
            currentRewindData = json.loads(currentGame.rewindData)
        if len(currentGame.rewindTempData) > 0:
            if len(currentRewindData) == 0 or (currentRewindData[-1] != currentGame.rewindTempData and jsonData["gameData"] != currentGame.rewindTempData):
                currentRewindData.append(json.loads(currentGame.rewindTempData))
            currentGame.rewindTempData = ""
        if not currentRewindData:
            currentRewindData.append([jsonData["gameData"]])
        else:
            if currentRewindData[-1][0] != jsonData["gameData"]:
                currentRewindData.append([jsonData["gameData"]])
                while len(currentRewindData) > 20:
                    currentRewindData.pop(0)
        currentGame.rewindData = json.dumps(currentRewindData)

    presenter.clearKickoutVotes()
    currentGame.save()

    response_data = {
        "latestUpdate": currentGame.latestUpdate,
        "secondsToNextKickout": presenter.getSecondsToNextKickout(),
    }
    return JsonResponse(response_data, safe=False)


def loadRewind(request, currentGame, jsonData, presenter):
    latest_update = jsonData.get("latestUpdate", 0)
    if str(latest_update) != str(currentGame.latestUpdate):
        turn = jsonData.get("turn", "N/A")
        phase = jsonData.get("phase", "N/A")
        message = (
            f"SYNC ERROR IN: NTR loadRewind - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
        )
        SN_sendAdminErrorMessage(message)
        return JsonResponse({"syncError": True}, safe=False)

    if len(currentGame.rewindData) == 0:
        return JsonResponse(
            {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
            safe=False,
        )

    currentRewindDataArray = json.loads(currentGame.rewindData)
    if len(currentRewindDataArray) == 0:
        return JsonResponse(
            {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
            safe=False,
        )

    loadDataArr = []
    if len(currentRewindDataArray) > 0:
        loadDataArr = currentRewindDataArray.pop()

    while len(loadDataArr) > 0 and loadDataArr[0] == currentGame.gameData and len(currentRewindDataArray) > 0:
        loadDataArr = currentRewindDataArray.pop()

    currentGame.gameData = loadDataArr[0]
    currentGame.rewindTempData = json.dumps(loadDataArr)
    currentGame.rewindData = json.dumps(currentRewindDataArray)

    presenter.clearKickoutVotes()

    newVer = (int(currentGame.latestUpdate) % 1000) + 1
    currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

    currentGame.save()

    return JsonResponse(
        {
            "gameData": loadDataArr[0],
            "latestUpdate": currentGame.latestUpdate,
            "missingPlayers": presenter.getMissingPlayersNamesArray(),
        },
        safe=False,
    )


def NTRdata(request, dataType=1):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="NTR")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("NTRpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
        }
        return JsonResponse(returnData)

    elif dataType == 2:
        presenter.removeChatNotification(request.user)
        currentGame.save()
        return JsonResponse({"chatData": currentGame.chatData})

    elif dataType == 3:
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
                "finishedGame": currentGame.gameStatus == "FINISHED",
            }
        )

    return HttpResponse(status=204)


@login_required()
def bugEntry(request):
    return shared_bug_entry(request, "NTR", extra_info_fn=lambda g: f"Options: {g.startingOptions}")


@login_required()
def sendChatMessage(request):
    return process_game_with_mutex(request, _sendChatMessage, mutex_prefix="processChat_")


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        try:
            currentGame = Game.objects.get(id=game_id, gameCode="NTR")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        currentChatData = []
        base64_data = currentGame.chatData if currentGame.chatData else ""
        if len(base64_data) > 0:
            compressed_data = base64.b64decode(base64_data)
            unzipped = safe_gzip_decompress(compressed_data).decode("utf-8")
            currentChatData = json.loads(unzipped)

        new_entry = jsonData["newEntry"]
        if (
            not isinstance(new_entry, list)
            or len(new_entry) < 3
            or not isinstance(new_entry[2], str)
            or len(new_entry[2]) > 2000
        ):
            return JsonResponse({"error": gettext("Invalid chat entry")}, status=400)

        new_entry[0] = request.user.username
        currentChatData.insert(0, new_entry)

        json_string = json.dumps(currentChatData)
        compressed_data = gzip.compress(json_string.encode("utf-8"))
        compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

        currentGame.chatData = compressedChatData
        currentGame.presenter().addChatNotifications(currentGame.presenter().getAllPlayersOrderedySeatInArray(False, True))
        currentGame.presenter().removeChatNotification(request.user)
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)


@login_required()
def saveNotesNTR(request):
    return shared_save_notes(request, "NTR")


@login_required
def saveZoomNTR(request):
    return shared_save_zoom(request, "NTR")


@login_required()
def castVote(request):
    return process_game_with_mutex(request, shared_cast_vote, mutex_prefix="processTurn_")
