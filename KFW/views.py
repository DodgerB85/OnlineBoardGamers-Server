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


from Lobby.models import Game, GamePlayer, User, Profile

if TYPE_CHECKING:
    from Lobby.presenters import KfwPresenter 
    
KFW_SUPER_USERS = ["BotKickStarter"]

def index(request):
    return HttpResponse("Hello, world. You're at KFW")


def KFWhelp(request):
    return render(request, "KFW/KFWhelp.html")


@login_required
def createKFWgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    players = ["player2", "player3", "player4", "player5", "player6"]
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
                return HttpResponseRedirect(reverse("createKFWpage"))
            if username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return HttpResponseRedirect(reverse("createKFWpage"))

    _gameDescription = request.POST["gameDescription"]
    _maxPlayers = int(request.POST.get("playerNumber", "2"))
    _pace = request.POST["pace"]

    _created = SR_getTimeNow()

    with transaction.atomic():
        newGame = Game(
            gameCode='KFW',
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

        # Create GamePlayer for creator
        GamePlayer.objects.create(
            game=newGame,
            player=request.user,
            seat_order=0,
            is_current=False,
        )

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
                GamePlayer.objects.create(
                    game=newGame,
                    player=shadow_player,
                    seat_order=i,
                    is_current=False,
                )

                if request.POST[f"player{i + 1}"]:
                    display_name = request.POST[f"player{i + 1}"]
                else:
                    display_name = f"{shadow_names[i - 1]}"
                shadow_players.append(display_name)

            # Store shadow display names in creator's notes (replaces player0notes)
            creator_gp = newGame.players.filter(player=request.user).first()
            if creator_gp:
                creator_gp.notes = json.dumps(shadow_players)
                creator_gp.save()

            presenter = cast('KfwPresenter', newGame.presenter())
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
                "KFW",
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
        else:
            _startingOptions.append(int(request.POST["hiddenInfoLevel"]))

        if "learningGame" in request.POST:
            _startingOptions.append(int(request.POST.get("learningGame")))
        if "experiencedGame" in request.POST:
            _startingOptions.append(int(request.POST.get("experiencedGame")))
        if "useMerchants" in request.POST:
            _startingOptions.append(int(request.POST["useMerchants"]))
        if "useAllPromos" in request.POST:
            _startingOptions.append(int(request.POST["useAllPromos"]))

        newGame.startingOptions = json.dumps(_startingOptions)

        if "privateGame" in request.POST:
            newGame.gameStatus = "PRIVATE"

        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("KFW", getattr(newGame, "id"))))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


def showKFWgame(request, game_id=1, spoilerFree=False, replayStep=1):
    try:
        currentGame = Game.objects.select_related(
            "host", "creator"
        ).prefetch_related(
            "players__player",
        ).get(id=game_id, gameCode='KFW')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    presenter = cast('KfwPresenter', currentGame.presenter())

    # Access the prefetch cache immediately to "warm" it
    all_game_players = list(currentGame.players.select_related("player").all())
    all_player_ids = {gp.player.id for gp in all_game_players if gp.player}
    missing_player_ids = {gp.player.id for gp in all_game_players if gp.player and gp.is_missing}
    kicked_player_ids = {gp.player.id for gp in all_game_players if gp.player and gp.is_kicked}
    chat_notify_ids = {gp.player.id for gp in all_game_players if gp.player and gp.has_chat_notification}

    userObj = request.user
    username = userObj.username

    gameID = currentGame.id
    gameName = presenter.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

    allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeat(False))

    gameData1 = (
        presenter.getGameData1Compressed(request.user.username)
        if request.user.is_authenticated
        else presenter.getGameData1Compressed("")
    )
    gameData3 = presenter.getGameData3compressed()

    # Logged out
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameData1": gameData1,
        "gameData3": gameData3,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 0,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "allPlayerListBySeat": allPlayerListBySeat,
        "currentPlayers": presenter.getCurrentPlayers(),
        "finishedGame": currentGame.gameStatus == "FINISHED",
        "preferredKFWoptions": [-1],
        "pov": -99,
        "move": "",
        "turn": currentGame.turn,
        "settingsDEBUG": config("KFW_USE_SOURCE_CODE", default=False, cast=bool),
    }

    if not request.user.is_authenticated:
        return render(request, "KFW/showKFWgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    is_kicked = user_id in kicked_player_ids
    involvedPlayer = is_in_all and not is_missing and not is_kicked
    if username in KFW_SUPER_USERS:
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code=KFW"

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if user_id in chat_notify_ids:
        chatNotification = True
        presenter.removeChatNotification(request.user)

    returnData["pov"] = -9

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "KFW/showKFWgame.html", returnData)

    pov = presenter.seatPosition(request.user.username)
    if username in KFW_SUPER_USERS:
        pov = 0
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(request.user.username)

    ## Get the Notes for the user
    player_gp = currentGame.players.filter(player=request.user).first()
    notes = player_gp.notes if player_gp else ""

    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    ## Involved Player
    returnData["pov"] = pov
    returnData["move"] = presenter.getMoveData(request.user.username)

    preferredKFWoptions = (
        json.loads(user_profile.preferredKFWoptions) if user_profile.preferredKFWoptions != "" else [-1]
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
            "preferredKFWoptions": preferredKFWoptions,
        }
    )

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            # Display names are stored in the creator's notes (replaces player0notes)
            creator_gp = currentGame.players.filter(player=currentGame.creator).first()
            displayNames = creator_gp.notes if creator_gp else ""
            if creator_gp:
                creator_gp.notes = ""
                creator_gp.save()
            notes = ""

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
            }
        )

    return render(request, "KFW/showKFWgame.html", returnData)


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
        print("ERROR-KFW: Not running, %s mutex not available" % (mutex_name))


@login_required()
def processKFWturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processKFWturn(request)


@login_required()
def _processKFWturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    latest_update = str(jsonData.get("latestUpdate", 0))

    try:
        currentGame = Game.objects.get(id=game_id, gameCode='KFW')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('KfwPresenter', currentGame.presenter())

    if jsonData["action"] == "getBoatMeeplesAndSkills":
        incomingData = presenter.decompressData(jsonData["gameData"])
        meeplesRequired = incomingData[0]
        skillsRequired = incomingData[1]
        serverDataArr = json.loads(currentGame.KFWserverData)
        meeple_bag = serverDataArr[0]
        skills_bag = serverDataArr[1]
        [meeplesPulled, meeple_bag] = presenter.pull_items_from_bag(meeplesRequired, meeple_bag)
        [skillsPulled, skills_bag] = presenter.pull_items_from_bag(skillsRequired, skills_bag)
        currentGame.KFWserverData = json.dumps([meeple_bag, skills_bag])
        currentGame.save()
        returnData = presenter.compressData([meeplesPulled, skillsPulled])
        return JsonResponse(
            {
                "data": returnData,
                "data3": presenter.getGameData3compressed(),
            },
            safe=False,
        )

    elif jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: KFW simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        response_data = {
            "completed": True,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "saveGame":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: KFW, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: KFW save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        # Process any end of turn actions
        newInformation = presenter.processEndOfTurnActions(jsonData["data2"])

        # If moving INTO winter tiles choosing, make sure data is clear
        if jsonData["phase"] == 3 and currentGame.phase != 3:
            presenter.clearAllMoveData()

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

        presenter.setCurrentPlayers(jsonData["nextPlayer"])

        # If it is boat collection phase, and there is a submitted village, then that player has no pending tiles
        if currentGame.phase == 1 or currentGame.phase == 2 and not presenter.isTrainingGame():
            if jsonData["IPM"] != "":
                if request.user.username not in KFW_SUPER_USERS:
                    presenter.updateSingleMove(request.user.username, jsonData["IPM"])
                else:
                    presenter.updateSingleMove(jsonData["BKSN"], jsonData["IPM"])
            # If you are saving INTO village expansion, check if the phase is complete
            if jsonData["phase"] == 2:
                presenter.setCurrentPlayers(presenter.getCurrentSimulPlayers())
            # If there are no players, return the simul moves to move the game on
            if presenter.getCurrentPlayersString() == "":
                currentGame.save()
                response_data = {
                    "latestUpdate": currentGame.latestUpdate,
                    "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                    "phaseEnded": True,
                    "gameData1": presenter.getGameData1Compressed(request.user.username),
                    "gameData3": presenter.getGameData3compressed(),
                    "newInformation": presenter.compressData(newInformation),
                }

                return JsonResponse(response_data, safe=False)

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
            currentPlayersField = presenter.getCurrentPlayersString()
            if (
                currentPlayersField != ""
                and currentPlayersField != "KfwBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [player.strip() for player in currentPlayersField.split(",")]
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)
                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "KFW",
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

            # If tempData isn't already on the end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if len(currentRewindData) == 0 or (
                    currentRewindData[-1] != currentGame.rewindTempData
                    and jsonData["data"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData.append(json.loads(currentGame.rewindTempData))
                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if not currentRewindData:
                currentRewindData.append(
                    [
                        jsonData["data"],
                        json.loads(currentGame.KFWserverData),
                        json.loads(currentGame.KFWplayersHiddenData),
                    ]
                )
            else:
                # else check last one isn't same as current, and if not then add
                if currentRewindData[-1][0] != jsonData["data"]:
                    currentRewindData.append(
                        [
                            jsonData["data"],
                            json.loads(currentGame.KFWserverData),
                            json.loads(currentGame.KFWplayersHiddenData),
                        ]
                    )
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "gameData1": presenter.getGameData1Compressed(request.user.username),
            "gameData3": presenter.getGameData3compressed(),
            "newInformation": presenter.compressData(newInformation),
        }

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "saveSimulMove":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: KFW saveSimulMove - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # Don't update these in case saving during the pre-village phase
        # currentGame.turn = jsonData["turn"]
        # currentGame.phase = jsonData["phase"]

        if request.user.username not in KFW_SUPER_USERS:
            presenter.updateSingleMove(request.user.username, jsonData["moveData"])
        else:
            presenter.updateSingleMove(jsonData["BKSN"], jsonData["moveData"])

        presenter.setCurrentPlayers(presenter.getCurrentPlayers())

        if request.user.username in KFW_SUPER_USERS:
            SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                jsonData["BKSN"],
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

        response = presenter.getJsonMoveResponse()
        response.append({"GameDataBoo": False})
        # If saving from a pre-phase, return the game data as well
        if jsonData["phase"] == 12:
            response[-1]["GameDataBoo"] = True  # Corrected line
            response.append({"GameData": currentGame.gameData})

        currentGame.save()
        return JsonResponse(response, safe=False)

    elif jsonData["action"] == "saveFinalScoringMove":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: KFW saveFinalScoringMove - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        # Process any end of turn actions
        newInformation = presenter.processEndOfTurnActions(jsonData["data2"])
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # If you're not a super user, and it's not a practice game, then save according to your login
        if request.user.username not in KFW_SUPER_USERS and 102 not in json.loads(currentGame.startingOptions):
            presenter.updateSingleMove(request.user.username, jsonData["moveData"])
        else:
            # Otherwise, save according to the name sent by the game
            presenter.updateSingleMove(jsonData["BKSN"], jsonData["moveData"])

        presenter.setCurrentPlayers(presenter.getCurrentPlayers())

        if request.user.username in KFW_SUPER_USERS:
            SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                jsonData["BKSN"],
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

        response = presenter.getJsonMoveResponseFinalScoring()

        currentGame.save()
        return JsonResponse(response, safe=False)

    elif jsonData["action"] == "saveEndGame":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: KFW, save -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: KFW save - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
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

    # END SAVE / CREATE

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

    elif jsonData["action"] == "loadRewind":
        if latest_update != "9999999999999" and str(latest_update) != str(currentGame.latestUpdate):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: KFW, loadRewind -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: KFW loadRewind - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
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

        if presenter.anyMoveData():
            # This saves it anyway
            presenter.clearAllMoveData()
            # add all players back into currentPlayers
            presenter.setCurrentPlayers(presenter.getCurrentSimulPlayers())

            if currentGame.rewindTempData != "":
                loadDataArr = json.loads(currentGame.rewindTempData)
            else:
                loadDataArr = currentRewindDataArray.pop()

            ####################################
            currentGame.gameData = loadDataArr[0]
            currentGame.KFWserverData = json.dumps(loadDataArr[1])
            currentGame.KFWplayersHiddenData = json.dumps(loadDataArr[2])
            ####################################

            newVer = (int(currentGame.latestUpdate) % 1000) + 1
            currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)
            currentGame.save()

            gameData1 = presenter.getGameData1Compressed(request.user.username)
            gameData3 = presenter.getGameData3compressed()

            return JsonResponse(
                {
                    "gameData": loadDataArr[0],
                    "gameData1": gameData1,
                    "gameData3": gameData3,
                    "latestUpdate": currentGame.latestUpdate,
                    "missingPlayers": presenter.getMissingPlayersNamesArray(),
                },
                safe=False,
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

        loadDataArr = []
        if len(currentRewindDataArray) > 0:
            loadDataArr = currentRewindDataArray.pop()

        while len(loadDataArr) > 0 and loadDataArr[0] == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadDataArr = currentRewindDataArray.pop()

        currentGame.gameData = loadDataArr[0]

        currentGame.KFWserverData = json.dumps(loadDataArr[1])
        currentGame.KFWplayersHiddenData = json.dumps(loadDataArr[2])

        currentGame.rewindTempData = json.dumps(loadDataArr)
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # Delete move data
        presenter.clearAllMoveData()

        currentGame.save()

        gameData1 = presenter.getGameData1Compressed(request.user.username)
        gameData3 = presenter.getGameData3compressed()

        return JsonResponse(
            {
                "gameData": loadDataArr[0],
                "gameData1": gameData1,
                "gameData3": gameData3,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # End LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        presenter.setCurrentPlayers(jsonData["nextPlayer"])
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        loadedStartingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "KfwBot" and 102 not in loadedStartingOptions:
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "KFW",
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
        if latest_update != "9999999999999" and str(latest_update) != str(
            currentGame.latestUpdate
        ):
            print(
                f"Sync Error: {latest_update} != {currentGame.latestUpdate} Game: KFW, kickout -- user: {request.user.username}"
            )
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: KFW kickout - gameID: {game_id} - User: {request.user.username} - JSON_LU: {latest_update} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersString()}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": "12345"}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        presenter.clearAllMoveData()

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

    elif jsonData["action"] == "adminDataInspection":
        # data1
        playersHiddenDataArr = json.loads(currentGame.KFWplayersHiddenData)
        returnData1 = []
        for playerData in playersHiddenDataArr:
            returnData1.append(playerData[1:])
        gameData1 = presenter.compressData(returnData1)
        # data3
        serverDataArr = json.loads(currentGame.KFWserverData)
        meepleArr = serverDataArr[0]
        skillsArr = serverDataArr[1]
        gameData3 = presenter.compressData([meepleArr, skillsArr])
        return JsonResponse(
            {
                "gameData1": gameData1,
                "gameData3": gameData3,
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


def KFWdata(request, data_type=1):
    if not request.user.is_authenticated:
        # User is not logged in, redirect to login page
        return redirect(reverse("myLogin"))

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='KFW')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('KfwPresenter', currentGame.presenter())

    if data_type == 1:
        gameData1 = (
            presenter.getGameData1Compressed(request.user.username)
            if request.user.is_authenticated
            else presenter.getGameData1Compressed("")
        )
        gameData3 = presenter.getGameData3compressed()
        returnData = {
            "gameData": currentGame.gameData,
            "gameData1": gameData1,
            "gameData3": gameData3,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "finishedGame": currentGame.gameStatus == "FINISHED",
            "latestUpdate": currentGame.latestUpdate,
            "move": presenter.getMoveData(request.user.username),
        }
        # Send game data
        return JsonResponse(returnData)
    elif data_type == 2:
        # Remove user from notifications
        presenter.removeChatNotification(request.user)
        currentGame.save()
        return JsonResponse(
            {
                "chatData": currentGame.chatData
            },
            safe=True,
        )
    # Check for update comparison, and update or do nothing
    if data_type == 3:
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        gameData1 = (
            presenter.getGameData1Compressed(request.user.username)
            if request.user.is_authenticated
            else presenter.getGameData1Compressed("")
        )
        gameData3 = presenter.getGameData3compressed()
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "gameData1": gameData1,
                "gameData3": gameData3,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
                "move": presenter.getMoveData(request.user.username),
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
        currentGame = Game.objects.get(id=gameID, gameCode='KFW')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    extraInfo = (
        "Options: "
        + currentGame.startingOptions
        + "ServerData: "
        + currentGame.KFWserverData
        + "  PlayersHiddenData: "
        + currentGame.KFWplayersHiddenData
        + "  PlayersMoveData: "
        + currentGame.KFWplayersMoveData
    )

    # email data to myself
    SN_sendBugReportEmail(request, "KFW", gameID, gameData, bugDescription, currentGame.rewindData, extraInfo)

    return JsonResponse({"bugEntrySuccess": True})


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

        currentGame = Game.objects.get(id=game_id, gameCode='KFW')

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
        currentGame.players.exclude(player__username=request.user.username).exclude(is_kicked=True).update(has_chat_notification=True)
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
        currentGame = Game.objects.get(id=game_id, gameCode='KFW')
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    player_gp = currentGame.players.filter(player=request.user).first()
    if player_gp:
        player_gp.notes = notes
        player_gp.save()

    return JsonResponse({"notePosted": True})


@login_required
def saveZoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode='KFW')
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
