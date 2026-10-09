import base64
import gzip
import json
import time
import uuid
from datetime import timedelta
from typing import TYPE_CHECKING, cast

from decouple import config

from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
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
from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
)

from . import ROWconstants as rfROW
from .common import create_row_game

ROW_DB_LOCK_NAME = "lockROWgame_"

if TYPE_CHECKING:
    from Lobby.presenters import ROWpresenter


def index(request):
    return HttpResponse("Hello, world. You're at ROW")


def ROWhelp(request):
    return render(request, "ROW/ROWhelp.html")


def createROWgame(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_row_game(request)


def showROWgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "ROW",
        default_zoom=16,
        settings_debug_key="ROW_USE_SOURCE_CODE",
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("ROWpresenter", currentGame.presenter())

    returnData = {**result["base_data"]}
    # The ROW client reads the whole model as plain JSON out of gameData.
    returnData["gameData"] = returnData["gameData"] if returnData["gameData"] else "{}"

    # Edition is carried as a starting option.
    loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    returnData["edition"] = "SECOND" if rfROW.SO_SECOND_EDITION in loadedStartingOptions else "FIRST"
    returnData["railsToTheNorth"] = rfROW.SO_RTTN in loadedStartingOptions
    returnData["simmental"] = rfROW.SO_SIMMENTAL in loadedStartingOptions
    returnData["mode"] = "STRATEGIC" if rfROW.SO_MODE_STRATEGIC in loadedStartingOptions else "ORIGINAL"
    returnData["buildings"] = "BEGINNER" if rfROW.SO_BUILDINGS_BEGINNER in loadedStartingOptions else "RANDOMIZED"
    returnData["playerOrder"] = "BIDDING" if rfROW.SO_PLAYER_ORDER_BIDDING in loadedStartingOptions else "RANDOMIZED"
    returnData["variant"] = "BALANCED" if rfROW.SO_VARIANT_BALANCED in loadedStartingOptions else "ORIGINAL"
    returnData["stationMasterPromos"] = rfROW.SO_STATION_MASTER_PROMOS in loadedStartingOptions
    returnData["building11"] = rfROW.SO_BUILDING_11 in loadedStartingOptions
    returnData["building13"] = rfROW.SO_BUILDING_13 in loadedStartingOptions

    currentPlayersArr = []
    if currentGame.phase in rfROW.MAIN_PHASES:
        currentPlayersArr = json.dumps(currentGame.serverCurrentPlayerNamesInTurnOrder if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 else [])
    elif currentGame.phase == rfROW.PHASE_GAME_OVER:
        currentPlayersArr = json.dumps(presenter.getArrayOfIsCurrentPlayers())

    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(False, False)),
            "currentPlayers": currentPlayersArr,
        }
    )

    if not result["is_authenticated"]:
        return render(request, "ROW/showROWgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    # Chat notification clearing (mirrors the other games)
    all_gps_including_kicked = list(currentGame.players.select_related("player").all())
    chat_notify_ids_all = {gp.player.id for gp in all_gps_including_kicked if gp.player and gp.has_chat_notification}
    if request.user.id in chat_notify_ids_all:
        returnData["chatNotification"] = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    if not result["is_involved"]:
        return render(request, "ROW/showROWgame.html", returnData)

    returnData.update(result["involved_data"])
    returnData.update(
        {
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
        }
    )

    return render(request, "ROW/showROWgame.html", returnData)


def processROWturn(request):
    return process_game_with_mutex(request, _processROWturn, mutex_prefix="processTurn_")


@login_required()
def _processROWturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="ROW")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("ROWpresenter", currentGame.presenter())

    if jsonData["action"] == "saveGame":
        return performSaveROWGame(request, currentGame, jsonData)

    elif jsonData["action"] == "saveAndUpdateNotifictionsAfterStack":
        # Generic alias: the scaffold has no server-side stack processing, so
        # this is just a normal save that also releases any transaction lock.
        if currentGame.transactionID and jsonData.get("transactionID", "") == currentGame.transactionID:
            currentGame.transactionID = ""
        return performSaveROWGame(request, currentGame, jsonData)

    elif jsonData["action"] == "resign":
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        return JsonResponse({"latestUpdate": currentGame.latestUpdate}, safe=False)

    elif jsonData["action"] == "kickout":
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: ROW kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        kickout_vote_result = presenter.processKickoutVote(request.user.username, jsonData["kickedName"])
        if kickout_vote_result["voteCast"]:
            currentGame.save()
            return JsonResponse(kickout_vote_result, safe=False)

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
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: ROW loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        if not currentGame.rewindData or currentGame.rewindData == "[]":
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        currentRewindDataArray = json.loads(currentGame.rewindData)
        if not currentRewindDataArray:
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        PwipeAllMoveData(currentGame)
        loadData = currentRewindDataArray.pop() if currentRewindDataArray else ""
        while len(currentRewindDataArray) > 0 and loadData == currentGame.gameData:
            loadData = currentRewindDataArray.pop()

        currentGame.gameData = loadData if loadData != "" else ""
        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        presenter.clearKickoutVotes()
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
            },
            safe=False,
        )

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"])
        presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])
        currentGame.gameData = jsonData["gameData"]

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

    return HttpResponse(status=204)  # No Content


def performSaveROWGame(request, currentGame, jsonData):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)
    game_id = currentGame.id
    presenter = cast("ROWpresenter", currentGame.presenter())

    if str(latest_update) != str(db_latest_update):
        message = (
            f"SYNC ERROR IN: ROW save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {db_latest_update} -- JSON_turn: {jsonData.get('turn', 'N/A')} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {jsonData.get('phase', 'N/A')} -- DB_phase: {currentGame.phase}"
        )
        SN_sendAdminErrorMessage(message)
        return JsonResponse({"syncError": True}, safe=False)

    nameToUse = request.user.username
    if request.user.username == "BotKickStarter":
        nameToUse = jsonData.get("BKSN", nameToUse)
    check_name = jsonData.get("checkName", "")
    if check_name:
        nameToUse = check_name

    currentGame.gameData = jsonData["gameData"]
    currentGame.turn = jsonData["turn"]
    currentGame.phase = jsonData["phase"]

    currentGame.kickoutFlexiData = SF_updateFlexiTime(
        currentGame.kickoutFlexiData,
        db_latest_update,
        int(time.time()) * 1000,
        nameToUse,
        currentGame.kickoutDuration,
    )

    oldVer = db_latest_update
    newVer = (int(db_latest_update) % 1000) + 1
    currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

    presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allIsCurrentPlayers"], acting_username=nameToUse, old_latest_update=oldVer)
    presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData["allRemainingPlayersInTurnOrder"])

    # SAVE BEFORE NOTIFICATIONS
    currentGame.save()

    if jsonData.get("status") == "FINISHED":
        presenter.endGame(
            request,
            jsonData["winnerUsername"],
            jsonData["finalPositions"],
            (jsonData.get("tournamentData") if jsonData.get("tournamentData") else []),
            jsonData["gameID"],
        )
    else:
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        allIsCurrentPlayers = jsonData["allIsCurrentPlayers"]
        if len(allIsCurrentPlayers) > 0 and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [p.strip() for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "RowBot"}]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification("ROW", playerListToNotify, currentGame.id, presenter.getGameName(), currentGame, oldVer)

    if jsonData.get("saveRewind", True):
        doSaveRewind(currentGame, jsonData)

    presenter.clearKickoutVotes()
    currentGame.save()

    return JsonResponse(
        {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        },
        safe=False,
    )


def doSaveRewind(currentGame, jsonData):
    new_point = jsonData["gameData"]

    if currentGame.rewindData:
        try:
            currentRewindData = json.loads(currentGame.rewindData)
            if currentRewindData and currentRewindData[-1] == new_point:
                return
        except json.JSONDecodeError:
            currentRewindData = []
    else:
        currentRewindData = []

    if currentGame.rewindTempData:
        if not currentRewindData or currentRewindData[-1] != currentGame.rewindTempData:
            currentRewindData.append(currentGame.rewindTempData)
        currentGame.rewindTempData = ""

    if not currentRewindData or currentRewindData[-1] != new_point:
        currentRewindData.append(new_point)
        if len(currentRewindData) > 20:
            currentRewindData = currentRewindData[-20:]

    currentGame.rewindData = json.dumps(currentRewindData)


@login_required()
def sendChatMessageROW(request):
    return process_game_with_mutex(request, _sendChatMessageROW, mutex_prefix="processChat_")


@login_required()
def _sendChatMessageROW(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        try:
            currentGame = Game.objects.get(id=game_id, gameCode="ROW")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        currentChatData = _decompressGenericChat(currentGame.chatData)
        currentChatData.insert(0, new_entry)
        currentGame.chatData = _compressGenericChat(currentChatData)

        currentGame.presenter().addChatNotifications(currentGame.presenter().getAllPlayersOrderedySeatInArray(False, True))
        currentGame.presenter().removeChatNotification(request.user)
        currentGame.save()

        return JsonResponse({"chatData": currentGame.chatData})

    return HttpResponse(status=204)  # No Content


def _decompressGenericChat(base64_data):
    currentChatData = []
    if base64_data and len(base64_data) > 0:
        compressed_data = base64.b64decode(base64_data)
        unzipped = gzip.decompress(compressed_data).decode("utf-8")
        currentChatData = json.loads(unzipped)
    return currentChatData


def _compressGenericChat(chat_array):
    json_string = json.dumps(chat_array)
    compressed_data = gzip.compress(json_string.encode("utf-8"))
    return base64.b64encode(compressed_data).decode("utf-8")


@login_required()
def bugEntryROW(request):
    return shared_bug_entry(request, "ROW", extra_info_fn=lambda g: "Options: " + g.startingOptions)


@login_required()
def saveNotesROW(request):
    return shared_save_notes(request, "ROW")


@login_required
def saveZoomROW(request):
    return shared_save_zoom(request, "ROW")


@login_required()
def ROWdata(request, dataType=1):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="ROW")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("ROWpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        return JsonResponse(
            {
                "gameData": currentGame.gameData if currentGame.gameData else "{}",
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "finishedGame": currentGame.gameStatus == "FINISHED",
                "latestUpdate": currentGame.latestUpdate,
                "turn": currentGame.turn,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
                "currentPlayerNames": currentGame.serverCurrentPlayerNamesInTurnOrder or [],
                "kickoutVotesData": presenter.getKickoutVotesData(),
                "kickoutVoteThreshold": presenter.getKickoutVoteThreshold(),
                "kickoutRequired": presenter.kickoutRequired(),
                "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
                "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
                "transactionID": currentGame.transactionID,
            }
        )
    elif dataType == 2:
        presenter.removeChatNotification(request.user)
        currentGame.save()
        return JsonResponse({"chatData": currentGame.chatData}, safe=True)

    if dataType == 3:
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData if currentGame.gameData else "{}",
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
#   MOVE DATA HELPERS
#
#########################################################


def PwipeAllMoveData(currentGame):
    for gp in currentGame.players.all():
        gp.moveDataJSON = None
        gp.save(update_fields=["moveDataJSON"])


@login_required()
def castVote(request):
    return process_game_with_mutex(request, shared_cast_vote, mutex_prefix="processTurn_")
