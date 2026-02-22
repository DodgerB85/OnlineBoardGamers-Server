import json
import time
import lzstring

# import requests
from decouple import config
from typing import TYPE_CHECKING, cast

from contextlib import contextmanager

from django.shortcuts import render, get_object_or_404, redirect
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


from Lobby.models import User, Profile, Game, GamePlayer

from .common import create_bus_game

from Lobby.sharedFunctions.constants import STATS_EXCLUDE_VOTE_TOPIC, DELETE_VOTE_TOPIC


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

if TYPE_CHECKING:
    from Lobby.presenters import BusPresenter

BUS_DB_LOCK_NAME = "lockTGZgame_"


def index(request):
    return HttpResponse("Hello Geeks")


def BusHelp(request):
    return render(request, "Bus/BusHelp.html")


def redirect_old_url(request, original_id):
    """Redirect old Bus_Game URLs to new Game Game URLs"""
    game = get_object_or_404(Game, gameCode="Bus", original_id=original_id)
    return redirect("Bus:showBusGame", game_id=game.id)


@login_required()
def createBusGame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_bus_game(request)

def showBusGame(request, game_id):
    try:
        currentGame = (
            Game.objects.select_related(
                "host",
                # "relatedBusTournament",
                "creator",
            )
            .prefetch_related("players__player", "invitedPlayers")
            .get(id=game_id, gameCode="Bus")
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("BusPresenter", currentGame.presenter())

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Access the prefetch cache immediately to "warm" it
    all_player_gps = list(currentGame.players.exclude(is_kicked=True))
    all_player_ids = {gp.player.id for gp in all_player_gps if gp.player}
    userObj = request.user
    username = userObj.username

    # Now it is a proper started game, so set up for not logged in
    gameID = currentGame.id
    gameName = presenter.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created

    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)

    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )

    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 120,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "settingsDEBUG": config("BUS_USE_SOURCE_CODE", default=False, cast=bool),
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
        return render(request, "Bus/showBusGame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)

    # Find user's GamePlayer record
    user_gp = None
    for gp in all_player_gps:
        if gp.player and gp.player.id == user_id:
            user_gp = gp
            break

    is_in_all = user_id in all_player_ids
    is_missing = user_gp.is_missing if user_gp else False
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={presenter.getGameCode()}"

    # Get Chat notification
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        user_gp.has_chat_notification = False
        user_gp.save()

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

    pov = presenter.seatPosition(request.user.username)
    if request.user.username == "BotKickStarter":
        pov = -1
    latestUpdate = currentGame.latestUpdate
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(request.user.username)

    # Get the Notes for the user from GamePlayer
    notes = ""
    if user_gp:
        notes = user_gp.notes or ""

    liveNotification = user_profile.liveNotification

    myZoomLevel = (
        json.loads(currentGame.zoomLevels)[pov]
        if pov >= 0 and pov < len(json.loads(currentGame.zoomLevels))
        else 120
    )

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
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            # Get display names from player0's notes
            user_gp = currentGame.players.filter(player=request.user).first()
            if user_gp:
                displayNames = user_gp.notes
                user_gp.notes = ""
                user_gp.save()
            notes = ""
        allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeat())

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "Bus/showBusGame.html", returnData)


@login_required()
def saveNotes(request, game_id=None):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="Bus")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("BusPresenter", currentGame.presenter())
    seat = presenter.seatPosition(request.user.username)

    if seat >= 0:
        gp = currentGame.players.filter(seat_order=seat).first()
        if gp:
            gp.notes = jsonData["notes"]
            gp.save()

    return JsonResponse({"notePosted": True})


@login_required
def busData(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="Bus")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("BusPresenter", currentGame.presenter())

    if dataType == 2:
        # Send game data
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    if dataType == 3:
        # Remove user from notifications
        presenter.removeChatNotification(request.user)
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
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="Bus")
        presenter = cast("BusPresenter", currentGame.presenter())

        # Remove chat notification for current user
        presenter.removeChatNotification(request.user)

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
        all_usernames = [
            gp.player.username
            for gp in currentGame.players.exclude(is_kicked=True).select_related(
                "player"
            )
            if gp.player
        ]
        usernames_to_notify = [u for u in all_usernames if u != request.user.username]
        presenter.addChatNotifications(usernames_to_notify)

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
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="Bus")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = cast("BusPresenter", currentGame.presenter())

    if jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        currentPlayersArr = presenter.getCurrentPlayersArray()
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentPlayersArr}"
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

        # Set current players via presenter
        presenter.setCurrentPlayers(jsonData["nextPlayer"])

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            # _winnerArray is an array of [winner_username, winner_username, ...]
            # _tournamentData is an array [ [username], [username, username,... TB_VALUE], [username, username,..., TB_VALUE], [...etc] ]
            # NB THE FIRST ENTRY IS AN ARRAY OF (MULTIPLE) WINNER(S)
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                (
                    jsonData.get("tournamentData")
                    if jsonData.get("tournamentData")
                    else []
                ),
                jsonData["gameID"],
            )
            # presenter.endGame(
            #    request,
            #    jsonData["winner"],
            #    jsonData["finalPositions"],
            #    jsonData["gameID"],
            # )

        else:
            # Send Notifications
            starting_options = (
                json.loads(currentGame.startingOptions)
                if currentGame.startingOptions
                else []
            )
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "HcBot"
                and not jsonData["status"] == "FINISHED"
                and 102 not in starting_options
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
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )
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
        presenter.setCurrentPlayers(jsonData["nextPlayer"])
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        starting_options = (
            json.loads(currentGame.startingOptions)
            if currentGame.startingOptions
            else []
        )
        if (
            jsonData["nextPlayer"] != ""
            and jsonData["nextPlayer"] != "HcBot"
            and 102 not in starting_options
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

    elif jsonData["action"] == "saveGameDataAfterKickout":
        currentPlayersArr = presenter.getCurrentPlayersArray()
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
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentPlayersArr}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        ## WHY WAS THIS COMMENTED OUT????
        # currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
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
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="Bus")
        except Game.DoesNotExist:
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
        currentGame = Game.objects.get(id=gameID, gameCode="Bus")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "Bus", gameID, gameData, bugDescription, currentGame.rewindData, ""
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
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
