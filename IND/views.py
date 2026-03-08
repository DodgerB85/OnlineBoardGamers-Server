import json
import time
import base64
import gzip
import copy

from contextlib import contextmanager

from decouple import config
from typing import TYPE_CHECKING, cast

from django.contrib import messages

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render, get_object_or_404, redirect
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.db import transaction, connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)

from .common import create_ind_game

from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.gameViewHelpers import build_show_game_data, shared_save_zoom, shared_save_notes, shared_bug_entry, shared_cast_vote

if TYPE_CHECKING:
    from Lobby.presenters import INDpresenter

INDsuperUsers = ["BotKickStarter"]


def index(request):
    return HttpResponse("Hello, world. You're at IND")


def showINDgameOLD(request):
    return HttpResponse(
        "Link defunct. Click logo in lobby, or use: https://www.onlineboardgamers.com/createINDpage/"
    )


def INDhelp(request):
    return render(request, "IND/INDhelp.html")


@login_required
def createINDgame(request):
    return create_ind_game(request)

def showINDgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(request, game_id, "IND",
        default_zoom=0, settings_debug_key="IND_USE_SOURCE_CODE")
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("INDpresenter", currentGame.presenter())
    user_gp = result["user_gp"]
    username = request.user.username
    userObj = request.user

    returnData = {**result["base_data"]}
    returnData["settingsDEBUG"] = returnData.pop("settingsDebug")
    returnData.update({
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeatInArray(False)),
        "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
        "finishedGame": currentGame.gameStatus == "FINISHED",
        "preferredINDoptions": [-1, 0, 0, 1, 1, 1],
        "pov": -99,
        "preMoves": "",
        "sideData": "",
    })

    if not result["is_authenticated"]:
        return render(request, "IND/showINDgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    preferredINDoptions = (
        json.loads(result["user_profile"].preferredINDoptions)
        if result["user_profile"].preferredINDoptions != ""
        else [-1, 0, 0, 1, 1, 1]
    )
    if len(preferredINDoptions) < 6:
        preferredINDoptions.extend([1] * (6 - len(preferredINDoptions)))
    returnData["preferredINDoptions"] = preferredINDoptions

    if not result["is_involved"]:
        return render(request, "IND/showINDgame.html", returnData)

    returnData.update(result["involved_data"])

    pov = result["pov"]

    # IND: only get notes if pov >= 0
    notes = ""
    if pov >= 0:
        if user_gp:
            notes = user_gp.notes
    returnData["notes"] = notes

    # IND: zoom fallback to 100 when pov < 0
    if pov < 0:
        returnData["myZoomLevel"] = 100

    returnData.update({
        "isHost": currentGame.host == userObj,
        "preMoves": presenter.getCompressedPreMoveArr(username),
        "sideData": presenter.getAllPreMoveDataCompressed(),
    })

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            # For shadow games, display names are stored in the first player's notes
            user_gp = currentGame.players.filter(player=userObj).first()
            if user_gp and user_gp.notes:
                displayNames = user_gp.notes
                user_gp.notes = ""
                user_gp.save()
                returnData["notes"] = ""

        returnData["displayNames"] = displayNames

    return render(request, "IND/showINDgame.html", returnData)


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = "dbmutex_" + name
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
        print("ERROR-IND: Not running, %s mutex not available" % (mutex_name))


@login_required()
def processINDturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockINDgame_" + str(gameID)):
        return _processINDturn(request)


@login_required()
def _processINDturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="IND")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("INDpresenter", currentGame.presenter())

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: IND, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: IND save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        # If saving into >= operations, delete all pre-moves
        if jsonData["phase"] >= 7:
            presenter.clearAllPreMoveData()
        # If saving less than ops, from >= ops, delete all pre-moves
        elif currentGame.phase >= 7 and jsonData["phase"] < 7:
            presenter.clearAllPreMoveData()

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

        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Only notify if game still running
        else:
            # Send Notifications
            loadedStartingOptions = (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            )
            if (
                len(jsonData["nextPlayer"]) > 0
                and jsonData["nextPlayer"][0] != "IndBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [
                    player.strip() for player in jsonData["nextPlayer"]
                ]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                # Also remove the player if it is R&D phase and they have a pre move
                if (
                    len(playerListToNotify) > 0
                    and jsonData["phase"] == 6
                    and presenter.doesPlayerHavePreMove(playerListToNotify[0])
                ):
                    playerListToNotify.remove(playerListToNotify[0])
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "IND",
                        playerListToNotify,
                        currentGame.id,
                        presenter.getGameName(),
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
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "sideData": presenter.getAllPreMoveDataCompressed(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        _missingPlayer_gp = currentGame.players.filter(player=_missingPlayer).first()
        if _missingPlayer_gp:
            _missingPlayer_gp.is_missing = True
            _missingPlayer_gp.save()
        presenter.checkForHostChange(_missingPlayer)

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": presenter.getArrayOfIsCurrentPlayers(),
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: IND, loadRewind -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: IND loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

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

        # Just set a default value
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

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
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
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])
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
            len(jsonData["nextPlayer"]) > 0
            and jsonData["nextPlayer"][0] != "IndBot"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "IND",
                    playerListToNotify,
                    currentGame.id,
                    presenter.getGameName(),
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
        if str(latest_update) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: IND, kickout -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: IND kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        _missingPlayer_gp = currentGame.players.filter(player=_missingPlayer).first()
        if _missingPlayer_gp:
            _missingPlayer_gp.is_missing = True
            _missingPlayer_gp.is_kicked = True
            _missingPlayer_gp.save()
        presenter.checkForHostChange(_missingPlayer)

        # Clears data and saves record - DONT DELETE FAC MOVES
        # currentGame.clearAllMoveData()

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

    ################### PRE TURN
    elif jsonData["action"] == "preTurn":
        # Check if old version is older than DB version, and if so, return
        if latest_update != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: IND preTurn - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # decompress the move data array
        # moveDataArray = json.loads(gzip.decompress(bytearray(base64.b64decode(jsonData["data"]))).decode("utf-8"))
        moveDataArray = jsonData["data"]

        # First, check for deletion
        if len(moveDataArray) == 0:
            presenter.insertPlayerPreMoveData(
                request.user.username, jsonData["prePhase"], moveDataArray
            )
        else:
            # If turns don't match, replace with no data
            if moveDataArray[0] != currentGame.turn:
                moveDataArray = []

            # add / replace the current phase move data. # recompress and save.
            presenter.insertPlayerPreMoveData(
                request.user.username, jsonData["prePhase"], moveDataArray
            )

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "data": presenter.getCompressedPreMoveArr(request.user.username),
        }

        return JsonResponse(response_data, safe=False)

    ################### END PRE TURN

    return HttpResponse(status=204)  # No Content


@login_required
def INDdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="IND")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist"))

    presenter = cast("INDpresenter", currentGame.presenter())

    if dataType == 1:
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
            "preMoves": presenter.getCompressedPreMoveArr(request.user.username),
        }
        # Send game data
        return JsonResponse(returnData)
    elif dataType == 2:
        # Remove user from notifications
        user_gp = currentGame.players.filter(player=request.user).first()
        if user_gp:
            user_gp.has_chat_notification = False
            user_gp.save()
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
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
                "preMoves": presenter.getCompressedPreMoveArr(request.user.username),
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    return shared_bug_entry(request, "IND")


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockINDgame_" + str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = Game.objects.get(id=game_id, gameCode="IND")

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
        currentGame.save()

        # Now add notifications to everyone except request.user
        currentGame.players.exclude(player=request.user).update(
            has_chat_notification=True
        )

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def saveNotes(request):
    return shared_save_notes(request, "IND")


@login_required
def saveZoom(request):
    return shared_save_zoom(request, "IND")


@login_required
def forkINDgame(request):
    if request.method != "POST":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    try:
        source_game = Game.objects.get(id=jsonData["gameID"], gameCode="IND")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # Clone the currentGame object
    # newGame = copy.deepcopy(currentGame)
    # newGame.pk = None  # Set id to None to create a new object
    # newGame.original_id = None  # Clear original_id for the fork
    # Modify the fields you want to change
    # newGame.gameName = currentGame.gameName + " (fork)"
    # newGame.save()
    
    old_presenter = cast("INDpresenter", source_game.presenter())
    
    original_players = list(source_game.players.all())

    newGame = source_game
    newGame.pk = None
    # newGame.id = None
    newGame.gameName = f"{old_presenter.getGameName()} (fork)"
    newGame.gameStatus = "ACTIVE"
    newGame.save()  # This creates the new record and assigns a new ID

    # Copy GamePlayer relationships
    # all_game_players = currentGame.players.all()
    for gp in original_players:
        GamePlayer.objects.create(
            game=newGame,
            player=gp.player,
            seat_order=gp.seat_order,
            is_missing=gp.is_missing,
            is_kicked=gp.is_kicked,
            is_current=gp.is_current,
            has_chat_notification=gp.has_chat_notification,
            winner=gp.winner,
            notes=gp.notes,
        )

    # Add all current players to invited players
    # for gp in all_game_players:
    #    if gp.player and gp.player.username != request.user.username:
    #        newGame.invitedPlayers.add(gp.player)

    # Remove all but current player from GamePlayer
    # newGame.players.exclude(player=request.user).delete()

    # Save the newGame object
    newGame.save()

    return JsonResponse({"response": "ok", "newID": newGame.id})



@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(str(jsonData["gameID"])):
        return shared_cast_vote(request)
