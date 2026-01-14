import json
import time
import lzstring

# import requests

from contextlib import contextmanager
from django.conf import settings

from django.shortcuts import render, get_object_or_404
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required

# from django.contrib.sites.shortcuts import get_current_site
# from django.template.loader import render_to_string
from django.utils.translation import gettext  # , get_language

# from django.utils import translation

from django.urls import reverse
from django.contrib import messages
from django.db import connection
from django.db.models import Q


from .models import Bus_Game
from Lobby.models import User, Profile

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


def index(request):
    return HttpResponse("Hello Geeks")


def BusHelp(request):
    return render(request, "Bus/BusHelp.html")


@login_required()
def createBusGame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Check Not You
    if "trainingGame" not in request.POST:
        # if request.user.username in [request.POST["player2"], request.POST["player3"], request.POST["player4"], request.POST["player5"]]:
        if request.user.username in [
            request.POST.get("player3"),
            request.POST.get("player4"),
            request.POST.get("player5"),
        ]:
            messages.error(
                request, gettext("You cannot add yourself as another player")
            )
            return HttpResponseRedirect(reverse("createBusPage"))

        # CHECK APPROPRIATE NUMBER OF ENTERED USERS ARE REAL AND UNIQUE
        if request.POST["player2"] != "":
            try:
                User.objects.get(username=request.POST["player2"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 2 does not exist"))
                return HttpResponseRedirect(reverse("createBusPage"))
        if request.POST["player3"] != "":
            try:
                User.objects.get(username=request.POST["player3"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 3 does not exist"))
                return HttpResponseRedirect(reverse("createBusPage"))
        if request.POST["player4"] != "":
            try:
                User.objects.get(username=request.POST["player4"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 4 does not exist"))
                return HttpResponseRedirect(reverse("createBusPage"))
        if request.POST["player5"] != "":
            try:
                User.objects.get(username=request.POST["player5"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 5 does not exist"))
                return HttpResponseRedirect(reverse("createBusPage"))

    _gameName = request.POST["gameName"]

    _gameDescription = request.POST["gameDescription"]

    _maxPlayers = 3
    if "playerNumber" in request.POST:
        _maxPlayers = int(request.POST["playerNumber"])

    _startingOptions = ""
    if "trainingGame" in request.POST:
        _startingOptions += request.POST["trainingGame"] + ","
    # if 'learningGame' in request.POST:
    #    _startingOptions += request.POST["trainingGame"] + ","
    if "experiencedGame" in request.POST:
        _startingOptions += request.POST["experiencedGame"] + ","

    if len(_startingOptions) > 0:
        _startingOptions = _startingOptions.rstrip(_startingOptions[-1])

    _created = SR_getTimeNow()
    _pace = request.POST["pace"]

    newGame = Bus_Game(
        gameName=_gameName,
        gameDescription=_gameDescription,
        creator=request.user,
        host=request.user,
        gamePace=_pace,
        turn=0,
        phase=0,
        created=_created,
        latestUpdate=_created,
        # seatOffset=_playerSeatOffset,
        startingOptions=_startingOptions,
        maxPlayers=_maxPlayers,
        gameStatus="AVAILABLE",
    )
    newGame.save()

    _player1 = request.user
    newGame.allPlayers.add(_player1)
    newGame.save()

    if "trainingGame" in request.POST:
        newGame.gameStatus = "ACTIVE"
        _newPlayer1 = User.objects.get(username="SHADOW")
        newGame.allPlayers.add(_newPlayer1)
        newGame.rewindConsent = "222"
        displayNames = []
        if request.POST["player2"] != "":
            # displayNames = request.POST["player2"] + ","
            displayNames.append(request.POST["player2"])
        else:
            # displayNames = "'SHADOW',"
            displayNames.append("SHADOW")
        if _maxPlayers >= 3:
            _newPlayer2 = User.objects.get(username="SHADOW_2")
            newGame.allPlayers.add(_newPlayer2)
            newGame.rewindConsent = "222"
            if request.POST["player3"] != "":
                displayNames.append(request.POST["player3"])
            else:
                displayNames.append("SHADOW_2")
        if _maxPlayers >= 4:
            _newPlayer3 = User.objects.get(username="SHADOW_3")
            newGame.allPlayers.add(_newPlayer3)
            newGame.rewindConsent = "2222"
            if request.POST["player4"] != "":
                displayNames.append(request.POST["player4"])
            else:
                displayNames.append("SHADOW_3")
        if _maxPlayers >= 5:
            _newPlayer4 = User.objects.get(username="SHADOW_4")
            newGame.allPlayers.add(_newPlayer4)
            newGame.rewindConsent = "22222"
            if request.POST["player5"] != "":
                displayNames.append(request.POST["player5"])
            else:
                displayNames.append("SHADOW_4")

        # displayNames = displayNames[:-1]
        newGame.player0notes = json.dumps(displayNames)
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
            "Bus",
        )

    newGame.kickoutDuration = request.POST["kickoutDuration"]

    # newGame.zoomLevels = "200" * _maxPlayers
    zoomLevels = []
    for i in range(_maxPlayers):
        zoomLevels.append(120)
    newGame.zoomLevels = json.dumps(zoomLevels)

    newGame.statsExcludeConsent = "0" * _maxPlayers
    if "trainingGame" in request.POST:
        newGame.statsExcludeConsent = "1" * _maxPlayers
        newGame.statsExcludedGame = True

    if "privateGame" in request.POST:
        newGame.gameStatus = "PRIVATE"

    newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, (gettext("Your Practice game has started")))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "current"})
        )
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("Bus", newGame.id)))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )


def showBusGame(request, game_id):
    try:
        currentGame = (
            Bus_Game.objects.select_related(
                "host",
                "relatedTournament",
                "creator",
            )
            .prefetch_related(
                "allPlayers", "missingPlayers", "playersWithChatNotification"
            )
            .get(id=game_id)
        )
    except Bus_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {p.id for p in currentGame.allPlayers.all()}
    userObj = request.user
    username = userObj.username

    # Noe it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = currentGame.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created

    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)

    startingOptions = currentGame.startingOptions

    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 120,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
        "startingOptions": startingOptions,
        "settingsDEBUG": settings.DEBUG,
    }

    if not request.user.is_authenticated:
        return render(request, "Bus/showBusGame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)
    missing_player_ids = {p.id for p in currentGame.missingPlayers.all()}
    chat_notify_ids = {p.id for p in currentGame.playersWithChatNotification.all()}

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={currentGame.getGameCode()}"

    # Get Chat notification
    chatNotification = False
    if userObj in currentGame.playersWithChatNotification.all():
        chatNotification = True
        currentGame.playersWithChatNotification.remove(userObj)
        currentGame.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "preferredBusBoard": user_profile.preferredBusBoard,
            "nextURL": nextURL,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "Bus/showBusGame.html", returnData)

    pov = currentGame.seatPosition(request.user.username)
    if request.user.username == "BotKickStarter":
        pov = -1
    latestUpdate = currentGame.latestUpdate
    secondsToNextKickout = currentGame.getSecondsToNextKickout()

    kickoutRequired = currentGame.kickoutRequired()

    myMove = currentGame.isMyMove(request.user.username)

    # Get the Notes for the user
    notes_mapping = {
        0: currentGame.player0notes,
        1: currentGame.player1notes,
        2: currentGame.player2notes,
        3: currentGame.player3notes,
        4: currentGame.player4notes,
    }
    notes = notes_mapping.get(pov, "")

    liveNotification = user_profile.liveNotification

    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    # Involved Player
    returnData.update(
        {
            "involvedPlayer": True,
            "pov": pov,
            "latestUpdateLiteral": latestUpdate,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "chatNotification": chatNotification,
            "yourTurnAudioType": liveNotification,
            "preferredBusColour": user_profile.preferredBusColour,
        }
    )

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
            # displayNames = "SHADOW,SHADOW2"
            currentGame.player0notes = ""
            notes = ""
            currentGame.save()
        allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "Bus/showBusGame.html", returnData)


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
    except Bus_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.seatPosition(request.user.username) == 0:
        currentGame.player0notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 1:
        currentGame.player1notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 2:
        currentGame.player2notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 3:
        currentGame.player3notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 4:
        currentGame.player4notes = jsonData["notes"]
    currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required
def busData(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
    except Bus_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 2:
        # Send game data
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    if dataType == 3:
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

    return HttpResponse(status=204)  # No Content


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
        print("ERROR: Not running, %s mutex not available" % (mutex_name))


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("sendChatMessage_" + str(gameID)):
        return _sendChatMessage(request)

    return HttpResponse(status=204)  # No Content


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
        currentGame.playersWithChatNotification.remove(request.user)

        LZS = lzstring.LZString()
        chat_data = (
            currentGame.chatData or ""
        )  # Ensure chat_data is at least an empty string
        decompressed_data = LZS.decompressFromEncodedURIComponent(chat_data)
        currentChatData = json.loads(decompressed_data) if decompressed_data else []

        # if currentGame.chatData != "":
        #    currentChatData = json.loads(LZS.decompressFromEncodedURIComponent(currentGame.chatData)) if currentGame.chatData else []

        currentChatData.insert(0, jsonData["newEntry"])

        # save chat data.
        compressedChatData = LZS.compressToEncodedURIComponent(
            json.dumps(currentChatData)
        )

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        currentGame.playersWithChatNotification.set(currentGame.allPlayers.all())
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def processBusTurn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processBusTurn(request)


@login_required()
def _processBusTurn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
    except Bus_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            turn = jsonData.get(
                "turn", "N/A"
            )  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get(
                "phase", "N/A"
            )  # Get the value for 'phase' or 'N/A' if not present
            gameID = jsonData["gameID"]
            latestUpdate = jsonData["latestUpdate"]
            message = (
                f"SYNC ERROR IN: Bus save - gameID: {gameID} - User: {request.user.username} - JSON_LU: {latestUpdate} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
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

        else:
            # Send Notifications
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "HcBot"
                and not jsonData["status"] == "FINISHED"
                and currentGame.startingOptions != "102"
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "Bus",
                        playerListToNotify,
                        jsonData["gameID"],
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
            if len(currentRewindData) == 0:
                currentRewindData.append(jsonData["data"])
            else:
                # else check last one isn't same as cufrent, and if not then add
                if (
                    len(currentRewindData) == 0
                    or currentRewindData[-1] != jsonData["data"]
                ):
                    currentRewindData.append(jsonData["data"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )
    # END SAVE / CREATE

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(request.user.username)
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        currentRewindDataArray = (
            json.loads(currentGame.rewindData) if currentGame.rewindData else []
        )
        if len(currentRewindDataArray) == 0:
            return JsonResponse(
                {
                    "errorMessage": gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                },
                safe=False,
            )

        loadData = currentGame.gameData

        # ELSE if there is not any current move data
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        rewindHostPossible = currentGame.getRewindHostPossible()
        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                "rewindHostPossible": rewindHostPossible,
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
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "HcBot"
            and currentGame.startingOptions != "102"
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "Bus",
                    playerListToNotify,
                    jsonData["gameID"],
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

    elif jsonData["action"] == "saveGameDataAfterKickout":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: Bus saveGameDataAfterKickout - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        ## WHY WAS THIS COMMENTED OUT????
        # currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


@login_required
def changeBusViewport(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "saveBoardPreference":
        try:
            profile = Profile.objects.get(user=request.user)
            profile.preferredBusBoard = jsonData["boardNumber"]
            profile.save()
        except Exception as e:
            print(
                "**************************************************** CHANGE BUS BOARD ERROR:  "
                + str(e)
                + "    "
                + request.user.username
            )
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    elif jsonData["action"] == "zoom":
        try:
            currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
        except Bus_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        zoomLevels = json.loads(currentGame.zoomLevels)
        zoomLevels[jsonData["playerNumber"]] = int(jsonData["zoomLevel"])
        if jsonData["allPlayers"]:
            for i in range(len(zoomLevels)):
                zoomLevels[i] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
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
        currentGame = Bus_Game.objects.get(id=gameID)
    except Bus_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "Bus", gameID, gameData, bugDescription, currentGame.rewindData, ""
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def voteToDelete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockINDgame_" + str(gameID)):
        return _voteToDelete(request)


@login_required
def _voteToDelete(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = Bus_Game.objects.get(id=jsonData["gameID"])
    except Bus_Game.DoesNotExist:
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
            return JsonResponse(
                {
                    "voteChanged": True,
                    "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
                    "redirect_url": reverse("index"),
                }
            )

        return JsonResponse(
            {
                "voteChanged": True,
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
            },
            safe=False,
        )

    return JsonResponse({"voteChanged": False})
