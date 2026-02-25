import json
import time
import base64
import gzip

from decouple import config
from typing import TYPE_CHECKING, cast

from contextlib import contextmanager

from django.contrib import messages
from django.conf import settings

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render, get_object_or_404, redirect
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.db import transaction, connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendPendingRNBturnNotification,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
    SN_sendFixNextTurnNotification,
)

from .common import create_rnb_game

from Lobby.models import User, Profile, Game

from Lobby.sharedFunctions.constants import DELETE_VOTE_TOPIC, STATS_EXCLUDE_VOTE_TOPIC
from Lobby.gameViewHelpers import build_show_game_data

RNB_DB_LOCK_NAME = "lockRNBgame_"

ALLOWED_USERS_RNB = [
    "admin",
    "DodgerB",
    "durendal",
    "Benkyo",
    "vraid",
    "JoshuaAcosta",
    "massibull",
    "phil",
    "timmymayes",
    "SaintJason",
    "h",
]

if TYPE_CHECKING:
    from Lobby.presenters import RnbPresenter


def index(request):
    return HttpResponse("Hello, world. You're at RNB")


def RNBhelp(request):
    return render(request, "RNB/RNBhelp.html")


def createRNBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_rnb_game(request)


def showRNBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    if request.user.username not in ALLOWED_USERS_RNB:
        return redirect("index")

    result = build_show_game_data(request, game_id, "RNB",
        default_zoom=24, settings_debug_key="RNB_USE_SOURCE_CODE",
        clear_chat_notification=False)
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("RnbPresenter", currentGame.presenter())
    user_gp = result["user_gp"]
    username = request.user.username

    returnData = {**result["base_data"]}
    # RNB uses gameDataB64 instead of gameData
    returnData["gameDataB64"] = returnData.pop("gameData")
    returnData.update({
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "pov": -99,
        "allPlayerListBySeat": json.dumps(presenter.getAllPlayersOrderedySeat(False, False)),
        "currentPlayers": currentGame.serverCurrentPlayerNamesInTurnOrder,
    })

    if not result["is_authenticated"]:
        return render(request, "RNB/showRNBgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    # RNB uses presenter.removeChatNotification + currentGame.save()
    if user_gp and user_gp.has_chat_notification:
        returnData["chatNotification"] = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    if not result["is_involved"]:
        return render(request, "RNB/showRNBgame.html", returnData)

    returnData.update(result["involved_data"])
    returnData.update({
        "currentMove": presenter.getCurrentMoveData(username),
        "trade": currentGame.playerTradeData,
    })

    ### NEW GAME
    if not currentGame.gameData or currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
            returnData["notes"] = ""
        if currentGame.startingMap != "":
            returnData["startingMap"] = json.loads(currentGame.startingMap)

        returnData["displayNames"] = displayNames

    return render(request, "RNB/showRNBgame.html", returnData)


# @login_required()
# def bugEntry(request):
#    if request.method != "POST":
#        return JsonResponse({"error": "POST request required."}, status=400)
#
#    jsonData = json.loads(request.body)
#    gameID = jsonData["gameID"]
#
#    #try:
#    #    currentGame = RNB_Game.objects.get(id=gameID)
#    #except RNB_Game.DoesNotExist:
#    #    raise Http404(gettext("Game does not exist"))
#
#    gameData = jsonData["gameData"]
#    bugDescription = jsonData["description"]
#
#    #extraInfo = "Options: " + currentGame.startingOptions
#    extraInfo = ""
#
#    # email data to myself
#    SN_sendBugReportEmail(
#        request,
#        "RNB",
#        gameID,
#        gameData,
#        bugDescription,
#        #currentGame.rewindData,
#        "",
#        extraInfo,
#    )
#
#    return JsonResponse({"bugEntrySuccess": True})


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = RNB_DB_LOCK_NAME + name
    cursor = connection.cursor()
    got_lock = False  # Initialize got_lock to False
    try:
        # timeout returns with error
        cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
        ((got,),) = cursor.fetchall()
        got_lock = bool(got)  # Convert to boolean for clarity

        if got_lock:
            yield  # Execute the code within the 'with' block
        else:
            # time out or can't open?
            print("ERROR-RNB: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(f"ERROR-RNB: Failed to release lock {mutex_name}: {e}")  # Log error


def processRNBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _processRNBturn(request)


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
        raise Http404(gettext("Game does not exist"))

    presenter = cast("RnbPresenter", currentGame.presenter())

    if jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join(presenter.getCurrentPlayersArray())
            message = (
                f"SYNC ERROR IN: RNB simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # currentGame.gameDataBLOB = jsonData["data"]
        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        response_data = {
            "completed": True,
            # "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "saveGame":
        return performSaveGame(request, currentGame, jsonData)

    # END SAVE / CREATE

    elif jsonData["action"] == "saveStackMove":
        # We don't mind if we are "out of sync" as moves will only get processed in server order anyway
        # But we can reject earlier moves that are prior to the game's current state
        savingTurn = jsonData["turn"]
        savingPhase = jsonData["phase"]
        if savingTurn < currentGame.turn or (savingTurn == currentGame.turn and savingPhase < currentGame.phase):
            print(
                f"RNB saveStackMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = f"RNB saveStackMove turn/phase Error: DB turn: {currentGame.turn}/{currentGame.phase} >> later than >> {savingTurn}/{savingPhase} Game: RNB id: {currentGame.id}, save -- user: {request.user.username}"
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

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

        # First, add the conflict preset move
        if jsonData["conflictPresetData"] != "":
            conflictPresetMove = PdecompressData(jsonData["conflictPresetData"])
            conflictPresetMove["status"] = "pending"
            PaddMoveToPlayer(currentGame, nameToUse, conflictPresetMove)

        # If the client and server both agree that this person is first, then the browser will only allow valid moves
        # So it must be a valid move. So update the game with the ALREADY PROCESSED game data, and move on
        if jsonData["isCurrent"] == True and (
            len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0
            and currentGame.serverCurrentPlayerNamesInTurnOrder[0] == nameToUse
            and int(currentGame.latestUpdate) == int(jsonData["latestUpdate"])
        ):
            # Perform most of a normal save
            db_latest_update = currentGame.latestUpdate
            latest_update = jsonData.get("latestUpdate", 0)
            game_id = currentGame.id
            presenter = cast("RnbPresenter", currentGame.presenter())

            gameDataStr = jsonData["gameData"]
            # raw_binary = base64.b64decode(gameDataStr)
            # currentGame.gameDataBLOB = raw_binary
            currentGame.gameData = gameDataStr
            currentGame.turn = jsonData["turn"]
            currentGame.phase = jsonData["phase"]

            oldVer = db_latest_update
            newVer = (int(db_latest_update) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

            presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allCurrentPlayers"])

            # SAVE BEFORE NOTIFICATIONS
            currentGame.save()

            ################ REWIND EVERY SAVE #######################
            # Don't save rewind if all players have moved - wait for client to process phase
            if jsonData["saveRewind"] and len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
                doSaveRewind(currentGame, jsonData)

            ################ END REWIND EVERY SAVE #######################

            currentGame.save()

            # time.sleep(10)
            print(f"servNames: {currentGame.serverCurrentPlayerNamesInTurnOrder} len: {len(currentGame.serverCurrentPlayerNamesInTurnOrder)}")

            # Now get the NEXT set of moves -- and set the next player's stack to current
            if len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0:
                setPlayerStackToCurrent(currentGame, currentGame.serverCurrentPlayerNamesInTurnOrder[0])

            response_data = {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "savingFromStackMove": True,
                "stacks": getAllCurrentStackMoves(currentGame),
                # "nextPhase": len(currentGame.serverCurrentPlayerNamesInTurnOrder) == 0,
                "sCurrentPlayers": currentGame.serverCurrentPlayerNamesInTurnOrder,
            }

            return JsonResponse(response_data, safe=False)

        # Otherwise, You are not current in BOTH server and browser.
        # But if you are the current player on the SERVER, thenn proceed for immediate processing
        # If you are current player on SERVER, the client must have missed an update
        # So return the mvoe for immediate client-side verification
        if (
            len(currentGame.serverCurrentPlayerNamesInTurnOrder) > 0
            and currentGame.serverCurrentPlayerNamesInTurnOrder[0] == nameToUse
            and int(currentGame.latestUpdate) == int(jsonData["latestUpdate"])
        ):
            # First save the move in case the return somehow fails
            newMoveEntry = {
                "turn": jsonData["turn"],
                "phase": jsonData["phase"],
                "actionStack": jsonData["actionStack"],
                "status": "current",
            }
            PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

            response_data = {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "immediateProcess": True,
                "stacks": getAllCurrentStackMoves(currentGame),
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
        }
        PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry)

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "savedMoveForLater": True,
        }

        return JsonResponse(response_data, safe=False)

    # End stack move

    elif jsonData["action"] == "saveAndUpdateNotifictionsAfterStack":
        db_latest_update = currentGame.latestUpdate
        latest_update = jsonData.get("latestUpdate", 0)
        game_id = currentGame.id
        presenter = cast("RnbPresenter", currentGame.presenter())
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(db_latest_update):
            print(f"Sync Error: {latest_update} != {db_latest_update} Game: RNB, save -- user: {request.user.username}")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        gameDataStr = jsonData["gameData"]
        # raw_binary = base64.b64decode(gameDataStr)
        # currentGame.gameDataBLOB = raw_binary
        currentGame.gameData = gameDataStr
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = db_latest_update
        newVer = (int(db_latest_update) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
        
        print(f"allcurrentplayers: {jsonData['allCurrentPlayers']}")

        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allCurrentPlayers"])

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
            loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
            nextCurrentPlayer = jsonData["nextCurrentPlayer"]
            if (
                nextCurrentPlayer != ""
                and nextCurrentPlayer != "RnbBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [nextCurrentPlayer]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    if jsonData["currentPlayerNeedsToFixMove"] == True:
                        SN_sendFixNextTurnNotification(
                            request,
                            "RNB",
                            playerListToNotify,
                            getattr(currentGame, "id"),
                            presenter.getGameName(),
                            currentGame,
                            oldVer,
                        )
                    else:
                        SN_sendNextTurnNotification(
                            request,
                            "RNB",
                            playerListToNotify,
                            getattr(currentGame, "id"),
                            presenter.getGameName(),
                            currentGame,
                            oldVer,
                        )
            pendingPlayers = jsonData["pendingPlayers"]
            if (
                len(pendingPlayers) > 0
                and not any(p.startswith("RnbBot") for p in pendingPlayers)
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [player.strip() for player in pendingPlayers]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendPendingRNBturnNotification(
                        request,
                        "RNB",
                        playerListToNotify,
                        getattr(currentGame, "id"),
                        presenter.getGameName(),
                        currentGame,
                        oldVer,
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

    elif jsonData["action"] == "saveEndGame":
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(currentGame.latestUpdate):
            print(f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, save -- user: {request.user.username}")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        # currentGame.gameDataBLOB = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = currentGame.latestUpdate
        newVer = (int(oldVer) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        presenter.endGame(
            request,
            jsonData["winner"],
            jsonData["finalPositions"],
            jsonData["gameID"],
        )

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE END GAME

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if str(latest_update) != str(currentGame.latestUpdate):
            print(f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, loadRewind -- user: {request.user.username}")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

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
                "gameData": loadDatab64,
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
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextCurrentPlayers"])

        gameDataStr = jsonData["gameData"]
        # raw_binary = base64.b64decode(gameDataStr)
        # currentGame.gameDataBLOB = raw_binary
        currentGame.gameData = gameDataStr

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        nextPlayersArr = jsonData["nextCurrentPlayers"]
        if len(nextPlayersArr) > 0 and not any(p.startswith("RnbBot") for p in nextPlayersArr) and 102 not in loadedStartingOptions:
            playerListToNotify = [p for p in nextPlayersArr if p != request.user.username and p != "RnbBot"]

            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "RNB",
                    playerListToNotify,
                    getattr(currentGame, "id"),
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
        if str(latest_update) != str(currentGame.latestUpdate):  # and not jsonData["ignoreSync"]:
            print(f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: RNB, kickout -- user: {request.user.username}")
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: RNB kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

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
    new_b64_point = jsonData["gameData"]

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
    presenter = cast("RnbPresenter", currentGame.presenter())
    # Check if old version is older than DB version, and if so, return
    if str(latest_update) != str(db_latest_update):
        print(f"Sync Error: {latest_update} != {db_latest_update} Game: RNB, save -- user: {request.user.username}")
        turn = jsonData.get("turn", "N/A")
        phase = jsonData.get("phase", "N/A")
        message = (
            f"SYNC ERROR IN: RNB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
            f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
            f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {", ".join(presenter.getCurrentPlayersArray())}"
        )
        SN_sendAdminErrorMessage(request, message)
        return JsonResponse({"syncError": "12345"}, safe=False)

    gameDataStr = jsonData["gameData"]
    # raw_binary = base64.b64decode(gameDataStr)
    # currentGame.gameDataBLOB = raw_binary
    currentGame.gameData = gameDataStr
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

    presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["allCurrentPlayers"])

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
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        nextCurrentPlayer = jsonData["nextCurrentPlayer"]
        if len(nextCurrentPlayer) != "" and nextCurrentPlayer != "RnbBot" and jsonData["status"] != "FINISHED" and 102 not in loadedStartingOptions:
            playerListToNotify = [nextCurrentPlayer]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "RNB",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )
        pendingPlayers = jsonData["pendingPlayers"]
        if (
            len(pendingPlayers) > 0
            and not any(p.startswith("RnbBot") for p in pendingPlayers)
            and jsonData["status"] != "FINISHED"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = [player.strip() for player in pendingPlayers]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendPendingRNBturnNotification(
                    request,
                    "RNB",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _sendChatMessageRNB(request)


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
        currentGame.presenter().addChatNotifications(currentGame.presenter().getAllPlayersOrderedySeat(False, True))
        currentGame.presenter().removeChatNotification(request.user)

        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntryRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode="RNB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    extraInfo = "Options: " + currentGame.startingOptions

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "RNB",
        gameID,
        gameData,
        bugDescription,
        currentGame.rewindData,
        extraInfo,
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def saveNotesRNB(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]
    try:
        currentGame = Game.objects.get(id=game_id, gameCode="RNB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # This directly saves the notes
    currentGame.players.filter(player=request.user).update(notes=notes)

    return JsonResponse({"notePosted": True})


@login_required
def saveZoomRNB(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="RNB")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        zoomLevels = json.loads(currentGame.zoomLevels)

        if jsonData.get("allPlayers"):
            for i in range(len(zoomLevels)):
                zoomLevels[i] = int(jsonData["zoomLevel"])
        else:
            zoomLevels[jsonData["playerNumber"]] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def RNBdata(request, dataType=1):
    if not request.user.is_authenticated:
        # User is not logged in, redirect to login page
        return redirect(reverse("myLogin"))

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="RNB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("RnbPresenter", currentGame.presenter())

    if dataType == 1:
        # 1. Get the raw binary (Gzip + MsgPack)
        # raw_blob = currentGame.gameDataBLOB or b""
        # 2. Encode to Base64 so it can travel safely in HTML
        # gameDataB64 = base64.b64encode(raw_blob).decode("utf-8")
        gameDataB64 = currentGame.gameData
        currentMove = presenter.getCurrentMoveData(request.user.username)
        returnData = {
            "gameDataB64": gameDataB64,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
            "currentMove": currentMove,
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
        currentMove = presenter.getCurrentMoveData(request.user.username)
        return JsonResponse(
            {
                "latest": False,
                "gameDataB64": gameDataB64,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
                "currentMove": currentMove,
            }
        )

    return HttpResponse(status=204)  # No Content


#########################################################
#
#   SIMUL MOVE FUNCTIONS - MOVE TO PRESENTER LATER
#
#########################################################


def PaddMoveToPlayer(currentGame, nameToUse, newMoveEntry):
    newMoveEntry["player"] = nameToUse
    gp_player = currentGame.players.only("moveDataJSON").get(player__username=nameToUse)

    moves = gp_player.moveDataJSON or []
    turn, phase = newMoveEntry["turn"], newMoveEntry["phase"]

    # Use enumerate for cleaner, faster indexing
    for i, entry in enumerate(moves):
        if entry.get("turn") == turn and entry.get("phase") == phase:
            moves[i] = newMoveEntry
            break
    else:
        # 'else' on a loop only runs if no 'break' occurred
        moves.append(newMoveEntry)

    gp_player.moveDataJSON = moves
    gp_player.save(update_fields=["moveDataJSON"])  # ONLY save this field


def PdecompressData(string_to_decompress):
    # return json.loads(gzip.decompress(base64.b64decode(string_to_decompress)).decode("utf-8"))
    return json.loads(gzip.decompress(bytearray(base64.b64decode(string_to_decompress))).decode("utf-8"))


def setPlayerStackToCurrent(currentGame, playerName):
    gp = currentGame.players.filter(player__username=playerName).first()
    print(f"Setting {playerName} to current: got {gp}")
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
                entryToAdd["player"] = gp.player.username
                currentStackMoves.append(entryToAdd)
                break

    return currentStackMoves


def getAllCurrentStackMoves(currentGame):
    currentStackMoves = []
    for gp in currentGame.players.all():
        gp_moveDataJSON = gp.moveDataJSON if gp.moveDataJSON else []
        for entry in gp_moveDataJSON:
            entry["player"] = gp.player.username
            currentStackMoves.append(entry)

    return currentStackMoves
