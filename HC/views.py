from cmath import phase
import json
import time

# from datetime import datetime
import requests
import re
import lzstring
from random import randint

from django.shortcuts import render, redirect, get_object_or_404
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.contrib.sites.shortcuts import get_current_site
from django.contrib import messages
from django.template.loader import render_to_string
from django.urls import reverse
from django.db.models import Q

from contextlib import contextmanager

from django.db import connection
from django.conf import settings

from Lobby.models import User, Profile
from .models import HC_Game

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendBugReportEmail,
    SN_sendNextTurnNotification,
    SN_sendAdminErrorMessage
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from django.utils.translation import gettext, get_language
from django.utils import translation


def index(request):
    return HttpResponse("Hello Geeks")


@login_required
def HCgameSummary(request, game_id):
    try:
        currentGame = HC_Game.objects.get(id=game_id)
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    return render(
        request,
        "HC/HCgameSummary.html",
        {
            # "now": now,
            "settingsDEBUG": settings.DEBUG,
            "gameData": currentGame.gameData,
            "gameID": getattr(currentGame, "id"),
        },
    )


#################### API ##################

# This creates ths initial record
# newGame = HC_Game(gameName=_gameName, creator=request.user, host=request.user, gamePace=_pace, turn=0, phase=0, created=_created, latestUpdate=_created,
#                      seatOffset=_playerSeatOffset, startingOptions=_startingOptions, maxPlayers=_maxPlayers, gameStatus="AVAILABLE")@login_required()
#   newGame.kickoutDuration = request.POST["kickoutDuration"]
#    newGame.zoomLevels = "200" * _maxPlayers
#    newGame.statsExcludeConsent = "0" * _maxPlayers
#    if 'trainingGame' in request.POST:
#        newGame.statsExcludeConsent = "1" * _maxPlayers
#        newGame.statsExcludedGame = True
# Set up rewind consent for training game


@login_required()
def createHCgame(request):
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
            return HttpResponseRedirect(reverse("createHCpage"))

        # CHECK APPROPRIATE NUMBER OF ENTERED USERS ARE REAL AND UNIQUE
        if request.POST["player2"] != "":
            try:
                User.objects.get(username=request.POST["player2"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 2 does not exist"))
                return HttpResponseRedirect(reverse("createHCpage"))
        if request.POST["player3"] != "":
            try:
                User.objects.get(username=request.POST["player3"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 3 does not exist"))
                return HttpResponseRedirect(reverse("createHCpage"))
        if request.POST["player4"] != "":
            try:
                User.objects.get(username=request.POST["player4"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 4 does not exist"))
                return HttpResponseRedirect(reverse("createHCpage"))
        if request.POST["player5"] != "":
            try:
                User.objects.get(username=request.POST["player5"])
            except User.DoesNotExist:
                messages.error(request, gettext("Error: Player 5 does not exist"))
                return HttpResponseRedirect(reverse("createHCpage"))

    _gameName = request.POST["gameName"]

    _gameDescription = request.POST["gameDescription"]

    _maxPlayers = 3
    if "playerNumber" in request.POST:
        _maxPlayers = int(request.POST["playerNumber"])

    # try:
    #    _maxPlayers
    # except:
    #    _maxPlayers = 3
    _playerSeatOffset = randint(0, _maxPlayers - 1)
    # _playerSeatOffset = 1

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

    newGame = HC_Game(
        gameName=_gameName,
        gameDescription=_gameDescription,
        creator=request.user,
        host=request.user,
        gamePace=_pace,
        turn=0,
        phase=0,
        created=_created,
        latestUpdate=_created,
        seatOffset=_playerSeatOffset,
        startingOptions=_startingOptions,
        maxPlayers=_maxPlayers,
        gameStatus="AVAILABLE",
    )
    newGame.save()

    _player1 = request.user
    newGame.allPlayers.add(_player1)
    newGame.save()

    # if 'trainingGame' in request.POST:
    #    newGame.gameStatus = "ACTIVE"
    #    _newPlayer1 = User.objects.get(username="SHADOW")
    #    newGame.allPlayers.add(_newPlayer1)
    #    newGame.rewindConsent = "22"
    #    if _maxPlayers >= 3:
    #        _newPlayer2 = User.objects.get(username="SHADOW_2")
    #        newGame.allPlayers.add(_newPlayer2)
    #        newGame.rewindConsent = "222"
    #    if _maxPlayers >= 4:
    #        _newPlayer3 = User.objects.get(username="SHADOW_3")
    #        newGame.allPlayers.add(_newPlayer3)
    #        newGame.rewindConsent = "2222"
    #    if _maxPlayers >= 5:
    #        _newPlayer4 = User.objects.get(username="SHADOW_4")
    #        newGame.allPlayers.add(_newPlayer4)
    #        newGame.rewindConsent = "22222"

    if "trainingGame" in request.POST:
        newGame.gameStatus = "ACTIVE"
        _newPlayer1 = User.objects.get(username="SHADOW")
        newGame.allPlayers.add(_newPlayer1)
        newGame.rewindConsent = "222"
        displayNames = ""
        if request.POST["player2"] != "":
            displayNames = request.POST["player2"] + ","
        else:
            displayNames = "SHADOW,"
        if _maxPlayers >= 3:
            _newPlayer2 = User.objects.get(username="SHADOW_2")
            newGame.allPlayers.add(_newPlayer2)
            newGame.rewindConsent = "222"
            if request.POST["player3"] != "":
                displayNames += request.POST["player3"] + ","
            else:
                displayNames += "SHADOW_2,"
        if _maxPlayers >= 4:
            _newPlayer3 = User.objects.get(username="SHADOW_3")
            newGame.allPlayers.add(_newPlayer3)
            newGame.rewindConsent = "2222"
            if request.POST["player4"] != "":
                displayNames += request.POST["player4"] + ","
            else:
                displayNames += "SHADOW_3,"
        if _maxPlayers >= 5:
            _newPlayer4 = User.objects.get(username="SHADOW_4")
            newGame.allPlayers.add(_newPlayer4)
            newGame.rewindConsent = "22222"
            if request.POST["player5"] != "":
                displayNames += request.POST["player5"] + ","
            else:
                displayNames += "SHADOW_4,"

        displayNames = displayNames[:-1]
        newGame.player0notes = displayNames
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
            "HC",
        )

    newGame.kickoutDuration = request.POST["kickoutDuration"]

    # newGame.zoomLevels = "200" * _maxPlayers
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
        messages.success(
            request, (SF_getGameCreationJsonReturn("HC", getattr(newGame, "id")))
        )
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )


def processHCturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processHCturn(request)


@login_required()
def _processHCturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]

    try:
        currentGame = HC_Game.objects.get(id=game_id)
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "turn0move":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)
        # save move data
        nameToUse = request.user.username
        if "kickedPlayerName" in jsonData:
            nameToUse = jsonData["kickedPlayerName"]

        currentGame.updateSingleMove(nameToUse, jsonData["content"])
        moveResponse = currentGame.getMoveResponse("turn0move")
        currentGame.currentPlayers = currentGame.getCurrentPlayers()

        currentGame.save()

        if not moveResponse:
            return JsonResponse(
                {"ready": False, "currentPlayers": currentGame.getCurrentPlayers()},
                safe=False,
            )
        else:
            # open up the game data.
            x = lzstring.LZString()
            raw_game_data = x.decompressFromEncodedURIComponent(
                currentGame.gameData or "{}"
            )
            # Fallback to "{}" if decompression returns None
            gameDataString = raw_game_data if raw_game_data is not None else "{}"
            rawModel = json.loads(gameDataString)

            # Overwrite players factories
            for i in range(currentGame.maxPlayers):
                # Fetch the attribute dynamically (player0currentMoveData, player1currentMoveData, etc.)
                attr_name = f"player{i}currentMoveData"
                move_data_raw = getattr(currentGame, attr_name, "")

                decompressed_move = x.decompressFromEncodedURIComponent(
                    move_data_raw or ""
                )
                # Fallback to "{}" if decompression fails
                rawModel[3][i][0] = json.loads(
                    decompressed_move if decompressed_move is not None else "{}"
                )

            # subtract components
            # 0 = availComponents # 5 = dept_res 6 = dept_plan
            rawModel[0][5] -= currentGame.maxPlayers
            rawModel[0][6] -= currentGame.maxPlayers

            # save game data.
            currentGame.gameData = x.compressToEncodedURIComponent(json.dumps(rawModel))

            # currentGame.currentPlayers = currentGame.getCurrentPlayers()
            currentGame.clearAllMoveData()

            currentGame.save()
            # return
            return JsonResponse(
                {
                    "ready": True,
                    #'currentPlayers': currentGame.currentPlayers,
                    "gameData": currentGame.gameData,
                },
                safe=False,
            )

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
    elif jsonData["action"] == "saveFactoryWithoutEndingTurn":
        currentGame.saveFactoryWithoutEndingTurn(
            request.user.username, jsonData["data"]
        )
        return JsonResponse({"savedFac": True}, safe=False)

    elif jsonData["action"] == "saveFactoryMove":
        # var FCIATT = player.factory.factoryComponenetIndexesAddedThisTurn
        # var FCNATT = player.factory.factoryComponentNamesAddedThisTurn
        # var FDBEdeco = decompressObjectFromDB(player.factory.factoryDataBeforeExpansion)
        # ThisAC = players availableComponents

        # CANT CHECK FOR SYNC ERROR AS currentGame.latestUpdate GETS CHANGED WITHOUT UPDATING PLAYERS
        # if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
        #    return JsonResponse({"syncError": True}, safe=False)

        # If there is a kickout, we need to check the first player in the loop
        useTheFirst = False
        if jsonData["useTheFirst"]:
            useTheFirst = True

        # There is incoming data. The server has the CORRECT player order.
        LZS = lzstring.LZString()
        name = jsonData["name"]
        if name == "BotKickStarter":
            name = jsonData["BKSN"]

        # Use a fallback string if decompression returns None
        incomingFactoryDataRaw = json.loads(
            LZS.decompressFromEncodedURIComponent(jsonData["data"]) or "{}"
        )
        DBgameDataRaw = json.loads(
            LZS.decompressFromEncodedURIComponent(currentGame.gameData) or "[]"
        )
        DBavailableComponents = DBgameDataRaw[0].copy() if DBgameDataRaw else []
        other = json.loads(
            LZS.decompressFromEncodedURIComponent(jsonData["other"]) or "[]"
        )

        FDBE = other[0]
        FCIATT = other[1]
        FCNATT = other[2]
        ThisAC = other[3]

        # CHECK IF WE CAN ACCEPT THE AVAILABLE COMPONENTS FROM THE PLAYER
        # if the player's name is at idx 0 of currnet players in game AND in DB
        currentPlayers = currentGame.currentPlayers
        currentPlayersList = currentPlayers.split(",")
        while len(currentPlayersList) > 0 and currentPlayersList[0] == "HcBot":
            currentPlayersList.pop(0)

        # IF YOU IN FIRST PLACE SERVER AND CLIENT, YOUR AC IS VALID, SO DON'T NEED TO CHECK
        # if jsonData["idx"] == 0 and currentPlayersList[0] == request.user.username:
        if jsonData["idx"] == 0 and currentPlayersList[0] == name:
            # ("Accepting ThisAC")
            DBgameDataRaw[0] = ThisAC.copy()
            DBavailableComponents = DBgameDataRaw[0].copy()
        else:
            # ("checking AC")
            for i in range(len(FCNATT)):
                DBavailableComponents[FCNATT[i]] -= 1
            enoughComponents = True
            for i in range(len(DBavailableComponents)):
                if DBavailableComponents[i] < 0:
                    enoughComponents = False

            # if not enough then return
            if not enoughComponents:
                # ("Not Enough Initial")
                # (FCNATT)
                # (DBavailableComponents)
                # Get FacDataBeforeExp back out into that players name
                # along with FCIATT
                retRaw = LZS.compressToEncodedURIComponent(
                    json.dumps([FDBE, FCIATT, DBavailableComponents])
                )
                return JsonResponse(
                    {
                        "invalid": True,
                        "name": name,
                        "backInfo": retRaw,
                    },
                    safe=False,
                )  # return the avail components
                # otherwise it is valid

        # Now it is valid for this time, so store the data
        dataToInsert = [FDBE, FCIATT, FCNATT, incomingFactoryDataRaw]
        # currentGame.updateSingleMove(request.user.username, LZS.compressToEncodedURIComponent(json.dumps(dataToInsert)))
        currentGame.updateSingleMove(
            name, LZS.compressToEncodedURIComponent(json.dumps(dataToInsert))
        )

        currentGame.save()

        # Now process as many factories as possible
        currentPlayers = currentGame.currentPlayers
        currentPlayersList = currentPlayers.split(",")
        while len(currentPlayersList) > 0 and currentPlayersList[0] == "HcBot":
            currentPlayersList.pop(0)

        # There can never be data in front of you.
        # Either you are first in TO, so it will process.
        # Or second subs, as soon as first goes, everyone in a row goes.
        if not currentGame.hasMoveData(currentPlayersList[0]):
            # ("Returning as not first player")
            return JsonResponse(
                {
                    "stored": True,
                    #'name': name,
                    #'backInfo': retRaw,
                },
                safe=False,
            )

        # So now we are able to process
        DBgameDataRaw[0] = DBavailableComponents.copy()

        # Change this to a WHILE
        # while currentGame.hasMoveData(currentPlayersList[0])
        # limit the max to 5 times

        for i in range(10):
            if i == 9:
                message = (
                    f"************ Max 'i' hit in HC - gameID: {game_id} - User: {request.user.username}  "
                    f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
                    f"--- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
                )  
                SN_sendAdminErrorMessage(request, message)
            if len(currentPlayersList) == 0:
                break
            # THIS WILL ALWAYS BE TRUE ONCE, AS NOW CURRENT PLAYER IS FIRST
            if currentGame.hasMoveData(currentPlayersList[0]):
                # moveData = json.loads(LZS.decompressFromEncodedURIComponent(currentGame.getSingleMoveForName(currentPlayersList[0])))
                moveData = json.loads(
                    LZS.decompressFromEncodedURIComponent(
                        currentGame.getSingleMoveForName(currentPlayersList[0]) or ""
                    )
                    or "[]"
                )
                FDBE = moveData[0]
                FCIATT = moveData[1]
                FCNATT = moveData[2]
                FAC_DATA_RAW = moveData[3]
                # Reset the component amounts
                DBavailableComponents = DBgameDataRaw[0].copy()

                # check enough components (first will always be true -- unless processing a kickout!)
                if i != 0 or useTheFirst:
                    for j in range(len(FCNATT)):
                        DBavailableComponents[FCNATT[j]] -= 1
                    enoughComponents = True
                    for j in range(len(DBavailableComponents)):
                        if DBavailableComponents[j] < 0:
                            enoughComponents = False
                    # (DBavailableComponents)

                    # If not enough, return with what's left. We know there must be at least one update
                    if not enoughComponents:
                        # ("Not enough")
                        DBgameDataRaw[0] = DBavailableComponents
                        break

                seatPosition = currentGame.seatPosition(currentPlayersList[0])
                # This is the current player. The factory is valid.
                # So insert factory
                DBgameDataRaw[3][seatPosition][0] = FAC_DATA_RAW
                # insert new availcomponents
                DBgameDataRaw[0] = DBavailableComponents

                # INSERT HISTORY
                # STORES PLACE IN factpryComponents ARRAY TO ALLOW HIGHLIGHTING LATER
                # store the length of FCNATT, and subtract that from the length of facComp to get index. Or store current length
                # 3 = players           X = select player                       0 =fac
                DBgameDataRaw[3][currentGame.seatPosition(currentPlayersList[0])][0][4]

                DBgameDataRaw[15].append(
                    [
                        currentGame.seatPosition(currentPlayersList[0]),
                        13,
                        [
                            len(FCNATT),
                            len(
                                DBgameDataRaw[3][
                                    currentGame.seatPosition(currentPlayersList[0])
                                ][0][4]
                            ),
                        ],
                    ]
                )
                # DBgameDataRaw[16].append((int(time.time())*1000 - (2*len(currentPlayersList)) )- DBgameDataRaw[15][0])
                DBgameDataRaw[16].append(
                    DBgameDataRaw[16][len(DBgameDataRaw[16]) - 1]
                    + (15 - len(currentPlayersList))
                )

                # end the first players turn
                currentPlayersList.pop(0)
                while (
                    len(currentPlayersList) > 0 and currentPlayersList[0] == "HcBot"
                ):
                    currentPlayersList.pop(0)

            else:
                # If not currentGame.hasMoveData(currentPlayersList[0]):
                break
            # End if move data
        # End loop of 6

        # repack game and save
        currentGame.gameData = LZS.compressToEncodedURIComponent(
            json.dumps(DBgameDataRaw)
        )
        # remove name from current players
        currentGame.currentPlayers = ",".join(currentPlayersList)
        
        # It is ok for currentPlayersList to be 0 length here - then the JS should go to next phase
        #if len(currentPlayersList) == 0:
        #    message = (
        #        f"************ No players left in HC after processing factory - gameID: {game_id} - User: {request.user.username}  "
        #        f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
        #        f"--- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
        #    )  
        #    SN_sendAdminErrorMessage(request, message)
            
        currentGame.kickoutFlexiData = SF_updateFlexiTime(
            currentGame.kickoutFlexiData,
            currentGame.latestUpdate,
            int(time.time()) * 1000,
            request.user.username,
            currentGame.kickoutDuration,
        )
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        if len(currentPlayersList) > 0:
            sendFactoryAlertNotification(
                request, currentPlayersList[0], jsonData["gameID"]
            )

        return JsonResponse(
            {
                "VFFFP": True,
                "latestUpdate": currentGame.latestUpdate,
                "currentPlayers": currentGame.currentPlayers,
                "gameData": currentGame.gameData,
            },
            safe=False,
        )
        # currentGame.currentPlayers is in CORRECT order, as it was updated from the Set Focus stage

    ######################################
    # if (currentPlayersList[0] == name and enoughComponents):
    #   seatPosition = currentGame.seatPosition(name)
    #    # This is the current player. The factory is valid.
    # 3#    # So insert factory
    #  DBgameDataRaw[3][seatPosition][0] = incomingFactoryDataRaw
    #  # insert new availcomponents
    #   DBgameDataRaw[0] = DBavailableComponents
    #   #repack game and save
    #   currentGame.gameData = LZS.compressToEncodedURIComponent(
    # 3       json.dumps(DBgameDataRaw))
    # remove name from current players
    #   currentPlayersList.pop(0)
    #   currentGame.currentPlayers = ','.join(currentPlayersList)
    #   currentGame.save()
    # Now check the next player to see if there is any data
    ##################################################

    elif jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # reset notifs
        # if jsonData["phase"] == 5:
        #     currentGame.notificationSuppression = "000000"

        # or (jsonData["deleteMoves"] == "true" and jsonData["deleteMoveDataDueKickout"]):
        # if (jsonData["deleteMoves"] == "true" and currentGame.phase != 5 and currentGame.phase != 7):
        currentGame.clearAllMoveData()

        # Use for rewind save check
        # elapsedTotalSeconds = int(time.time()) - int(currentGame.latestUpdate)//1000

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

        currentGame.save()

        if jsonData["status"] == "FINISHED":
            endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
                currentGame,
            )
        else:
            # Send Notifications
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "HcBot"
                and not jsonData["status"] == "FINISHED"
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "HC",
                        playerListToNotify,
                        jsonData["gameID"],
                        currentGame.getGameName(),
                        currentGame,
                        oldVer,
                    )

        ################ REWIND EVERY SAVE #######################

        if jsonData["saveRewind"]:
            currentRewindData = currentGame.rewindData
            currentRewindDataArray = currentRewindData.split("'SPLIT'")

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if (
                    currentRewindDataArray[-1] != currentGame.rewindTempData
                    and jsonData["data"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData = (
                        currentRewindData + "'SPLIT'" + currentGame.rewindTempData
                    )
                    # currentRewindDataArray = currentRewindData.split("'SPLIT'")
                    currentRewindDataArray.append(currentGame.rewindTempData)

                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if len(currentRewindData) == 0:
                currentRewindData = jsonData["data"]
            else:
                # else check last one isn't same as cufrent, and if not then add
                if currentRewindDataArray[-1] != jsonData["data"]:
                    currentRewindDataArray.append(jsonData["data"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindDataArray) > 20:
                        currentRewindDataArray.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????
                currentRewindData = "'SPLIT'".join(currentRewindDataArray)
            currentGame.rewindData = currentRewindData

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

    elif jsonData["action"] == "load":
        # specialData = False
        # Use to stop actions showing when there's already move Data
        # if currentGame.hasMoveData(request.user.username):
        #    specialData = True
        return JsonResponse(
            {
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": currentGame.getCurrentPlayers(),
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "specialData": specialData,
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        currentRewindData = currentGame.rewindData
        if len(currentRewindData) == 0:
            return JsonResponse(
                {
                    "message": gettext(
                        "<b>No rewind data. Rewind limit reached. Please play on to generate more rewind data </b>"
                    )
                },
                safe=False,
            )
        if (
            not currentGame.getRewindHostPossible()
            and request.user.username != "BotKickStarter"
        ):
            return JsonResponse(
                {
                    "message": gettext(
                        "<b>Permissions missing. Please reload the page and check again</b>"
                    )
                },
                safe=False,
            )

        currentRewindDataArray = currentRewindData.split("'SPLIT'")

        # If there is any move data, simply clear it out and go back to the game
        if 1 == 2:  # currentGame.anyMoveData():
            currentGame.clearAllMoveData()
            rewindHostPossible = currentGame.getRewindHostPossible()
            # add all players back into currentPlayers
            # currentGame.letAllPlayersMove()

            # Don't remove rewind permission if there's move data
            # if currentGame.rewindConsent != '':
            #    # This saves it anyway
            #    currentGame.actionRewindAlterConsent()

            if currentGame.rewindTempData != "":
                loadData = currentGame.rewindTempData
            else:
                loadData = currentRewindDataArray[-1]

            newVer = (int(currentGame.latestUpdate) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
            currentGame.save()

            return JsonResponse(
                {
                    "loadData": loadData,
                    "rewindHostPossible": rewindHostPossible,
                    "latestUpdate": currentGame.latestUpdate,
                    "missingPlayers": currentGame.getMissingPlayersNamesArray(),
                },
                safe=False,
            )

        # ELSE if there is not any current move data
        loadData = (
            currentRewindDataArray.pop() if len(currentRewindDataArray) > 0 else ""
        )

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        # currentGame.rewindTempData = currentRewindDataArray.pop()
        currentGame.rewindTempData = loadData
        currentGame.rewindData = "'SPLIT'".join(currentRewindDataArray)
        # if len(currentGame.rewindData) == 0:
        #    currentGame.rewindData = loadData
        if currentGame.rewindConsent != "":
            currentGame.actionRewindAlterConsent()
        currentGame.clearAllMoveData()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        rewindHostPossible = currentGame.getRewindHostPossible()

        return JsonResponse(
            {
                "loadData": loadData,
                "rewindHostPossible": rewindHostPossible,
                # "latestUpdate": str(int(time.time())*1000),
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
        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "HcBot":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "HC",
                    playerListToNotify,
                    jsonData["gameID"],
                    currentGame.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "saveAfterKickout":
        if (
            str(jsonData["latestUpdate"]) != "9999999999999"
            and str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate)
            and not jsonData["ignoreSync"]
        ):
            print("HC: Sync Error Kickout Save " + str(jsonData["gameID"]))
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        # Clears data and saves record - DONT DELETE FAC MOVES
        # currentGame.clearAllMoveData()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        ## WHY WAS THIS COMMENTED OUT????
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            # endGame(request, jsonData["winner"], jsonData["finalScores"], jsonData["gameID"], currentGame)
            endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
                currentGame,
            )
        else:
            # Send Notifications
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "HcBot"
                and not jsonData["status"] == "FINISHED"
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "HC",
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
                "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


# def endGame(request, _winner, _finalScores, _gameID, currentGame):
def endGame(request, _winner, _finalPositions, _gameID, currentGame):
    with db_mutex("endGame"):
        return currentGame.endGame(request, _winner, _finalPositions, _gameID)


@login_required
def showHCgame(request, game_id):
    try:
        currentGame = (
            HC_Game.objects.select_related("host", "relatedTournament")
            .prefetch_related(
                "allPlayers", "missingPlayers", "playersWithChatNotification"
            )
            .get(id=game_id)
        )
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)

    gameCreationTimestamp = currentGame.created

    # If person is logged in, may or may not be in game
    if request.user.is_authenticated:
        all_player_ids = {p.id for p in currentGame.allPlayers.all()}
        userObj = request.user
        username = userObj.username
        user_id = userObj.id

        user_profile = Profile.objects.get(user=userObj)
        missing_player_ids = {p.id for p in currentGame.missingPlayers.all()}
        chat_notify_ids = {p.id for p in currentGame.playersWithChatNotification.all()}

        is_in_all = user_id in all_player_ids
        is_missing = user_id in missing_player_ids
        involvedPlayer = is_in_all and not is_missing
        if username == "BotKickStarter":
            involvedPlayer = True
        now = int(time.time()) * 1000
        chatData = currentGame.chatData

        c = bytes(chatData, "utf-8")
        chatData = c.decode("unicode-escape")

        currentMove = ""
        currentNotes = ""
        temporaryMove = ""
        pov = None
        preferredHCcolour = -1
        allPlayerListBySeat = currentGame.getAllPlayersOrderedySeat()
        kickoutRequired = 0
        chatNotification = False

        myMove = False
        # myZoomLevel = 200
        myStatsExcludeConsent = 0
        liveNotification = 1
        finishedGame = False
        if currentGame.gameStatus == "FINISHED":
            finishedGame = True
        rewindPanelType = 0
        rewindHostHTML = ""
        rewindHostPossible = False
        currentRewindConsent = "0"
        currentPlayers = currentGame.currentPlayers
        # if currentPlayers == "":
        #    currentPlayers = currentGame.getAllPlayersOrderedySeat()
        statsExcludedGame = currentGame.statsExcludedGame
        displayNames = ""

        # Do Chat notification separately, as could be kicked out, and so not involoved
        if user_id in chat_notify_ids:
            chatNotification = True
            currentGame.playersWithChatNotification.remove(userObj)
            currentGame.save()

        ## Get the next URL
        nextURL = (
            f"/nextGame?current_id={game_id}&current_code={currentGame.getGameCode()}"
        )
        # If person is logged in and in the game
        if involvedPlayer:
            rewindPanelType = 1
            if (
                currentGame.host == request.user
                or request.user.username == "BotKickStarter"
            ):
                rewindPanelType = 2
                rewindHostPossible = currentGame.getRewindHostPossible()
                if request.user.username == "BotKickStarter":
                    rewindHostPossible = True
                rewindHostHTML = currentGame.getRewindHostHTML()

            pov = currentGame.seatPosition(username)
            currentRewindConsent = currentGame.getCurrentRewindConsent(username)

            preferredHCcolour = user_profile.preferredHCcolour
            liveNotification = user_profile.liveNotification
            if currentGame.hasMoveData(username):
                currentMove = (
                    '{"phase": '
                    + str(currentGame.phase)
                    + ',"turn": '
                    + str(currentGame.turn)
                    + ',"content": "'
                    + currentGame.hasMoveData(username)
                    + '"}'
                )

            if currentGame.hasTemporaryMoveData(username):
                temporaryMove = (
                    '{"type": "'
                    + currentGame.hasTemporaryMoveData(username)[0]
                    + '","content": "'
                    + currentGame.hasTemporaryMoveData(username)[1]
                    + '"}'
                )

            # Get the Notes for the user
            if currentGame.seatPosition(username) == 0:
                currentNotes = currentGame.player0notes
            if currentGame.seatPosition(username) == 1:
                currentNotes = currentGame.player1notes
            if currentGame.seatPosition(username) == 2:
                currentNotes = currentGame.player2notes
            if currentGame.seatPosition(username) == 3:
                currentNotes = currentGame.player3notes
            if currentGame.seatPosition(username) == 4:
                currentNotes = currentGame.player4notes

            # Check for kickout
            kickoutRequired = currentGame.kickoutRequired()

            myMove = currentGame.isMyMove(username)
            # myZoomLevel = currentGame.zoomLevels[pov*3:pov*3+3]
            myStatsExcludeConsent = currentGame.statsExcludeConsent[pov : pov + 1]

            if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
                displayNames = currentGame.player0notes
                currentGame.player0notes = ""
                currentNotes = ""
                currentGame.save()

        #######
        #   Check if SHADOW in currentGame.allPlayers
        #   Check currentGame.involvedPlayer
        #   Use currentGame.gameName
        #   Use if currentGame.startingOptionsLiteral
        #   Use currentGame.startingMap
        #   use currentGame.gameID
        #   Use currentGame.currentPlayers
        #   Use currentGame.latestUpdateLiteral
        #   Use currentGame.myMove to prevent self kickout
        # tournamentGame = False
        return render(
            request,
            "HC/HCtemplate.html",
            {
                "gameCreationTimestamp": gameCreationTimestamp,
                "now": now,
                "gameData": currentGame.gameData,
                "pov": pov,
                "preferredHCcolour": preferredHCcolour,
                # "allPlayers": allPlayers,
                "name": username,
                "chatData": chatData,
                "chatNotification": chatNotification,
                "moveData": currentMove,  # Used for Move Data
                "temporaryMoveData": temporaryMove,
                # used for global.players AND if includes SHADOW
                "allPlayerListBySeat": allPlayerListBySeat,
                "currentNotes": currentNotes,
                "kickoutRequired": kickoutRequired,
                "involvedPlayer": involvedPlayer,
                "gameName": currentGame.getGameName(),
                "startingOptionsLiteral": currentGame.startingOptions,
                "gameID": getattr(currentGame, "id"),
                "currentPlayers": currentPlayers,
                "latestUpdateLiteral": currentGame.latestUpdate,
                "myMove": myMove,
                # "myZoomLevel": myZoomLevel,
                "liveNotification": liveNotification,
                "finishedGame": finishedGame,
                "rewindPanelType": rewindPanelType,
                "rewindHostHTML": rewindHostHTML,
                "rewindHostPossible": rewindHostPossible,
                "currentRewindConsent": int(currentRewindConsent),
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "tournamentGame": currentGame.relatedTournament,
                # "startingOptionsHTML": startingOptionsHTML,
                "myStatsExcludeConsent": myStatsExcludeConsent,
                "statsExcludedGame": statsExcludedGame,
                "displayNames": displayNames,
                "nextURL": nextURL,
                "KickoutFlexiDataArray": KickoutFlexiDataArray,
                "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
                "settingsDebug": settings.DEBUG,
            },
        )

    allPlayerListBySeat = [request.user.username, "Ross", "Rachel"]

    now = int(time.time()) * 1000

    preferredColour = -1  # user_profile.preferredHCcolour

    return render(
        request,
        "HC/HCtemplate.html",
        {
            # "gameData": currentGame.gameData,
            # "gameID": game_id,
            "showAssistance": "true",
            # "currentGame": currentGameJSON,
            # "latestUpdateLiteral": currentGame.latestUpdate,
            # "involvedPlayer": False,
            #  "gameName": currentGame.gameName,
            # "myMove": False,
            "gameName": "Test Game",
            "allPlayerListBySeat": allPlayerListBySeat,
            "trainingGame": True,
            "name": request.user.username,
            "gameID": 1,
            "now": now,
            "preferredColour": preferredColour,
            "KickoutFlexiDataArray": KickoutFlexiDataArray,
            "deleteVotesData": json.dumps(currentGame.getDeleteVotesData()),
            "settingsDebug": settings.DEBUG,
        },
    )


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    gameID = jsonData["gameID"]

    try:
        currentGame = HC_Game.objects.get(id=gameID)
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "HC", gameID, gameData, bugDescription, currentGame.rewindData, ""
    )

    return JsonResponse({"bugEntrySuccess": True})


def HChelp(request):
    return render(request, "HC/HChelp.html")


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
        print("ERROR-HC: Not running, %s mutex not available" % (mutex_name))


# TODO move this to SN_
def sendFactoryAlertNotification(request, player, gameID):
    user = User.objects.get(username=player)
    try:
        profile = Profile.objects.get(user=user)
        currentGame = HC_Game.objects.get(id=gameID)

        originalLang = get_language()
        translation.activate(profile.profileLanguage)

        # SEND EMAIL
        if profile.sendEmailNotificationOnTurn:
            current_site = get_current_site(request)
            subject = gettext(
                "It is your turn at Horseless Carriage - Factory Building"
            )
            message = render_to_string(
                "HC/yourTurnEmailFactory.html",
                {
                    "user": user.username,
                    "domain": current_site.domain,
                    "gameID": gameID,
                    "gameName": currentGame.getGameName(),
                    "currentTurnString": currentGame.currentTurnString(),
                },
            )
            user.email_user(subject, message)

        messageText = (
            user.username
            + ": "
            + gettext(
                "Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs building\n%(gameName)s - %(currentTurnString)s."
            )
            % {
                "gameName": currentGame.getGameName(),
                "currentTurnString": currentGame.currentTurnString(),
            }
        )
        urlText = gettext("Click here to play Horseless Carriage")

        # SEND DISCORD
        # if profile.sendDiscordWebhookNotificationOnTurn:
        #    message = ""
        #    if len(profile.discordWebhookUserID) != 0:
        #        message += "<@" + profile.discordWebhookUserID + ">\n"
        #    message += messageText + "\n[" + urlText + "](https://www.OnlineBoardGamers.com/HC/" + str(currentGame.id) + "/)"
        #
        #    # message = ""
        #    # if  len(profile.discordWebhookUserID) != 0: message += "<@" + profile.discordWebhookUserID + ">\n"
        #    # message += user.username + ": "
        #    # message += gettext("Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs fixing!\n%(gameName)s - %(currentTurnString)s.\n[Click here to play Horseless Carriage](https://www.OnlineBoardGamers.com/HC/%(gameID)s/)") % {'gameName' : currentGame.gameName, 'currentTurnString' : currentGame.currentTurnString(), 'gameID' : str(currentGame.id)}
        #
        #    # message += "Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs fixing!\n" + currentGame.gameName + " - " + currentGame.currentTurnString() +  ".\n[Click here to play Horseless Carriage](https://www.OnlineBoardGamers.com/HC/" + str(currentGame.id) + "/)"
        #    # str(currentGame.turn) + "." + str(currentGame.phase) + \
        #    requests.post("" + profile.discordWebhookURL, data={"content": message})
        #
        ## SEND SLACK
        # if profile.sendSlackWebhookNotificationOnTurn:
        #    message = ""
        #    message += messageText + "\n<https://www.OnlineBoardGamers.com/HC/" + str(currentGame.id) + "/|" + urlText + ">"
        #
        #    # message = user.username + ": "
        #    # message += gettext("Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs fixing!\n%(gameName)s - %(currentTurnString)s.\n<https://www.OnlineBoardGamers.com/HC/%(gameID)s/|Click here to play Horseless Carriage>") % {'gameName' : currentGame.gameName, 'currentTurnString' : currentGame.currentTurnString(), 'gameID' : str(currentGame.id)}
        #
        #    # message += "Your turn at OnlineBoardGamers - Horseless Carriage\nYour factory needs fixing!\n" + currentGame.gameName + " - " + currentGame.currentTurnString() + ".\n<https://www.OnlineBoardGamers.com/HC/" +str(currentGame.id) + "/|Click here to play Horseless Carriage>"
        #    # str(currentGame.turn) + "." + str(currentGame.phase) + \
        #
        #    payload = {"text": message}
        #    requests.post(profile.slackWebhookURL, json.dumps(payload))

        translation.activate(originalLang)

    except Exception:
        print("Error seinding factory notifiction")


@login_required()
def chat(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    if jsonData["action"] == "refreshChat":
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

        newChatData = currentGame.chatData or ""  # Ensure it's a string

        newMessage = re.search("{(.+?)}", newChatData)

        # FIX: Check if the regex found a match
        if newMessage:
            msgToAdd = "{" + newMessage.group(1) + "}"

            # Decode unicode escapes safely
            try:
                c = bytes(msgToAdd, "utf-8")
                msgToAdd = c.decode("unicode-escape")
                convertedDict = json.loads(msgToAdd)
            except (UnicodeDecodeError, json.JSONDecodeError):
                return JsonResponse({"error": "Invalid chat format"}, status=500)

            return JsonResponse(convertedDict, safe=False)

        # Fallback if no JSON-like structure is found in chatData
        return JsonResponse({"error": "No messages found"}, status=404)

    if jsonData["action"] == "addMessage":
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
        if request.user in currentGame.playersWithChatNotification.all():
            currentGame.playersWithChatNotification.set(currentGame.allPlayers.all())
        else:
            currentGame.playersWithChatNotification.set(currentGame.allPlayers.all())
            currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()
        currentChatData = currentGame.chatData

        newMessage = jsonData["message"]
        newMessage = newMessage.encode("unicode-escape").decode("ASCII")

        newMessage = newMessage.replace("\n", " ").replace("\r", "")

        playerName = jsonData["player"]
        playerName = playerName.encode("unicode-escape").decode("ASCII")

        now = str(int(time.time()) * 1000)
        newChatString = (
            '{"name":"'
            + playerName
            + '","timestamp":'
            + str(now)
            + ',"message":"'
            + newMessage
            + '"},'
        )
        currentChatData = newChatString + currentChatData
        currentGame.chatData = currentChatData
        currentGame.save()

        return JsonResponse({"chatEntry": True})

    return HttpResponse(status=204)  # No Content


@login_required()
def notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.seatPosition(request.user.username) == 0:
        currentGame.player0notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 1:
        currentGame.player1notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 2:
        currentGame.player2notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 3:
        currentGame.player3notes = jsonData["note"]
    if currentGame.seatPosition(request.user.username) == 4:
        currentGame.player4notes = jsonData["note"]
    currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required
def processHCrewindConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)
    try:
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
    except HC_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.rewindConsent == "":
        currentGame.setupRewindConsent()
    # Set current person to 1 pr 2.
    seatToChange = jsonData["playerNumber"]
    rewindConsentList = list(currentGame.rewindConsent)
    rewindConsentList[seatToChange] = jsonData["consentLevel"]
    rewindConsentString = "".join(rewindConsentList)
    currentGame.rewindConsent = rewindConsentString
    currentGame.save()
    return JsonResponse(
        {
            "newPermission": jsonData["consentLevel"],
        }
    )


@login_required
def processHCstatsExcludeConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    try:
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
    except HC_Game.DoesNotExist:
        raise Http404("Game does not exist")
    currentGame.enableStatsExclude(request.user.username)
    currentGame.save()
    return JsonResponse({"statsExcludedGame": currentGame.statsExcludedGame})


@login_required()
def voteToDelete(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("lockFCMgame_" + str(gameID)):
        return _voteToDelete(request)


@login_required
def _voteToDelete(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = HC_Game.objects.get(id=jsonData["gameID"])
    except HC_Game.DoesNotExist:
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
