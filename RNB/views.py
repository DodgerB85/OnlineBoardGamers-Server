import json
import time
import base64
import gzip

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
from Lobby.models import User, Profile

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
 
    return render(request, "RNB/showRNBgame.html")
    #try:
    #    currentGame = IND_Game.objects.get(id=game_id)
    #except IND_Game.DoesNotExist:
    #    raise Http404(gettext("Game does not exist"))

    #if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
    #    messages.error(request, gettext("The game is not Active"))
    #    return HttpResponseRedirect(reverse("index"))

    # No2 it is a proper started game, so set up for not logged in
    gameID = 1#currentGame.id
    gameName = "Test Game Name" # currentGame.getGameName()
    gameData = ""#currentGame.gameData
    gameCreationTimestamp = SR_getTimeNow()#currentGame.created
    KickoutFlexiDataArray = []#json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    startingOptions = []#json.loads(currentGame.startingOptions) if currentGame.startingOptions else []

    allPlayerListBySeat = []#json.dumps(currentGame.getAllPlayersOrderedySeat(False))

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
            "allPlayerListBySeat": allPlayerListBySeat,
            "currentPlayers": currentGame.getCurrentPlayers(),
            "preferredINDoptions": [-1,1,0,0,1,1,0]
        }

    if not request.user.is_authenticated:
        return render(request, "IND/showINDgame.html", returnData)

    # Now you are logged in
    name = request.user.username
    chatData = currentGame.chatData

    latestUpdate = currentGame.latestUpdate
    
    preferredINDoptions = json.loads(request.user.profile.preferredINDoptions) if request.user.profile.preferredINDoptions != "" else [-1,1,0,0,1,1,0]

    # preferredINDoptions
    # colour, mapHybrid, resourceIconType, pullResToMan, keepForestUnderWoodRes,showPollutionUnderRes, housesInNumberOrder
    
    # UPDATE CHAT NOTIFICATIONS HERE IN CASE OF BOT
    ## Get Chat notification
    chatNotification = False
    if request.user in currentGame.playersWithChatNotification.all():
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()
    
    returnData.update({
            "name": name,
            "chatData": chatData,
            "latestUpdateLiteral": latestUpdate,
            "nextURL": nextURL,
            "preferredINDoptions": preferredINDoptions,
            "chatNotification": chatNotification,

        })
    

        
        
    involvedPlayer = request.user in currentGame.allPlayers.all() and request.user not in currentGame.missingPlayers.all()
    if request.user.username == "BotKickStarter":
        involvedPlayer = True

    if not involvedPlayer:
        return render(request, "IND/showINDgame.html", returnData)

    pov = currentGame.seatPosition(request.user.username)
    if request.user.username == "BotKickStarter": pov = 0
    secondsToNextKickout = currentGame.getSecondsToNextKickout()
    
    kickoutRequired = currentGame.kickoutRequired()
    
    myMove = currentGame.isMyMove(request.user.username)
 
    ## Get the Notes for the user
    seat_position = currentGame.seatPosition(request.user.username)
    notes_dict = {
        0: currentGame.player0notes,
        1: currentGame.player1notes,
        2: currentGame.player2notes,
        3: currentGame.player3notes,
    }
    notes = notes_dict.get(seat_position, "")


    
    liveNotification = request.user.profile.liveNotification
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]
    
    move = currentGame.getMoveData(request.user.username)
    trade = currentGame.playerTradeData

    ## Involved Player
    returnData.update({
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "yourTurnAudioType": liveNotification,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "myStatsExcludeConsent": int(currentGame.statsExcludeConsent[pov:pov+1]),
            "move": move,
            "trade": trade,
        })
    
    ### NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
            currentGame.player0notes = ""
            notes = ""
            currentGame.save()
        #allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())
        if currentGame.startingMap != "": returnData.update({"startingMap": json.loads(currentGame.startingMap) })
    
        returnData.update({
            "notes": notes,
            "displayNames": displayNames,
            #"allPlayerListBySeat": allPlayerListBySeat,
        })
    
    return render(request, "IND/showINDgame.html", returnData)



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
    return render(request, "Lobby/index.html")