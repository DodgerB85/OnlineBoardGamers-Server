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
from Lobby.sharedFunctions.permissions import is_game_admin
from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
)

from . import DDLconstants as rfDDL
from .common import create_ddl_game

DDL_DB_LOCK_NAME = "lockDDLgame_"

if TYPE_CHECKING:
    from Lobby.presenters import DDLpresenter


def index(request):
    return HttpResponse("Hello, world. You're at DDL")


def DDLhelp(request):
    return render(request, "DDL/DDLhelp.html")


def createDDLgame(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_ddl_game(request)


def showDDLgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "DDL",
        default_zoom=16,
        settings_debug_key="DDL_USE_SOURCE_CODE",
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("DDLpresenter", currentGame.presenter())

    returnData = {**result["base_data"]}
    # gameData is a gzip+base64 string produced by the client.
    returnData["gameData"] = returnData["gameData"] if returnData["gameData"] else ""
    returnData["gameCreationTimestamp"] = int(currentGame.created) / 1000 if currentGame.created else 0
    returnData["setupSeed"] = currentGame.playerOrderSeed
    returnData["maxPlayers"] = currentGame.maxPlayers
    returnData["displayNames"] = "[]"
    loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    if rf.SO_TRAINING_GAME in loadedStartingOptions and result.get("user_gp") and result["user_gp"].notes:
        returnData["displayNames"] = result["user_gp"].notes

    currentPlayersArr = []
    if currentGame.phase in rfDDL.MAIN_PHASES:
        currentPlayersArr = json.dumps(currentGame.serverCurrentPlayerNamesInTurnOrder if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 else [])
    elif currentGame.phase == rfDDL.PHASE_GAME_OVER:
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
        return render(request, "DDL/showDDLgame.html", returnData)

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
        return render(request, "DDL/showDDLgame.html", returnData)

    returnData.update(result["involved_data"])
    returnData.update(
        {
            "currentMoveData": presenter.getCurrentMoveDataForPlayer(request.user.username),
            "allMyMoveData": presenter.getAllMyMoveDataForPlayer(request.user.username),
        }
    )

    return render(request, "DDL/showDDLgame.html", returnData)


def processDDLturn(request):
    return process_game_with_mutex(request, _processDDLturn, mutex_prefix="processTurn_")


@login_required()
def _processDDLturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="DDL")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("DDLpresenter", currentGame.presenter())

    if jsonData["action"] == "saveBid":
        return saveDDLBid(request, currentGame, jsonData)

    elif jsonData["action"] == "getBids":
        return getDDLBids(currentGame, jsonData)

    if jsonData["action"] == "saveGame":
        return performSaveDDLGame(request, currentGame, jsonData)

    elif jsonData["action"] == "saveAndUpdateNotifictionsAfterStack":
        # Generic alias: the scaffold has no server-side stack processing, so
        # this is just a normal save that also releases any transaction lock.
        if currentGame.transactionID and jsonData.get("transactionID", "") == currentGame.transactionID:
            currentGame.transactionID = ""
        return performSaveDDLGame(request, currentGame, jsonData)

    elif jsonData["action"] == "resign":
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        return JsonResponse({"latestUpdate": currentGame.latestUpdate}, safe=False)

    elif jsonData["action"] == "kickout":
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: DDL kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
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
            message = f"SYNC ERROR IN: DDL loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
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


def saveDDLBid(request, currentGame, jsonData):
    """Store one player's sealed starting-auction bid outside gameData."""
    try:
        starting_options = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    except json.JSONDecodeError:
        starting_options = []
    if rfDDL.SO_AUCTION not in starting_options:
        return JsonResponse({"ok": False, "error": gettext("This game has no starting auction.")}, safe=False)
    if currentGame.phase != rfDDL.PHASE_SETUP:
        return JsonResponse({"ok": False, "error": gettext("The setup phase is over.")}, safe=False)

    gp = currentGame.players.select_related("player").filter(player=request.user, is_kicked=False, is_missing=False).first()
    if gp is None:
        return JsonResponse({"ok": False, "error": gettext("You are not an active player in this game.")}, safe=False)

    round_number = 2 if int(jsonData.get("round", 1)) == 2 else 1
    if round_number == 2:
        tied_players = jsonData.get("tiedPlayers") or []
        if request.user.username not in tied_players:
            return JsonResponse({"ok": False, "error": gettext("You are not in this tie-break.")}, safe=False)

    bid = max(0, min(999, int(jsonData.get("bid", 0))))
    existing = gp.moveDataJSON if isinstance(gp.moveDataJSON, dict) else {}
    bids = existing.get("ddlBids") if isinstance(existing.get("ddlBids"), dict) else {}
    if "ddlBid" in existing and existing.get("round") is not None:
        bids[str(existing["round"])] = int(existing["ddlBid"])
    bids[str(round_number)] = bid
    gp.moveDataJSON = {"ddlBids": bids}
    gp.save(update_fields=["moveDataJSON"])
    return JsonResponse({"ok": True}, safe=False)


def getDDLBids(currentGame, jsonData):
    """Reveal bids only when every required player has submitted one."""
    round_number = 2 if int(jsonData.get("round", 1)) == 2 else 1
    active_gps = list(currentGame.players.select_related("player").filter(is_kicked=False, is_missing=False))
    tied_players = jsonData.get("tiedPlayers") or []
    if round_number == 2:
        required = [gp for gp in active_gps if gp.player and gp.player.username in tied_players]
    else:
        required = [gp for gp in active_gps if gp.player]

    missing = []
    bids = {}
    for gp in required:
        data = gp.moveDataJSON if isinstance(gp.moveDataJSON, dict) else {}
        bids_by_round = data.get("ddlBids") if isinstance(data.get("ddlBids"), dict) else {}
        value = bids_by_round.get(str(round_number))
        if value is None and data.get("round") == round_number and "ddlBid" in data:
            value = data["ddlBid"]
        if value is not None:
            bids[gp.player.username] = int(value)
        else:
            missing.append(gp.player.username)
    return JsonResponse({"ready": len(missing) == 0, "bids": bids, "missing": missing}, safe=False)


def performSaveDDLGame(request, currentGame, jsonData):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)
    game_id = currentGame.id
    presenter = cast("DDLpresenter", currentGame.presenter())

    if str(latest_update) != str(db_latest_update):
        message = (
            f"SYNC ERROR IN: DDL save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {db_latest_update} -- JSON_turn: {jsonData.get('turn', 'N/A')} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {jsonData.get('phase', 'N/A')} -- DB_phase: {currentGame.phase}"
        )
        SN_sendAdminErrorMessage(message)
        return JsonResponse({"syncError": True}, safe=False)

    nameToUse = request.user.username
    if is_game_admin(request.user):
        nameToUse = jsonData.get("BKSN", nameToUse)
    check_name = jsonData.get("checkName", "")
    if check_name:
        nameToUse = check_name

    currentGame.gameData = jsonData["gameData"]
    previous_phase = currentGame.phase
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
    presenter.setServerCurrentPlayerNamesInTurnOrder(jsonData.get("allRemainingPlayersInTurnOrder") or jsonData.get("allIsCurrentPlayers") or [])

    # SAVE BEFORE NOTIFICATIONS
    currentGame.save()

    if previous_phase == rfDDL.PHASE_SETUP and currentGame.phase == rfDDL.PHASE_MAIN:
        PwipeAllMoveData(currentGame)

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
        if len(allIsCurrentPlayers) > 0 and rf.SO_TRAINING_GAME not in loadedStartingOptions and not jsonData.get("noNotify"):
            playerListToNotify = [p.strip() for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "DdlBot"}]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification("DDL", playerListToNotify, currentGame.id, presenter.getGameName(), currentGame, oldVer)

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
def sendChatMessageDDL(request):
    return process_game_with_mutex(request, _sendChatMessageDDL, mutex_prefix="processChat_")


@login_required()
def _sendChatMessageDDL(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        try:
            currentGame = Game.objects.get(id=game_id, gameCode="DDL")
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
def bugEntryDDL(request):
    return shared_bug_entry(request, "DDL", extra_info_fn=lambda g: "Options: " + g.startingOptions)


@login_required()
def saveNotesDDL(request):
    return shared_save_notes(request, "DDL")


@login_required
def saveZoomDDL(request):
    return shared_save_zoom(request, "DDL")


@login_required()
def DDLdata(request, dataType=1):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="DDL")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("DDLpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        return JsonResponse(
            {
                "gameData": currentGame.gameData if currentGame.gameData else "",
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "finishedGame": currentGame.gameStatus == "FINISHED",
                "latestUpdate": currentGame.latestUpdate,
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
                "gameData": currentGame.gameData if currentGame.gameData else "",
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
