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
from Lobby.sharedFunctions.permissions import can_act_in_game, is_game_admin
from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
)

from . import ROWconstants as rfROW
from .common import create_row_game
from Lobby.sharedFunctions.safeCompression import safe_gzip_decompress

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
    automa_option = next((c for c in loadedStartingOptions if c in rfROW.AUTOMA_OPTIONS), None)
    returnData["automaGame"] = automa_option is not None
    returnData["difficulty"] = rfROW.AUTOMA_DIFFICULTY_BY_OPTION.get(automa_option, "EASY")

    currentPlayersArr = []
    if currentGame.phase in rfROW.MAIN_PHASES:
        currentPlayersArr = json.dumps(presenter.getRemainingTurnOrderNames())
    elif currentGame.phase == rfROW.PHASE_GAME_OVER:
        currentPlayersArr = json.dumps(presenter.getArrayOfIsCurrentPlayers())

    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(False, False)),
            "currentPlayers": currentPlayersArr,
            "missingPlayers": json.dumps(presenter.getMissingPlayersNamesArray()),
        }
    )

    if not result["is_authenticated"]:
        return render(request, "ROW/showROWgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

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


def _promoteNextCurrentPlayer(currentGame, presenter):
    """Move the turn to the next active player after the current seat leaves.

    ``addMissingPlayer``/``addKickedPlayer`` only remove the seat from the
    server turn order. Without this, a resignation on your own turn leaves the
    game with no current player and every client refuses to act.
    """
    missing = set(presenter.getMissingPlayersNamesArray())
    names = [name for name in presenter.getRemainingTurnOrderNames() if name not in missing]
    if not names:
        currentGame.players.update(is_current=False, remainingTurnOrder=None)
        currentGame.serverCurrentPlayerNamesInTurnOrder = []
        currentGame.save()
        return
    presenter.setCurrentPlayersFromArrInTurnOrder([names[0]])
    presenter.setServerCurrentPlayerNamesInTurnOrder(names)


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

    if not can_act_in_game(request.user, currentGame):
        return JsonResponse({"error": gettext("You are not a player in this game")}, status=403)

    # A finished game is final: ignore late saves, votes and resignations from
    # stale tabs instead of letting them overwrite the stored result.
    if currentGame.gameStatus == "FINISHED":
        return JsonResponse(
            {
                "finishedGame": True,
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": 0,
            },
            safe=False,
        )

    if jsonData["action"] == "saveGame":
        return performSaveROWGame(request, currentGame, jsonData)

    elif jsonData["action"] == "saveAndUpdateNotifictionsAfterStack":
        # Generic alias: the scaffold has no server-side stack processing, so
        # this is just a normal save that also releases any transaction lock.
        if currentGame.transactionID and jsonData.get("transactionID", "") == currentGame.transactionID:
            currentGame.transactionID = ""
        return performSaveROWGame(request, currentGame, jsonData)

    elif jsonData["action"] == "resign":
        if str(latest_update) != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)

        was_current = currentGame.players.filter(player__username=request.user.username, is_current=True).exists()
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        if was_current:
            _promoteNextCurrentPlayer(currentGame, presenter)
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

    elif jsonData["action"] == "kickout":
        if str(latest_update) != str(currentGame.latestUpdate):
            message = f"SYNC ERROR IN: ROW kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        participant = currentGame.players.filter(player=request.user, is_missing=False, is_kicked=False).exists()
        if not participant and not is_game_admin(request.user):
            return JsonResponse({"error": gettext("Only another active player can initiate kickout.")}, status=403)

        target_username = jsonData["kickedName"]
        target_gp = currentGame.players.filter(player__username=target_username).first()
        if target_username == request.user.username or target_gp is None or target_gp.is_missing or target_gp.is_kicked:
            return JsonResponse({"error": gettext("Invalid kickout target")}, status=400)

        # Mirror URR/BUS: only the player actually on turn can be kicked, and
        # only when the server itself says the timer expired. A dialog left open
        # on a client can outlive the move that reset the clock.
        live_current_usernames = set(
            currentGame.players.filter(is_current=True, is_missing=False, is_kicked=False).values_list("player__username", flat=True)
        )
        target_on_turn = not live_current_usernames or target_username in live_current_usernames
        if not target_on_turn or presenter.kickoutRequired() != 2:
            return JsonResponse({"error": gettext("This player is not eligible for kickout.")}, status=400)

        kickout_vote_result = presenter.processKickoutVote(request.user, target_username)
        if kickout_vote_result["voteCast"]:
            currentGame.save()
            return JsonResponse(kickout_vote_result, safe=False)

        was_current = target_username in live_current_usernames
        _missingPlayer = User.objects.get(username=target_username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        if was_current or not live_current_usernames:
            _promoteNextCurrentPlayer(currentGame, presenter)

        # Cannot rewind past a kickout.
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
        # Second half of a rewind: reject if another write landed between the load and this update.
        if str(jsonData.get("latestUpdate", 0)) != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)
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

    # A finished game is final: ignore late saves from stale tabs.
    if currentGame.gameStatus == "FINISHED":
        return JsonResponse(
            {
                "finishedGame": True,
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": 0,
            },
            safe=False,
        )

    if str(latest_update) != str(db_latest_update):
        message = (
            f"SYNC ERROR IN: ROW save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
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
    currentGame.turn = jsonData["turn"]
    currentGame.phase = jsonData["phase"]

    SF_updateFlexiTime(
        currentGame,
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
            playerListToNotify = [p.strip() for p in allIsCurrentPlayers if p.strip() not in {request.user.username, "RowBot", "RowAI"}]
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification("ROW", playerListToNotify, currentGame.id, presenter.getGameName(), currentGame, oldVer)

    if jsonData.get("saveRewind", True) and jsonData.get("status") != "FINISHED":
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
        unzipped = safe_gzip_decompress(compressed_data).decode("utf-8")
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
                "currentPlayerNames": presenter.getRemainingTurnOrderNames(),
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
        gameUpdate = int(jsonData.get("latestUpdate", 0) or 0)
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            # Kickout votes do not bump latestUpdate (that would reset the timer),
            # so still return the small vote snapshot on an otherwise unchanged poll.
            return JsonResponse(
                {
                    "latest": True,
                    "kickoutVotesData": presenter.getKickoutVotesData(),
                    "kickoutVoteThreshold": presenter.getKickoutVoteThreshold(),
                    "kickoutRequired": presenter.kickoutRequired(),
                },
                safe=False,
            )
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData if currentGame.gameData else "{}",
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "finishedGame": currentGame.gameStatus == "FINISHED",
                "latestUpdate": currentGame.latestUpdate,
                "turn": currentGame.turn,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
                "currentPlayerNames": presenter.getRemainingTurnOrderNames(),
                "kickoutVotesData": presenter.getKickoutVotesData(),
                "kickoutVoteThreshold": presenter.getKickoutVoteThreshold(),
                "kickoutRequired": presenter.kickoutRequired(),
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
