import base64
import gzip
import json
import time
from typing import TYPE_CHECKING, cast

from decouple import config
from django.contrib.auth.decorators import login_required
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import transaction
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.utils.translation import gettext  # , get_language

import Lobby.sharedFunctions.constants as rf
from Lobby.gameViewHelpers import (
    build_show_game_data,
    shared_bug_entry,
    shared_cast_vote,
    shared_save_notes,
)
from Lobby.models import Game, GamePlayer, Profile, User
from Lobby.sharedFunctions.db_mutex import db_mutex
from Lobby.sharedFunctions.sharedFunctions import (
    SF_fastSerializeGame,
    SF_updateFlexiTime,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML

from . import FCMconstants as rfFCM
from .common import create_fcm_game

if TYPE_CHECKING:
    from Lobby.presenters import FCMpresenter

# import requests  # Keep this to broadcase on WSS when it is uncommented
FCMsuperUsers = ["BotKickStarter"]
USE_NEW_CODE = False

FCM_DB_LOCK_NAME = "lockFCMgame_"


def index(request):
    return HttpResponse('Hello! Psssssssssssst...... Start a Practice Game of FCM and click on "Connected" in the top right 5 times!')


def FCMhelp(request):
    return render(request, "FCM/FCMhelp.html")


def FCMchinaHelp(request):
    return render(request, "FCM/FCMchinaHelp.html")


def coffeeHelp(request):
    return render(request, "FCM/coffeeHelp.html")


@login_required
def FCMstats(request):
    with open("./FCM/FCMstats/FCM_stats.json") as f:
        data = json.load(f)

    return render(
        request,
        "FCM/FCMstats.html",
        {
            "basicData": data["basicData"],
            "modulesUsed": data["modulesUsed"],
            "rg_t_m_stats": data["rg_t_m_stats"],
        },
    )


@login_required
def FCMstatGames(request):
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

    # Slice gameIDs for the current page
    paginator = Paginator(gameIDs, items_per_page)  # Initialize the paginator here
    try:
        gameIDs_page = paginator.page(page).object_list  # Get the gameIDs for the current page
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = Paginator(gameIDs, items_per_page).page(1).object_list
        page = 1
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = Paginator(gameIDs, items_per_page).page(Paginator(gameIDs, items_per_page).num_pages).object_list
        page = Paginator(gameIDs, items_per_page).num_pages

    # Filter the games for the current page ONLY
    # Try to find games by id first, then fall back to original_id for old game references
    finishedGames = (
        Game.objects.filter(id__in=gameIDs_page, gameCode="FCM")
        .order_by("-latestUpdate")
        .select_related("creator__profile", "creator")
        .prefetch_related(
            "players__player",
            "invitedPlayers",
        )
    )
    if not finishedGames.exists():
        finishedGames = (
            Game.objects.filter(original_id__in=gameIDs_page, gameCode="FCM")
            .order_by("-latestUpdate")
            .select_related("creator__profile", "creator")
            .prefetch_related(
                "players__player",
                "invitedPlayers",
            )
        )

    # Serialize ONLY the games for the current page
    finishedGamesListJson = [SF_fastSerializeGame(game, request.user) for game in finishedGames]

    return render(
        request,
        "FCM/FCMstatGames.html",
        {
            "finishedGamesList": finishedGamesListJson,
            "page": int(page),
            "num_pages": paginator.num_pages,
            "total_games_count": total_games_count,  # Pass the total count to the template
            "game_ids_json": request.POST["game_ids"],  # Pass the game_ids back to the
        },
    )


@login_required()
def createFCMgame(request):
    return create_fcm_game(request)


def showGame(request, game_id):
    result = build_show_game_data(
        request,
        game_id,
        "FCM",
        default_zoom=200,
        settings_debug_key="FCM_USE_SOURCE_CODE",
        super_users=FCMsuperUsers,
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("FCMpresenter", currentGame.presenter())
    all_players = result["all_players"]
    username = request.user.username

    # FCMtourneyAdmin super user check (needs game data)
    if currentGame.relatedMainTournament and username == "FCMtourneyAdmin" and "FCMtourneyAdmin" not in FCMsuperUsers:
        FCMsuperUsers.append("FCMtourneyAdmin")

    finishedGame = currentGame.gameStatus == "FINISHED"
    USE_NEW_CODE = int(currentGame.created) > rfFCM.TS_USE_NEW_CODE

    startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(currentGame.startingOptions) if currentGame.startingOptions else [])

    OOBpreference = 0

    if not result["is_authenticated"]:
        returnData = {**result["base_data"]}
        returnData.update(
            {
                "gameID": game_id,
                "showAssistance": "true",
                "latestUpdateLiteral": currentGame.latestUpdate,
                "involvedPlayer": False,
                "myMove": False,
                "startingOptionsHTML": startingOptionsHTML,
                "USE_NEW_CODE": USE_NEW_CODE,
                "finishedGame": finishedGame,
                "startingOptionsLiteral": currentGame.startingOptions,
                "startingMap": currentGame.startingMap,
                "pov": -99,
                "preferredColour": -1,
                "OOBpreference": OOBpreference,
                "moveData": "",
            }
        )
        return render(request, "FCM/GameTemplate.html", returnData)

    # Logged in
    user_profile = result["user_profile"]
    user_id = request.user.id

    highContrastBoardItems = user_profile.highContrastBoardItems
    showAssistance = "true" if user_profile.showAssistance else "false"
    now = int(time.time()) * 1000

    chatData = currentGame.chatData
    if not USE_NEW_CODE:
        c = bytes(chatData, "utf-8")
        chatData = c.decode("unicode-escape")

    currentMove = ""
    currentNotes = ""
    pov = -9
    preferredRestaurantColour = -1
    allPlayerListBySeat = presenter.getAllPlayersOrderedySeatInArray()
    kickoutRequired = 0
    chatNotification = False
    myMove = False
    myZoomLevel = 200
    liveNotification = 1
    rewindPanelType = 0
    rewindHostHTML = ""
    rewindHostPossible = False
    currentRewindConsent = 0  # NB needed in template for rewind panel
    currentPlayers = presenter.getArrayOfIsCurrentPlayers()
    statsExcludedGame = currentGame.statsExcludedGame
    displayNames = ""
    tournamentGame = False

    # Chat notification separately (could be kicked out)
    is_in_all = user_id in result["all_player_ids"]
    #chat_notify_ids = {gp.player.id for gp in all_players if gp.player and gp.has_chat_notification}
    # Also check all players including kicked
    all_gps_including_kicked = list(currentGame.players.select_related("player").all())
    chat_notify_ids_all = {gp.player.id for gp in all_gps_including_kicked if gp.player and gp.has_chat_notification}
    if is_in_all and user_id in chat_notify_ids_all:
        chatNotification = True
        presenter.removeChatNotification(request.user)

    nextURL = f"/nextGame?current_id={game_id}&current_code=FCM"

    involvedPlayer = result["is_involved"]
    # Re-check involvement if FCMtourneyAdmin was added after helper ran
    if not involvedPlayer and username in FCMsuperUsers:
        involvedPlayer = True

    if involvedPlayer:
        if currentGame.relatedMainTournament:
            tournamentGame = True
        rewindPanelType = 1
        if currentGame.host == request.user:
            rewindPanelType = 2
            rewindHostPossible = presenter.getRewindHostPossible()
            rewindHostHTML = presenter.getRewindHostHTML()

        if username in FCMsuperUsers:
            rewindPanelType = 2
            rewindHostPossible = True
            rewindHostHTML = presenter.getRewindHostHTML()

        pov = presenter.seatPosition(username)
        currentRewindConsent = presenter.getCurrentRewindConsent(username)  # NB needed in template for rewind panel

        preferredRestaurantColour = user_profile.preferredRestaurantColour
        liveNotification = user_profile.liveNotification

        currentMove = ""
        if presenter.hasValidActualMoveData(username) or presenter.hasValidActualCleanupPreset(username):
            currentMove = presenter.getCompressedMoveArr(username, True)

        player_gp = next((gp for gp in all_players if gp.player and gp.player.id == user_id), None)
        currentNotes = player_gp.notes if player_gp else ""

        kickoutRequired = presenter.kickoutRequired()

        # Get OOBpreference
        OOBpreference = presenter.getOOBpreference(request.user.username)
        allPlayerListBySeat = presenter.getAllPlayersOrderedySeatInArray(False, False)
        myMove = presenter.isMyMove(request.user.username)

        myZoomLevel = currentGame.zoomLevels[pov * 3 : pov * 3 + 3]
        if currentGame.gameData == "" and "SHADOW" in presenter.getAllPlayersOrderedySeatInArray(False, False):
            displayNames = player_gp.notes if player_gp else ""
            if player_gp:
                player_gp.notes = ""
                player_gp.save()
            currentNotes = ""

    return render(
        request,
        "FCM/GameTemplate.html",
        {
            "gameCreationTimestamp": currentGame.created,
            "now": now,
            "gameData": currentGame.gameData,
            "pov": pov,
            "preferredColour": preferredRestaurantColour,
            "name": username,
            "chatData": chatData,
            "showAssistance": showAssistance,
            "chatNotification": chatNotification,
            "moveData": currentMove,
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentNotes": currentNotes,
            "kickoutRequired": kickoutRequired,
            "involvedPlayer": involvedPlayer,
            "gameName": presenter.getGameName(),
            "phase": currentGame.phase,
            "gameID": currentGame.id,
            "currentPlayers": currentPlayers,
            "latestUpdateLiteral": currentGame.latestUpdate,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "liveNotification": liveNotification,
            "finishedGame": finishedGame,
            "rewindPanelType": rewindPanelType,
            "rewindHostHTML": rewindHostHTML,
            "rewindHostPossible": rewindHostPossible,
            "currentRewindConsent": currentRewindConsent,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "tournamentGame": tournamentGame,
            "highContrastBoardItems": highContrastBoardItems,
            "startingOptionsHTML": startingOptionsHTML,
            "statsExcludedGame": statsExcludedGame,
            "displayNames": displayNames,
            "nextURL": nextURL,
            "KickoutFlexiDataArray": result["base_data"]["KickoutFlexiDataArray"],
            "USE_NEW_CODE": USE_NEW_CODE,
            "startingOptionsLiteral": currentGame.startingOptions,
            "startingMap": currentGame.startingMap,
            "OOBpreference": OOBpreference,
            "statsExcludeVotesData": result["base_data"]["statsExcludeVotesData"],
            "deleteVotesData": result["base_data"]["deleteVotesData"],
            "settingsDebug": result["base_data"]["settingsDebug"],
        },
    )



def showGameVue(request, game_id):
    result = build_show_game_data(
        request,
        game_id,
        "FCM",
        default_zoom=200,
        settings_debug_key="FCM_USE_SOURCE_CODE",
        super_users=FCMsuperUsers,
        clear_chat_notification=False,
    )
    if isinstance(result, HttpResponseRedirect):
        return result

    currentGame = result["game"]
    presenter = cast("FCMpresenter", currentGame.presenter())
    all_players = result["all_players"]
    username = request.user.username

    # FCMtourneyAdmin super user check (needs game data)
    if currentGame.relatedMainTournament and username == "FCMtourneyAdmin" and "FCMtourneyAdmin" not in FCMsuperUsers:
        FCMsuperUsers.append("FCMtourneyAdmin")

    finishedGame = currentGame.gameStatus == "FINISHED"
    USE_NEW_CODE = int(currentGame.created) > rfFCM.TS_USE_NEW_CODE

    startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(currentGame.startingOptions) if currentGame.startingOptions else [])

    OOBpreference = 0

    if not result["is_authenticated"]:
        returnData = {**result["base_data"]}
        returnData.update(
            {
                "gameID": game_id,
                "showAssistance": "true",
                "latestUpdateLiteral": currentGame.latestUpdate,
                "involvedPlayer": False,
                "myMove": False,
                "startingOptionsHTML": startingOptionsHTML,
                "USE_NEW_CODE": USE_NEW_CODE,
                "finishedGame": finishedGame,
                "startingOptionsLiteral": currentGame.startingOptions if currentGame.startingOptions else [],
                "startingMap": currentGame.startingMap if currentGame.startingMap else [],
                "pov": -99,
                "preferredColour": -1,
                "OOBpreference": OOBpreference,
                "moveData": "",
            }
        )
        return render(request, "FCM/gameTemplateVue.html", returnData)

    # Logged in - same logic as original showGame but for Vue template
    user_profile = result["user_profile"]
    user_id = request.user.id

    highContrastBoardItems = user_profile.highContrastBoardItems
    showAssistance = "true" if user_profile.showAssistance else "false"
    now = int(time.time()) * 1000

    chatData = currentGame.chatData
    if not USE_NEW_CODE:
        c = bytes(chatData, "utf-8")
        chatData = c.decode("unicode-escape")

    moveData = ""
    currentNotes = ""
    pov = -9
    preferredRestaurantColour = -1
    allPlayerListBySeat = presenter.getAllPlayersOrderedySeatInArray()
    kickoutRequired = 0
    chatNotification = False
    myMove = False
    myZoomLevel = 200
    liveNotification = 1
    rewindPanelType = 0
    rewindHostHTML = ""
    rewindHostPossible = False
    currentRewindConsent = 0  # NB needed in template for rewind panel
    currentPlayers = presenter.getArrayOfIsCurrentPlayers()
    statsExcludedGame = currentGame.statsExcludedGame
    displayNames = ""
    tournamentGame = False

    # Chat notification separately (could be kicked out)
    is_in_all = user_id in result["all_player_ids"]
    all_gps_including_kicked = list(currentGame.players.select_related("player").all())
    chat_notify_ids_all = {gp.player.id for gp in all_gps_including_kicked if gp.player and gp.has_chat_notification}
    if is_in_all and user_id in chat_notify_ids_all:
        chatNotification = True
        presenter.removeChatNotification(request.user)

    nextURL = f"/nextGame?current_id={game_id}&current_code=FCM"

    involvedPlayer = result["is_involved"]
    # Re-check involvement if FCMtourneyAdmin was added after helper ran
    if not involvedPlayer and username in FCMsuperUsers:
        involvedPlayer = True

    if involvedPlayer:
        if currentGame.relatedMainTournament:
            tournamentGame = True
        rewindPanelType = 1
        if currentGame.host == request.user:
            rewindPanelType = 2
            rewindHostPossible = presenter.getRewindHostPossible()
            rewindHostHTML = presenter.getRewindHostHTML()

        if username in FCMsuperUsers:
            rewindPanelType = 2
            rewindHostPossible = True
            rewindHostHTML = presenter.getRewindHostHTML()

        pov = presenter.seatPosition(username)
        currentRewindConsent = presenter.getCurrentRewindConsent(username)

        preferredRestaurantColour = user_profile.preferredRestaurantColour
        liveNotification = user_profile.liveNotification

        moveData = ""
        if presenter.hasValidActualMoveData(username) or presenter.hasValidActualCleanupPreset(username):
            moveData = presenter.getCompressedMoveArr(username, True)

        player_gp = next((gp for gp in all_players if gp.player and gp.player.id == user_id), None)
        currentNotes = player_gp.notes if player_gp else ""

        kickoutRequired = presenter.kickoutRequired()

        # Get OOBpreference
        OOBpreference = presenter.getOOBpreference(request.user.username)
        allPlayerListBySeat = presenter.getAllPlayersOrderedySeatInArray(False, False)
        myMove = presenter.isMyMove(request.user.username)

        myZoomLevel = currentGame.zoomLevels[pov * 3 : pov * 3 + 3]
        if currentGame.gameData == "" and "SHADOW" in presenter.getAllPlayersOrderedySeatInArray(False, False):
            displayNames = player_gp.notes if player_gp else ""
            if player_gp:
                player_gp.notes = ""
                player_gp.save()
            currentNotes = ""

    return render(
        request,
        "FCM/gameTemplateVue.html",
        {
            "turn": currentGame.turn,
            "gameCreationTimestamp": currentGame.created,
            "now": now,
            "gameData": currentGame.gameData,
            "pov": pov,
            "preferredColour": preferredRestaurantColour,
            "name": username,
            "chatData": chatData,
            "showAssistance": showAssistance,
            "chatNotification": chatNotification,
            "moveData": moveData,
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentNotes": currentNotes,
            "kickoutRequired": kickoutRequired,
            "involvedPlayer": involvedPlayer,
            "gameName": presenter.getGameName(),
            "phase": currentGame.phase,
            "gameID": currentGame.id,
            "currentPlayers": currentPlayers,
            "latestUpdateLiteral": currentGame.latestUpdate,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "liveNotification": liveNotification,
            "finishedGame": finishedGame,
            "rewindPanelType": rewindPanelType,
            "rewindHostHTML": rewindHostHTML,
            "rewindHostPossible": rewindHostPossible,
            "currentRewindConsent": currentRewindConsent,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            "tournamentGame": tournamentGame,
            "highContrastBoardItems": highContrastBoardItems,
            "startingOptionsHTML": startingOptionsHTML,
            "statsExcludedGame": statsExcludedGame,
            "displayNames": displayNames,
            "nextURL": nextURL,
            "KickoutFlexiDataArray": result["base_data"]["KickoutFlexiDataArray"],
            "USE_NEW_CODE": USE_NEW_CODE,
            "startingOptionsLiteral": currentGame.startingOptions if currentGame.startingOptions else [],
            "startingMap": currentGame.startingMap if currentGame.startingMap else [],
            "OOBpreference": OOBpreference,
            "statsExcludeVotesData": result["base_data"]["statsExcludeVotesData"],
            "deleteVotesData": result["base_data"]["deleteVotesData"],
            "settingsDebug": result["base_data"]["settingsDebug"],
        },
    )


# This is used for HTMX update
def checkNewData(request, game_id):
    if request.method == "GET":
        try:
            currentGame = Game.objects.get(id=game_id, gameCode="FCM")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None
        return HttpResponse(currentGame.latestUpdate)

    return HttpResponse(status=204)  # No Content


def test(request):
    # return HttpResponse("You're looking at game %s." % 1)
    # currentGame = FCM_Game.objects.get(id=23)

    # requests.post("https://wss.s3.sitereview.io/post/allFCMchannels/",
    #    json={"somekey":"someval"
    # })

    # requests.post("https://wss.s3.sitereview.io/post/allFCMchannels/",
    #    "MESSAGEFROMADIN=Thank you for playing FCM Online"
    # )
    # currentGame = FCM_Game.objects.get(id=game_id)
    return render(request, "FCM/test.html", {"gameID": 21})




def processTurn(request):
    # time.sleep(5)
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _processTurn(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


@transaction.atomic
@login_required()
def _processTurn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="FCM")
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist")) from None

    presenter = cast("FCMpresenter", currentGame.presenter())

    if currentGame.relatedMainTournament and request.user.username == "FCMtourneyAdmin":
        FCMsuperUsers.append("FCMtourneyAdmin")

    # loads the latest game and updates latest-Update
    if jsonData["action"] == "loadNew":
        currentMove = ""
        # Use to stop actions showing when there's already move Data
        if presenter.hasValidActualMoveData(request.user.username):
            currentMove = presenter.getCompressedMoveArr(request.user.username)

        OOBpreference = presenter.getOOBpreference(request.user.username)
        return JsonResponse(
            {
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "specialData": currentMove,
                "latestUpdate": currentGame.latestUpdate,
                "startingMap": currentGame.startingMap if currentGame.startingMap else [],
                "OOBpreference": OOBpreference,
            },
            safe=False,
        )

    # Reset move data to blank
    elif jsonData["action"] == "unlockRestructure" or jsonData["action"] == "unlockPayday":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM unlockRestructure - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Add turn/phase validation to prevent backward saves
        #if jsonData.get("turn", 0) < currentGame.turn or (jsonData.get("turn", 0) == currentGame.turn and jsonData.get("phase", 0) < currentGame.phase):
        #    SN_sendAdminErrorMessage(f"BACKWARD SAVE DETECTED - User: {request.user.username} gameID: {currentGame.id}")
            # return JsonResponse({"syncError": True}, safe=False)

        # Wipe the move data
        presenter.deleteSinglePlayersMove(request.user.username)

        # Update current players
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        if request.user.username not in currentPlayersArr:
            currentPlayersArr.append(request.user.username)  # This updates the list directly
            presenter.setCurrentPlayersFromArrInTurnOrder(currentPlayersArr)
        currentGame.save()
        return JsonResponse({"unlockStatus": True}, safe=False)

    # save OOB preference
    elif jsonData["action"] == "saveOOBpreference":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveOOBpreference - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Wipe the move data
        setCorrectly = presenter.setOOBpreference(request.user.username, jsonData["OOBpreference"])

        currentGame.save()
        return JsonResponse({"OOBsaved": setCorrectly}, safe=False)

    elif jsonData["action"] == "deleteMoveData":
        phase = jsonData["phase"]
        # This is the "new phase" you are just moving into
        # If moving into TO, don't clear the moves (save pre-selectiongs), EXCEPT on turn 1 when there's no pre-selection
        # If moving into cleanup, don't clear the moves
        if phase == rfFCM.PHASE_CLEAN_UP or (phase == rfFCM.PHASE_TURN_ORDER and currentGame.turn != 1):
            return JsonResponse(
                {
                    "result": 2,
                },
                safe=False,
            )
        presenter.clearAllMoveDataV2()
        currentGame.save()
        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    elif jsonData["action"] == "saveInProgressMap":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveInProgressMap - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]

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

        # Update module selections
        currentGame.startingMap = jsonData["tiles"]

        # If staying in module selection, don't save a rewind
        if currentGame.phase == rfFCM.PHASE_URBAN_PLANNING:
            currentGame.rewindData = ""
        else:
            # You are moving into the game proper
            currentGame.rewindData = json.dumps([currentGame.gameData])

        currentGame.save()

        # Send Notifications - MODULE SELECTION
        if len(jsonData["nextPlayer"]) > 0:
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "FcmBot" in playerListToNotify:
                playerListToNotify.remove("FcmBot")
            if "FcmAI" in playerListToNotify:
                playerListToNotify.remove("FcmAI")
            for player in playerListToNotify:
                ppov = presenter.seatPosition(player)
                playerNotificationSuppression = currentGame.FCMnotificationSuppression[ppov : ppov + 1]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.FCMnotificationSuppression = currentGame.FCMnotificationSuppression[:ppov] + "0" + currentGame.FCMnotificationSuppression[ppov + 1 :]

            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": (currentGame.startingOptions if currentGame.startingOptions else "[]"),
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(
                    (json.loads(currentGame.startingOptions) if currentGame.startingOptions else []),
                ),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "saveModuleSelection":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveModuleSelection - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        currentGame.phase = jsonData["phase"]

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

        # Update module selections
        starting_options = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        starting_options.append(int(jsonData["SM"]))

        # If staying in module selection, don't save a rewind
        if currentGame.phase == rfFCM.PHASE_SETUP_MODULES:
            currentGame.rewindData = ""
        else:
            # You are moving into the game proper
            currentGame.rewindData = json.dumps([currentGame.gameData])
            # Move '300' to the end
            if rfFCM.SO_DRAFT_MODULE_BREAKER in starting_options:
                starting_options.remove(rfFCM.SO_DRAFT_MODULE_BREAKER)
                starting_options.append(rfFCM.SO_DRAFT_MODULE_BREAKER)

        currentGame.startingOptions = json.dumps(starting_options, separators=(",", ":"))

        currentGame.save()

        # Send Notifications - MODULE SELECTION
        if len(jsonData["nextPlayer"]) > 0:
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "FcmBot" in playerListToNotify:
                playerListToNotify.remove("FcmBot")
            if "FcmAI" in playerListToNotify:
                playerListToNotify.remove("FcmAI")
            for player in playerListToNotify:
                ppov = presenter.seatPosition(player)
                playerNotificationSuppression = currentGame.FCMnotificationSuppression[ppov : ppov + 1]
                if playerNotificationSuppression == "1":
                    playerListToNotify.remove(player)
                    currentGame.FCMnotificationSuppression = currentGame.FCMnotificationSuppression[:ppov] + "0" + currentGame.FCMnotificationSuppression[ppov + 1 :]

            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "SO": (currentGame.startingOptions if currentGame.startingOptions else "[]"),
                "startingOptionsHTML": SR_getFCMstartingOptionsHTML(
                    (json.loads(currentGame.startingOptions) if currentGame.startingOptions else []),
                ),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
            },
            safe=False,
        )

    # NEW
    elif jsonData["action"] == "saveNormal":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveNormal - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Add turn/phase validation to prevent backward saves
        #if jsonData.get("turn", 0) < currentGame.turn or (jsonData.get("turn", 0) == currentGame.turn and jsonData.get("phase", 0) < currentGame.phase):
        #    SN_sendAdminErrorMessage(f"BACKWARD SAVE DETECTED - User: {request.user.username} gameID: {currentGame.id}")
            # return JsonResponse({"syncError": True}, safe=False)

        if currentGame.gameStatus == "FINISHED":
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData and jsonData["mapTiles"] and currentGame.startingMap != "":
            incomingTiles = jsonData["mapTiles"]
            currentTiles = json.loads(currentGame.startingMap)
            if len(incomingTiles) != len(currentTiles):
                turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
                phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
                message = (
                    f"MAP TILES LENGTH OUT OF SYNC - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                    f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                    f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
                )
                SN_sendAdminErrorMessage(message)
                return JsonResponse({"syncError": True}, safe=False)
            for i in range(len(incomingTiles)):
                if incomingTiles[i] != currentTiles[i]:
                    turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
                    phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
                    message = (
                        f"MAP TILES CONTENT OUT OF SYNC - gameID: {currentGame.id} - User: {request.user.username} - DB Tiles: {currentTiles} - IN Tiles: {incomingTiles} - JSON_LU: {jsonData['latestUpdate']} "
                        f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                        f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
                    )
                    SN_sendAdminErrorMessage(message)
                    return JsonResponse(
                        {"syncError": True},
                        safe=False,
                    )

        if "mapTiles" in jsonData and jsonData["mapTiles"] and currentGame.startingMap == "":
            currentGame.startingMap = json.dumps(jsonData["mapTiles"], separators=(",", ":"))

        nameToUse = request.user.username
        if request.user.username in FCMsuperUsers:
            nameToUse = jsonData["BKSN"]
            if nameToUse.startswith("FCMtourneyAdmin/"):
                name_parts = nameToUse.split("/", 1)
                nameToUse = name_parts[1] if len(name_parts) > 1 else nameToUse

        # Before updating the gameData, we need to make sure the latest is
        # saved into the rewind stack
        currentRewindDataArray = load_rewind_data(currentGame)
        oldData = currentGame.gameData
        if len(currentRewindDataArray) == 0 or currentRewindDataArray[-1] != oldData:
            currentRewindDataArray.append(oldData)
        currentGame.rewindData = json.dumps(currentRewindDataArray, separators=(",", ":"))

        currentGame.gameData = jsonData["gameData"]

        returnOOBpreferences = False
        returnPaydayPreturns = False
        returnFridgePreturns = False

        oldPhase = currentGame.phase

        ###########

        if "phase" not in jsonData:
            message = f"******** PHASE NOT FOUND IN JSONDATA ********* - jsonData: {jsonData} - User: {request.user.username} - - DB_LU: {currentGame.latestUpdate}  -- DB_turn: {currentGame.turn}  -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            SN_sendAdminErrorMessage(message)

        starting_options = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

        if oldPhase == rfFCM.PHASE_PAYDAY and jsonData["phase"] == rfFCM.PHASE_PAYDAY and rfFCM.SO_STRICT_PAYDAY_FRIDGE not in starting_options:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE PAYDAY (ok with kickout) ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)

        if oldPhase == rfFCM.PHASE_CLEAN_UP and jsonData["phase"] == rfFCM.PHASE_CLEAN_UP and rfFCM.SO_STRICT_PAYDAY_FRIDGE not in starting_options:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"******** DOUBLE PHASE SAVE CLEANUP ********* - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
        ###########

        starting_options = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        trainingGame = False
        if rf.SO_TRAINING_GAME in starting_options:
            trainingGame = True

        if jsonData["checksum"] or trainingGame:
            presenter.clearAllMoveDataV2()

        # If you are saving into turn order, return all players OOB preferences
        if oldPhase == rfFCM.PHASE_TURN_ORDER and jsonData["phase"] == rfFCM.PHASE_TURN_ORDER and rfFCM.SO_STRICT_PAYDAY_FRIDGE not in starting_options:
            returnOOBpreferences = True

        # If the stored game is not payday, and the new data IS payday, then we need to return payday preturns
        if oldPhase != rfFCM.PHASE_PAYDAY and jsonData["phase"] == rfFCM.PHASE_PAYDAY and rfFCM.SO_STRICT_PAYDAY_FRIDGE not in starting_options:
            returnPaydayPreturns = True
        # Same for cleanup
        if oldPhase != rfFCM.PHASE_CLEAN_UP and jsonData["phase"] == rfFCM.PHASE_CLEAN_UP and rfFCM.SO_STRICT_PAYDAY_FRIDGE not in starting_options:
            returnFridgePreturns = True

        # Remove move data at start of reatruc
        if currentGame.phase != rfFCM.PHASE_RESTRUCTURING and jsonData["phase"] == rfFCM.PHASE_RESTRUCTURING:
            presenter.clearAllMoveDataV2()
            # Emergency check; make sure all players except bots are in currentPlayers
            missing_players = set(currentGame.players.filter(is_missing=True).values_list("player__username", flat=True))
            current_players = [gp.player.username for gp in currentGame.players.all().select_related("player") if gp.player and gp.player.username not in missing_players]
            presenter.setCurrentPlayersFromArrInTurnOrder(current_players)
            currentGame.save()

        # Remove move data at start of working day
        if currentGame.phase != rfFCM.PHASE_WORKING_DAY and jsonData["phase"] == rfFCM.PHASE_WORKING_DAY:
            presenter.clearAllMoveDataV2()

        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.save()

        # reset notifs - SAVE NORMAL
        if jsonData["phase"] == rfFCM.PHASE_WORKING_DAY or oldPhase == rfFCM.PHASE_WORKING_DAY:
            currentGame.FCMnotificationSuppression = "0" * currentGame.maxPlayers

        # If it WAS a working day save the side data (pre moves) - UNLESS it is now working day again
        # So also check you're not coming from Turn Order
        if not trainingGame and nameToUse != "" and oldPhase != rfFCM.PHASE_TURN_ORDER and jsonData["phase"] != rfFCM.PHASE_RESTRUCTURING and (jsonData["phase"] == rfFCM.PHASE_WORKING_DAY or oldPhase == rfFCM.PHASE_WORKING_DAY) and jsonData["sideData"] and jsonData["sideData"] != "":
            preMoveArray = json.loads(gzip.decompress(bytearray(base64.b64decode(jsonData["sideData"]))).decode("utf-8"))
            # currentGame.updateWholeMoveData(nameToUse, json.dumps(preMoveArray, separators=(",", ":")))
            phases = [
                rfFCM.PHASE_WORKING_DAY,
                rfFCM.PHASE_DINNERTIME,
                rfFCM.PHASE_PAYDAY,
                rfFCM.PHASE_MARKETING_CAMPAIGNS,
                rfFCM.PHASE_CLEAN_UP,
                rfFCM.PHASE_PIZZA_BOMB,
                rfFCM.PHASE_COFFE_SHOP_MS,
                rfFCM.PHASE_CHOOSE_CEO_BONUS,
            ]
            presenter.insertPlayerMoveData(nameToUse, phases, preMoveArray)

        # Use for rewind save check
        if nameToUse != "":
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                nameToUse,
                currentGame.kickoutDuration,
            )

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # First, save the currentPlayers from the jsonData
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])

        # Before sending notifications, update the currentPlayers
        # If saving into phase 2/7/9, then update for simul players
        if jsonData["phase"] == rfFCM.PHASE_SETUP_RESERVE or jsonData["phase"] == rfFCM.PHASE_PAYDAY or jsonData["phase"] == rfFCM.PHASE_CLEAN_UP:
            presenter.setCurrentPlayersFromArrInTurnOrder(presenter.getCurrentSimulPlayersFCM())

        # Send Notifications - payday/fridge with moves are already removd
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        if len(currentPlayersArr) > 0 and jsonData["status"] != "FINISHED":
            playerListToNotify = currentPlayersArr
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "FcmBot" in playerListToNotify:
                playerListToNotify.remove("FcmBot")
            if "FcmAI" in playerListToNotify:
                playerListToNotify.remove("FcmAI")

            # If you are saving into phase 4, and the next player has OOB, remove them from notifications
            if jsonData["phase"] == rfFCM.PHASE_TURN_ORDER and presenter.hasValidActualMoveData(jsonData["nextPlayer"][0]):
                playerListToNotify.remove(jsonData["nextPlayer"][0])

            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    oldVer,
                )

        ################ REWIND EVERY SAVE #######################
        # Don't save during cleanup as it messes up some training games
        # [[[Don't save if less than 5 seconds elapsed, to allow to rewind past skipped phases]]]

        # You always want to save a rewind, even at the END of a pointless move
        # But if it is pointless, you want to delete the PREVIOUS rewind point
        # So first check if the move was pointless, and then remove the PREVIOUS rewind point
        if jsonData["IPM"]:
            currentRewindDataArray = load_rewind_data(currentGame)
            if len(currentRewindDataArray) > 0:
                loadData = ""
                if len(currentRewindDataArray) > 0:
                    loadData = currentRewindDataArray.pop()

                while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
                    loadData = currentRewindDataArray.pop()

                currentGame.rewindTempData = ""
                currentGame.rewindData = json.dumps(currentRewindDataArray)
                currentGame.save()

        if jsonData["saveRewind"]:  # and not jsonData["IPM"]:  # and jsonData["phase"] != 9:
            currentRewindDataArray = load_rewind_data(currentGame)

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            # if len(currentGame.rewindTempData) > 0:
            #    if (
            #        currentRewindDataArray[-1] != currentGame.rewindTempData
            #        and jsonData["gameData"] != currentGame.rewindTempData
            #    ):
            #        # add to RWdata and RWdata[]
            #        currentRewindData = (
            #            currentRewindData + "'SPLIT'" + currentGame.rewindTempData
            #        )
            #        currentRewindDataArray.append(currentGame.rewindTempData)
            #
            #    currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if len(currentRewindDataArray) == 0:
                currentRewindDataArray = [currentGame.gameData]
            else:
                # else check last one isn't same as cufrent, and if not then add
                if currentRewindDataArray[-1] != currentGame.gameData:
                    currentRewindDataArray.append(currentGame.gameData)
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindDataArray) > 20:
                        currentRewindDataArray.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????
                # currentRewindData = json.dumps(currentRewindDataArray)
            currentGame.rewindData = json.dumps(currentRewindDataArray)

        ################ END REWIND EVERY SAVE #######################

        if jsonData["status"] == "FINISHED":
            currentGame.presenter().endGame(
                request,
                jsonData["winner"],
                jsonData["finalScores"],
                jsonData["tournamentData"],
                jsonData["gameID"],
            )

        presenter.removeSingleRewindPermission()

        currentGame.save()

        returnResponse = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        if returnPaydayPreturns or returnFridgePreturns or returnOOBpreferences:
            playersMoveDataArr = presenter.getOrScaffoldAllMoveData()
            compressedData = (base64.b64encode(gzip.compress(json.dumps(playersMoveDataArr, separators=(",", ":")).encode("utf-8"))).decode("utf-8"),)
            returnResponse.update({"sideData": compressedData})

        return JsonResponse(
            returnResponse,
            safe=False,
        )
    # END SAVE-NORM

    # NEW
    elif jsonData["action"] == "saveSimulMove":
        notRequiedPlayerNames = jsonData.get("notRequiedPlayerNames", [])
        continueFromStalledGame = jsonData.get("continueFromStalledGame", False)

        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate) or jsonData["phase"] != currentGame.phase or jsonData["turn"] != currentGame.turn:
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveSimulMove - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Add turn/phase validation to prevent backward saves
        #if jsonData.get("turn", 0) < currentGame.turn or (jsonData.get("turn", 0) == currentGame.turn and jsonData.get("phase", 0) < currentGame.phase):
        #    SN_sendAdminErrorMessage(f"BACKWARD SAVE DETECTED - User: {request.user.username} gameID: {currentGame.id}")
            # return JsonResponse({"syncError": True}, safe=False)

        if not continueFromStalledGame:
            currentGame.turn = jsonData["turn"]
            currentGame.phase = jsonData["phase"]

            nameToUpdate = request.user.username
            if request.user.username in FCMsuperUsers:
                nameToUpdate = jsonData["BKSN"]
                if nameToUpdate.startswith("FCMtourneyAdmin/"):
                    name_parts = nameToUpdate.split("/", 1)
                    nameToUse = name_parts[1] if len(name_parts) > 1 else nameToUpdate
            phaseArr = [-1]
            if currentGame.phase == rfFCM.PHASE_SETUP_RESTAURANT1 or currentGame.phase == rfFCM.PHASE_SETUP_RESTAURANT2 or currentGame.phase == rfFCM.PHASE_SETUP_RESERVE:
                phaseArr = [
                    rfFCM.PHASE_SETUP_RESTAURANT1,
                    rfFCM.PHASE_SETUP_RESTAURANT2,
                    rfFCM.PHASE_SETUP_RESERVE,
                ]
            elif currentGame.phase == rfFCM.PHASE_RESTRUCTURING:
                phaseArr = [rfFCM.PHASE_RESTRUCTURING, rfFCM.PHASE_TURN_ORDER]
            elif currentGame.phase in [
                rfFCM.PHASE_WORKING_DAY,
                rfFCM.PHASE_DINNERTIME,
                rfFCM.PHASE_PAYDAY,
                rfFCM.PHASE_MARKETING_CAMPAIGNS,
                rfFCM.PHASE_CLEAN_UP,
                rfFCM.PHASE_PIZZA_BOMB,
                rfFCM.PHASE_COFFE_SHOP_MS,
                rfFCM.PHASE_CHOOSE_CEO_BONUS,
            ]:
                phaseArr = [
                    rfFCM.PHASE_WORKING_DAY,
                    rfFCM.PHASE_DINNERTIME,
                    rfFCM.PHASE_PAYDAY,
                    rfFCM.PHASE_MARKETING_CAMPAIGNS,
                    rfFCM.PHASE_CLEAN_UP,
                    rfFCM.PHASE_PIZZA_BOMB,
                    rfFCM.PHASE_COFFE_SHOP_MS,
                    rfFCM.PHASE_CHOOSE_CEO_BONUS,
                ]
            # Decompress the incoming data
            decompressedData = json.loads(gzip.decompress(bytearray(base64.b64decode(jsonData["moveData"]))).decode("utf-8"))

            presenter.insertPlayerMoveData(nameToUpdate, phaseArr, decompressedData)

            if currentGame.phase != rfFCM.PHASE_SETUP_RESTAURANT1 and currentGame.phase != rfFCM.PHASE_SETUP_RESTAURANT2:
                presenter.setCurrentPlayersFromArrInTurnOrder(presenter.getCurrentSimulPlayersFCM())

            if request.user.username in FCMsuperUsers:
                flexName = jsonData["BKSN"]
                if flexName.startswith("FCMtourneyAdmin/"):
                    name_parts = flexName.split("/", 1)
                    flexName = name_parts[1] if len(name_parts) > 1 else flexName
                currentGame.kickoutFlexiData = SF_updateFlexiTime(
                    currentGame.kickoutFlexiData,
                    currentGame.latestUpdate,
                    int(time.time()) * 1000,
                    flexName,
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

        response = presenter.getJsonMoveResponseV2(notRequiedPlayerNames)

        currentGame.save()
        return JsonResponse(response, safe=False)

    ################### PRE TURN
    elif jsonData["action"] == "preTurn":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - preTurn: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # decompress the move data array
        preMoveArray = json.loads(gzip.decompress(bytearray(base64.b64decode(jsonData["data"]))).decode("utf-8"))

        # FIX THIS TO ALLOW NAME CHECK (or just don't do pre turns with FCMtA)
        phaseArr = [
            rfFCM.PHASE_WORKING_DAY,
            rfFCM.PHASE_DINNERTIME,
            rfFCM.PHASE_PAYDAY,
            rfFCM.PHASE_MARKETING_CAMPAIGNS,
            rfFCM.PHASE_CLEAN_UP,
            rfFCM.PHASE_PIZZA_BOMB,
            rfFCM.PHASE_COFFE_SHOP_MS,
            rfFCM.PHASE_CHOOSE_CEO_BONUS,
        ]
        presenter.insertPlayerMoveData(request.user.username, phaseArr, preMoveArray)

        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    ################### END PRE TURN

    elif jsonData["action"] == "resign":
        # Always do this
        _missingPlayer = User.objects.get(username=request.user.username)
        presenter.addMissingPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)
        currentGame.save()
        # Otherwise, resigned from restruc, so delete move data, allow everyone to move, generate latest update, send notifications

        # Delete move data
        presenter.clearAllMoveDataV2()

        # Add all players into currentPlayers
        presenter.addAllPlayersToCurrentPlayers()

        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                # "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                # "nextPlayer": currentGame.currentPlayers,
            },
            safe=False,
        )

        # use this return only to wipe data if resigining during work day and there is payday skip data
        # not used for anything else yet.

    elif jsonData["action"] == "saveAfterKickout":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM saveAfterKickout - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Add turn/phase validation to prevent backward saves
        #if jsonData.get("turn", 0) < currentGame.turn or (jsonData.get("turn", 0) == currentGame.turn and jsonData.get("phase", 0) < currentGame.phase):
        #    SN_sendAdminErrorMessage(f"BACKWARD SAVE DETECTED - User: {request.user.username} gameID: {currentGame.id}")
            # return JsonResponse({"syncError": True}, safe=False)

        currentGame.gameData = jsonData["data"]
        # Phase first otherwise MOVE payday skip overwrites with phase 7
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        # Clears data and saves record
        presenter.clearAllMoveDataV2()

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # WHY WAS THIS COMMENTED OUT????
        presenter.setCurrentPlayersFromArrInTurnOrder(jsonData["nextPlayer"])
        currentGame.save()

        # Send notification s
        if not jsonData["noNotification"] and len(jsonData["nextPlayer"]) > 0 and jsonData["phase"] != rfFCM.PHASE_GAME_OVER:
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "FcmBot" in playerListToNotify:
                playerListToNotify.remove("FcmBot")
            if "FcmAI" in playerListToNotify:
                playerListToNotify.remove("FcmAI")
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "FCM",
                        playerListToNotify,
                        jsonData["gameID"],
                        presenter.getGameName(),
                        currentGame,
                        oldVer,
                    )

        # End Game
        if jsonData["phase"] == rfFCM.PHASE_GAME_OVER:
            currentGame.presenter().endGame(
                request,
                jsonData["winner"],
                jsonData["finalScores"],
                jsonData["tournamentData"],
                jsonData["gameID"],
            )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "nextPlayer": jsonData["nextPlayer"],
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM kickout - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        # Add turn/phase validation to prevent backward saves
        #if jsonData.get("turn", 0) < currentGame.turn or (jsonData.get("turn", 0) == currentGame.turn and jsonData.get("phase", 0) < currentGame.phase):
        #    SN_sendAdminErrorMessage(f"BACKWARD SAVE DETECTED - User: {request.user.username} gameID: {currentGame.id}")
            # return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)
        presenter.checkForHostChange(_missingPlayer)

        presenter.clearAllMoveDataV2()

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

    elif jsonData["action"] == "loadRewind":
        # If working day, clear move data now, to get rid of pre-prepared SALARY phase
        if jsonData["phase"] == rfFCM.PHASE_WORKING_DAY:
            presenter.clearAllMoveDataV2()
        currentRewindDataArray = load_rewind_data(currentGame)
        if len(currentRewindDataArray) == 0:
            return JsonResponse(
                {"message": "<b>" + gettext("No rewind data. Rewind limit reached. Please play on to generate more rewind data") + " </b>"},
                safe=False,
            )

        allowAnyRewind = False
        if "latency" in jsonData and jsonData["latency"] == 20:
            allowAnyRewind = True

        if not allowAnyRewind and not presenter.getRewindHostPossible() and request.user.username not in FCMsuperUsers:
            return JsonResponse(
                {"message": "<b>" + gettext("Permissions missing. Please reload the page and check again") + "</b>"},
                safe=False,
            )

        # If there is any move data, simply clear it out and go back to the game
        if presenter.hasAnyPlayerMovedThisPhase(currentGame.phase):
            # This saves it anyway
            presenter.clearAllMoveDataV2()
            rewindHostPossible = presenter.getRewindHostPossible()
            # add all players back into currentPlayers
            presenter.addAllPlayersToCurrentPlayers()

            # if currentGame.rewindTempData != "":
            #    loadData = currentGame.rewindTempData
            # else:
            loadData = currentRewindDataArray.pop() if currentRewindDataArray else ""

            ####################################
            # But this load data needs to be moved to temp
            # SKIP FIX ATTEMPT
            # currentRewindDataArray.append(loadData)
            currentGame.rewindData = json.dumps(currentRewindDataArray)
            ####################################

            # SKIP FIX ATTEMPT
            # currentGame.rewindTempData = ""  # Clear temp data to prevent contamination

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
        loadData = ""
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        # currentGame.rewindTempData = loadData
        # SKIP FIX ATTEMPT
        # currentRewindDataArray.append(loadData)

        currentGame.rewindData = json.dumps(currentRewindDataArray)

        if jsonData["RSRP"]:
            presenter.removeSingleRewindPermission()

        presenter.clearAllMoveDataV2()

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()
        rewindHostPossible = presenter.getRewindHostPossible()

        return JsonResponse(
            {
                "loadData": loadData,
                "rewindHostPossible": rewindHostPossible,
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
        if len(jsonData["nextPlayer"]) > 0:
            playerListToNotify = jsonData["nextPlayer"]
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if "FcmBot" in playerListToNotify:
                playerListToNotify.remove("FcmBot")
            if "FcmAI" in playerListToNotify:
                playerListToNotify.remove("FcmAI")
            if len(playerListToNotify) > 0:
                presenter.sendYourTurnNotification(
                    "FCM",
                    playerListToNotify,
                    jsonData["gameID"],
                    presenter.getGameName(),
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "adminKickout":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != str(currentGame.latestUpdate):
            turn = jsonData.get("turn", "N/A")  # Get the value for 'turn' or 'N/A' if not present
            phase = jsonData.get("phase", "N/A")  # Get the value for 'phase' or 'N/A' if not present
            message = (
                f"SYNC ERROR IN: FCM adminKickout - gameID: {currentGame.id} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {presenter.getArrayOfIsCurrentPlayers()}"
            )
            SN_sendAdminErrorMessage(message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        presenter.addMissingPlayer(_missingPlayer)
        presenter.addKickedPlayer(_missingPlayer)

        # Add FCM tourney admin player
        fcm_tourney_admin = User.objects.get(username="FCMtourneyAdmin")
        GamePlayer.objects.get_or_create(
            game=currentGame,
            player=fcm_tourney_admin,
            defaults={"seat_order": currentGame.maxPlayers},
        )

        # Change host to FCM tourney admin
        currentGame.host = fcm_tourney_admin

        # Delete Rewind Data
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        presenter.clearAllMoveDataV2()

        currentGame.save()
        response_data = {
            "result": 2,
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": presenter.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "simpleSave":
        currentGame.gameData = jsonData["data"]
        currentGame.save()
        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    elif jsonData["action"] == "saveAndUpdateNotifictions":
        currentGame.gameData = jsonData["data"]
        #referringPhase = jsonData["referringPhase"]

        starting_options = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
        trainingGame = False
        if rf.SO_TRAINING_GAME in starting_options:
            trainingGame = True

        # Send Notifications - and remove pre-data for players with illegal moves
        playerIndexesToNotify = jsonData["playerIndexesToNotify"]
        playerNames = presenter.getAllPlayersOrderedySeatInArray(False, False)
        playerListToNotify = []
        for playerIndex in playerIndexesToNotify:
            playerListToNotify.append(playerNames[playerIndex])
        for playerName in playerListToNotify:
            if not trainingGame:
                presenter.insertPlayerMoveData(playerName, [-1], [])

        # Add players to currentPlayers
        currentPlayersArr = presenter.getArrayOfIsCurrentPlayers()
        for player in playerListToNotify:
            if player not in currentPlayersArr:
                currentPlayersArr.append(player)

        presenter.setCurrentPlayersFromArrInTurnOrder(currentPlayersArr)

        currentGame.save()

        if request.user.username in playerListToNotify:
            playerListToNotify.remove(request.user.username)

        # SAVE UPDATE NOTIFICATION
        for player in playerListToNotify:
            ppov = presenter.seatPosition(player)
            playerNotificationSuppression = currentGame.FCMnotificationSuppression[ppov : ppov + 1]
            if playerNotificationSuppression == "1":
                playerListToNotify.remove(player)
                currentGame.FCMnotificationSuppression = currentGame.FCMnotificationSuppression[:ppov] + "0" + currentGame.FCMnotificationSuppression[ppov + 1 :]

        if len(playerListToNotify) > 0:
            presenter.sendYourTurnNotification(
                "FCM",
                playerListToNotify,
                jsonData["gameID"],
                presenter.getGameName(),
                currentGame,
                currentGame.latestUpdate,
            )

        return JsonResponse(
            {
                "result": 2,
            },
            safe=False,
        )

    print(f"* * * ERROR: {jsonData['action']} -- Game: {currentGame.gameName} -- ID: {currentGame.id}")
    return HttpResponse(status=204)  # No Content


@login_required()
def bugEntry(request):
    return shared_bug_entry(
        request,
        "FCM",
        extra_info_fn=lambda g: f"{g.startingMap} Options: {g.startingOptions if g.startingOptions else ''}",
    )


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex(str(gameID), timeout=5, ttl=60) as acquired:
        if acquired:
            return _sendChatMessage(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        game_id = jsonData["gameID"]
        new_entry = jsonData["newEntry"]

        currentGame = Game.objects.get(id=game_id, gameCode="FCM")
        presenter = cast("FCMpresenter", currentGame.presenter())

        currentChatData = []
        base64_data = currentGame.chatData if currentGame.chatData else ""
        if len(base64_data) > 0:
            compressed_data = base64.b64decode(base64_data)
            unzipped = gzip.decompress(compressed_data).decode("utf-8")
            currentChatData = json.loads(unzipped)
        currentChatData.insert(0, new_entry)

        json_string = json.dumps(currentChatData, separators=(",", ":"))
        compressed_data = gzip.compress(json_string.encode("utf-8"))
        compressedChatData = base64.b64encode(compressed_data).decode("utf-8")

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        all_usernames = [gp.player.username for gp in currentGame.players.all().select_related("player") if gp.player and gp.player.username != request.user.username]
        presenter.addChatNotifications(all_usernames)

        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return HttpResponse(status=204)  # No Content


@login_required()
def notes(request):
    return shared_save_notes(request, "FCM", json_key="note")


@login_required
def changeAssistance(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "assistance":
        try:
            profile = Profile.objects.get(user=request.user)
            profile.showAssistance = jsonData["changeAssistance"]
            profile.save()
        except Exception:
            print(f"* * * CHANGE ASSISTANCE ERROR:  {request.user.username}")
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    elif jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="FCM")
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist")) from None

        playerNumber = int(jsonData["playerNumber"])
        requiredLength = 3 * currentGame.maxPlayers

        # Ensure zoomLevels string is long enough
        if len(currentGame.zoomLevels) < requiredLength:
            currentGame.zoomLevels = "200" * currentGame.maxPlayers

        # Ensure we have enough space for the player's zoom level
        while len(currentGame.zoomLevels) < (playerNumber + 1) * 3:
            currentGame.zoomLevels += "200"

        currentGame.zoomLevels = currentGame.zoomLevels[: playerNumber * 3] + jsonData["zoomLevel"] + currentGame.zoomLevels[playerNumber * 3 + 3 :]
        if jsonData["allPlayers"]:
            currentGame.zoomLevels = jsonData["zoomLevel"] * (len(currentGame.zoomLevels) // 3)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def gameAdmin(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    return render(
        request,
        "FCM/gameAdmin.html",
        {
            "gameID": 21,
            "settingsDEBUG": config("FCM_USE_SOURCE_CODE", default=False, cast=bool),
        },
    )


@login_required()
def gameAdminGetMoveData(request):
    if request.user.username != "admin" and request.user.username != "DodgerB":
        return JsonResponse({"error": "Wrong request."}, status=400)
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="FCM")
    except Game.DoesNotExist:
        return render(request, "FCM/gameAdmin.html", {"gameID": 21})

    #presenter = cast("FCMpresenter", currentGame.presenter())

    #names = presenter.getAllPlayersOrderedySeatInArray(True)

    playersMoveDataArr = json.loads(currentGame.FCMplayersMoveData) if currentGame.FCMplayersMoveData else []

    allMoveData = []
    for row in playersMoveDataArr:
        if 3 in row[1]:
            allMoveData.append([row[3], row[0]])

    return JsonResponse({"allMoveData": allMoveData})


@login_required
def FCMdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode="FCM")
    except Game.DoesNotExist:
        # raise Http404(gettext("Game does not exist"))
        if dataType == 3:
            return JsonResponse({"gameDoesNotExist": True})
        raise Http404(f"Game {jsonData.get('gameID')} does not exist (Code: FCM)") from None

    presenter = cast("FCMpresenter", currentGame.presenter())

    # if dataType == 1:
    # Send game data
    #    return JsonResponse({"gameData": currentGame.gameData,
    #                        "secondsToNextKickout": presenter.getSecondsToNextKickout()} )
    if dataType == 2:
        # Remove user from notifications
        presenter.removeChatNotification(request.user)
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
        try:
            gameUpdate = int(jsonData["latestUpdate"])
            latestUpdate = int(currentGame.latestUpdate)
        except Exception as e:
            SN_sendAdminErrorMessage(f"ERROR IN FCMdata: gameID: {jsonData['gameID']} Error: {e}")
            # NB this might need to be changed if the above msg is getting triggered
            specialData = False

            # Use to stop actions showing when there's already move Data
            if presenter.hasValidActualMoveData(request.user.username):
                specialData = True
            return JsonResponse(
                {
                    "latest": False,
                    "loadData": currentGame.gameData,
                    # Not used at the moment, in // comment
                    "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                    "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                    "specialData": specialData,
                    "latestUpdate": currentGame.latestUpdate,
                },
                safe=False,
            )
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        specialData = False

        # Use to stop actions showing when there's already move Data
        if presenter.hasValidActualMoveData(request.user.username):
            specialData = True
        return JsonResponse(
            {
                "latest": False,
                "loadData": currentGame.gameData,
                # Not used at the moment, in // comment
                "currentPlayers": presenter.getArrayOfIsCurrentPlayers(),
                "secondsToNextKickout": presenter.getSecondsToNextKickout(),
                "specialData": specialData,
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    return HttpResponse(status=204)  # No Content


@login_required()
def castVote(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    jsonData = json.loads(request.body)
    with db_mutex(str(jsonData["gameID"]), timeout=5, ttl=60) as acquired:
        if acquired:
            return shared_cast_vote(request)
        else:
            return JsonResponse({"error": "System busy, please try again"}, status=503)


######### Temp functions to handle data change
def load_rewind_data(currentGame):
    """Load rewind data: supports both JSON arrays and 'SPLIT' strings"""
    try:
        data = currentGame.rewindData
        if not data:
            return []

        # 1. Clean the string to check format
        clean_data = str(data).strip()

        # 2. Check if it's a JSON array (starts with '[')
        if clean_data.startswith("["):
            try:
                parsed = json.loads(clean_data)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                # If JSON fails, it might just be an old string that happens to start with '['
                pass

        # 3. Fallback: Split by your custom tag
        # Use a list comprehension to remove any accidental empty strings
        return [item for item in clean_data.split("'SPLIT'") if item]

    except Exception as e:
        print(f"CRITICAL ERROR loading rewind data: {e}")
        return []
