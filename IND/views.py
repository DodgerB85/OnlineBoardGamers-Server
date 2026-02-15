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
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.models import User, Profile, Game, GamePlayer

if TYPE_CHECKING:
    from Lobby.presenters import IndPresenter

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
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # if (
    #    "trainingGame" not in request.POST
    #    and request.user.username != "admin"
    #    and request.user.username != "massibull"
    #    and request.user.username != "DodgerB"
    #    and request.user.username != "pgh_gamer"
    #    and request.user.username != "PhasingPlayer"
    # ):
    #    messages.error(request, gettext("Practice games only for now"))
    #    return HttpResponseRedirect(reverse("createINDpage"))

    players = ["player2", "player3", "player4", "player5"]
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
                return HttpResponseRedirect(reverse("createINDpage"))
            if username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return HttpResponseRedirect(reverse("createINDpage"))

    _gameDescription = request.POST["gameDescription"]
    _maxPlayers = int(request.POST.get("playerNumber", "2"))
    _pace = request.POST["pace"]

    _created = SR_getTimeNow()

    with transaction.atomic():
        newGame = Game(
            gameCode="IND",
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

        _gameName = request.POST["gameName"]
        if _gameName != "":
            newGame.gameName = _gameName

        newGame.save()

        # Create GamePlayer for the creator
        GamePlayer.objects.create(
            game=newGame,
            player=request.user,
            seat_order=0,
            is_current=False,
            is_missing=False,
            is_kicked=False,
            has_chat_notification=False,
            winner=False,
            notes="",
        )

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4"]
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i-1]}")

                # Create GamePlayer for shadow player
                GamePlayer.objects.create(
                    game=newGame,
                    player=shadow_player,
                    seat_order=i,
                    is_current=False,
                    is_missing=False,
                    is_kicked=False,
                    has_chat_notification=False,
                    winner=False,
                    notes="",
                )

                if request.POST[f"player{i+1}"]:
                    display_name = request.POST[f"player{i+1}"]
                else:
                    display_name = f"{shadow_names[i-1]}"
                shadow_players.append(display_name)

            # Store display names in the first player's notes (seat_order=0)
            user_gp = newGame.players.filter(player=request.user).first()
            if user_gp:
                user_gp.notes = json.dumps(shadow_players)
                user_gp.save()

            presenter = cast("IndPresenter", newGame.presenter())
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
                "IND",
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
        if "keepMoneyHidden" in request.POST:
            _startingOptions.append(int(request.POST["keepMoneyHidden"]))
        if "useAegeanMap" in request.POST:
            _startingOptions.append(int(request.POST["useAegeanMap"]))
            newGame.statsExcludedGame = True
        if "usePHPmap" in request.POST:
            _startingOptions.append(int(request.POST["usePHPmap"]))
            newGame.statsExcludedGame = True
        if "useMergerSubsidy" in request.POST:
            _startingOptions.append(int(request.POST["useMergerSubsidy"]))
        if "useShippingSubsidy" in request.POST:
            _startingOptions.append(int(request.POST["useShippingSubsidy"]))

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
        messages.success(request, (SF_getGameCreationJsonReturn("IND", newGame.id)))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )


def showINDgame(request, game_id=1, spoilerFree=False, replayStep=1):
    try:
        currentGame = (
            Game.objects.select_related("host", "creator")
            .prefetch_related("players__player", "invitedPlayers")
            .get(id=game_id, gameCode="IND")
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("IndPresenter", currentGame.presenter())

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_game_players = currentGame.players.exclude(is_kicked=True).all()
    all_player_ids = {gp.player.id for gp in all_game_players if gp.player}
    userObj = request.user
    username = userObj.username

    # start_time = time.time()
    # show_timestamps = username in ["admin", "DodgerB"]

    # def print_timestamp(label):
    #    if show_timestamps:
    #        print(f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}")

    # No2 it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = presenter.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = (
        json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    )
    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )

    allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeat(False))

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
        "currentPlayers": presenter.getCurrentPlayersString(),
        "finishedGame": currentGame.gameStatus == "FINISHED",
        "preferredINDoptions": [-1, 0, 0, 1, 1, 1],
        "pov": -99,
        "deleteVotesData": json.dumps(presenter.getDeleteVotesData()),
        "preMoves": "",
        "sideData": "",
        "settingsDEBUG": config("IND_USE_SOURCE_CODE", default=False, cast=bool),
    }

    # print_timestamp("returnData 1")

    if not request.user.is_authenticated:
        return render(request, "IND/showINDgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)
    missing_player_ids = {
        gp.player.id for gp in currentGame.players.filter(is_missing=True) if gp.player
    }
    chat_notify_ids = {
        gp.player.id
        for gp in currentGame.players.filter(has_chat_notification=True)
        if gp.player
    }

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={presenter.getGameCode()}"

    # print_timestamp("nextURL")

    preferredINDoptions = (
        json.loads(user_profile.preferredINDoptions)
        if user_profile.preferredINDoptions != ""
        else [-1, 0, 0, 1, 1, 1]
    )

    if len(preferredINDoptions) < 6:
        preferredINDoptions.extend([1] * (6 - len(preferredINDoptions)))
    # preferredINDoptions
    # colour, map, citySizeColour, outline

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if user_id in chat_notify_ids:
        chatNotification = True
        user_gp = currentGame.players.filter(player=request.user).first()
        if user_gp:
            user_gp.has_chat_notification = False
            user_gp.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            "preferredINDoptions": preferredINDoptions,
            "chatNotification": chatNotification,
            "pov": -9,
        }
    )

    # print_timestamp("returnData 2")

    if not involvedPlayer:
        return render(request, "IND/showINDgame.html", returnData)

    pov = presenter.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(username)

    ## Get the Notes for the user
    notes = ""
    if pov >= 0:
        user_gp = currentGame.players.filter(player=userObj).first()
        if user_gp:
            notes = user_gp.notes

    # print_timestamp("notes")

    liveNotification = user_profile.liveNotification
    myZoomLevel = 100
    if pov >= 0:
        myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    isHost = False
    if currentGame.host == userObj:
        isHost = True

    # print_timestamp("returnData 3")

    ## Involved Player
    returnData.update(
        {
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "yourTurnAudioType": liveNotification,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "isHost": isHost,
            "preMoves": presenter.getCompressedPreMoveArr(request.user.username),
            "sideData": presenter.getAllPreMoveDataCompressed(),
        }
    )

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            # For shadow games, display names are stored in the first player's notes
            user_gp = currentGame.players.filter(player=userObj).first()
            if user_gp and user_gp.notes:
                displayNames = user_gp.notes
                user_gp.notes = ""
                user_gp.save()
                notes = ""
        # allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeat())

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                # "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

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

    presenter = cast("IndPresenter", currentGame.presenter())

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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersArray()}"
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

        presenter.setCurrentPlayers(jsonData["nextPlayer"])

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
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "IndBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = [
                    player.strip() for player in jsonData["nextPlayer"].split(",")
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
            # currentRewindDataArray = currentRewindData.split("'SPLIT'")

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
        success = presenter.addDeleteVote(
            _missingPlayer.username
        )  # Pass playerName to addDeleteVote
        # presenter.enableStatsExclude(request.user.username)

        # newVer = (int(currentGame.latestUpdate) % 1000) + 1
        # currentGame.latestUpdate = str((int(time.time())*1000) + newVer)
        # currentGame.save()
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": presenter.getCurrentPlayersArray(),
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersArray()}"
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
        presenter.setCurrentPlayers(jsonData["nextPlayer"])
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
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "IndBot"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersArray()}"
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
        success = presenter.addDeleteVote(
            _missingPlayer.username
        )  # Pass playerName to addDeleteVote
        # presenter.enableStatsExclude(_missingPlayer.username)

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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getCurrentPlayersArray()}"
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
        raise Http404(gettext("Game does not exist"))

    presenter = cast("IndPresenter", currentGame.presenter())

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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode="IND")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "IND", gameID, gameData, bugDescription, currentGame.rewindData, ""
    )

    return JsonResponse({"bugEntrySuccess": True})


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
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]
    try:
        currentGame = Game.objects.get(id=game_id, gameCode="IND")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # Save notes to the GamePlayer record
    user_gp = currentGame.players.filter(player=request.user).first()
    if user_gp:
        user_gp.notes = notes
        user_gp.save()

    return JsonResponse({"notePosted": True})


@login_required
def saveZoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="IND")
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
    original_players = list(source_game.players.all())

    newGame = source_game
    newGame.pk = None
    # newGame.id = None
    newGame.gameName = f"{source_game.getGameName()} (fork)"
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
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="IND")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("IndPresenter", currentGame.presenter())
    playerName = request.user.username  # Get the player's username

    success = presenter.addDeleteVote(playerName)  # Pass playerName to addDeleteVote

    if success:
        # Check if all players have voted to delete
        all_voted = True
        delete_votes_data = presenter.getDeleteVotesData()
        missingPlayers = presenter.getMissingPlayersNamesArray()
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
                    "deleteVotesData": json.dumps(presenter.getDeleteVotesData()),
                    "redirect_url": reverse("index"),
                }
            )

        return JsonResponse(
            {
                "voteChanged": True,
                "deleteVotesData": json.dumps(presenter.getDeleteVotesData()),
            },
            safe=False,
        )

    return JsonResponse({"voteChanged": False})
