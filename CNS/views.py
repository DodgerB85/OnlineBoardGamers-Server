import json
import time

import base64
import gzip

from typing import TYPE_CHECKING, cast

from Lobby.sharedFunctions.db_mutex import db_mutex

from django.contrib import messages

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.db import transaction

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.models import User, Game, GamePlayer

import Lobby.sharedFunctions.constants as rf
from Lobby.gameViewHelpers import (
    build_show_game_data,
    shared_save_zoom,
    shared_save_notes,
    shared_bug_entry,
    shared_cast_vote,
)

from . import CNSconstants as rfCNS

if TYPE_CHECKING:
    from Lobby.presenters import CNSpresenter

CNS_DB_LOCK_NAME = "lockCNSgame_"


# Create your views here.
def index(request):
    return HttpResponse("Hello, world. You're at the CNS index")


def redirectLegacyCNS(request, original_id):
    """Redirect from old /CNS/:original_id format to new /CNS/:id/show format"""
    try:
        game = Game.objects.get(gameCode="CNS", original_id=original_id)
        return HttpResponseRedirect(reverse("CNS:showCNSgame", args=[game.id]))
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))


def CNShelp(request):
    return render(request, "CNS/CNShelp.html")


@login_required
def createCNSgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    players = ["player2", "player3", "player4"]
    usernames = []
    for player in players:
        username = request.POST.get(player)
        if username:
            usernames.append(username)

    if "trainingGame" not in request.POST:
        existing_users = User.objects.filter(username__in=usernames)
        existing_usernames = set(user.username for user in existing_users)

        for username in usernames:
            if username not in existing_usernames:
                messages.error(request, gettext(f"Error: {username} does not exist"))
                return HttpResponseRedirect(reverse("createCNSpage"))
            if username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return HttpResponseRedirect(reverse("createCNSpage"))

    _gameDescription = request.POST["gameDescription"]
    _maxPlayers = int(request.POST.get("playerNumber", "2"))
    _startingOptions = []
    if "trainingGame" in request.POST:
        _startingOptions.append(int(request.POST["trainingGame"]))
    if "useExpansion" in request.POST:
        _startingOptions.append(int(request.POST["useExpansion"]))
    if "tableSizeRadio" in request.POST:
        _startingOptions.append(int(request.POST.get("tableSizeRadio")))
    if "tableJunkRadio" in request.POST:
        _startingOptions.append(int(request.POST.get("tableJunkRadio")))
    if "learningGame" in request.POST:
        _startingOptions.append(int(request.POST.get("learningGame")))
    if "experiencedGame" in request.POST:
        _startingOptions.append(int(request.POST.get("experiencedGame")))

    _pace = request.POST["pace"]
    _created = SR_getTimeNow()

    with transaction.atomic():
        newGame = Game(
            gameCode="CNS",
            gameDescription=_gameDescription,
            creator=request.user,
            host=request.user,
            gamePace=_pace,
            turn=1,
            phase=rfCNS.PHASE_PLACE_HEXES,
            created=_created,
            latestUpdate=_created,
            maxPlayers=_maxPlayers,
            gameStatus="AVAILABLE",
        )
        newGame.save()

        _gameName = request.POST["gameName"]
        if _gameName != "":
            newGame.gameName = _gameName

        # Add creator as a player
        GamePlayer.objects.create(
            game=newGame,
            player=request.user,
        )

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = rf.SHADOW_PLAYER_NAMES
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
                GamePlayer.objects.create(
                    game=newGame,
                    player=shadow_player,
                )

                if request.POST[f"player{i + 1}"]:
                    display_name = request.POST[f"player{i + 1}"]
                else:
                    display_name = f"{shadow_names[i - 1]}"
                shadow_players.append(display_name)

            # Store shadow player names in creator's notes
            creator_gp = newGame.players.get(player=request.user)
            creator_gp.notes = json.dumps(shadow_players)
            creator_gp.save()

            presenter = cast("CNSpresenter", newGame.presenter())

            presenter.startGame(request)
        else:
            usernamesToNotify = []
            for i in range(2, _maxPlayers + 1):
                player_username = request.POST.get(f"player{i}", "")
                if player_username:
                    newPlayer = get_object_or_404(User, username=player_username)
                    newGame.gameStatus = "WAITING"
                    newGame.invitedPlayers.add(newPlayer)
                    usernamesToNotify.append(newPlayer.username)

            newGame.presenter().sendInviteNotifications(
                usernamesToNotify,
                newGame.presenter().getGameName(),
                _maxPlayers,
                "CNS",
            )

        newGame.kickoutDuration = request.POST["kickoutDuration"]
        zoomLevels = [24] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)
        if "trainingGame" in request.POST:
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            newGame.statsExcludedGame = True

        newGame.startingOptions = json.dumps(_startingOptions)

        if "privateGame" in request.POST:
            newGame.gameStatus = "PRIVATE"

        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("CNS", newGame.id)))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _processCNSturn(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


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
        raise Http404(gettext("Game does not exist"))

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

        # Update current players
        next_player_usernames = jsonData["nextPlayer"] if jsonData["nextPlayer"] else []
        currentGame.players.exclude(is_kicked=True).update(is_current=False)

        if next_player_usernames:
            for username in next_player_usernames:
                currentGame.players.filter(player__username=username, is_kicked=False).update(is_current=True)

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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("sendChatMessage_" + str(gameID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _sendChatMessage(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = Game.objects.get(id=game_id, gameCode="CNS")

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
        raise Http404(gettext("Game does not exist"))

    presenter = currentGame.presenter()

    if dataType == 1:
        # Send game data
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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(CNS_DB_LOCK_NAME + str(jsonData["gameID"]), timeout=5, ttl=60) as acquired:
        if acquired:
            return shared_cast_vote(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)
