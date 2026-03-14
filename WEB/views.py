import json
import time
import base64
import gzip

from decouple import config
from typing import TYPE_CHECKING, cast

from contextlib import contextmanager

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
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.gameViewHelpers import (
    build_show_game_data,
    shared_save_zoom,
    shared_save_notes,
    shared_bug_entry,
    shared_cast_vote,
)

import Lobby.sharedFunctions.constants as rf

if TYPE_CHECKING:
    from Lobby.presenters import WEBpresenter

WEB_DB_LOCK_NAME = "lockWEBgame_"


def index(request):
    return HttpResponse("Hello, world. You're at WEB")


def WEBhelp(request):
    return render(request, "WEB/WEBhelp.html")


@login_required
def createWEBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # if "trainingGame" not in request.POST and request.user.username !="admin" and request.user.username !="DodgerB":
    #    messages.error(request, gettext(f"Practice games only for now"))
    #    return HttpResponseRedirect(reverse("createWEBpage"))

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
                return HttpResponseRedirect(reverse("createWEBpage"))
            if username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return HttpResponseRedirect(reverse("createWEBpage"))

    _gameDescription = request.POST["gameDescription"]
    _maxPlayers = int(request.POST.get("playerNumber", "2"))
    _pace = request.POST["pace"]

    _created = SR_getTimeNow()

    with transaction.atomic():
        newGame = Game(
            gameCode="WEB",
            gameDescription=_gameDescription,
            creator=request.user,
            host=request.user,
            gamePace=_pace,
            turn=1,
            phase=0,
            created=_created,
            latestUpdate=_created,
            maxPlayers=_maxPlayers,
            gameStatus="AVAILABLE",
        )
        newGame.save()

        _gameName = request.POST["gameName"]
        if _gameName != "":
            newGame.gameName = _gameName

        # Create GamePlayer for the creator
        GamePlayer.objects.create(game=newGame, player=request.user)

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = rf.SHADOW_PLAYER_NAMES
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
                GamePlayer.objects.create(game=newGame, player=shadow_player)

                if request.POST[f"player{i + 1}"]:
                    display_name = request.POST[f"player{i + 1}"]
                else:
                    display_name = f"{shadow_names[i - 1]}"
                shadow_players.append(display_name)

            # Store shadow player names in creator's notes
            creator_gp = newGame.players.get(player=request.user)
            creator_gp.notes = json.dumps(shadow_players)
            creator_gp.save()

            presenter = cast("WEBpresenter", newGame.presenter())
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

            presenter = cast("WEBpresenter", newGame.presenter())
            SN_sendInviteNotifications(
                request,
                usernamesToNotify,
                presenter.getGameName(),
                _maxPlayers,
                "WEB",
            )

        newGame.kickoutDuration = request.POST["kickoutDuration"]
        zoomLevels = [0] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)

        if "trainingGame" in request.POST:
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            newGame.statsExcludedGame = True

        _startingOptions = []
        if "trainingGame" in request.POST:
            _startingOptions.append(int(request.POST["trainingGame"]))

        if "learningGame" in request.POST:
            _startingOptions.append(int(request.POST.get("learningGame")))
        if "experiencedGame" in request.POST:
            _startingOptions.append(int(request.POST.get("experiencedGame")))
        # if "useMerchants" in request.POST:
        #    _startingOptions.append(int(request.POST["useMerchants"]))

        newGame.startingOptions = json.dumps(_startingOptions)

        if "privateGame" in request.POST:
            newGame.gameStatus = "PRIVATE"

        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "current"})
        )
    else:
        messages.success(
            request, (SF_getGameCreationJsonReturn("WEB", getattr(newGame, "id")))
        )
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )


def showWEBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    result = build_show_game_data(
        request,
        game_id,
        "WEB",
        default_zoom=0,
        settings_debug_key="WEB_USE_SOURCE_CODE",
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = result["presenter"]
    all_players = result["all_players"]
    user_gp = result["user_gp"]

    returnData = {**result["base_data"]}
    returnData["settingsDEBUG"] = returnData.pop("settingsDebug")
    returnData.update(
        {
            "spoilerFree": spoilerFree,
            "replayStep": replayStep,
            "allPlayerListBySeat": json.dumps(
                presenter.getAllPlayersOrderedySeatInArray(False)
            ),
            "currentPlayers": ", ".join(presenter.getArrayOfIsCurrentPlayers()),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "preferredWEBoptions": [-1],
            "pov": -99,
            "turn": currentGame.turn,
        }
    )

    if not result["is_authenticated"]:
        return render(request, "WEB/showWEBgame.html", returnData)

    returnData.update(result["auth_data"])
    returnData["pov"] = -9

    if not result["is_involved"]:
        return render(request, "WEB/showWEBgame.html", returnData)

    returnData.update(result["involved_data"])

    preferredWEBoptions = (
        json.loads(result["user_profile"].preferredWEBoptions)
        if result["user_profile"].preferredWEBoptions != ""
        else [-1]
    )
    returnData["preferredWEBoptions"] = preferredWEBoptions

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            creator_gp = next(
                (
                    gp
                    for gp in all_players
                    if gp.player and gp.player.id == currentGame.creator_id
                ),
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

    return render(request, "WEB/showWEBgame.html", returnData)


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = WEB_DB_LOCK_NAME + name
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
            print("ERROR-WEB: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(
                    f"ERROR-WEB: Failed to release lock {mutex_name}: {e}"
                )  # Log error


def processWEBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        # get rid of decorator on processTurn
        # do more stuff
        # return render(request, "somefile.html")
        return _processWEBturn(request)


@login_required()
def _processWEBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="WEB")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("WEBpresenter", currentGame.presenter())

    if jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join(presenter.getArrayOfIsCurrentPlayers())
            message = (
                f"SYNC ERROR IN: WEB simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

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
        db_latest_update = currentGame.latestUpdate
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(db_latest_update):
            print(
                f"Sync Error: {latest_update} != {db_latest_update} Game: WEB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {db_latest_update} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

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
            current_players = presenter.getArrayOfIsCurrentPlayers()
            if (
                len(current_players) > 0
                and not any(p.startswith("WEBBot") for p in current_players)
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [player.strip() for player in current_players]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "WEB",
                        playerListToNotify,
                        getattr(currentGame, "id"),
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
            # currentRewindDataArray = currentRewindData.split("'SPLIT'")

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if len(currentRewindData) == 0 or (
                    currentRewindData[-1] != currentGame.rewindTempData
                    and jsonData["gameData"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData.append(json.loads(currentGame.rewindTempData))
                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if not currentRewindData:
                currentRewindData.append([jsonData["gameData"]])
            else:
                # else check last one isn't same as current, and if not then add
                if currentRewindData[-1][0] != jsonData["gameData"]:
                    currentRewindData.append([jsonData["gameData"]])
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
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "saveEndGame":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and str(latest_update) != str(
            currentGame.latestUpdate
        ):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: WEB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
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
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: WEB, loadRewind -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
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

        loadDataArr = []
        if len(currentRewindDataArray) > 0:
            loadDataArr = currentRewindDataArray.pop()

        while (
            len(loadDataArr) > 0
            and loadDataArr[0] == currentGame.gameData
            and len(currentRewindDataArray) > 0
        ):
            loadDataArr = currentRewindDataArray.pop()

        currentGame.gameData = loadDataArr[0]

        currentGame.rewindTempData = json.dumps(loadDataArr)
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        # currentGame.actionRewindAlterConsent()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # rewindHostPossible = currentGame.getRewindHostPossible()

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadDataArr[0],
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
        next_players = jsonData["nextPlayer"]
        if (
            len(jsonData["nextPlayer"]) > 0
            and not any(p.startswith("WebBotot") for p in next_players)
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = next_players
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "WEB",
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
        if str(latest_update) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: WEB, kickout -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {', '.join(presenter.getArrayOfIsCurrentPlayers())}"
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


def WEBdata(request, dataType=1):
    if not request.user.is_authenticated:
        # User is not logged in, redirect to login page
        return redirect(reverse("myLogin"))

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="WEB")
    except Game.DoesNotExist:
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(gettext("Game does not exist"))

    presenter = cast("WEBpresenter", currentGame.presenter())

    if dataType == 1:
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
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
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    return shared_bug_entry(
        request, "WEB", extra_info_fn=lambda g: "Options: " + g.startingOptions
    )


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = Game.objects.get(id=game_id, gameCode="WEB")

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
        currentGame.presenter().addChatNotifications(
            currentGame.presenter().getAllPlayersOrderedySeatInArray(False, True)
        )
        currentGame.presenter().removeChatNotification(request.user)

        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def saveNotesWEB(request):
    return shared_save_notes(request, "WEB")


@login_required
def saveZoom(request):
    return shared_save_zoom(request, "WEB")


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(str(jsonData["gameID"])):
        return shared_cast_vote(request)
