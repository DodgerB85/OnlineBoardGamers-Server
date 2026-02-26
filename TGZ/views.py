import json
import lzstring
import time
import requests
import random

from contextlib import contextmanager

from decouple import config
from typing import TYPE_CHECKING, cast

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

from Lobby.models import User, Profile, Game

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

from Lobby.sharedFunctions.constants import STATS_EXCLUDE_VOTE_TOPIC, DELETE_VOTE_TOPIC
from Lobby.gameViewHelpers import build_show_game_data, shared_save_zoom, shared_save_notes, shared_bug_entry, shared_cast_vote


if TYPE_CHECKING:
    from Lobby.presenters import TGZpresenter

TGZ_DB_LOCK_NAME = "lockTGZgame_"


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
    mutex_name = TGZ_DB_LOCK_NAME + name
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
    # TGZ has TGZtourneyAdmin as additional super user
    super_users = ["BotKickStarter"]

    result = build_show_game_data(request, game_id, "TGZ",
        default_zoom=240, settings_debug_key="TGZ_USE_SOURCE_CODE",
        extra_select_related=["relatedMainTournament"],
        super_users=super_users)
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("TGZpresenter", currentGame.presenter())
    user_gp = result["user_gp"]
    username = request.user.username

    returnData = {**result["base_data"]}
    returnData["settingsDEBUG"] = returnData.pop("settingsDebug")
    # TGZ includes latestUpdateLiteral in base data
    returnData["latestUpdateLiteral"] = currentGame.latestUpdate
    returnData.update({
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
    })

    if not result["is_authenticated"]:
        return render(request, "TGZ/showTGZgame.html", returnData)

    # TGZtourneyAdmin involvement check
    is_involved = result["is_involved"]
    if username == "TGZtourneyAdmin" and currentGame.relatedMainTournament is not None:
        is_involved = True

    returnData.update(result["auth_data"])
    # TGZ has trailing / on nextURL
    returnData["nextURL"] = f"/nextGame?current_id={currentGame.id}&current_code={presenter.getGameCode()}/"
    returnData["TGZminimalText"] = result["user_profile"].TGZminimalText

    if not is_involved:
        return render(request, "TGZ/showTGZgame.html", returnData)

    if result["is_involved"]:
        returnData.update(result["involved_data"])
    else:
        # TGZtourneyAdmin: helper didn't compute involved_data, do it here
        pov = presenter.seatPosition(username)
        notes = user_gp.notes if user_gp else ""
        myZoomLevel = 240
        try:
            zoomLevels = json.loads(currentGame.zoomLevels)
            if 0 <= pov < len(zoomLevels):
                myZoomLevel = zoomLevels[pov]
        except (json.JSONDecodeError, IndexError, TypeError):
            pass
        returnData.update({
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "kickoutRequired": presenter.kickoutRequired(),
            "myMove": presenter.isMyMove(username),
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "chatNotification": result["auth_data"]["chatNotification"],
            "yourTurnAudioType": result["user_profile"].liveNotification,
            "statsExcludedGame": currentGame.statsExcludedGame,
        })

    # TGZ: BotKickStarter gets pov=0
    pov = result["pov"] if result["is_involved"] else returnData["pov"]
    if username == "BotKickStarter":
        pov = 0
        returnData["pov"] = pov

    is_external_tournament = presenter.isExternalTournamentGame()
    if username == "TGZtourneyAdmin" and is_external_tournament:
        pov = 0
        returnData["pov"] = pov

    # Recalc zoom for overridden pov
    if pov != result["pov"]:
        try:
            returnData["myZoomLevel"] = json.loads(currentGame.zoomLevels)[pov]
        except (json.JSONDecodeError, IndexError, TypeError):
            pass

    startingOptions = (
        json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    )
    returnData["startingOptions"] = startingOptions
    returnData["preferredTGZcolour"] = result["user_profile"].preferredTGZcolour

    autoPass = "false"
    if hasattr(currentGame, "autoMoves") and currentGame.autoMoves is not None:
        autoMoves = json.loads(currentGame.autoMoves)
        if autoMoves[pov] == 1:
            autoPass = "true"
    returnData["autoPass"] = autoPass

    experiencedPlayer = False
    if currentGame.turn == 0:
        if (
            Game.objects.filter(
                gameCode="TGZ", players__player=request.user, gameStatus="FINISHED"
            )
            .distinct()
            .count()
            >= 5
        ):
            experiencedPlayer = True
    returnData["experiencedPlayer"] = experiencedPlayer
    returnData["externalTournamentGame"] = is_external_tournament

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeatInArray():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
            returnData["notes"] = ""
        allPlayerListBySeat = json.dumps(presenter.getAllPlayersOrderedySeatInArray())
        if currentGame.startingMap != "":
            returnData["startingMap"] = json.loads(currentGame.startingMap)

        returnData.update(
            {
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

    with db_mutex(str(gameID)):
        return _processTGZturn(request)


@login_required()
def _processTGZturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        presenter = cast("TGZpresenter", currentGame.presenter())
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    # Helper function to update current players
    def set_current_players(next_player_str):
        """Update current players for Game model"""
        # Clear all is_current flags
        currentGame.players.update(is_current=False)
        # Set is_current for the next players
        if next_player_str:
            next_usernames = [name.strip() for name in next_player_str.split(",") if name.strip()]
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
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
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
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
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
                is_kicked=False,
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
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
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
            presenter.endGame(
                request,
                jsonData["winner"],
                jsonData["finalPositions"],
                jsonData["tournamentData"],
                jsonData["gameID"],
            )
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
                    currentRewindData[-1] != currentGame.rewindTempData and jsonData["data"] != currentGame.rewindTempData
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

        response_data = {
            "latestUpdate": newLatestUpdate,
            "secondsToNextKickout": secondsToNextKickout,
        }

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

        player_gp = currentGame.players.filter(player=_missingPlayer).first()
        if player_gp:
            player_gp.is_missing = True
            player_gp.save()

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
        if len(currentGame.rewindData) == 0:
            return JsonResponse(
                {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
                safe=False,
            )

        currentRewindDataArray = json.loads(currentGame.rewindData)
        if len(currentRewindDataArray) == 0:
            return JsonResponse(
                {"errorMessage": gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data")},
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

        player_gp = currentGame.players.filter(player=_missingPlayer).first()
        if player_gp:
            player_gp.is_missing = True
            player_gp.is_kicked = True
            player_gp.save()
        presenter.checkForHostChange(_missingPlayer)

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
    return shared_bug_entry(request, "TGZ",
        extra_info_fn=lambda g: g.startingMap)


@login_required()
def saveNotes(request):
    return shared_save_notes(request, "TGZ")


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="TGZ")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        user_gp = currentGame.players.filter(player=request.user).first()
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
        all_game_players = currentGame.players.exclude(is_kicked=True)
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
        presenter = cast("TGZpresenter", currentGame.presenter())
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
        user_gp = currentGame.players.filter(player=request.user).first()
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
    return shared_save_zoom(request, "TGZ")


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

    # timeString_schism = data_schism["time_string"]

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
    TGZ_games = (
        Game.objects.filter(gameCode="TGZ", original_id__in=gameIDs_page)
        .select_related("creator__profile", "creator")
        .prefetch_related("players__player", "invitedPlayers")
    )

    finishedGames = list(TGZ_games)

    # Sort by latestUpdate
    finishedGames.sort(key=lambda x: x.latestUpdate, reverse=True)

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


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(str(jsonData["gameID"])):
        return shared_cast_vote(request)
