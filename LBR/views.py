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
    from Lobby.presenters import LBRpresenter


def index(request):
    return HttpResponse("Hello, world. You're at Land Between Rivers")


def LBRhelp(request):
    return render(request, "LBR/LBRhelp.html")


@login_required
def createLBRgame(request):
    from LBR.common import create_lbr_game

    return create_lbr_game(request)


def showLBRgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "LBR",
        default_zoom=0,
        settings_debug_key="LBR_USE_SOURCE_CODE",
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("LBRpresenter", currentGame.presenter())
    all_players = result["all_players"]
    user_gp = result["user_gp"]

    returnData = {**result["base_data"]}
    returnData["settingsDEBUG"] = returnData.pop("settingsDebug")
    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "pov": -99,
            "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(True, False)),
            "currentPlayers": json.dumps(presenter.getArrayOfIsCurrentPlayers()),
        }
    )

    if not result["is_authenticated"]:
        return render(request, "LBR/showLBRgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    if not result["is_involved"]:
        return render(request, "LBR/showLBRgame.html", returnData)

    returnData.update(result["involved_data"])

    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            creator_gp = next(
                (gp for gp in all_players if gp.player and gp.player.id == currentGame.creator_id),
                None,
            )
            if creator_gp:
                displayNames = creator_gp.notes
                creator_gp.notes = ""
                creator_gp.save()
                if user_gp and user_gp.player_id == currentGame.creator_id:
                    returnData["notes"] = ""
            currentGame.save()
        returnData["displayNames"] = displayNames

    return render(request, "LBR/showLBRgame.html", returnData)


def processLBRturn(request):
    return process_game_with_mutex(request, _processLBRturn, mutex_prefix="processTurn_")


@login_required()
def _processLBRturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="LBR")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("LBRpresenter", currentGame.presenter())

    if not can_act_in_game(request.user, currentGame):
        return JsonResponse({"error": gettext("You are not a player in this game")}, status=403)

    action = jsonData.get("action")
    if action == "saveGame":
        return performSaveGame(request, currentGame, jsonData, presenter)
    if action == "resign":
        missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(missingPlayer)
        presenter.checkForHostChange(missingPlayer)
        currentGame.save()
        return JsonResponse({"latestUpdate": currentGame.latestUpdate}, safe=False)
    if action == "kickout":
        latest_update = str(jsonData.get("latestUpdate", 0))
        participant = currentGame.players.filter(player=request.user, is_missing=False, is_kicked=False).exists()
        target_is_current = currentGame.players.filter(
            player__username=jsonData["kickedName"], is_current=True, is_missing=False, is_kicked=False
        ).exists()
        if not participant or request.user.username == jsonData["kickedName"]:
            return JsonResponse({"error": gettext("Only another active player can initiate kickout.")}, status=403)
        if not target_is_current or presenter.kickoutRequired() != 2:
            return JsonResponse({"error": gettext("This player is not eligible for kickout.")}, status=400)
        if latest_update != str(currentGame.latestUpdate):
            SN_sendAdminErrorMessage(
                f"SYNC ERROR IN: LBR kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} - DB_LU: {currentGame.latestUpdate}"
            )
            return JsonResponse({"syncError": True}, safe=False)

        kickout_vote_result = presenter.processKickoutVote(request.user.username, jsonData["kickedName"])
        if kickout_vote_result["voteCast"]:
            currentGame.save()
            return JsonResponse(kickout_vote_result, safe=False)

        missing_player = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(missing_player)
        presenter.addKickedPlayer(missing_player)
        presenter.checkForHostChange(missing_player)

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
    if action == "loadRewind":
        return loadRewind(request, currentGame, jsonData, presenter)
    return HttpResponse(status=204)


def performSaveGame(request, currentGame, jsonData, presenter):
    db_latest_update = currentGame.latestUpdate
    latest_update = jsonData.get("latestUpdate", 0)

    if str(latest_update) != str(db_latest_update):
        turn = jsonData.get("turn", "N/A")
        phase = jsonData.get("phase", "N/A")
        message = (
            f"SYNC ERROR IN: LBR save - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {latest_update} "
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

    presenter.setCurrentPlayersFromArrInTurnOrder(
        jsonData.get("nextPlayer", []),
        acting_username=request.user.username,
        old_latest_update=oldVer,
    )

    # SAVE BEFORE NOTIFICATIONS
    currentGame.save()

    if jsonData.get("status") == "FINISHED":
        presenter.endGame(
            request,
            jsonData.get("winner", []),
            jsonData.get("finalPositions", []),
            jsonData["gameID"],
        )
    else:
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        current_players = presenter.getArrayOfIsCurrentPlayers()
        if current_players and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = [player.strip() for player in current_players]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if playerListToNotify:
                presenter.sendYourTurnNotification(
                    "LBR",
                    playerListToNotify,
                    currentGame.id,
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

    if jsonData.get("saveRewind"):
        currentRewindData = []
        if currentGame.rewindData != "":
            currentRewindData = json.loads(currentGame.rewindData)
        if currentGame.rewindTempData:
            if not currentRewindData or (
                currentRewindData[-1] != currentGame.rewindTempData
                and jsonData["gameData"] != currentGame.rewindTempData
            ):
                currentRewindData.append(json.loads(currentGame.rewindTempData))
            currentGame.rewindTempData = ""
        if not currentRewindData:
            currentRewindData.append([jsonData["gameData"]])
        elif currentRewindData[-1][0] != jsonData["gameData"]:
            currentRewindData.append([jsonData["gameData"]])
            while len(currentRewindData) > 20:
                currentRewindData.pop(0)
        currentGame.rewindData = json.dumps(currentRewindData)

    presenter.clearKickoutVotes()
    currentGame.save()

    return JsonResponse(
        {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        },
        safe=False,
    )


def loadRewind(request, currentGame, jsonData, presenter):
    if str(jsonData.get("latestUpdate", 0)) != str(currentGame.latestUpdate):
        SN_sendAdminErrorMessage(
            f"SYNC ERROR IN: LBR loadRewind - gameID: {currentGame.id} - User: {request.user.username}"
        )
        return JsonResponse({"syncError": True}, safe=False)

    if not currentGame.rewindData:
        return JsonResponse(
            {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
            safe=False,
        )

    currentRewindDataArray = json.loads(currentGame.rewindData)
    if not currentRewindDataArray:
        return JsonResponse(
            {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
            safe=False,
        )

    loadDataArr = currentRewindDataArray.pop()
    while loadDataArr[0] == currentGame.gameData and currentRewindDataArray:
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


def LBRdata(request, dataType=1):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="LBR")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("LBRpresenter", currentGame.presenter())

    if dataType == 1:
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "finishedGame": currentGame.gameStatus == "FINISHED",
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
                "kickoutRequired": presenter.kickoutRequired(),
            }
        )

    if dataType == 2:
        presenter.removeChatNotification(request.user)
        currentGame.save()
        return JsonResponse({"chatData": currentGame.chatData})

    if dataType == 3:
        kickout_data = {
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "kickoutRequired": presenter.kickoutRequired(),
            "missingPlayers": presenter.getMissingPlayersNamesArray(),
        }
        if int(jsonData["latestUpdate"]) == int(currentGame.latestUpdate):
            return JsonResponse({"latest": True, **kickout_data}, safe=False)
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "latestUpdate": currentGame.latestUpdate,
                "finishedGame": currentGame.gameStatus == "FINISHED",
                **kickout_data,
            }
        )

    return HttpResponse(status=204)


@login_required()
def bugEntry(request):
    return shared_bug_entry(request, "LBR", extra_info_fn=lambda g: f"Options: {g.startingOptions}")


@login_required()
def sendChatMessage(request):
    return process_game_with_mutex(request, _sendChatMessage, mutex_prefix="processChat_")


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="LBR")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        if not can_act_in_game(request.user, currentGame):
            return JsonResponse({"error": gettext("You are not a player in this game")}, status=403)

        currentChatData = []
        base64_data = currentGame.chatData if currentGame.chatData else ""
        if base64_data:
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

        compressed_data = gzip.compress(json.dumps(currentChatData).encode("utf-8"))
        currentGame.chatData = base64.b64encode(compressed_data).decode("utf-8")
        presenter = currentGame.presenter()
        presenter.addChatNotifications(presenter.getAllPlayersOrderedySeatInArray(False, True))
        presenter.removeChatNotification(request.user)
        currentGame.save()

        return JsonResponse({"chatData": currentGame.chatData})

    return HttpResponse(status=204)


@login_required()
def saveNotesLBR(request):
    return shared_save_notes(request, "LBR")


@login_required
def saveZoomLBR(request):
    return shared_save_zoom(request, "LBR")


@login_required()
def castVote(request):
    return process_game_with_mutex(request, _castVote, mutex_prefix="processTurn_")


@login_required()
def _castVote(request):
    jsonData = json.loads(request.body)
    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="LBR")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None
    if not can_act_in_game(request.user, currentGame):
        return JsonResponse({"error": gettext("You are not a player in this game")}, status=403)
    return shared_cast_vote(request)
