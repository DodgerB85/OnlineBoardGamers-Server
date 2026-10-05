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

from . import URRconstants as rfURR
from .common import create_urr_game

URR_DB_LOCK_NAME = "lockURRgame_"

if TYPE_CHECKING:
    from Lobby.presenters import URRpresenter


def index(request):
    return HttpResponse("Hello, world. You're at URR")


def URRhelp(request):
    return render(request, "URR/URRhelp.html")


def createURRgame(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_urr_game(request)


def showURRgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "URR",
        default_zoom=16,
        settings_debug_key="URR_USE_SOURCE_CODE",
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("URRpresenter", currentGame.presenter())

    returnData = {**result["base_data"]}
    # The URR client reads the whole model as plain JSON out of gameData.
    returnData["gameData"] = returnData["gameData"] if returnData["gameData"] else "{}"

    returnData["missingPlayers"] = json.dumps(presenter.getMissingPlayersNamesArray())

    currentPlayersArr = []
    if currentGame.phase in rfURR.MAIN_PHASES:
        currentPlayersArr = json.dumps(currentGame.serverCurrentPlayerNamesInTurnOrder if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0 else [])
    elif currentGame.phase == rfURR.PHASE_GAME_OVER:
        currentPlayersArr = json.dumps(presenter.getArrayOfIsCurrentPlayers())

    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(True, False)),
            "currentPlayers": currentPlayersArr,
        }
    )

    if not result["is_authenticated"]:
        return render(request, "URR/showURRgame.html", returnData)

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
        return render(request, "URR/showURRgame.html", returnData)

    returnData.update(result["involved_data"])

    ## NEW GAME: the shadow display names are stashed in the creator's notes on creation.
    # Hand them over once, then clear them so they never show up as personal notes.
    displayNames = ""
    if currentGame.gameData == "" and "SHADOW" in presenter.getAllPlayersOrderedySeatInArray(False, False):
        creator_gp = next((gp for gp in result["all_players"] if gp.player and gp.player.id == currentGame.creator_id), None)
        if creator_gp:
            displayNames = creator_gp.notes
            creator_gp.notes = ""
            creator_gp.save()
            if result["user_gp"] and result["user_gp"].player_id == currentGame.creator_id:
                returnData["notes"] = ""
    returnData["displayNames"] = displayNames

    return render(request, "URR/showURRgame.html", returnData)


def processURRturn(request):
    return process_game_with_mutex(request, _processURRturn, mutex_prefix="processTurn_")


@login_required()
def _processURRturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    if "gameDataCompressed" in jsonData:
        # Compress only the transfer: saved positions and legacy callers retain
        # the plain JSON format used by show pages, history, and rewind.
        jsonData["gameData"] = gzip.decompress(base64.b64decode(jsonData["gameDataCompressed"])).decode("utf-8")
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="URR")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("URRpresenter", currentGame.presenter())

    if jsonData["action"] == "saveGame":
        return performSaveURRGame(request, currentGame, jsonData)

    elif jsonData["action"] == "resign":
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        return JsonResponse({"latestUpdate": currentGame.latestUpdate}, safe=False)

    elif jsonData["action"] == "kickout":
        participant = currentGame.players.filter(player=request.user, is_missing=False, is_kicked=False).exists()
        target_is_current = currentGame.players.filter(player__username=jsonData["kickedName"], is_current=True, is_missing=False, is_kicked=False).exists()
        if not participant or request.user.username == jsonData["kickedName"]:
            return JsonResponse({"error": gettext("Only another active player can initiate kickout.")}, status=403)
        if not target_is_current or presenter.kickoutRequired() != 2:
            return JsonResponse({"error": gettext("This player is not eligible for kickout.")}, status=400)
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: URR kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
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

        # Cannot rewind past a kickout
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
        currentGame.save()
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: URR loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        if not currentGame.rewindData or currentGame.rewindData == "[]":
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        currentRewindDataArray = json.loads(currentGame.rewindData)
        if not currentRewindDataArray:
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        loadData = decompressRewindPoint(currentRewindDataArray.pop()) if currentRewindDataArray else ""
        while len(currentRewindDataArray) > 0 and loadData == currentGame.gameData:
            loadData = decompressRewindPoint(currentRewindDataArray.pop())

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


def performSaveURRGame(request, currentGame, jsonData):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)
    game_id = currentGame.id
    presenter = cast("URRpresenter", currentGame.presenter())

    if str(latest_update) != str(db_latest_update):
        message = (
            f"SYNC ERROR IN: URR save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
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

    previous_game_data = currentGame.gameData
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
            playerListToNotify = [p.strip() for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "UrrBot"}]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification("URR", playerListToNotify, currentGame.id, presenter.getGameName(), currentGame, oldVer)

    if jsonData.get("saveRewind", True):
        doSaveRewind(currentGame, jsonData, previous_game_data)

    presenter.clearKickoutVotes()
    currentGame.save()

    return JsonResponse(
        {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        },
        safe=False,
    )


def compressRewindPoint(point):
    if point.startswith("gzip:"):
        return point
    return "gzip:" + base64.b64encode(gzip.compress(point.encode("utf-8"), mtime=0)).decode("ascii")


def decompressRewindPoint(point):
    if point.startswith("gzip:"):
        return gzip.decompress(base64.b64decode(point[5:])).decode("utf-8")
    return point


def openingPosition(gameData):
    """Rebuild the start of the game from a save's own first history entry.

    The client creates the opening position, so a game that has never been
    saved has no earlier position on the server yet. Without this the first
    rewind of a game would have nothing to go back to.
    """
    try:
        history = json.loads(gameData).get("history") or []
        if not history:
            return ""
        opening = json.loads(history[0][2])
        opening["history"] = [history[0]]
        return json.dumps(opening)
    except (json.JSONDecodeError, IndexError, TypeError):
        return ""


def doSaveRewind(currentGame, jsonData, previousGameData):
    # Each point holds the complete replay history, so keep them gzipped.
    # Points are the positions from *before* each move: the position after the
    # latest move is already currentGame.gameData, and storing it too would
    # leave the first rewind of a game with nothing to step back to.
    currentRewindData = []
    if currentGame.rewindData:
        try:
            currentRewindData = [compressRewindPoint(point) for point in json.loads(currentGame.rewindData)]
        except json.JSONDecodeError:
            currentRewindData = []

    if currentGame.rewindTempData:
        # Put back the position we rewound to, so playing on from it does not
        # lose the ability to rewind there again.
        temp_point = compressRewindPoint(currentGame.rewindTempData)
        if not currentRewindData or currentRewindData[-1] != temp_point:
            currentRewindData.append(temp_point)
        currentGame.rewindTempData = ""

    if not previousGameData:
        previousGameData = openingPosition(jsonData["gameData"])
    if previousGameData:
        previous_point = compressRewindPoint(previousGameData)
        if not currentRewindData or currentRewindData[-1] != previous_point:
            currentRewindData.append(previous_point)

    if len(currentRewindData) > 20:
        currentRewindData = currentRewindData[-20:]

    currentGame.rewindData = json.dumps(currentRewindData)


@login_required()
def sendChatMessageURR(request):
    return process_game_with_mutex(request, _sendChatMessageURR, mutex_prefix="processChat_")


@login_required()
def _sendChatMessageURR(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        try:
            currentGame = Game.objects.get(id=game_id, gameCode="URR")
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
def bugEntryURR(request):
    return shared_bug_entry(request, "URR", extra_info_fn=lambda g: "Options: " + g.startingOptions)


@login_required()
def saveNotesURR(request):
    return shared_save_notes(request, "URR")


@login_required
def saveZoomURR(request):
    return shared_save_zoom(request, "URR")


def getKickoutData(presenter):
    return {
        "kickoutRequired": presenter.kickoutRequired(),
        "kickoutVotesData": presenter.getKickoutVotesData(),
        "kickoutVoteThreshold": presenter.getKickoutVoteThreshold(),
        "KickoutFlexiDataArray": json.loads(presenter.gameObj.kickoutFlexiData or "[]"),
        "missingPlayers": presenter.getMissingPlayersNamesArray(),
        "secondsToNextKickout": presenter.getSecondsToNextKickout(),
    }


@login_required()
def URRdata(request, dataType=1):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="URR")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("URRpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        return JsonResponse(
            {
                **getKickoutData(presenter),
                "gameData": currentGame.gameData if currentGame.gameData else "{}",
                "finishedGame": currentGame.gameStatus == "FINISHED",
                "latestUpdate": currentGame.latestUpdate,
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
            return JsonResponse({"latest": True, **getKickoutData(presenter)}, safe=False)
        return JsonResponse(
            {
                "latest": False,
                **getKickoutData(presenter),
                "gameData": currentGame.gameData if currentGame.gameData else "{}",
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def castVote(request):
    return process_game_with_mutex(request, shared_cast_vote, mutex_prefix="processTurn_")
