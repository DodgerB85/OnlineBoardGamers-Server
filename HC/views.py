from cmath import phase
import json
import time

# from datetime import datetime
import requests
import re
import lzstring
from random import randint

from decouple import config
from typing import TYPE_CHECKING, cast

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

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.sharedFunctions.constants import (
    STATS_EXCLUDE_VOTE_TOPIC,
    DELETE_VOTE_TOPIC,
    REWIND_CONSENT_VOTE_TOPIC,
)
from Lobby.gameViewHelpers import build_show_game_data, shared_save_notes, shared_bug_entry, shared_cast_vote

from Lobby.sharedFunctions.sharedFunctions import (
    SF_updateFlexiTime,
    SF_getGameCreationJsonReturn,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendBugReportEmail,
    SN_sendNextTurnNotification,
    SN_sendFactoryAlertNotification,
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from django.utils.translation import gettext, get_language
from django.utils import translation

if TYPE_CHECKING:
    from Lobby.presenters import HCpresenter


def index(request):
    return HttpResponse("Hello Geeks")


@login_required
def HCgameSummary(request, game_id):
    try:
        currentGame = Game.objects.get(id=game_id, gameCode="HC")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    return render(
        request,
        "HC/HCgameSummary.html",
        {
            # "now": now,
            "settingsDEBUG": config("HC_USE_SOURCE_CODE", default=False, cast=bool),
            "gameData": currentGame.gameData,
            "gameID": getattr(currentGame, "id"),
        },
    )


#################### API ##################


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

    _player_order_seed = randint(0, _maxPlayers - 1)
    statsExcludedGame = False

    _startingOptions = []
    if "trainingGame" in request.POST:
        _startingOptions.append(int(request.POST["trainingGame"]))
    if "experiencedGame" in request.POST:
        _startingOptions.append(int(request.POST["experiencedGame"]))

    if "limitVehicles" in request.POST:
        # Exclude from stats
        statsExcludedGame = True
        if "vehicleLimitRadio" in request.POST:
            _startingOptions.append(int(request.POST["vehicleLimitRadio"]))
        if "increaseMainlines" in request.POST:
            _startingOptions.append(int(request.POST["increaseMainlines"]))

    _created = SR_getTimeNow()
    _pace = request.POST["pace"]

    newGame = Game(
        gameCode="HC",
        gameName=_gameName,
        gameDescription=_gameDescription,
        creator=request.user,
        host=request.user,
        gamePace=_pace,
        turn=0,
        phase=0,
        created=_created,
        latestUpdate=_created,
        playerOrderSeed=_player_order_seed,
        startingOptions=json.dumps(_startingOptions, separators=(",", ":")),
        maxPlayers=_maxPlayers,
        gameStatus="AVAILABLE",
        statsExcludedGame=statsExcludedGame,
    )
    newGame.save()

    _player1 = request.user
    GamePlayer.objects.create(game=newGame, player=_player1, seat_order=0)

    if "trainingGame" in request.POST:
        newGame.gameStatus = "ACTIVE"
        _newPlayer1 = User.objects.get(username="SHADOW")
        GamePlayer.objects.create(game=newGame, player=_newPlayer1, seat_order=1)
        displayNames = ""
        if request.POST["player2"] != "":
            displayNames = request.POST["player2"] + ","
        else:
            displayNames = "SHADOW,"
        if _maxPlayers >= 3:
            _newPlayer2 = User.objects.get(username="SHADOW_2")
            GamePlayer.objects.create(game=newGame, player=_newPlayer2, seat_order=2)
            if request.POST["player3"] != "":
                displayNames += request.POST["player3"] + ","
            else:
                displayNames += "SHADOW_2,"
        if _maxPlayers >= 4:
            _newPlayer3 = User.objects.get(username="SHADOW_3")
            GamePlayer.objects.create(game=newGame, player=_newPlayer3, seat_order=3)
            if request.POST["player4"] != "":
                displayNames += request.POST["player4"] + ","
            else:
                displayNames += "SHADOW_3,"
        if _maxPlayers >= 5:
            _newPlayer4 = User.objects.get(username="SHADOW_4")
            GamePlayer.objects.create(game=newGame, player=_newPlayer4, seat_order=4)
            if request.POST["player5"] != "":
                displayNames += request.POST["player5"] + ","
            else:
                displayNames += "SHADOW_4,"

        displayNames = displayNames[:-1]
        # Store displayNames in player0's notes
        player_gp = newGame.players.filter(player=request.user).first()
        if player_gp:
            player_gp.notes = displayNames
            player_gp.save()
        presenter = cast("HCpresenter", newGame.presenter())
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

        SN_sendInviteNotifications(
            request,
            usernamesToNotify,
            newGame.presenter().getGameName(),
            _maxPlayers,
            "HC",
        )

    newGame.kickoutDuration = request.POST["kickoutDuration"]

    if "trainingGame" in request.POST:
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
        currentGame = Game.objects.get(id=game_id, gameCode="HC")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("HCpresenter", currentGame.presenter())

    if jsonData["action"] == "turn0move":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(
            jsonData["latestUpdate"]
        ) != str(currentGame.latestUpdate):
            return JsonResponse({"syncError": True}, safe=False)
        # save move data
        nameToUse = request.user.username
        if "kickedPlayerName" in jsonData:
            nameToUse = jsonData["kickedPlayerName"]

        presenter.updateSingleMove(nameToUse, jsonData["content"])
        moveResponse = presenter.getMoveResponse("turn0move")
        currentPlayers = presenter.getCurrentPlayersHC()
        presenter.setCurrentPlayersFromArrInTurnOrder(currentPlayers)

        currentGame.save()

        if not moveResponse:
            return JsonResponse(
                {"ready": False, "currentPlayers": presenter.getCurrentPlayersHC()},
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
            all_gps = list(currentGame.players.order_by("seat_order"))
            for i in range(currentGame.maxPlayers):
                move_data_raw = all_gps[i].currentMoveData if i < len(all_gps) else ""

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

            presenter.clearAllMoveData()

            currentGame.save()
            # return
            return JsonResponse(
                {
                    "ready": True,
                    "gameData": currentGame.gameData,
                },
                safe=False,
            )

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )
    elif jsonData["action"] == "saveFactoryWithoutEndingTurn":
        presenter.saveFactoryWithoutEndingTurn(request.user.username, jsonData["data"])
        return JsonResponse({"savedFac": True}, safe=False)

    elif jsonData["action"] == "saveFactoryMove":
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
        currentPlayers = presenter.getCurrentPlayersInOrderArrHC()
        currentPlayersList = currentPlayers
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
        presenter.updateSingleMove(
            name, LZS.compressToEncodedURIComponent(json.dumps(dataToInsert))
        )

        currentGame.save()

        # Now process as many factories as possible
        currentPlayers = presenter.getCurrentPlayersInOrderArrHC()
        currentPlayersList = currentPlayers
        while len(currentPlayersList) > 0 and currentPlayersList[0] == "HcBot":
            currentPlayersList.pop(0)

        # There can never be data in front of you.
        # Either you are first in TO, so it will process.
        # Or second subs, as soon as first goes, everyone in a row goes.
        if not presenter.hasMoveData(currentPlayersList[0]):
            # ("Returning as not first player")
            return JsonResponse(
                {
                    "stored": True,
                },
                safe=False,
            )

        # So now we are able to process
        DBgameDataRaw[0] = DBavailableComponents.copy()

        for i in range(10):
            if i == 9:
                message = (
                    f"************ Max 'i' hit in HC - gameID: {game_id} - User: {request.user.username}  "
                    f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
                    f"--- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersInOrderArrHC()}"
                )
                SN_sendAdminErrorMessage(request, message)
            if len(currentPlayersList) == 0:
                break
            # THIS WILL ALWAYS BE TRUE ONCE, AS NOW CURRENT PLAYER IS FIRST
            if presenter.hasMoveData(currentPlayersList[0]):
                moveData = json.loads(
                    LZS.decompressFromEncodedURIComponent(
                        presenter.getSingleMoveForName(currentPlayersList[0]) or ""
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
                        try:
                            DBavailableComponents[FCNATT[j]] -= 1
                        except Exception as e:
                            SN_sendAdminErrorMessage(
                                request,
                                f"Exception: {e} -- FCIATT: {FCIATT} -- FCNATT: {FCNATT} -- DBavailableComponents: {DBavailableComponents} j: {j} FCNATT[j]:",
                            )
                            break
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

                seatPosition = presenter.seatPosition(currentPlayersList[0])
                # This is the current player. The factory is valid.
                # So insert factory
                DBgameDataRaw[3][seatPosition][0] = FAC_DATA_RAW
                # insert new availcomponents
                DBgameDataRaw[0] = DBavailableComponents

                # INSERT HISTORY
                # STORES PLACE IN factpryComponents ARRAY TO ALLOW HIGHLIGHTING LATER
                # store the length of FCNATT, and subtract that from the length of facComp to get index. Or store current length
                # 3 = players           X = select player                       0 =fac
                # THIS LINE WAS REMOVED FOR BEING USELESS
                #DBgameDataRaw[3][presenter.seatPosition(currentPlayersList[0])][0][4]
                
                #DBgameDataRaw[3][seatPosition][0][4]

                DBgameDataRaw[15].append(
                    [
                        presenter.seatPosition(currentPlayersList[0]),
                        13,
                        [
                            len(FCNATT),
                            len(
                                DBgameDataRaw[3][
                                    presenter.seatPosition(currentPlayersList[0])
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
                while len(currentPlayersList) > 0 and currentPlayersList[0] == "HcBot":
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
        presenter.setCurrentPlayersFromArrInTurnOrder(currentPlayersList)

        # It is ok for currentPlayersList to be 0 length here - then the JS should go to next phase
        # if len(currentPlayersList) == 0:
        #    message = (
        #        f"************ No players left in HC after processing factory - gameID: {game_id} - User: {request.user.username}  "
        #        f"- DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn} "
        #        f"--- DB_phase: {currentGame.phase} -- currentP: {presenter.getArr()}"
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
            # Send an alert, and set a "yout turn" indicator in the lobby
            newNameCurrent = currentPlayersList[0]
            seat = presenter.seatPosition(newNameCurrent)
            gp = currentGame.players.filter(seat_order=seat).first()

            if gp:
                gp.currentMoveTime = "ILLEGALMOVE"  # "NODATASFWET"
                gp.save()
            SN_sendFactoryAlertNotification(
                request, newNameCurrent, jsonData["gameID"], currentGame
            )

        return JsonResponse(
            {
                "VFFFP": True,
                "latestUpdate": currentGame.latestUpdate,
                #"currentPlayers": presenter.getCurrentPlayersInOrderArrHC(),
                # !!!!!!!!!!!!!!!!!! Need to allow a return of 0 names to process phase !!!!!!!!!!!!!!!!!!!
                "currentPlayers": currentPlayersList,
                "gameData": currentGame.gameData,
            },
            safe=False,
        )
        # currentPlayers is in CORRECT order, as it was updated from the Set Focus stage

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
        presenter.clearAllMoveData()

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

        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])

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
                len(jsonData["nextPlayer"]) > 0 
                and not jsonData["status"] == "FINISHED"
            ):
                playerListToNotify = jsonData["nextPlayer"]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if "HcBot" in playerListToNotify:
                    playerListToNotify.remove("HcBot")

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "HC",
                        playerListToNotify,
                        jsonData["gameID"],
                        presenter.getGameName(),
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
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
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
                "currentPlayers": presenter.getCurrentPlayersHC(),
                # "secondsToNextKickout": presenter.getSecondsToNextKickout(),
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
            not presenter.getRewindHostPossible()
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
            presenter.clearAllMoveData()
            rewindHostPossible = presenter.getRewindHostPossible()
            # add all players back into currentPlayers
            # presenter.letAllPlayersMove()

            # Don't remove rewind permission if there's move data
            # if currentGame.rewindConsent != '':
            #    # This saves it anyway
            #    presenter.actionRewindAlterConsent()

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
                    "missingPlayers": presenter.getMissingPlayersNamesArray(),
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
        if currentGame.activeVotes and "rewind_consent" in currentGame.activeVotes:
            presenter.actionRewindAlterConsent()
        presenter.clearAllMoveData()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        rewindHostPossible = presenter.getRewindHostPossible()

        return JsonResponse(
            {
                "loadData": loadData,
                "rewindHostPossible": rewindHostPossible,
                # "latestUpdate": str(int(time.time())*1000),
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
        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if len(jsonData["nextPlayer"]) > 0 and jsonData["nextPlayer"][0] != "HcBot":
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "HC",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": presenter.getSecondsToNextKickout(),
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
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        # Clears data and saves record - DONT DELETE FAC MOVES
        # presenter.clearAllMoveData()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        ## WHY WAS THIS COMMENTED OUT????
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])
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
                len(jsonData["nextPlayer"]) > 0 
                and not jsonData["status"] == "FINISHED"
            ):
                playerListToNotify = jsonData["nextPlayer"]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if "HcBot" in playerListToNotify:
                    playerListToNotify.remove("HcBot")

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "HC",
                        playerListToNotify,
                        jsonData["gameID"],
                        presenter.getGameName(),
                        currentGame,
                        currentGame.latestUpdate,
                    )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


# def endGame(request, _winner, _finalScores, _gameID, currentGame):
def endGame(request, _winner, _finalPositions, _gameID, currentGame):
    with db_mutex("endGame"):
        return currentGame.presenter().endGame(
            request, _winner, _finalPositions, _gameID
        )


@login_required
def showHCgame(request, game_id):
    result = build_show_game_data(request, game_id, "HC",
        default_zoom=200, settings_debug_key="HC_USE_SOURCE_CODE",
        clear_chat_notification=False)
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("HCpresenter", currentGame.presenter())
    all_players = result["all_players"]
    username = request.user.username
    user_id = request.user.id

    now = int(time.time()) * 1000
    chatData = currentGame.chatData

    c = bytes(chatData, "utf-8")
    chatData = c.decode("unicode-escape")

    currentMove = ""
    currentNotes = ""
    temporaryMove = ""
    pov = None
    preferredHCcolour = -1
    allPlayerListBySeat = presenter.getAllPlayersOrderedySeatInArray()
    kickoutRequired = 0
    chatNotification = False
    myMove = False
    liveNotification = 1
    finishedGame = currentGame.gameStatus == "FINISHED"
    rewindPanelType = 0
    rewindHostHTML = ""
    rewindHostPossible = False
    # TODO: remove this
    currentRewindConsent = "0"
    currentPlayers = presenter.getCurrentPlayersInOrderArrHC()
    if len(currentPlayers) == 0:
       currentPlayers = presenter.getAllPlayersOrderedySeatInArray()[0]
    statsExcludedGame = currentGame.statsExcludedGame
    displayNames = ""

    # Chat notification separately (could be kicked out)
    chat_notify_ids = {gp.player.id for gp in all_players if gp.player and gp.has_chat_notification}
    # Also check all players including kicked
    all_gps_including_kicked = list(currentGame.players.select_related("player").all())
    chat_notify_ids_all = {gp.player.id for gp in all_gps_including_kicked if gp.player and gp.has_chat_notification}
    if user_id in chat_notify_ids_all:
        chatNotification = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    nextURL = (
        f"/nextGame?current_id={game_id}&current_code={presenter.getGameCode()}"
    )

    involvedPlayer = result["is_involved"]

    if involvedPlayer:
        rewindPanelType = 1
        if (
            currentGame.host == request.user
            or username == "BotKickStarter"
        ):
            rewindPanelType = 2
            rewindHostPossible = presenter.getRewindHostPossible()
            if username == "BotKickStarter":
                rewindHostPossible = True
            rewindHostHTML = presenter.getRewindHostHTML()

        pov = presenter.seatPosition(username)
        currentRewindConsent = presenter.getCurrentRewindConsent(username)

        preferredHCcolour = result["user_profile"].preferredHCcolour
        liveNotification = result["user_profile"].liveNotification
        if presenter.hasMoveData(username, True):
            currentMove = (
                '{"phase": '
                + str(currentGame.phase)
                + ',"turn": '
                + str(currentGame.turn)
                + ',"content": "'
                + presenter.getMoveData(username)
                + '"}'
            )

        if presenter.hasTemporaryMoveData(username):
            temporaryMove = (
                '{"type": "'
                + presenter.hasTemporaryMoveData(username)[0]
                + '","content": "'
                + presenter.hasTemporaryMoveData(username)[1]
                + '"}'
            )

        # Get the Notes for the user
        user_gp = next(
            (gp for gp in all_players if gp.player and gp.player.id == user_id),
            None,
        )
        if user_gp:
            currentNotes = user_gp.notes

        kickoutRequired = presenter.kickoutRequired()
        myMove = presenter.isMyMove(username)

        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            player_gp = next(
                (gp for gp in all_players if gp.player and gp.player.id == user_id),
                None,
            )
            if player_gp:
                displayNames = player_gp.notes
                player_gp.notes = ""
                player_gp.save()
            currentNotes = ""

    return render(
        request,
        "HC/HCtemplate.html",
        {
            "gameCreationTimestamp": currentGame.created,
            "now": now,
            "gameData": currentGame.gameData,
            "pov": pov,
            "preferredHCcolour": preferredHCcolour,
            "name": username,
            "chatData": chatData,
            "chatNotification": chatNotification,
            "moveData": currentMove,
            "temporaryMoveData": temporaryMove,
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentNotes": currentNotes,
            "kickoutRequired": kickoutRequired,
            "involvedPlayer": involvedPlayer,
            "gameName": presenter.getGameName(),
            "startingOptionsLiteral": (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            ),
            "gameID": currentGame.id,
            "currentPlayers": currentPlayers,
            "latestUpdateLiteral": currentGame.latestUpdate,
            "myMove": myMove,
            "liveNotification": liveNotification,
            "finishedGame": finishedGame,
            "rewindPanelType": rewindPanelType,
            "rewindHostHTML": rewindHostHTML,
            "rewindHostPossible": rewindHostPossible,
            "currentRewindConsent": int(currentRewindConsent),
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "statsExcludedGame": statsExcludedGame,
            "displayNames": displayNames,
            "nextURL": nextURL,
            "KickoutFlexiDataArray": result["base_data"]["KickoutFlexiDataArray"],
            "settingsDebug": result["base_data"]["settingsDebug"],
            "statsExcludeVotesData": result["base_data"]["statsExcludeVotesData"],
            "deleteVotesData": result["base_data"]["deleteVotesData"],
        },
    )


@login_required()
def bugEntry(request):
    return shared_bug_entry(request, "HC")


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


@login_required()
def chat(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    if jsonData["action"] == "refreshChat":
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="HC")
        presenter = cast("HCpresenter", currentGame.presenter())
        presenter.removeChatNotification(request.user)
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
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="HC")
        presenter = cast("HCpresenter", currentGame.presenter())
        # Add chat notifications for all players except current user
        all_player_usernames = [
            gp.player.username
            for gp in currentGame.players.all().select_related("player")
            if gp.player
        ]
        other_players = [u for u in all_player_usernames if u != request.user.username]
        presenter.addChatNotifications(other_players)
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
    return shared_save_notes(request, "HC", json_key="note")


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(str(jsonData["gameID"])):
        return shared_cast_vote(request)


