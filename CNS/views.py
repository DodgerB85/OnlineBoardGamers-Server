import base64
import gzip
import json
import time
from typing import TYPE_CHECKING, cast

from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
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
from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)

if TYPE_CHECKING:
    from Lobby.presenters import CNSpresenter


# Create your views here.
def index(request):
    return HttpResponse("Hello, world. You're at the CNS index")


def redirectLegacyCNS(request, original_id):
    """Redirect from old /CNS/:original_id format to new /CNS/:id/show format"""
    try:
        game = Game.objects.get(gameCode="CNS", original_id=original_id)
        return HttpResponseRedirect(reverse("CNS:showCNSgame", args=[game.id]))
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None


def CNShelp(request):
    return render(request, "CNS/CNShelp.html")


@login_required
def createCNSgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    from CNS.common import create_cns_game

    return create_cns_game(request)


def showCNSgame(request, game_id, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "CNS",
        default_zoom=24,
        settings_debug_key="CNS_USE_SOURCE_CODE",
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = result["presenter"]
    all_players = result["all_players"]
    user_gp = result["user_gp"]

    returnData = {
        **result["base_data"],
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
    }

    if not result["is_authenticated"]:
        return render(request, "CNS/showCNSgame.html", returnData)

    returnData.update(result["auth_data"])

    if not result["is_involved"]:
        return render(request, "CNS/showCNSgame.html", returnData)

    returnData.update(result["involved_data"])

    preferredCNScolour = result["user_profile"].preferredCNScolour if result["user_profile"].preferredCNScolour is not None else -1
    returnData["preferredCNScolour"] = preferredCNScolour

    ## NEW GAME
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
        allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeatInArray())

        returnData.update(
            {
                "displayNames": displayNames,
                "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "CNS/showCNSgame.html", returnData)


@login_required()
def processCNSturn(request):
    return process_game_with_mutex(request, _processCNSturn, mutex_prefix="processTurn_")


@login_required()
def _processCNSturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="CNS")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("CNSpresenter", currentGame.presenter())

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)

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

        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"], acting_username=request.user.username, old_latest_update=oldVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Don't notify if auto-passing
        else:
            # Send Notifications
            loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
            if len(jsonData["nextPlayer"]) > 0 and jsonData["status"] != "FINISHED" and rf.SO_TRAINING_GAME not in loadedStartingOptions:
                playerListToNotify = jsonData["nextPlayer"]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if "CnsBot" in playerListToNotify:
                    playerListToNotify.remove("CnsBot")
                if len(playerListToNotify) > 0:
                    presenter.sendYourTurnNotification(
                        "CNS",
                        playerListToNotify,
                        currentGame.id,
                        currentGame.presenter().getGameName(),
                        currentGame,
                        oldVer,
                    )

        ################ REWIND EVERY SAVE #######################

        if jsonData["saveRewind"]:
            currentRewindData = []
            # Need this as intially it is totally empty
            if currentGame.rewindData != "":
                currentRewindData = json.loads(currentGame.rewindData)

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if len(currentRewindData) == 0 or (currentRewindData[-1] != currentGame.rewindTempData and jsonData["data"] != currentGame.rewindTempData):
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
                # MAYBE ADD AN INDENT TO THIS LINE????

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        # Any game save moves the game on, so any pending kickout votes are void
        presenter.clearKickoutVotes()

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        missing_gp = currentGame.players.filter(player=_missingPlayer).first()
        if missing_gp:
            missing_gp.is_missing = True
            missing_gp.save()
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
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):
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

        loadData = ""
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # A rewind moves the game on, so any pending kickout votes are void
        presenter.clearKickoutVotes()

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # Update current players
        next_player_usernames = jsonData["nextPlayer"] if jsonData["nextPlayer"] else []
        currentGame.players.exclude(is_kicked=True).update(is_current=False)
        if next_player_usernames:
            for username in next_player_usernames:
                currentGame.players.filter(player__username=username, is_kicked=False).update(is_current=True)

        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        if len(jsonData["nextPlayer"]) > 0 and rf.SO_TRAINING_GAME not in loadedStartingOptions:
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "CnsBot" in playerListToNotify:
                playerListToNotify.remove("CnsBot")
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "CNS",
                    playerListToNotify,
                    currentGame.id,
                    currentGame.presenter().getGameName(),
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
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):  # and not jsonData["ignoreSync"]:
            return JsonResponse({"syncError": True}, safe=False)

        # Voting layer: 3p+ games need a majority vote to kick, unless the
        # requester's own vote for this target is more than 2 days old.
        # If the vote is only recorded, return straight away without kicking.
        kickout_vote_result = presenter.processKickoutVote(request.user.username, jsonData["kickedName"])
        if kickout_vote_result["voteCast"]:
            currentGame.save()
            return JsonResponse(kickout_vote_result, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        missing_gp = currentGame.players.filter(player=_missingPlayer).first()
        if missing_gp:
            missing_gp.is_missing = True
            missing_gp.is_kicked = True
            missing_gp.save()
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

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    return shared_bug_entry(request, "CNS")


@login_required()
def saveNotes(request):
    return shared_save_notes(request, "CNS")


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
            currentGame = Game.objects.get(id=game_id, gameCode="CNS")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

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


@login_required
def CNSdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="CNS")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist")) from None

    presenter = currentGame.presenter()

    if dataType == 1:
        # Send game data
        if currentGame.gameStatus == "FINISHED":
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp and user_gp.is_pending_finish:
                user_gp.is_pending_finish = False
                user_gp.save()
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    elif dataType == 2:
        # Remove user from notifications
        user_gp = currentGame.players.filter(player=request.user).first()
        if user_gp:
            user_gp.has_chat_notification = False
            user_gp.save()
        return JsonResponse(
            {"chatData": currentGame.chatData},
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


@login_required
def changeCNSzoom(request):
    return shared_save_zoom(request, "CNS")


@login_required()
def castVote(request):
    return process_game_with_mutex(request, shared_cast_vote, mutex_prefix="processTurn_")
