import json
import time
import base64
import gzip

from decouple import config
from typing import TYPE_CHECKING, cast

from contextlib import contextmanager

from django.contrib import messages
from django.conf import settings

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


from .models import RNB_Game
from .common import create_rnb_game

from Lobby.models import User, Profile, Game

from Lobby.sharedFunctions.constants import DELETE_VOTE_TOPIC, STATS_EXCLUDE_VOTE_TOPIC

if TYPE_CHECKING:
    from Lobby.presenters import RnbPresenter 

def index(request):
    return HttpResponse("Hello, world. You're at RNB")

def RNBhelp(request):
    return render(request, "RNB/RNBhelp.html")

def showRNBgame(request, game_id=1, spoilerFree=False, replayStep=1):
    #ALLOWED_USERS = ["admin", "ha.steven", "massibull", "durendal", 'DodgerB', 'BotKickStarter','Rastko','Benkyo', 'vraid', "F1087", "krieg90", "gdc", "enavico", 'PhasingPlayer']
    #["admin", "ha.steven", "Kawlos", "Jasonbartfast", "Batch", "Juni", "TDUBZ", "BigBad", "massibull", "durendal", 'DodgerB', 'BotKickStarter', '33', 'Rastko', 'Burmer', 'phil', 'Benkyo', 'Steveth', "F1087", "krieg90", "gdc"]
    #                 #'looogic', 'Burmer',
    #                 #'pgh_gamer', , 'huddyrx', 'user1', 'craggybackhand', 'Strange8ractor', ]
    ##print("******************************************************************************************************** IND ACCESS: =================================================:  " + request.user.username)
    ALLOWED_USERS = ['admin', 'DodgerB', 'durendal', 'Benkyo', 'vraid', 'JoshuaAcosta', "massibull", "phil", "timmymayes", "SaintJason"]
    
    if request.user.username not in ALLOWED_USERS:
        return redirect('index')
 
    try:
        currentGame = (
            Game.objects.select_related("host", "creator")
            .prefetch_related(
                "players__player", "invitedPlayers"
            )
            .get(id=game_id, gameCode='RNB')
        )
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    presenter = cast('RnbPresenter', currentGame.presenter())

    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {gp.player.id for gp in currentGame.players.all() if gp.player}
    userObj = request.user
    username = userObj.username

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

    allPlayerListBySeat = presenter.getAllPlayersOrderedySeat(False, False)

    # Logged out
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 16,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "allPlayerListBySeat": json.dumps(allPlayerListBySeat),
        "currentPlayers": presenter.getCurrentPlayers(),
        #"preferredAQYoptions": [-1, 1, 0, 0, 1, 1, 0],
        "statsExcludeVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                STATS_EXCLUDE_VOTE_TOPIC, presenter.getAllPlayersOrderedySeat(True), False
            )
        ),
        "deleteVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                DELETE_VOTE_TOPIC, presenter.getAllPlayersOrderedySeat(True), False
            )
        ),
        "settingsDebug": config("RNB_USE_SOURCE_CODE", default=False, cast=bool),
    }

    if not request.user.is_authenticated:
        return render(request, "RNB/showRNBgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id

    user_profile = Profile.objects.get(user=userObj)

    # Get user game player object
    user_gp = currentGame.players.filter(player=userObj).first()

    is_in_all = user_gp is not None
    is_missing = user_gp.is_missing if user_gp else False
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True

    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code=RNB"

    #preferredAQYoptions = (
    #    json.loads(user_profile.preferredAQYoptions)
    #    if user_profile.preferredAQYoptions != ""
    #    else [-1, 1, 0, 0, 1, 1, 0]
    #)

    # preferredAQYoptions
    # colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes,showPollutionUnderRes, housesInNumberOrder

    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        presenter.removeChatNotification(request.user)
        currentGame.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            #"preferredAQYoptions": preferredAQYoptions,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "RNB/showRNBgame.html", returnData)

    pov = presenter.seatPosition(username)
    if request.user.username == "BotKickStarter":
        pov = -1
    secondsToNextKickout = presenter.getSecondsToNextKickout()

    kickoutRequired = presenter.kickoutRequired()

    myMove = presenter.isMyMove(username)

    ## Get the Notes for the user
    notes = user_gp.notes if user_gp else ""

    liveNotification = user_profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    move = presenter.getMoveData(username)
    trade = currentGame.playerTradeData

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
            "move": move,
            "trade": trade,
        }
    )

    ## pre move
    #if (
    #    currentGame.phase == 4
    #    or currentGame.phase == 5
    #    or currentGame.phase == 6
    #    or currentGame.phase == 7
    #    or currentGame.phase == 8
    #    or currentGame.phase == 9
    #):
    #    if presenter.getMoveDataTime(username) == "PRE_MOVE":
    #        returnData.update({"preMove": presenter.getMoveData(username)})

    # TODO: also send any current player pre moves in case action failed.

    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in presenter.getAllPlayersOrderedySeat():
            displayNames = user_gp.notes if user_gp else ""
            if user_gp:
                user_gp.notes = ""
                user_gp.save()
            notes = ""
        # allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())
        if currentGame.startingMap != "":
            returnData.update({"startingMap": json.loads(currentGame.startingMap)})

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                # "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "RNB/showRNBgame.html", returnData)



@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    #try:
    #    currentGame = WEB_Game.objects.get(id=gameID)
    #except WEB_Game.DoesNotExist:
    #    raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    #extraInfo = "Options: " + currentGame.startingOptions
    extraInfo = ""

    # email data to myself
    SN_sendBugReportEmail(
        request,
        "RNB",
        gameID,
        gameData,
        bugDescription,
        #currentGame.rewindData, 
        "",
        extraInfo,
    )

    return JsonResponse({"bugEntrySuccess": True})

def createRNBgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_rnb_game(request)