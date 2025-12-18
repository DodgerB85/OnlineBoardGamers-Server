import json
import time

# import lzstring
import base64
import gzip

from contextlib import contextmanager

from django.contrib import messages
from django.conf import settings

from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext
from django.shortcuts import render  # , redirect
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.db import transaction, connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import SF_getGameCreationJsonReturn, SF_updateFlexiTime
from Lobby.sharedFunctions.sharedNotifications import SN_sendInviteNotifications, SN_sendNextTurnNotification, SN_sendBugReportEmail
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow  

from .models import CNS_Game
from Lobby.models import User, Profile

# Create your views here.
def index(request):
    return HttpResponse("Hello, world. You're at the CNS index")


def CNShelp(request):
    return render(request, "CNS/CNShelp.html")


@login_required
def createCNSgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # if 'trainingGame' not in request.POST and request.user.username != "admin" and request.user.username != "DodgerB":
    #    messages.error(request, gettext('Practice games only for now'))
    #    return HttpResponseRedirect(reverse("createCNSpage"))

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
        newGame = CNS_Game(gameDescription=_gameDescription, creator=request.user, host=request.user, gamePace=_pace, turn=1, phase=0, created=_created, latestUpdate=_created, maxPlayers=_maxPlayers, gameStatus="AVAILABLE")
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
                shadow_player = User.objects.get(username=f"{shadow_names[i-1]}")
                newGame.allPlayers.add(shadow_player)

                if request.POST[f"player{i+1}"]:
                    display_name = request.POST[f"player{i+1}"]
                else:
                    display_name = f"{shadow_names[i-1]}"
                shadow_players.append(display_name)

            #newGame.rewindConsent = "2" * (_maxPlayers - 1)
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

            SN_sendInviteNotifications(request, usernamesToNotify, newGame.getGameName(), _maxPlayers, "CNS")

        newGame.kickoutDuration = request.POST["kickoutDuration"]
        zoomLevels = [24] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)
        newGame.statsExcludeConsent = "0" * _maxPlayers

        if "trainingGame" in request.POST:
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            # newGame.rewindConsent = "2" * (_maxPlayers)
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True

        newGame.startingOptions = json.dumps(_startingOptions)
        
        if "privateGame" in request.POST:
            newGame.gameStatus = "PRIVATE"
        
        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("CNS", getattr(newGame, "id"))))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


def showCNSgame(request, game_id, spoilerFree=False, replayStep=1):
    try:
        currentGame = CNS_Game.objects.select_related(
            "host", "creator"
        ).prefetch_related(
            "allPlayers", 
            "missingPlayers", 
            "playersWithChatNotification"
        ).get(id=game_id)
    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
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
    KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

    # Logged in but not involved
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 24,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "settingsDebug": settings.DEBUG,
    }

    if not request.user.is_authenticated:
        return render(request, "CNS/showCNSgame.html", returnData)

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

    latestUpdate = currentGame.latestUpdate

    # Get Chat notification
    chatNotification = False
    if user_id in chat_notify_ids:
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={currentGame.getGameCode()}"

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
        }
    )

    if not involvedPlayer:
        return render(request, "CNS/showCNSgame.html", returnData)

    pov = currentGame.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = currentGame.getSecondsToNextKickout()

    kickoutRequired = currentGame.kickoutRequired()

    myMove = currentGame.isMyMove(username)

    # Get the Notes for the user
    seat_position = currentGame.seatPosition(username)
    notes_dict = {
        0: currentGame.player0notes,
        1: currentGame.player1notes,
        2: currentGame.player2notes,
        3: currentGame.player3notes,
    }
    notes = notes_dict.get(seat_position, "")



    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    preferredCNScolour = user_profile.preferredCNScolour if user_profile.preferredCNScolour is not None else -1

    # Involved Player
    returnData.update(
        {
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "chatNotification": chatNotification,
            "yourTurnAudioType": liveNotification,
            "preferredCNScolour": preferredCNScolour,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "myStatsExcludeConsent": int(currentGame.statsExcludeConsent[pov : pov + 1]),
        }
    )

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
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
        
    return render(request, "CNS/showCNSgame.html", returnData)


@contextmanager
def db_mutex(name, timeout=10):
    # if settings.DEBUG:
    # if 1==2:
    #    print('Not creating mutex ' + name)
    #    yield
    #    return
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
        print("ERROR-CNS: Not running, %s mutex not available" % (mutex_name))


@login_required()
def processCNSturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processCNSturn(request)

    

@login_required()
def _processCNSturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = CNS_Game.objects.get(id=game_id)
    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        if "checkName" in jsonData:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(currentGame.kickoutFlexiData, currentGame.latestUpdate, int(time.time()) * 1000, jsonData["checkName"], currentGame.kickoutDuration)
        else:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(currentGame.kickoutFlexiData, currentGame.latestUpdate, int(time.time()) * 1000, request.user.username, currentGame.kickoutDuration)

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            currentGame.endGame(request, jsonData["winner"], jsonData["finalPositions"], jsonData["gameID"])

        # Don't notify if auto-passing
        else:
            # Send Notifications
            loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
            if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "CnsBot" and jsonData["status"] != "FINISHED" and 102 not in loadedStartingOptions:
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(request, "CNS", playerListToNotify, currentGame.id, currentGame.getGameName(), currentGame, oldVer)

        ################ REWIND EVERY SAVE #######################

        if jsonData["saveRewind"]:
            currentRewindData = []
            # Need this as intially it is totally empty
            if currentGame.rewindData != "":
                currentRewindData = json.loads(currentGame.rewindData)
            # currentRewindDataArray = currentRewindData.split("'SPLIT'")

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

        response_data = {"latestUpdate": currentGame.latestUpdate, "secondsToNextKickout": currentGame.getSecondsToNextKickout()}

        return JsonResponse(response_data, safe=False)

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
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)

        if len(currentGame.rewindData) == 0:
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        currentRewindDataArray = json.loads(currentGame.rewindData)
        if len(currentRewindDataArray) == 0:
            return JsonResponse({"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")}, safe=False)

        loadData = ""
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
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "CnsBot" and 102 not in loadedStartingOptions:
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(request, "CNS", playerListToNotify, currentGame.id, currentGame.getGameName(), currentGame, currentGame.latestUpdate)

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if latest_update != "9999999999999" and latest_update != str(currentGame.latestUpdate):  # and not jsonData["ignoreSync"]:
            # print("Sync Error Kickout Save " + str(jsonData["gameID"]))
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        # Clears data and saves record - DONT DELETE FAC MOVES
        # currentGame.clearAllMoveData()

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


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = CNS_Game.objects.get(id=gameID)
    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(request, "CNS", gameID, gameData, bugDescription, currentGame.rewindData, "")

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]

    try:
        currentGame = CNS_Game.objects.get(id=game_id)
    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    seat_position = currentGame.seatPosition(request.user.username)
    if seat_position in range(5):
        player_notes_field = f"player{seat_position}notes"
        setattr(currentGame, player_notes_field, notes)
        currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("sendChatMessage_" + str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]
        # LZS = lzstring.LZString()

        currentGame = CNS_Game.objects.get(id=game_id)

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

        # currentChatData = json.loads(LZS.decompressFromEncodedURIComponent(currentGame.chatData)) if currentGame.chatData else []
        # currentChatData.insert(0, new_entry)

        # save chat data.
        # compressedChatData2 = LZS.compressToEncodedURIComponent(
        #        json.dumps(currentChatData))
        #

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        currentGame.playersWithChatNotification.set(currentGame.allPlayers.exclude(username=request.user.username))
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content

@login_required
def CNSdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = CNS_Game.objects.get(id=jsonData["gameID"])
    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 1:
        # Send game data
        return JsonResponse({"gameData": currentGame.gameData, 
                             "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                             "latestUpdate": currentGame.latestUpdate
                             })
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
        return JsonResponse({
            "latest": False, 
            "gameData": currentGame.gameData, 
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            "latestUpdate": currentGame.latestUpdate
            })

    return HttpResponse(status=204)  # No Content

@login_required
def changeCNSzoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = CNS_Game.objects.get(id=jsonData["gameID"])
        except CNS_Game.DoesNotExist:
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

@login_required
def processStatsExcludeConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    try:
        currentGame = CNS_Game.objects.get(id=jsonData["gameID"])

    except CNS_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    currentGame.enableStatsExclude(request.user.username)
    currentGame.save()
    return JsonResponse({"statsExcludedGame": currentGame.statsExcludedGame})
