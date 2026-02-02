import json
import lzstring
import time
import requests
import random

from contextlib import contextmanager

from decouple import config

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.shortcuts import render  # , redirect
from django.contrib.auth.decorators import login_required

# from django.contrib.sites.shortcuts import get_current_site
# from django.template.loader import render_to_string
from django.utils.translation import gettext  # , get_language
from django.contrib import messages
from django.urls import reverse
from django.db import connection, transaction
from django.shortcuts import get_object_or_404

from django.db.models import Q

from Lobby.models import User, Profile, Game, GamePlayer

from Lobby.sharedFunctions.sharedFunctions import (
    SF_TGZadvancedOptions,
    SF_getGameCreationJsonReturn,
    SF_updateFlexiTime,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_T_sendTournamentGameStartNotification,
    SN_sendBugReportEmail,
    SN_sendNextTurnNotification,
    SN_sendInviteNotifications,
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from .common import create_tgz_game

def index(request):
    return HttpResponse("Secret tip! Click your name in the top right in a PRACTICE game to unlock all gods!")


def redirectLegacyTGZ(request, original_id):
    """Redirect from old /TGZ/:original_id format to new /TGZ/:id/show format"""
    try:
        game = Game.objects.get(gameCode="TGZ", original_id=original_id)
        return HttpResponseRedirect(reverse("TGZ:showTGZgame", args=[game.id]))
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))


def TGZhelp(request):
    return render(request, "TGZ/TGZhelp.html")


@login_required()
def createTGZgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_tgz_game(request)

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
        print("ERROR-TGZ: Not running, %s mutex not available" % (mutex_name))


def showTGZgame(request, game_id, spoilerFree=False, replayStep=1):
    try:
        currentGame = (
            Game.objects.select_related("host", "creator", "relatedMainTournament")
            .prefetch_related("players__player", "invitedPlayers")
            .get(id=game_id, gameCode="TGZ")
        )
        presenter = currentGame.presenter()
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))
    
    # Access the prefetch cache immediately to "warm" it
    all_players = GamePlayer.objects.filter(game=currentGame).exclude(is_kicked=True)
    all_player_ids = {gp.player.id for gp in all_players if gp.player}
    
    userObj = request.user
    username = userObj.username
    
    #start_time = time.time()
    #show_timestamps = username in ["admin", "DodgerB"]
    #def print_timestamp(label):
    #    if show_timestamps:
    #        print(f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}")

    # Noe it is a proper started game, so set up for not logged in
    gameID = getattr(currentGame, "id")
    
    gameName = presenter.getGameName()
    
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)
    
    gameCode = presenter.getGameCode()
    
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 240,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "latestUpdateLiteral": currentGame.latestUpdate,
        "settingsDEBUG": config("TGZ_USE_SOURCE_CODE", default=False, cast=bool),
    }
    
    #print_timestamp("After not logged in setup")

    if not request.user.is_authenticated:
        return render(request, "TGZ/showTGZgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id
    
    user_profile = Profile.objects.get(user=userObj)
    
    user_gp = all_players.filter(player=userObj).first()
    is_in_all = user_id in all_player_ids
    is_missing = user_gp.is_missing if user_gp else False
    
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True
    if username == "TGZtourneyAdmin" and currentGame.relatedMainTournament is not None:
        involvedPlayer = True
            
    preferredTGZcolour = user_profile.preferredTGZcolour
    chatData = currentGame.chatData

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={gameCode}/"
    
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        user_gp.has_chat_notification = False
        user_gp.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "nextURL": nextURL,
            "TGZminimalText": user_profile.TGZminimalText,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "TGZ/showTGZgame.html", returnData)
    
    #print_timestamp("After not involvedPlayer")

    pov = presenter.seatPosition(username)
    
    if username == "BotKickStarter":
        pov = 0
    # Check for external tournament game
    is_external_tournament = presenter.isExternalTournamentGame()
    
    if username == "TGZtourneyAdmin" and is_external_tournament:
        pov = 0
    
    secondsToNextKickout = presenter.getSecondsToNextKickout()
    kickoutRequired = presenter.kickoutRequired()
    myMove = presenter.isMyMove(username)

    # Get the Notes for the user
    notes = user_gp.notes if user_gp else ""

    #print_timestamp("After getting notes")

    liveNotification = user_profile.liveNotification
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    autoPass = "false"
    if hasattr(currentGame, 'autoMoves') and currentGame.autoMoves is not None:
        autoMoves = json.loads(currentGame.autoMoves)
        if autoMoves[pov] == 1:
            autoPass = "true"

    experiencedPlayer = False
    if currentGame.turn == 0:
        # Count finished games for user in unified model
        if Game.objects.filter(gameCode="TGZ", players__player=request.user, gameStatus="FINISHED").distinct().count() >= 5:
            experiencedPlayer = True

    myStatsExcludeConsent = "0"
    try:
        myStatsExcludeConsent = int(currentGame.statsExcludeConsent[pov : pov + 1])
    except:
        myStatsExcludeConsent = "0"

    #print_timestamp("After getting myStatsExcludeConsent")

    # Determine external tournament game status
    is_external_tournament = presenter.isExternalTournamentGame()

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
            "yourTurnAudioType": liveNotification,
            "startingOptions": startingOptions,
            "preferredTGZcolour": preferredTGZcolour,
            "autoPass": autoPass,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "myStatsExcludeConsent": myStatsExcludeConsent,
            "externalTournamentGame": is_external_tournament,
            "experiencedPlayer": experiencedPlayer,
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
        if currentGame.startingMap != "":
            returnData.update({"startingMap": json.loads(currentGame.startingMap)})

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "TGZ/showTGZgame.html", returnData)


@login_required()
def processTGZturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processTGZturn(request)


@login_required()
def _processTGZturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        presenter = currentGame.presenter()
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # Helper function to update current players
    def set_current_players(next_player_str):
        """Update current players for unified model"""
        from Lobby.models import GamePlayer
        # Clear all is_current flags
        currentGame.players.update(is_current=False)
        # Set is_current for the next players
        if next_player_str:
            next_usernames = [name.strip() for name in next_player_str.split(',') if name.strip()]
            for username in next_usernames:
                currentGame.players.filter(player__username=username).update(is_current=True)

    if jsonData["action"] == "setAutoPass":
        playerIndex = jsonData["playerNumber"]
        autoPass = jsonData["autoPass"]
        if not autoPass and currentGame.autoMoves is None:
            return JsonResponse({"setAutoPassSuccess": True})
        if currentGame.autoMoves is None:
            autoMoves = [0] * currentGame.maxPlayers
        else:
            autoMoves = json.loads(currentGame.autoMoves)
        if autoPass:
            autoMoves[playerIndex] = 1
        else:
            autoMoves[playerIndex] = 0
        currentGame.autoMoves = json.dumps(autoMoves)
        currentGame.save()
        return JsonResponse({"setAutoPassSuccess": True})

    elif jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join([gp.player.username for gp in currentGame.players.filter(is_current=True) if gp.player])
            message = (
                f"SYNC ERROR IN: TGZ simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData:
            currentGame.startingMap = json.dumps(jsonData["mapTiles"])

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "replaceExternalTournamentPlayer":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join([gp.player.username for gp in currentGame.players.filter(is_current=True) if gp.player])
            message = (
                f"SYNC ERROR IN: TGZ replaceExternalTournamentPlayer - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        tourney_admin = User.objects.get(username="TGZtourneyAdmin")
        
        # For unified model, update GamePlayer records
        from Lobby.models import GamePlayer
        
        # Mark player as missing/kicked
        player_gp = currentGame.players.filter(player=_missingPlayer).first()
        if player_gp:
            player_gp.is_missing = True
            player_gp.is_kicked = True
            player_gp.save()
        
        # Add TGZ tourney admin if not already a player
        if not currentGame.players.filter(player=tourney_admin).exists():
            # Find the seat order of the kicked player
            kicked_seat = player_gp.seat_order if player_gp else currentGame.players.count()
            GamePlayer.objects.create(
                game=currentGame,
                player=tourney_admin,
                seat_order=kicked_seat,
                is_missing=False,
                is_kicked=False
            )

        # Change host to TGZ tourney admin (works for both models)
        currentGame.host = tourney_admin

        set_current_players(jsonData["nextPlayer"])

        # Delete Rewind Data
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()
        
        secondsToNextKickout = presenter.getSecondsToNextKickout()
            
        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": secondsToNextKickout,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join([gp.player.username for gp in currentGame.players.filter(is_current=True) if gp.player])
            message = (
                f"SYNC ERROR IN: TGZ save - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData:
            currentGame.startingMap = json.dumps(jsonData["mapTiles"])

        firstSave = False
        if currentGame.gameData == "":
            firstSave = True

        # If staying in bid phase
        autoPass = False
        if currentGame.phase == 1 and jsonData["phase"] == 1:
            if currentGame.autoMoves is not None:
                autoMoves = json.loads(currentGame.autoMoves)
                seat = presenter.seatPosition(jsonData["nextPlayer"])
                if autoMoves[seat] == 1:
                    autoPass = True

        # If moving from bids to actions, set automoves to null
        if currentGame.phase == 1 and jsonData["phase"] == 2:
            currentGame.autoMoves = None

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
        newLatestUpdate = str((int(time.time()) * 1000) + newVer)
        currentGame.latestUpdate = newLatestUpdate

        set_current_players(jsonData["nextPlayer"])

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            # _winnerArray is an array of [winner_username, winner_username, ...]
            # _tournamentData is an array [ [username], [username, username,... TB_VALUE], [username, username,..., TB_VALUE], [...etc] ]
            # NB THE FIRST ENTRY IS AN ARRAY OF (MULTIPLE) WINNER(S)
            presenter.endGame(request, jsonData["winner"], jsonData["finalPositions"], jsonData["tournamentData"], jsonData["gameID"])
            if "externalTournamentGame" in jsonData and jsonData["externalTournamentGame"] is True:
                currentGame.kickoutFlexiData = ""
                currentGame.kickoutFlexiData = json.dumps(jsonData["tournamentData"])
                currentGame.save()

        # Don't notify if auto-passing
        elif not autoPass and not firstSave:
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
                        "TGZ",
                        playerListToNotify,
                        getattr(currentGame, "id"),
                        currentGame.gameName,
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
                if len(currentRewindData) == 0 or currentRewindData[-1] != jsonData["data"]:
                    currentRewindData.append(jsonData["data"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        # Get secondsToNextKickout
        secondsToNextKickout = presenter.getSecondsToNextKickout()
            
        response_data = {"latestUpdate": newLatestUpdate, "secondsToNextKickout": secondsToNextKickout}

        if autoPass:
            response_data["processAutoPass"] = autoPass

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "resign":
        # Always do this
        usernameToUse = request.user.username
        if usernameToUse == "BotKickStarter":
            usernameToUse = jsonData["BKSN"]
        _missingPlayer = User.objects.get(username=usernameToUse)
        
        # For unified model, update GamePlayer records
        from Lobby.models import GamePlayer
        player_gp = currentGame.players.filter(player=_missingPlayer).first()
        if player_gp:
            player_gp.is_missing = True
            player_gp.save()
        
        presenter.checkForHostChange(_missingPlayer)
        presenter.enableStatsExclude(usernameToUse)
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
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
                "missingPlayers": currentGame.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        set_current_players(jsonData["nextPlayer"])
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "TGZbot" and currentGame.startingOptions != "102":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "TGZ",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    currentGame.gameName,
                    currentGame,
                    currentGame.latestUpdate,
                )

        secondsToNextKickout = presenter.getSecondsToNextKickout()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": secondsToNextKickout,
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            current_players = ", ".join([gp.player.username for gp in currentGame.players.filter(is_current=True) if gp.player])
            message = (
                f"SYNC ERROR IN: TGZ kickout - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {current_players}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        
        # For unified model, update GamePlayer records
        from Lobby.models import GamePlayer
        player_gp = currentGame.players.filter(player=_missingPlayer).first()
        if player_gp:
            player_gp.is_missing = True
            player_gp.is_kicked = True
            player_gp.save()
        presenter.checkForHostChange(_missingPlayer)
        presenter.enableStatsExclude(_missingPlayer.username)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        secondsToNextKickout = presenter.getSecondsToNextKickout()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": secondsToNextKickout,
            },
            safe=False,
        )

    return JsonResponse({"error": "POST request required."}, status=400)


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode="TGZ")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "TGZ", gameID, gameData, bugDescription, currentGame.rewindData, currentGame.startingMap
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        presenter = currentGame.presenter()
        
        # Find the user's GamePlayer
        user_gp = GamePlayer.objects.filter(game=currentGame, player=request.user).first()
        if user_gp:
            user_gp.notes = jsonData["notes"]
            user_gp.save()
            return JsonResponse({"notePosted": True})
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))


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
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
            presenter = currentGame.presenter()
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        
        user_gp = GamePlayer.objects.filter(game=currentGame, player=request.user).first()
        if user_gp and user_gp.has_chat_notification:
            user_gp.has_chat_notification = False
            user_gp.save()

        LZS = lzstring.LZString()
        currentChatData = []
        chat_data = currentGame.chatData
        # if currentGame.chatData != "":
        if chat_data:  # Check if chatData is not None and not empty
            # currentChatData = json.loads(LZS.decompressFromEncodedURIComponent(currentGame.chatData))
            try:
                decompressed_chat_data = LZS.decompressFromEncodedURIComponent(chat_data)
                if decompressed_chat_data:
                    currentChatData = json.loads(decompressed_chat_data)
            except (TypeError, json.JSONDecodeError) as e:
                # Handle potential errors during decompression or JSON parsing
                print(f"Error processing chat data: {e}")
                currentChatData = []  # Or handle the error as appropriate
        currentChatData.insert(0, jsonData["newEntry"])

        # save chat data.
        compressedChatData = LZS.compressToEncodedURIComponent(json.dumps(currentChatData))

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        all_game_players = GamePlayer.objects.filter(game=currentGame).exclude(is_kicked=True)
        for gp in all_game_players:
            if gp.player and gp.player != request.user:
                gp.has_chat_notification = True
                gp.save()
        
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return JsonResponse({"error": "POST request required."}, status=400)


@login_required
def TGZdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        presenter = currentGame.presenter()
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 1:
        # Send game data
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    if dataType == 2:
        # Remove user from notifications
        user_gp = GamePlayer.objects.filter(game=currentGame, player=request.user).first()
        if user_gp and user_gp.has_chat_notification:
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
            }
        )

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def changeTGZzoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        
        zoomLevels = json.loads(currentGame.zoomLevels)
        zoomLevels[jsonData["playerNumber"]] = int(jsonData["zoomLevel"])
        if jsonData.get("allPlayers"):
            for i in range(len(zoomLevels)):
                zoomLevels[i] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def createTGZspinoff(request):
    if request.method != "POST":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "copyGame":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        NgameName = "[Copy] - " + currentGame.gameName
        NgameStatus = "ACTIVE"
        if currentGame.startingOptions != "":
            NstartingOptions = json.loads(currentGame.startingOptions)
        else:
            NstartingOptions = []
        if len(NstartingOptions) == 0 or NstartingOptions[0] != 102:
            NstartingOptions = [102, *NstartingOptions]
        NstartingOptions = json.dumps(NstartingOptions)
        NplayerOrderSeed = currentGame.playerOrderSeed
        NmaxPlayers = currentGame.maxPlayers
        Nturn = jsonData["turn"]
        Nphase = jsonData["phase"]
        NkickoutDuration = currentGame.kickoutDuration
        NgamePace = currentGame.gamePace
        Ncreator = request.user
        Nhost = request.user
        NgameData = jsonData["data"]
        NstatsExcludedGame = True
        # For some reason jsonData["latestUpdate"] didn't come through one time. Use this as a fallback so it doesn't fail
        Ncreated = jsonData["latestUpdate"] if jsonData["latestUpdate"] else SR_getTimeNow()
        NlatestUpdate = jsonData["latestUpdate"] if jsonData["latestUpdate"] else SR_getTimeNow()
        NstartingMap = currentGame.startingMap
        NzoomLevels = currentGame.zoomLevels

        newGame = Game(
            gameCode="TGZ",
            gameName=NgameName,
            gameStatus=NgameStatus,
            startingOptions=NstartingOptions,
            startingMap=NstartingMap,
            playerOrderSeed=NplayerOrderSeed,
            maxPlayers=NmaxPlayers,
            turn=Nturn,
            phase=Nphase,
            kickoutDuration=NkickoutDuration,
            gamePace=NgamePace,
            creator=Ncreator,
            host=Nhost,
            gameData=NgameData,
            statsExcludedGame=NstatsExcludedGame,
            created=Ncreated,
            latestUpdate=NlatestUpdate,
            zoomLevels=NzoomLevels,
        )

        newGame.save()

        # Add players using GamePlayer
        from Lobby.models import GamePlayer
        GamePlayer.objects.create(game=newGame, player=request.user, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=newGame, player=User.objects.get(username="SHADOW"), seat_order=1)
        if NmaxPlayers >= 3:
            GamePlayer.objects.create(game=newGame, player=User.objects.get(username="SHADOW_2"), seat_order=2)
        if NmaxPlayers >= 4:
            GamePlayer.objects.create(game=newGame, player=User.objects.get(username="SHADOW_3"), seat_order=3)
        if NmaxPlayers >= 5:
            GamePlayer.objects.create(game=newGame, player=User.objects.get(username="SHADOW_4"), seat_order=4)
        
        newGame.latestUpdate = str(int(time.time()) * 1000)

        rewindDataArray = []
        rewindDataArray.append(NgameData)
        newGame.rewindData = json.dumps(rewindDataArray)

        newGame.save()

        return JsonResponse({"response": "ok", "newID": getattr(newGame, "id")})

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def processStatsExcludeConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    
    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        presenter = currentGame.presenter()
        presenter.enableStatsExclude(request.user.username)
        currentGame.save()
        return JsonResponse({"statsExcludedGame": currentGame.statsExcludedGame})
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))


# @login_required
# def TGZstats(request):
#    f = open("./TGZ/TGZstats/TGZ_stats.json")
#    data = json.load(f)
#    PRE_DATA = data[0]
#    G_STATS_DATA = data[1]
#    S_STATS_DATA = data[2]
#
#    timeString = PRE_DATA[0]
#
#    data_2p = data[1]
#    data_3p = data[2]
#    data_4p = data[3]
#    data_tp = data[4]
#    data_5p = data[5]
#
#    data_2p.insert(0, "players2")
#    data_3p.insert(0, "players3")
#    data_4p.insert(0, "players4")
#    data_tp.insert(0, "playerst")
#    data_5p.insert(0, "players5")
#
#    all_data = [data_2p, data_3p, data_4p, data_tp, data_5p]
#
#    f_schism = open("./TGZ/TGZstats/TGZ_stats_schism.json")
#    data_schism = json.load(f_schism)
#    PRE_DATA_schism = data_schism[0]
#    G_STATS_DATA = data_schism[1]
#    S_STATS_DATA = data_schism[2]
#
#    timeString_schism = PRE_DATA_schism[0]
#
#    data_2p_schism = data_schism[1]
#    data_3p_schism = data_schism[2]
#    data_4p_schism = data_schism[3]
#    data_tp_schism = data_schism[4]
#    data_5p_schism = data_schism[5]
#
#    data_2p_schism.insert(0, "players2")
#    data_3p_schism.insert(0, "players3")
#    data_4p_schism.insert(0, "players4")
#    data_tp_schism.insert(0, "playerst")
#    data_5p_schism.insert(0, "players5")
#
#    all_data_schism = [data_2p_schism, data_3p_schism, data_4p_schism, data_tp_schism, data_5p_schism]
#
#    # bar_chart_data = []
#    # for row_god in data[1]:
#    #    bar_chart_data.append({
#    #        'totalHeight': row_god[0],
#    #        'xHeight': row_god[2],
#    #        'yHeight': row_god[1] - row_god[2]
#    #    })
#
#    return render(
#        request,
#        "TGZ/TGZstats.html",
#        {
#            "timeString": timeString,
#            "all_data": all_data,
#            "all_data_schism": all_data_schism,
#        },
#    )


@login_required
def TGZstats(request):
    # Load regular stats
    with open("./TGZ/TGZstats/TGZ_stats.json", "r") as f:
        data = json.load(f)

    timeString = data["time_string"]

    all_data = {}
    for playerCount in [2, 3, 4, 4.5, 5]:
        player_data = data["player_counts"].get(str(playerCount))
        playerCountLabel = playerCount
        if playerCount == 4.5:
            playerCountLabel = "45"
        if player_data:
            seat_wins = player_data.get("seat_wins", [])  
            
            all_data[playerCountLabel] = {
                "finishedGamesCount": player_data["finishedGamesCount"],
                "god_stats": player_data["god_stats"],
                "spec_stats": player_data["spec_stats"],
                "seat_wins": seat_wins,
            }

    # Load schism stats
    with open("./TGZ/TGZstats/TGZ_stats_schism.json", "r") as f_schism:
        data_schism = json.load(f_schism)

    #timeString_schism = data_schism["time_string"]

    all_data_schism = {}
    for playerCount in [2, 3, 4, 4.5, 5]:
        player_data_schism = data_schism["player_counts"].get(str(playerCount))
        playerCountLabel = playerCount
        if playerCount == 4.5:
            playerCountLabel = "45"
        if player_data_schism:
            all_data_schism[playerCountLabel] = {
                "finishedGamesCount": player_data_schism["finishedGamesCount"],
                "god_stats": player_data_schism["god_stats"],
                "spec_stats": player_data_schism["spec_stats"],
            }

    return render(
        request,
        "TGZ/TGZstats.html",
        {
            "timeString": timeString,
            "all_data": all_data,
            "all_data_schism": all_data_schism,
        },
    )


@login_required
def TGZstatGames(request):
    # Post is required
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Get the game ids
    gameIDs = json.loads(request.POST["game_ids"])
    
    gameIDs.reverse()

    # Pagination settings
    page = request.POST.get("page", 1)  # Get the current page number from the request
    items_per_page = 20  # Number of games to display per page

    # Get the total count of games BEFORE slicing gameIDs
    total_games_count = len(gameIDs)

    # Initialize paginator and related variables outside the try block
    paginator = Paginator(gameIDs, items_per_page)
    gameIDs_page = []
    num_pages = 1  # Default to 1 page if there are no games

    # Slice gameIDs for the current page
    try:
        gameIDs_page = paginator.page(page).object_list  # Get the gameIDs for the current page
        num_pages = paginator.num_pages
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = paginator.page(1).object_list
        page = 1
        num_pages = paginator.num_pages
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = paginator.page(paginator.num_pages).object_list
        page = paginator.num_pages
        num_pages = paginator.num_pages

    # Filter the games for the current page ONLY
    # Query unified Game model only
    unified_games = Game.objects.filter(
        gameCode="TGZ", original_id__in=gameIDs_page
    ).select_related("creator__profile", "creator").prefetch_related(
        "players__player", "invitedPlayers"
    )
    
    finishedGames = list(unified_games)
    
    # Sort by latestUpdate
    finishedGames.sort(key=lambda x: x.latestUpdate, reverse=True)

#    def serializeLocal(game):
#        winner = game.winner.username if game.winner else None  # Handle cases where there is no winner
#
#        latestUpdateString = str(game.latestUpdate)
#
#        latestUpdateElapsedTimeString = ""  # You can calculate this if needed
#
#        # startingOptionsHTML = SR_getTGZstartingOptionsHTML(game.startingOptions)
#
#        return {
#            "gameID": game.id,
#            "gameName": game.getGameName(),
#            # "creator": game.creator.username,
#            "allPlayers": [user.username for user in game.allPlayers.all()],
#            "currentTurn": game.currentTurnString(),
#            "latestUpdate": latestUpdateString,
#            "startingOptions": "",
#            "maxPlayers": game.maxPlayers,
#            "winner": winner,  # Used for Finished Games
#            "game": "TGZ",
#        }

    # Serialize ONLY the games for the current page
    finishedGamesListJson = [SF_fastSerializeGame(game, request.user) for game in finishedGames]

    return render(
        request,
        "TGZ/TGZstatGames.html",
        {
            "finishedGamesList": finishedGamesListJson,
            "page": int(page),
            "num_pages": num_pages,
            "total_games_count": total_games_count,  # Pass the total count to the template
            "game_ids_json": request.POST["game_ids"],  # Pass the game_ids back to the
        },
    )
