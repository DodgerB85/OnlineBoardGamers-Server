import json
import time
import base64
import gzip

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
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow


from .models import WEB_Game
from Lobby.models import User  # , Profile

def index(request):
    return HttpResponse("Hello, world. You're at WEB")

def WEBhelp(request):
    return render(request, "WEB/WEBhelp.html")

@login_required
def createWEBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    #if "trainingGame" not in request.POST and request.user.username !="admin" and request.user.username !="DodgerB":
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
        newGame = WEB_Game(
            gameDescription=_gameDescription,
            creator=request.user,
            host=request.user,
            gamePace=_pace,
            turn=0,
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

        newGame.allPlayers.add(request.user)

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3"]
            shadow_players = []

            for i in range(1, _maxPlayers):
                # shadow_username = f"{shadow_names[i-1]}"  # Use the base name directly
                # shadow_player = User.objects.get(username=shadow_username)
                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
                newGame.allPlayers.add(shadow_player)

                if request.POST[f"player{i + 1}"]:
                    display_name = request.POST[f"player{i + 1}"]
                else:
                    display_name = f"{shadow_names[i - 1]}"
                shadow_players.append(display_name)

            # newGame.rewindConsent = "2" * (_maxPlayers - 1)
            newGame.player0notes = json.dumps(shadow_players)
            newGame.startGame(request)
        else:
            usernamesToNotify = []
            for i in range(2, _maxPlayers + 1):
                player_username = request.POST.get(f"player{i}", "")
                if player_username:
                    newPlayer = get_object_or_404(User, username=player_username)
                    newGame.gameStatus = "WAITING"
                    newGame.invitedPlayers.add(newPlayer)
                    usernamesToNotify.append(newPlayer.username)

            SN_sendInviteNotifications(
                request,
                usernamesToNotify,
                newGame.getGameName(),
                _maxPlayers,
                "WEB",
            )

        newGame.kickoutDuration = request.POST["kickoutDuration"]
        zoomLevels = [0] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)
        # newGame.statsExcludeConsent = "0" * _maxPlayers

        if "trainingGame" in request.POST:
            # newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            # newGame.rewindConsent = "2" * (_maxPlayers)
            # newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True

        _startingOptions = []
        if "trainingGame" in request.POST:
            _startingOptions.append(int(request.POST["trainingGame"]))

        if "learningGame" in request.POST:
            _startingOptions.append(int(request.POST.get("learningGame")))
        if "experiencedGame" in request.POST:
            _startingOptions.append(int(request.POST.get("experiencedGame")))
        #if "useMerchants" in request.POST:
        #    _startingOptions.append(int(request.POST["useMerchants"]))

        newGame.startingOptions = json.dumps(_startingOptions)

        if "privateGame" in request.POST:
            newGame.gameStatus = "PRIVATE"

        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("WEB", getattr(newGame, "id"))))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))

def showWEBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    #ALLOWED_USERS = ["admin", "Joey", "Rachel", "ha.steven", "pgh_gamer","massibull", "durendal", 'DodgerB', 'BotKickStarter','Rastko','Benkyo', 'vraid', "F1087", "krieg90", "gdc", "enavico", 'PhasingPlayer']
    #ALLOWED_USERS += ["admin","user1", "ha.steven", "massibull", "durendal", "DodgerB", "BotKickStarter", "Rastko", "Benkyo", "vraid", "F1087", "krieg90", "gdc", "enavico", "PhasingPlayer", "Acacia"]
    #ALLOWED_USERS += ["ha.steven", "Kawlos", "Jasonbartfast", "Batch", "Juni", "TDUBZ", "BigBad", "massibull", "durendal", "DodgerB", "BotKickStarter", "33", "Rastko", "Burmer", "phil"]
    #ALLOWED_USERS += ["Benkyo", "Steveth", "F1087", "krieg90", "gdc", "michazhn", "Hohohale", "Rachel", "Joey", "CouldUseASkittleHelp"]

    ###print("******************************************************************************************************** WEB ACCESS: =================================================:  " + request.user.username)
    #if request.user.username not in ALLOWED_USERS:
    #    return HttpResponseRedirect(reverse("index"))

    try:
        currentGame = WEB_Game.objects.get(id=game_id)
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    gameID = getattr(currentGame, "id")
    gameName = currentGame.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

    allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat(False))

    # Logged out
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 0,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "allPlayerListBySeat": allPlayerListBySeat,
        "currentPlayers": currentGame.getCurrentPlayers(),
        "finishedGame": currentGame.gameStatus == "FINISHED",
        "preferredWEBoptions": [-1],
        "pov": -99,
        "turn": currentGame.turn,
        "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
        "settingsDEBUG": settings.DEBUG,
    }

    if not request.user.is_authenticated:
        return render(request, "WEB/showWEBgame.html", returnData)

    # Now you are logged in
    name = request.user.username
    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={currentGame.getGameCode()}"

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    chatNotification = False
    if request.user in currentGame.playersWithChatNotification.all():
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

    returnData["pov"] = -9

    returnData.update(
        {
            "name": name,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            "chatNotification": chatNotification,
        }
    )

    involvedPlayer = (
        request.user in currentGame.allPlayers.all() and request.user not in currentGame.missingPlayers.all()
    )
    if request.user.username == "BotKickStarter":
        involvedPlayer = True

    if not involvedPlayer:
        return render(request, "WEB/showWEBgame.html", returnData)

    pov = currentGame.seatPosition(request.user.username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = currentGame.getSecondsToNextKickout()

    kickoutRequired = currentGame.kickoutRequired()

    myMove = currentGame.isMyMove(request.user.username)

    ## Get the Notes for the user
    seat_position = currentGame.seatPosition(request.user.username)
    notes_dict = {
        0: currentGame.player0notes,
        1: currentGame.player1notes,
        2: currentGame.player2notes,
        3: currentGame.player3notes,
    }
    notes = notes_dict.get(seat_position, "")

    liveNotification = request.user.profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    ## Involved Player
    returnData["pov"] = pov

    preferredWEBoptions = (
        json.loads(request.user.profile.preferredWEBoptions) if request.user.profile.preferredWEBoptions != "" else [-1]
    )

    returnData.update(
        {
            "involvedPlayer": True,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "yourTurnAudioType": liveNotification,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "preferredWEBoptions": preferredWEBoptions,
            # "myStatsExcludeConsent": int(currentGame.statsExcludeConsent[pov : pov + 1]),
        }
    )
    
    print(f"DB hits: {len(connection.queries)}")

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
            currentGame.player0notes = ""
            notes = ""
            currentGame.save()
        # allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                # "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "WEB/showWEBgame.html", returnData)


@contextmanager
def db_mutex(name, timeout=10):
    mutex_name = "dbmutex_" + name
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
            print("ERROR-FCM: Not running, %s mutex not available" % (mutex_name))
            return  # Important: Exit the context manager if the lock wasn't acquired
    finally:
        # Ensure the lock is ALWAYS released, even if there's an exception
        if got_lock:  # Check if the lock was acquired before releasing
            try:
                cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
                cursor.fetchall()
            except Exception as e:
                print(f"ERROR-FCM: Failed to release lock {mutex_name}: {e}")  # Log error


def processWEBturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockWEBgame_" + str(gameID)):
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
        currentGame = WEB_Game.objects.get(id=game_id)
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
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
        # Check if old version is older than DB version, and if so, return
        if str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: WEB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        currentGame.gameData = jsonData["gameData"]
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

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            currentGame.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Only notify if game still running
        else:
            # Send Notifications
            loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
            if (
                currentGame.currentPlayers != ""
                and currentGame.currentPlayers != "WEBBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [player.strip() for player in currentGame.currentPlayers.split(",")]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "WEB",
                        playerListToNotify,
                        getattr(currentGame, "id"),
                        currentGame.getGameName(),
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
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE  TODO

    elif jsonData["action"] == "saveEndGame":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: WEB, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: WEB save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
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

        currentGame.endGame(
            request,
            jsonData["winner"],
            jsonData["finalPositions"],
            jsonData["gameID"],
        )

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE END GAME

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        # currentGame.enableStatsExclude(request.user.username)

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
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

        while len(loadDataArr) > 0 and loadDataArr[0] == currentGame.gameData and len(currentRewindDataArray) > 0:
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
                "missingPlayers": currentGame.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "WEBBot" and 102 not in loadedStartingOptions:
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "WEB",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    currentGame.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        # currentGame.enableStatsExclude(_missingPlayer.username)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
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
        currentGame = WEB_Game.objects.get(id=jsonData["gameID"])
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 1:
        returnData = {
            "gameData": currentGame.gameData,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
        }
        # Send game data
        return JsonResponse(returnData)
    elif dataType == 2:
        # Remove user from notifications
        currentGame.playersWithChatNotification.remove(request.user)
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
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = WEB_Game.objects.get(id=gameID)
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    extraInfo = (
        "Options: "
        + currentGame.startingOptions
    )

    # email data to myself
    SN_sendBugReportEmail(request, "WEB", gameID, gameData, bugDescription, currentGame.rewindData, extraInfo)

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockWEBgame_" + str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = WEB_Game.objects.get(id=game_id)

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
        currentGame.playersWithChatNotification.set(currentGame.allPlayers.exclude(username=request.user.username))
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]
    try:
        currentGame = WEB_Game.objects.get(id=game_id)
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    seat_position = currentGame.seatPosition(request.user.username)

    if seat_position in range(4):
        player_notes_field = f"player{seat_position}notes"
        setattr(currentGame, player_notes_field, notes)
        currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required
def saveZoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = WEB_Game.objects.get(id=jsonData["gameID"])
        except WEB_Game.DoesNotExist:
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
def voteToDelete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockWEBgame_" + str(gameID)):
        return _voteToDelete(request)

@login_required
def _voteToDelete(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = WEB_Game.objects.get(id=jsonData["gameID"])
    except WEB_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    # player = request.user  # Assuming the logged-in user is voting
    playerName = request.user.username  # Get the player's username

    success = currentGame.addDeleteVote(playerName)  # Pass playerName to addDeleteVote

    if success:
        # Check if all players have voted to delete
        all_voted = True
        delete_votes_data = currentGame.getDeleteVotesData()
        missingPlayers = currentGame.getMissingPlayersNamesArray()
        for player, vote in delete_votes_data.items():
            if not vote and player not in missingPlayers:
                all_voted = False
                break

        if all_voted:
            # Delete the game
            currentGame.delete()
             # Add a success message
            messages.success(request, gettext("Game successfully deleted"))
            # Redirect to the index page
            return JsonResponse({
                "voteChanged": True, 
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
                "redirect_url": reverse("index")})

        return JsonResponse(
            {
                "voteChanged": True,
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
            },
            safe=False,
        )
    
    return JsonResponse({"voteChanged": False})
