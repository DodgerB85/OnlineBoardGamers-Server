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
from django.shortcuts import render
from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.db import transaction, connection
from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendInviteNotifications,
    SN_sendNextTurnNotification,
    SN_sendBugReportEmail,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.sharedFunctions.constants import STATS_EXCLUDE_VOTE_TOPIC, DELETE_VOTE_TOPIC

if TYPE_CHECKING:
    from Lobby.presenters import CannesPresenter 
    
CNS_DB_LOCK_NAME = "lockCNSgame_"

# Create your views here.
def index(request):
    return HttpResponse("Hello, world. You're at the CNS index")


def redirectLegacyCNS(request, original_id):
    """Redirect from old /CNS/:original_id format to new /CNS/:id/show format"""
    try:
        game = Game.objects.get(gameCode="CNS", original_id=original_id)
        return HttpResponseRedirect(reverse("CNS:showCNSgame", args=[game.id]))
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))


def CNShelp(request):
    return render(request, "CNS/CNShelp.html")


@login_required
def createCNSgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

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
        newGame = Game(
            gameCode="CNS",
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

        # Add creator as a player
        GamePlayer.objects.create(
            game=newGame,
            player=request.user,
        )

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3"]
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i-1]}")
                GamePlayer.objects.create(
                    game=newGame,
                    player=shadow_player,
                )

                if request.POST[f"player{i+1}"]:
                    display_name = request.POST[f"player{i+1}"]
                else:
                    display_name = f"{shadow_names[i-1]}"
                shadow_players.append(display_name)

            # Store shadow player names in creator's notes
            creator_gp = GamePlayer.objects.get(game=newGame, player=request.user)
            creator_gp.notes = json.dumps(shadow_players)
            creator_gp.save()

            newGame.presenter().startGame(request)
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
                "CNS",
            )

        newGame.kickoutDuration = request.POST["kickoutDuration"]
        zoomLevels = [24] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)
        if "trainingGame" in request.POST:
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            newGame.statsExcludedGame = True

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
        messages.success(request, (SF_getGameCreationJsonReturn("CNS", newGame.id)))
        return HttpResponseRedirect(
            reverse("indexListType", kwargs={"listType": "waiting"})
        )


def showCNSgame(request, game_id, spoilerFree=False, replayStep=1):
    try:
        currentGame = (
            Game.objects.select_related("host", "creator")
            .prefetch_related("players__player", "invitedPlayers")
            .get(id=game_id, gameCode="CNS")
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = currentGame.presenter()

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    # all_players = currentGame.players.exclude(is_kicked=True)
    all_players = GamePlayer.objects.filter(game=currentGame).exclude(is_kicked=True)
    all_player_ids = {gp.player.id for gp in all_players if gp.player}
    userObj = request.user
    username = userObj.username

    # Now it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = currentGame.presenter().getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = (
        json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    )
    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )

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
        "settingsDebug": config("CNS_USE_SOURCE_CODE", default=False, cast=bool),
        "statsExcludeVotesData": json.dumps(
            currentGame.presenter().getFullSetOfVoteResults(
                STATS_EXCLUDE_VOTE_TOPIC, currentGame.presenter().getAllPlayersOrderedySeat(True), False
            )
        ),
        "deleteVotesData": json.dumps(
            currentGame.presenter().getFullSetOfVoteResults(
                DELETE_VOTE_TOPIC, currentGame.presenter().getAllPlayersOrderedySeat(True), False
            )
        ),
    }

    if not request.user.is_authenticated:
        return render(request, "CNS/showCNSgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)
    user_gp = all_players.filter(player=userObj).first()

    is_in_all = user_id in all_player_ids
    is_missing = user_gp.is_missing if user_gp else False
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    # Get Chat notification
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        user_gp.has_chat_notification = False
        user_gp.save()

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={presenter.getGameCode()}"

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

    pov = presenter.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(username)

    # Get the Notes for the user
    notes = user_gp.notes if user_gp else ""

    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    preferredCNScolour = (
        user_profile.preferredCNScolour
        if user_profile.preferredCNScolour is not None
        else -1
    )

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
            #"myStatsExcludeConsent": int(
            #    currentGame.statsExcludeConsent[pov : pov + 1]
            #),
        }
    )

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            creator_gp = all_players.filter(player=currentGame.creator).first()
            if creator_gp:
                displayNames = creator_gp.notes
                creator_gp.notes = ""
                creator_gp.save()
                if user_gp and user_gp.player == currentGame.creator:
                    notes = ""
            currentGame.save()
        allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeat())

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
        currentGame = Game.objects.get(id=game_id, gameCode="CNS")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast('CannesPresenter', currentGame.presenter())

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):
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

        # Update current players
        next_player_usernames = (
            jsonData["nextPlayer"].split(",") if jsonData["nextPlayer"] else []
        )
        # currentGame.players.exclude(is_kicked=True).update(is_current=False)
        GamePlayer.objects.filter(game=currentGame).exclude(is_kicked=True).update(
            is_current=False
        )
        # if next_player_usernames:
        #    for username in next_player_usernames:
        #        currentGame.players.filter(player__username=username, is_kicked=False).update(is_current=True)
        # 2. Update specific players
        if next_player_usernames:
            GamePlayer.objects.filter(
                game=currentGame,
                player__username__in=next_player_usernames,
                is_kicked=False,
            ).update(is_current=True)
        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["gameID"],
            )

        # Don't notify if auto-passing
        else:
            # Send Notifications
            loadedStartingOptions = (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            )
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "CnsBot"
                and jsonData["status"] != "FINISHED"
                and 102 not in loadedStartingOptions
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "CNS",
                        playerListToNotify,
                        currentGame.id,
                        currentGame.presenter().getGameName(),
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
                # MAYBE ADD AN INDENT TO THIS LINE????

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

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
        # missing_gp = currentGame.players.filter(player=_missingPlayer).first()
        missing_gp = GamePlayer.objects.filter(
            game=currentGame, player=_missingPlayer
        ).first()
        if missing_gp:
            missing_gp.is_missing = True
            missing_gp.save()
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
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):
            return JsonResponse({"syncError": True}, safe=False)

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

        loadData = ""
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": presenter.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        # Update current players
        next_player_usernames = (
            jsonData["nextPlayer"].split(",") if jsonData["nextPlayer"] else []
        )
        # currentGame.players.exclude(is_kicked=True).update(is_current=False)
        # if next_player_usernames:
        #    for username in next_player_usernames:
        #        currentGame.players.filter(player__username=username, is_kicked=False).update(is_current=True)
        # 1. Reset all non-kicked players for this game to is_current=False
        GamePlayer.objects.filter(game=currentGame).exclude(is_kicked=True).update(
            is_current=False
        )

        # 2. Update all next players in a single query (Optimized Method 3)
        if next_player_usernames:
            GamePlayer.objects.filter(
                game=currentGame,
                player__username__in=next_player_usernames,
                is_kicked=False,
            ).update(is_current=True)

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
            and jsonData["nextPlayer"] != "CnsBot"
            and 102 not in loadedStartingOptions
        ):
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "CNS",
                    playerListToNotify,
                    currentGame.id,
                    currentGame.presenter().getGameName(),
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
        if latest_update != "9999999999999" and latest_update != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        # missing_gp = currentGame.players.filter(player=_missingPlayer).first()
        missing_gp = GamePlayer.objects.filter(
            game=currentGame, player=_missingPlayer
        ).first()
        if missing_gp:
            missing_gp.is_missing = True
            missing_gp.is_kicked = True
            missing_gp.save()
        presenter.checkForHostChange(_missingPlayer)

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

    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode="CNS")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "CNS", gameID, gameData, bugDescription, currentGame.rewindData, ""
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    game_id = jsonData["gameID"]
    notes = jsonData["notes"]

    try:
        currentGame = Game.objects.get(id=game_id, gameCode="CNS")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # presenter = currentGame.presenter()
    # user_gp = currentGame.players.filter(player=request.user).first()
    user_gp = GamePlayer.objects.filter(game=currentGame, player=request.user).first()
    if user_gp:
        user_gp.notes = notes
        user_gp.save()

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

        currentGame = Game.objects.get(id=game_id, gameCode="CNS")

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


@login_required
def CNSdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="CNS")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = currentGame.presenter()

    if dataType == 1:
        # Send game data
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    elif dataType == 2:
        # Remove user from notifications
        #user_gp = currentGame.players.filter(player=request.user).first()
        user_gp = GamePlayer.objects.filter(game=currentGame, player=request.user).first()
        if user_gp:
            user_gp.has_chat_notification = False
            user_gp.save()
        return JsonResponse(
            {"chatData": currentGame.chatData},
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


@login_required
def changeCNSzoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="CNS")
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
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(CNS_DB_LOCK_NAME + str(gameID)):
        return _castVote(request)


@login_required
def _castVote(request):
    """Adds a delete vote for a player."""
    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"])
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # Delegate all logic to the presenter
    result = currentGame.presenter().processVoteLogic(
        topic=jsonData["topic"],
        username=request.user.username,
        choice=True,
    ) 

    # If an action occurred that requires a user message, add it here
    msg = result.get("message")
    if isinstance(msg, str):  # This clarifies the type for the type checker
        messages.success(request, msg)
        
    return JsonResponse(result)
