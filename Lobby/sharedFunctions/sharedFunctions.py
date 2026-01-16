import time
import itertools
import gzip
import base64
from collections import defaultdict
from decouple import config

import requests
import json

from django.conf import settings
from django.db.models import Q
from django.utils.translation import gettext  # , activate, get_language

# from django.template.loader import render_to_string
# from django.contrib.sites.shortcuts import get_current_site
from django.utils.safestring import mark_safe

# from django.urls import reverse
# from django.http import HttpResponseRedirect
from Lobby.models import User, Profile

# from django.contrib import messages
# from django.core.mail import get_connection, EmailMessage

# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# from django.conf import settings

from Lobby.sharedFunctions.sharedNotifications import SN_M_T_sendTournamentWinNotification
from Lobby.sharedFunctions.sharedRefs import (
    SR_isThisMultiiWinnersGame,
    SR_getPointsForPosition,
    getCleanedAndSortedRoundData,
    SR_currentTurnString,
    SR_getFCMstartingOptionsHTML,
    SR_gamePaceString,
)
from Lobby.sharedFunctions.tournyGenerator import multiGamePlayers4p, multiGamePlayersRound2

from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

NAMES_NOT_TO_ADD_TO_NEXT_TOURNAMENT_ROUND = ["FCMtourneyAdmin", "TGZtourneyAdmin"]

def SF_getTimeNow():
    return str(int(time.time()) * 1000)


def SF_getRequiredExp(gameCode):
    if gameCode == "FCM":
        return 2
    if gameCode == "HC":
        return 1
    if gameCode == "Bus":
        return 1
    if gameCode == "TGZ":
        return 2
    if gameCode == "CNS":
        return 2
    if gameCode == "AQY":
        return 2
    if gameCode == "IND":
        return 2
    if gameCode == "KFW":
        return 2
    return 2


def SF_hasRequiredExperience(request, gameCode, gameModel):
    from Lobby.models import Game
    
    shadowUser = User.objects.get(username="SHADOW")
    experienced = False

    # Handle unified Game model differently
    if gameModel == Game:
        # For unified Game model, query through GamePlayer
        model_games_involved = Game.objects.filter(
            gameCode=gameCode,
            gameStatus="FINISHED",
            players__player=request.user
        ).exclude(
            players__player=shadowUser
        ).distinct()
    else:
        # For legacy game models with allPlayers M2M
        model_games_involved = gameModel.objects.filter(
            Q(allPlayers=request.user, gameStatus="FINISHED") & ~Q(allPlayers=shadowUser)
        )
    
    exp = model_games_involved.count()
    if exp >= SF_getRequiredExp(gameCode):
        experienced = True
    return experienced


def SF_getGameCreationJsonReturn(gameCode, gameID):
    return mark_safe(
        gettext("Your game has been created and is waiting for players<br/>Invite Link: ")
        + f"<a href='https://www.onlineboardgamers.com/join/{gameCode}{gameID}/'>https://www.onlineboardgamers.com/join/{gameCode}{gameID}/</a> <button class='copyGameLinkButton' onclick='copyToClipboard(`https://www.onlineboardgamers.com/join/{gameCode}{gameID}/`, event)'>"
        + gettext("Copy Link")
        + "</button>"
    )


def SF_getMiniTournamentCreationJsonReturn(MT_ID):
    return mark_safe(
        gettext("Your Mini Tournament has been created and is waiting for players<br/>Invite Link: ")
        + f"<a href='https://www.onlineboardgamers.com/MiniTournament/{MT_ID}/'>https://www.onlineboardgamers.com/MiniTournament/{MT_ID}/</a> <button class='copyGameLinkButton' onclick='copyToClipboard(`https://www.onlineboardgamers.com/MiniTournament/{MT_ID}/`, event)'>"
        + gettext("Copy Link")
        + "</button>"
    )

def SF_fastSerializeGame(game, user):
    """
    Zero-query serialization for any game model.
    Dynamically identifies game type (FCM, TGZ, etc.)
    Handles both legacy models with M2M fields and unified Game model
    """
    from Lobby.models import Game
    
    # --- 1. Identify Game Type ---
    is_unified_model = isinstance(game, Game)
    
    if is_unified_model:
        game_code = game.gameCode
    else:
        game_code = game._meta.app_label
    
    # 2. Handle player data differently for unified vs legacy models
    if is_unified_model:
        # Unified Game model - use GamePlayer
        all_game_players = list(game.players.exclude(is_kicked=True).select_related('player'))
        all_players = [gp.player for gp in all_game_players if gp.player]
        all_usernames = [p.username for p in all_players]
        invited_usernames = [u.username for u in game.invitedPlayers.all()]
        all_ids = {p.id for p in all_players}
        missing_ids = {gp.player.id for gp in all_game_players if gp.is_missing and gp.player}
        chat_notify_ids = {gp.player.id for gp in all_game_players if gp.has_chat_notification and gp.player}
        
        # Get current players from is_current flag
        current_players_str = ", ".join([
            gp.player.username for gp in all_game_players 
            if gp.is_current and gp.player
        ])
        
        # Winner from GamePlayer
        winner_gp = next((gp for gp in all_game_players if gp.winner), None)
        winner_str = winner_gp.player.username if (winner_gp and winner_gp.player) else ""
    else:
        # Legacy model - use M2M fields
        all_players = list(game.allPlayers.all())
        all_usernames = [u.username for u in all_players]
        invited_usernames = [u.username for u in game.invitedPlayers.all()]
        all_ids = {u.id for u in all_players}
        missing_ids = {u.id for u in game.missingPlayers.all()}
        chat_notify_ids = {u.id for u in game.playersWithChatNotification.all()}
        current_players_str = game.currentPlayers
        
        # Winner Logic (Handles both FK and M2M)
        winner_str = ""
        if game.winner:
            if hasattr(game.winner, 'all'): # M2M
                winner_str = ", ".join([u.username for u in game.winner.all()])
            else: # ForeignKey
                winner_str = game.winner.username

    # 3. Timing Calculation
    now = int(time.time())
    ref_time = int(game.latestUpdate) // 1000 if game.gameStatus == "ACTIVE" else int(game.created) // 1000
    elapsed = max(0, now - ref_time)
    
    d, rem = divmod(elapsed, 86400)
    h, rem = divmod(rem, 3600)
    m, s = divmod(rem, 60)
    elapsed_str = f"{f'{d}d ' if d else ''}{f'{h}h ' if h else ''}{f'{m}m ' if m else ''}{s}s"

    # 4. MyMove & Involved Logic
    is_my_move = False
    if user:
        is_my_move = (not current_players_str or user.username in current_players_str or 
                      any(s in current_players_str for s in ["SHADOW", "FcmAI"]))
        
        # For HC, if it is factory phase, AND you have submitted your move, set it back to false
        if game_code == "HC" and is_my_move and game.phase == 3 and game.hasMoveData(user.username) != "":
            is_my_move = False
    
    is_involved = user.id in all_ids and user.id not in missing_ids if user else False

    # 5. Shadow/Delete Logic
    shadow_names = {"SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5", "FcmAI"}
    is_deleteable = any(name in all_usernames for name in shadow_names) and (user.id in all_ids if user else False)

    creator = game.creator.username 
    gameName = getattr(game, 'gameName', 'Unknown Game')
    if gameName == "":
        gameName = f"[{creator}'s Game]"

    startingOptions = []
    if game_code == "FCM" or game_code == "HC" or game_code == "Bus":
        startingOptions = game.startingOptions.split(",")
    else:
        startingOptions = json.loads(game.startingOptions) if game.startingOptions else []

    isLearningGame = False
    isExperiencedGame = False
    if "110" in startingOptions:
        isLearningGame = True
    if "120" in startingOptions:
        isExperiencedGame = True
    
    startingOptionsHTML = ""
    if game_code == "FCM":
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(game.startingOptions)
    
    # Get kickout required - use presenter for unified model
    if is_unified_model:
        kickoutRequiredNum = game.presenter().kickoutRequired()
    else:
        kickoutRequiredNum = game.kickoutRequired()

    return {
        "gameID": game.id,
        "gameName": gameName,
        "gameDescription": game.gameDescription,
        "creator": creator,
        "allPlayers": all_usernames,
        "invitedPlayers": invited_usernames,
        "winner": winner_str,
        "myMove": is_my_move,
        "involvedPlayer": is_involved,
        "chatNotification": user.id in chat_notify_ids if user else False,
        "latestUpdateElapsedTimeString": elapsed_str,
        "deleteableGame": is_deleteable,
        "gameStatus": game.gameStatus,
        "gameCode": game_code,
        "currentTurn": SR_currentTurnString(game_code, game.turn, game.phase),
        "kickoutDuration": game.kickoutDuration,
        "created": game.created,
        "learningGame": isLearningGame,
        "experiencedGame": isExperiencedGame,
        "maxPlayers": game.maxPlayers,
        "startingOptionsHTML": startingOptionsHTML,
        "pace": SR_gamePaceString(game.gamePace),
        "startingMap": game.startingMap if hasattr(game, 'startingMap') else "",
        "latestUpdate": game.latestUpdate,
        "currentPlayers": current_players_str, 
        "kickoutRequiredNum": kickoutRequiredNum

    }
            #"currentPlayers": self.currentPlayers,
            #"kickoutRequiredNum": kickoutRequiredNum,
            #"remainingPlayers": remainingPlayers,

def SF_updateFlexiTime(kickoutFlexiData, latestUpdate, now, currentUsername, kickoutDuration):
    secondsSinceUpdate = int((now - int(latestUpdate)) / 1000)
    ##### DEBUG #######
    # secondsSinceUpdate += 24*60*60

    # If there is no flexi time used, just return the original data
    # Check Kickout in Mins
    flexUsed = 0
    if kickoutDuration < 50:
        return kickoutFlexiData
    # Now check 12 hrs
    elif kickoutDuration == 50:
        flexUsed = secondsSinceUpdate - (12 * 60 * 60)
    # Now check kickout in days
    elif kickoutDuration >= 100:
        flexUsed = secondsSinceUpdate - (int(kickoutDuration / 100) * 60 * 60 * 24)
    if flexUsed <= 0:
        # ("no update")
        return kickoutFlexiData

    # Now there must have been some flex used
    KickoutFlexiDataArray = []
    if kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(kickoutFlexiData)
    # Find if currentUsername already exists in the array
    found = False
    for entry in KickoutFlexiDataArray:
        if isinstance(entry, list) and len(entry) == 2 and entry[0] == currentUsername:
            # If currentUsername is found, add 1000 to the number next to it
            entry[1] += int(flexUsed)
            found = True
            break

    if not found:
        # If currentUsername is not found, add a new entry with currentUsername and 1000
        newEntry = [currentUsername, int(flexUsed)]
        KickoutFlexiDataArray.append(newEntry)

    # Convert KickoutFlexiDataArray back to JSON string
    updatedKickoutFlexiData = json.dumps(KickoutFlexiDataArray)
    # ("Data Upated")
    return updatedKickoutFlexiData


def SF_kickoutRequired(gameStatus, allPlayers, latestUpdate, kickoutDuration, kickoutFlexiData, currentUsername):
    FLEXI_SECONDS = 60 * 60 * 24

    if gameStatus != "ACTIVE":
        return 0
    NO_KICKOUT_USERS = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5", "FcmAI"]
    if any(username in allPlayers for username in NO_KICKOUT_USERS):
        return 0
    secondsSinceUpdate = (int(time.time()) * 1000 - int(latestUpdate)) / 1000

    ##### DEBUG #######
    # secondsSinceUpdate += 24*60*60
    ##### DEBUG #######

    individualCheckRequired = False
    # Check Kickout in Mins
    if kickoutDuration < 50:
        # For blitz minutes, subtract 10 seconds in comparison
        if secondsSinceUpdate - 10 > ((kickoutDuration) * 60):
            return 2

    # Now check 12 hrs
    elif kickoutDuration == 50:
        if secondsSinceUpdate > (12 * 60 * 60):
            individualCheckRequired = True

    # NOW CHECK FOR KICKOUT IN DAYS
    elif kickoutDuration >= 100:
        kickoutInDays = int(kickoutDuration / 100)
        # if relatedTournament != None and turn == 0 and phase == 0:
        #    kickoutInDays = 3
        # if secondsSinceUpdate > 10:
        # if secondsSinceUpdate > kickoutDuration:
        if secondsSinceUpdate > (kickoutInDays * 60 * 60 * 24):
            individualCheckRequired = True

    if individualCheckRequired:
        # Any extra 24hrs must be a kickout
        if kickoutDuration == 50 and secondsSinceUpdate > (12 * 60 * 60) + FLEXI_SECONDS:
            return 2
        elif (
            kickoutDuration >= 100 and secondsSinceUpdate > (int(kickoutDuration / 100) * 60 * 60 * 24) + FLEXI_SECONDS
        ):
            return 2
        # Otherwise, need to interrogate the array
        KickoutFlexiDataArray = []
        if kickoutFlexiData:
            KickoutFlexiDataArray = json.loads(kickoutFlexiData)

        usedSeconds = 0
        for entry in KickoutFlexiDataArray:
            if isinstance(entry, list) and len(entry) == 2:
                if entry[0] == currentUsername:
                    usedSeconds = entry[1]
                    break
        # So need to check whether used seconds + difference
        total_elasped_time = secondsSinceUpdate + usedSeconds
        if kickoutDuration == 50 and total_elasped_time > (12 * 60 * 60) + FLEXI_SECONDS:
            return 2
        elif (
            kickoutDuration >= 100 and total_elasped_time > (int(kickoutDuration / 100) * 60 * 60 * 24) + FLEXI_SECONDS
        ):
            return 2
        return 1

    # ("no check")
    return 0

def SF_getSecondsToNextKickout(latestUpdate, kickoutDuration):
    startPeriodinSeconds = int(latestUpdate) / 1000
    durationPeriodInSeconds = 9999999
    if kickoutDuration < 50:
        durationPeriodInSeconds = kickoutDuration * 60
    elif kickoutDuration == 50:
        durationPeriodInSeconds = 12 * 60 * 60
    elif kickoutDuration >= 100:
        durationPeriodInSeconds = int(kickoutDuration / 100) * 60 * 60 * 24
    endPeriod = startPeriodinSeconds + (durationPeriodInSeconds)
    secondsToNextKickout = (int(endPeriod)) - (int(time.time()))
    return secondsToNextKickout

# THIS IS THE OLD SEPERATE MODEL FUNCTION 
def SF_M_ProcessTournamentEndGame(request, _game, _currentGame, _winnerArray):
    # Add winner into results
    tournamentProgressionDataArray = json.loads(_currentGame.relatedTournament.tournamentProgressionData)
    # Find correct index in latest round
    indexRequired = -1
    for i in range(0, len(tournamentProgressionDataArray[-1])):
        for j in range(0, len(tournamentProgressionDataArray[-1][i])):
            if tournamentProgressionDataArray[-1][i][j] == _winnerArray[0]:
                indexRequired = i
    tournamentProgressionDataArray[-1][indexRequired].append(_winnerArray[0])
    _currentGame.relatedTournament.tournamentProgressionData = json.dumps(tournamentProgressionDataArray)

    ############################## Add players to next round players
    # KO JUST ADD THE WINNER
    if _currentGame.relatedTournament.tournamentType == "KO":
        for playerUsername in _winnerArray:
            _currentGame.relatedTournament.nextRoundPlayers.add(User.objects.get(username=playerUsername))
    # RR/PT Add all players not kickied
    elif _currentGame.relatedTournament.tournamentType == "RR" or _currentGame.relatedTournament.tournamentType == "PT":
        # Just add winner for KO part
        if len(tournamentProgressionDataArray) >= _currentGame.relatedTournament.roundsBeforeKnockout:
            for playerUsername in _winnerArray:
                _currentGame.relatedTournament.nextRoundPlayers.add(User.objects.get(username=playerUsername))
        # Else add everyone
        else:
            for playerObj in _currentGame.allPlayers.all():
                if playerObj not in _currentGame.kickedPlayers.all() and playerObj.username != "FCMtourneyAdmin":
                    _currentGame.relatedTournament.nextRoundPlayers.add(playerObj)
    # TL Process lives, remove kicks, add players with lives
    elif _currentGame.relatedTournament.tournamentType == "TL":
        # Process the lives list
        livesList = json.loads(_currentGame.relatedTournament.tournamentSideData)
        for playerObj in _currentGame.allPlayers.all():
            if SR_isThisMultiiWinnersGame(_game):
                if playerObj not in _currentGame.winner.all() and playerObj.username != "FCMtourneyAdmin":
                    livesList.remove(playerObj.username)
            else:
                if playerObj != _currentGame.winner and playerObj.username != "FCMtourneyAdmin":
                    livesList.remove(playerObj.username)
        for playerObj in _currentGame.kickedPlayers.all():
            while playerObj.username in livesList:
                livesList.remove(playerObj.username)

        # Now add players to next round with 1/2 lives and not kicked
        for playerObj in _currentGame.allPlayers.all():
            if playerObj.username in livesList:
                _currentGame.relatedTournament.nextRoundPlayers.add(playerObj)

        _currentGame.relatedTournament.tournamentSideData = json.dumps(livesList)

    ########################## Update the points
    # Update the winners count for TL and RR
    if _currentGame.relatedTournament.tournamentType == "TL" or _currentGame.relatedTournament.tournamentType == "RR":
        pointsList = json.loads(_currentGame.relatedTournament.tournamentPointsData)
        for i in range(len(pointsList)):
            if pointsList[i][0] in _winnerArray:
                pointsList[i][1] += 1
        _currentGame.relatedTournament.tournamentPointsData = json.dumps(pointsList)
    # Update the points for PT
    elif _currentGame.relatedTournament.tournamentType == "PT":
        pass
    _currentGame.relatedTournament.save()

    # Check all games from previous round are finished
    tournamentRoundFinished = False

    # Check all games from previous round are finished
    finishedGames = 0
    for row in tournamentProgressionDataArray[-1]:
        if row[0] == "BYEPLAYERS":
            finishedGames += 1
        else:
            gamePlayers = _currentGame.relatedTournament.maxGamePlayers
            # Each row has all player names, plus gameID, plus winner (if applicable)
            if len(row) >= gamePlayers + 2:
                finishedGames += 1
    if finishedGames == len(tournamentProgressionDataArray[-1]):
        tournamentRoundFinished = True

    # All games done; either end tourny or start new round
    if tournamentRoundFinished:
        from FCM.common import create_fcm_game
        from TGZ.common import create_tgz_game

        # check for winner
        if (
            _currentGame.relatedTournament.nextRoundPlayers.count()
            < _currentGame.relatedTournament.maxGamePlayers
        ):
            # End the Tournament ONLY WORKS HERE FOR RR in KO, KO, TL
            SF_endTournament(request, _currentGame, _game, _winnerArray)
            _currentGame.relatedTournament.save()
            return
        # Otherwise start a new round
        # First get the list for Rounds of RR / PT, and TL
        allPlayersList = list(
            _currentGame.relatedTournament.nextRoundPlayers.all().order_by("?").values_list("username", flat=True)
        )
        if (
            (
                _currentGame.relatedTournament.tournamentType == "RR"
                and len(tournamentProgressionDataArray) < _currentGame.relatedTournament.roundsBeforeKnockout
            )
            or (
                _currentGame.relatedTournament.tournamentType == "PT"
                and len(tournamentProgressionDataArray) < _currentGame.relatedTournament.roundsBeforeKnockout
            )
            or _currentGame.relatedTournament.tournamentType == "TL"
        ):
            # In this case, allPlayersList should start with 0 points up to max points
            pointsList = json.loads(_currentGame.relatedTournament.tournamentPointsData)
            pointsList = sorted(pointsList, key=lambda x: x[1])
            # Now points list has weakest players at the top
            allPlayersList = []
            for row in pointsList:
                nextUsername = row[0]
                if nextUsername in list(
                    _currentGame.relatedTournament.nextRoundPlayers.all().values_list("username", flat=True)
                ):
                    allPlayersList.append(nextUsername)
            # BUT remove 0 lives people from TL
            if _currentGame.relatedTournament.tournamentType == "TL":
                livesList = json.loads(_currentGame.relatedTournament.tournamentSideData)
                removalList = []
                for playerName in allPlayersList:
                    if playerName not in livesList:
                        removalList.append(playerName)
                for playerName in removalList:
                    allPlayersList.remove(playerName)

        # BUT if rounds are over then move to knockout
        if (
            _currentGame.relatedTournament.tournamentType == "RR"
            and len(tournamentProgressionDataArray) == _currentGame.relatedTournament.roundsBeforeKnockout
        ):
            pointsList = json.loads(_currentGame.relatedTournament.tournamentPointsData)
            pointsList = sorted(pointsList, key=lambda x: x[1])
            allPlayersList = []
            # find points required for knockout
            maxPoints = pointsList[-1][1]
            for row in pointsList:
                if row[1] >= maxPoints:
                    allPlayersList.append(row[0])
            if len(allPlayersList) < _currentGame.relatedTournament.maxGamePlayers:
                SF_endTournament(request, _currentGame, _game, _winnerArray)
                _currentGame.relatedTournament.save()
                return

        # NOW ALL PLAYERS LIST IS SORTED WITH WEAKEST AT TOP
        _currentGame.relatedTournament.nextRoundPlayers.clear()

        roundNumberString = gettext("Round") + " " + str(len(tournamentProgressionDataArray) + 1)
        if _currentGame.relatedTournament.tournamentType == "RR" and len(tournamentProgressionDataArray) >= 4:
            roundNumberString += " (KO)"
        if len(allPlayersList) == _currentGame.relatedTournament.maxGamePlayers:
            if _currentGame.relatedTournament.tournamentType == "RR" and len(tournamentProgressionDataArray) >= 4:
                roundNumberString = gettext("Final Round (KO)")
            else:
                roundNumberString = gettext("Final Round")

        # Make a set of players
        roundData = []
        # Start by removing any "BYE" plauers
        if (
            len(allPlayersList) % _currentGame.relatedTournament.maxGamePlayers > 0
            and len(allPlayersList) >= _currentGame.relatedTournament.maxGamePlayers
        ):
            byePlayers = ["BYEPLAYERS"]
            currentIndex = 0
            alreadyByedPlayers = _currentGame.relatedTournament.getByedPlayersList()
            forceBye = False
            while len(allPlayersList) % _currentGame.relatedTournament.maxGamePlayers > 0:
                if allPlayersList[currentIndex] in alreadyByedPlayers and not forceBye:
                    pass
                else:
                    _currentGame.relatedTournament.nextRoundPlayers.add(
                        User.objects.get(username=allPlayersList[currentIndex])
                    )
                    byePlayers.append(allPlayersList.pop(currentIndex))
                currentIndex += 1
                # If at the end, start force adding people
                if currentIndex == len(allPlayersList):
                    currentIndex -= 1
                    forceBye = True

            roundData.append(byePlayers)
            # Now add 1 point for the byes
            if len(_currentGame.relatedTournament.tournamentPointsData) > 0:
                pointsList = json.loads(_currentGame.relatedTournament.tournamentPointsData)
                for i in range(len(byePlayers)):
                    if byePlayers[i] != "BYEPLAYERS":
                        # find the player in points list and add 1
                        for j in range(len(pointsList)):
                            if pointsList[j][0] == byePlayers[i]:
                                if _currentGame.relatedTournament.tournamentType == "PT":
                                    ###### BYED POINTS
                                    if _currentGame.relatedTournament.maxGamePlayers == 2:
                                        pointsList[j][1] += 1
                                    elif _currentGame.relatedTournament.maxGamePlayers == 3:
                                        pointsList[j][1] += 2
                                    elif _currentGame.relatedTournament.maxGamePlayers == 4:
                                        pointsList[j][1] += 3
                                    elif _currentGame.relatedTournament.maxGamePlayers == 5:
                                        pointsList[j][1] += 4
                                    elif _currentGame.relatedTournament.maxGamePlayers == 6:
                                        pointsList[j][1] += 7
                                elif (
                                    _currentGame.relatedTournament.tournamentType == "RR"
                                    or _currentGame.relatedTournament.tournamentType == "TL"
                                ):
                                    pointsList[j][1] += 1
                                break
                _currentGame.relatedTournament.tournamentPointsData = json.dumps(pointsList)

        # Then create games with exact number of players required
        # First get all players who have played together in a list
        tournamentProgressionDataArray = json.loads(_currentGame.relatedTournament.tournamentProgressionData)
        previousGamesPlayers = []
        for round in tournamentProgressionDataArray:
            for row in round:
                if row[0] != "BYEPLAYERS":
                    currentItem = []
                    for i in range(_currentGame.relatedTournament.maxGamePlayers):
                        currentItem.append(row[i])
                    previousGamesPlayers.append(currentItem)

        while len(allPlayersList) >= _currentGame.relatedTournament.maxGamePlayers:
            currentPlayers = []
            # Gather the players
            currentPlayers.append(allPlayersList.pop(0))
            # for i in range(self.relatedTournament.maxGamePlayers):
            #    currentPlayers.append(allPlayersList.pop(0))
            for i in range(len(allPlayersList)):
                # Add fix for when 4 player rounds broke
                try:
                    nextPlayer = allPlayersList[i]
                except Exception as e:
                    print("SF_M_PROCESSTournamentEndGame: " + str(e))
                    nextPlayer = allPlayersList[0]
                eligible = True
                for row in previousGamesPlayers:
                    if nextPlayer in row and currentPlayers[0] in row:
                        eligible = False
                        break
                if eligible:
                    currentPlayers.append(nextPlayer)
                    allPlayersList.remove(nextPlayer)
                if len(currentPlayers) == _currentGame.relatedTournament.maxGamePlayers:
                    break

            # Now just make sure a game is full
            while len(currentPlayers) < _currentGame.relatedTournament.maxGamePlayers:
                currentPlayers.append(allPlayersList.pop(0))

            # Start a game
            if _game == "FCM":
                newGameID = create_fcm_game(
                    request, "normT", _currentGame.relatedTournament, roundNumberString, currentPlayers
                )
            elif _game == "TGZ":
                newGameID = create_tgz_game(
                    request, MAIN_T_FLAG, _currentGame.relatedTournament, roundNumberString, currentPlayers
                )
            else:
                newGameID = _currentGame.relatedTournament.createTournamentGame(
                    request, roundNumberString, currentPlayers
                )
            currentPlayers.append(newGameID)
            roundData.append(currentPlayers)

        if len(roundData) > 0:
            tournamentProgressionDataArray.append(roundData)
        _currentGame.relatedTournament.tournamentProgressionData = json.dumps(tournamentProgressionDataArray)

        # Clear next round players out

    _currentGame.relatedTournament.save()


def SF_endTournament(request, _currentGame, _game, _winnerArray):
    winnersData = []

    # End the tournament
    _currentGame.relatedTournament.tournamentStatus = "FN"
    # RR / TL / PT
    if (
        _currentGame.relatedTournament.tournamentType == "RR"
        or _currentGame.relatedTournament.tournamentType == "TL"
        or _currentGame.relatedTournament.tournamentType == "PT"
    ):
        # get winners based on points
        pointsList = json.loads(_currentGame.relatedTournament.tournamentPointsData)
        pointsList = sorted(pointsList, key=lambda x: -x[1])
        # Now points list has strongest players at the top
        currentTopPoints = 0
        firsts = []
        seconds = []
        thirds = []
        ranking = 1
        for entry in pointsList:
            if currentTopPoints > entry[1]:
                if ranking == 3:
                    ranking = 4
                if ranking == 2:
                    ranking = 3
                if ranking == 1:
                    ranking = 2
            currentTopPoints = entry[1]
            if ranking == 1:
                firsts.append(entry[0])
            if ranking == 2:
                seconds.append(entry[0])
            if ranking == 3:
                thirds.append(entry[0])

        winnersData.append(firsts)
        winnersData.append(seconds)
        winnersData.append(thirds)
        _currentGame.relatedTournament.winnersData = json.dumps(winnersData)
        _currentGame.relatedTournament.save()

    # If not RR / TL / PT
    elif _currentGame.relatedTournament.tournamentType == "KO":
        # First place is winner, 2nd place everyone else in game
        firsts = []
        seconds = []
        finalPlayersList = _currentGame.getAllPlayersOrderedySeat(True)
        # add BYES from next round first
        nextRoundPlayersList = list(
            _currentGame.relatedTournament.nextRoundPlayers.all().order_by("?").values_list("username", flat=True)
        )

        for player in nextRoundPlayersList:
            firsts.append(player)

        for player in finalPlayersList:
            if player in _winnerArray and player not in firsts:
                firsts.append(player)
            elif player not in firsts:
                seconds.append(player)

        winnersData.append(firsts)
        winnersData.append(seconds)
        _currentGame.relatedTournament.winnersData = json.dumps(winnersData)
        _currentGame.relatedTournament.save()

    # now update the players profiles with th new wins
    for i in range(len(winnersData)):
        for player in winnersData[i]:
            playerObject = User.objects.get(username=player)
            relatedProfile = Profile.objects.get(user=playerObject)
            FCMtournamentTrophies = (
                json.loads(relatedProfile.FCMtournamentTrophies) if relatedProfile.FCMtournamentTrophies else []
            )
            while len(FCMtournamentTrophies) < 7:
                FCMtournamentTrophies.append([0, 0, 0])
            baseIndex = 0
            if _game == "FCM":
                baseIndex = 1
            if _game == "HC":
                baseIndex = 2
            if _game == "Bus":
                baseIndex = 3
            if _game == "TGZ":
                baseIndex = 4
            if _game == "AQY":
                baseIndex = 5
            if _game == "IND":
                baseIndex = 6
            FCMtournamentTrophies[baseIndex][i] += 1
            relatedProfile.FCMtournamentTrophies = json.dumps(FCMtournamentTrophies)
            relatedProfile.save()
            if i == 0:
                SN_M_T_sendTournamentWinNotification(
                    _currentGame.relatedTournament, request, player, _game, "fullTournament"
                )


def SF_TGZadvancedOptions(request):
    _startingOptions = []
    gods = [90]
    customVR = [91]
    specVR = [92, 6, 1, 1, 3, 2]
    specVR_ORIGINAL = [92, 6, 1, 1, 3, 2]
    useCustomVr = False
    useSpecVR = False

    gods_mapping = {
        "shadipinyi": (4, "VRgod0"),
        "elegua": (4, "VRgod1"),
        "dziva": (2, "VRgod2"),
        "eshu": (4, "VRgod3"),
        "gu": (4, "VRgod4"),
        "obatala": (7, "VRgod5"),
        "atete": (5, "VRgod6"),
        "tsuiGoab": (3, "VRgod7"),
        "anansi": (5, "VRgod8"),
        "qamata": (2, "VRgod9"),
        "engai": (5, "VRgod10"),
        "xango": (-2, "VRgod11"),
        # Schism
        "agwu_nsi": (5, "VRgod12"),
        "aja": (3, "VRgod13"),
        "aje_shaluga": (4, "VRgod14"),
        "alajire": (2, "VRgod15"),
        "anyanwu": (6, "VRgod16"),
        "ekwensu": (0, "VRgod17"),
        "ogun": (3, "VRgod18"),
        "ovia": (4, "VRgod19"),
        "oya": (6, "VRgod20"),
        "simbi": (2, "VRgod21"),
        "tiurakh": (7, "VRgod22"),
        "yemoja": (4, "VRgod23"),
    }

    specVR_mapping = {"VRherd": 1, "VRnomads": 2, "VRrain": 3, "VRshaman": 4, "VRbuilder": 5}

    for god_key, (value, vr_key) in gods_mapping.items():
        if god_key in request.POST:
            gods.append(int(request.POST[god_key]))
            customVR.append(int(request.POST[vr_key]))
            if int(request.POST[vr_key]) != value:
                useCustomVr = True

    for spec_key, value in specVR_mapping.items():
        if spec_key in request.POST:
            specVR[specVR_mapping[spec_key]] = int(request.POST[spec_key])
            if int(request.POST[spec_key]) != specVR_ORIGINAL[specVR_mapping[spec_key]]:
                useSpecVR = True

    _startingOptions.append(gods)
    if useCustomVr:
        _startingOptions.append(customVR)
    if useSpecVR:
        _startingOptions.append(specVR)

    return _startingOptions


# def SF_TGZadvancedOptions(request):
#    _startingOptions = []
#    gods = [90]
#    customVR = [91]
#    specVR = [92, 6, 1, 1, 3, 2]
#    useCustomVr = False
#    useSpecVR = False
#    if "shadipinyi" in request.POST:
#        gods.append(int(request.POST["shadipinyi"]))
#        customVR.append(int(request.POST["VRgod0"]))
#        if int(request.POST["VRgod0"]) != 4:
#            useCustomVr = True
#    if "elegua" in request.POST:
#        gods.append(int(request.POST["elegua"]))
#        customVR.append(int(request.POST["VRgod1"]))
#        if int(request.POST["VRgod1"]) != 4:
#            useCustomVr = True
#    if "dziva" in request.POST:
#        gods.append(int(request.POST["dziva"]))
#        customVR.append(int(request.POST["VRgod2"]))
#        if int(request.POST["VRgod2"]) != 2:
#            useCustomVr = True
#    if "eshu" in request.POST:
#        gods.append(int(request.POST["eshu"]))
#        customVR.append(int(request.POST["VRgod3"]))
#        if int(request.POST["VRgod3"]) != 4:
#            useCustomVr = True
#    if "gu" in request.POST:
#        gods.append(int(request.POST["gu"]))
#        customVR.append(int(request.POST["VRgod4"]))
#        if int(request.POST["VRgod4"]) != 4:
#            useCustomVr = True
#    if "obatala" in request.POST:
#        gods.append(int(request.POST["obatala"]))
#        customVR.append(int(request.POST["VRgod5"]))
#        if int(request.POST["VRgod5"]) != 7:
#            useCustomVr = True
#    if "atete" in request.POST:
#        gods.append(int(request.POST["atete"]))
#        customVR.append(int(request.POST["VRgod6"]))
#        if int(request.POST["VRgod6"]) != 5:
#            useCustomVr = True
#    if "tsuiGoab" in request.POST:
#        gods.append(int(request.POST["tsuiGoab"]))
#        customVR.append(int(request.POST["VRgod7"]))
#        if int(request.POST["VRgod7"]) != 3:
#            useCustomVr = True
#    if "anansi" in request.POST:
#        gods.append(int(request.POST["anansi"]))
#        customVR.append(int(request.POST["VRgod8"]))
#        if int(request.POST["VRgod8"]) != 5:
#            useCustomVr = True
#    if "qamata" in request.POST:
#        gods.append(int(request.POST["qamata"]))
#        customVR.append(int(request.POST["VRgod9"]))
#        if int(request.POST["VRgod9"]) != 2:
#            useCustomVr = True
#    if "engai" in request.POST:
#        gods.append(int(request.POST["engai"]))
#        customVR.append(int(request.POST["VRgod10"]))
#        if int(request.POST["VRgod10"]) != 5:
#            useCustomVr = True
#    if "xango" in request.POST:
#        gods.append(int(request.POST["xango"]))
#        customVR.append(int(request.POST["VRgod11"]))
#        if int(request.POST["VRgod11"]) != -2:
#            useCustomVr = True
#
#    if "VRherd" in request.POST:
#        specVR[1] = int(request.POST["VRherd"])
#        if int(request.POST["VRherd"]) != 6:
#            useSpecVR = True
#    if "VRnomads" in request.POST:
#        specVR[2] = int(request.POST["VRnomads"])
#        if int(request.POST["VRnomads"]) != 1:
#            useSpecVR = True
#    if "VRrain" in request.POST:
#        specVR[3] = int(request.POST["VRrain"])
#        if int(request.POST["VRrain"]) != 1:
#            useSpecVR = True
#    if "VRshaman" in request.POST:
#        specVR[4] = int(request.POST["VRshaman"])
#        if int(request.POST["VRshaman"]) != 3:
#            useSpecVR = True
#    if "VRbuilder" in request.POST:
#        specVR[5] = int(request.POST["VRbuilder"])
#        if int(request.POST["VRbuilder"]) != 2:
#            useSpecVR = True
#
#    _startingOptions.append(gods)
#    if useCustomVr:
#        _startingOptions.append(customVR)
#    if useSpecVR:
#        _startingOptions.append(specVR)
#
#    return _startingOptions


######################################
#
#   MAIN/MINI TOURNAMENTS COMMON FUNCTIONS
#
######################################
def SF_startAnyTournament(request, mainORmini, tournamentObj):
    if mainORmini == "main":
        tournamentObj.invitedPlayers.clear()

    gameCode = tournamentObj.gameCode

    ######### COMMON TO ALL TOURNYS ##########
    tournamentObj.tournamentStatus = "IP"
    allPlayersList = list(tournamentObj.startingPlayers.all().order_by("?").values_list("username", flat=True))

    # Add everyone to nextRoundPlayers
    for player in allPlayersList:
        tournamentObj.nextRoundPlayers.add(User.objects.get(username=player))

    tournamentObj.tournamentProgressionData = json.dumps([])
    tournamentObj.tournamentPointsData = json.dumps([])

    if tournamentObj.tournamentType == "TL":
        allPlayersList = list(tournamentObj.startingPlayers.all().order_by("?").values_list("username", flat=True))
        livesList = []
        for playerName in allPlayersList:
            livesList.append([playerName, 2])
        tournamentObj.tournamentSideData = json.dumps(livesList)

    if (
        tournamentObj.tournamentType == "RR"
        or tournamentObj.tournamentType == "TL"
        or tournamentObj.tournamentType == "PT"
        or tournamentObj.tournamentType == "MG"
    ):
        allPlayersList = list(tournamentObj.startingPlayers.all().order_by("?").values_list("username", flat=True))
        pointsList = []
        for playerName in allPlayersList:
            if tournamentObj.tournamentType == "MG":
                # Name, played, wins (then TieBreaker to come)
                pointsList.append([playerName, 0, 0])
            else:
                pointsList.append([playerName, 0])

        if tournamentObj.tournamentType == "MG":
            # dump inside a round 1 array
            tournamentObj.tournamentPointsData = json.dumps([pointsList])
        else:
            tournamentObj.tournamentPointsData = json.dumps(pointsList)

    start_next_any_tournament_round(request, mainORmini, tournamentObj, None, [], [])

    tournamentObj.save()
    return

# Because the next round players for MG tournaments cannot always be determined
# until all TB's and results are in, we cannot add players as we go.
# Therefore, next round players need to be added here JUST BEFORE starting the next round
def setNextRoundMultiGamePlayers(tournamentObj):
    allPlayersList = list(tournamentObj.nextRoundPlayers.all().order_by("?").values_list("username", flat=True))
    # First round has ALREADY added everyone. Just return
    if len(allPlayersList) > 0:
        return
    # So now next round is empty. So for Second round add top 14. 3rd round add top 2 from each group
    TPDA = json.loads(tournamentObj.tournamentProgressionData)
    # If we have had 3 rounds, then the tournament is over
    if len(TPDA) == 3:
        return
    pointsList = json.loads(tournamentObj.tournamentPointsData)
    if len(TPDA) == 1:
        # Get 14 players for round 2
        playersData = []
        previousRound = pointsList[-1]
        for row in previousRound:
            name, played, wins = row[0], row[1], row[2]
            tb = sorted(row[3:], reverse=True)  # sort existing TBs descending
            tb += [[-float("inf"), -1]] * (4 - len(tb))  # pad if needed (optional)
            normalized_row = [name, played, wins] + tb[:4]  # keep only top 4
            playersData.append(normalized_row)
        playersData.sort(key=lambda r: (-r[2], -r[3][0], -r[4][0], -r[5][0], -r[6][0], r[0]))

        playersData = playersData[:14]
        for i in range(14):
            tournamentObj.nextRoundPlayers.add(User.objects.get(username=playersData[i][0]))

        # Set up the points data for Round 2
        tournamentPointsData = json.loads(tournamentObj.tournamentPointsData)
        
        A = playersData[0::2]   # 0,2,4,6,8,10,12
        B = playersData[1::2]   # 1,3,5,7,9,11,13

        pointsList = []
        for row in A:
            # Name, played, wins (then TB to come)
            pointsList.append([row[0], 0, 0])
        for row in B:
            # Name, played, wins (then TB to come)
            pointsList.append([row[0], 0, 0])

        # dump inside a round 12array
        tournamentPointsData.append(pointsList)
        tournamentObj.tournamentPointsData = json.dumps(tournamentPointsData)

        tournamentObj.save()

    elif len(TPDA) == 2:
        # Get the 4 finalists
        previousRound = pointsList[-1]
        groupA = previousRound[:7]
        groupB = previousRound[7:]
        groupAclean = getCleanedAndSortedRoundData(groupA)
        groupBclean = getCleanedAndSortedRoundData(groupB)
        finalists = [groupAclean[0][0], groupBclean[0][0], groupAclean[1][0], groupBclean[1][0]]
        for player in finalists:
            tournamentObj.nextRoundPlayers.add(User.objects.get(username=player))

        # Set up the points data for Round 3
        tournamentPointsData = json.loads(tournamentObj.tournamentPointsData)

        pointsList = []
        for player in finalists:
            # Name, played, wins (then TB to come)
            pointsList.append([player, 0, 0])

        # dump inside a round 12array
        tournamentPointsData.append(pointsList)
        tournamentObj.tournamentPointsData = json.dumps(tournamentPointsData)

        tournamentObj.save()

def start_next_any_tournament_round(request, mainORmini, tournamentObj, _currentGame, _winnerArray, _finalPositionNamesAndScore):
    from FCM.common import create_fcm_game
    from TGZ.common import create_tgz_game
    from AQY.common import create_aqy_game

    # MG tournaments don't add next round players dynamically
    # End T check checks for not enough next round players
    # So need to add players here first to prevent tournament stopping early
    if tournamentObj.tournamentType == "MG":
        setNextRoundMultiGamePlayers(tournamentObj)
        
    if SF_checkForAnyTournamentEnd(tournamentObj, mainORmini) == True:
        SF_endAnyTournament(request, mainORmini, tournamentObj, _currentGame, _winnerArray, _finalPositionNamesAndScore)
        tournamentObj.save()
        return

    ret = SF_createNextRoundGamesSetup(tournamentObj, mainORmini)
    
    # Clear nextRoundPlayers for the end of the next round
    # -- gamePlayers have now been returned in ret
    tournamentObj.nextRoundPlayers.clear()

    # Scaffold the round data. Add bye players, then add each game entry
    roundData = []

    # First, handle byes
    byePlayers = ret["byePlayers"]
    if len(byePlayers) > 0:
        roundData.append(["BYEPLAYERS"] + byePlayers)
        for player in byePlayers:
            # Add bye players to next round
            tournamentObj.nextRoundPlayers.add(User.objects.get(username=player))
            # Update points for byes
            if tournamentObj.tournamentType in ["RR", "TL", "PT"]:
                pointsList = json.loads(tournamentObj.tournamentPointsData)
                byePoints = 1
                if tournamentObj.tournamentType == "PT":
                    byePoints = SR_getPointsForPosition(99, tournamentObj.maxGamePlayers)
                for byePlayer in byePlayers:
                    for playerData in pointsList:
                        if playerData[0] == byePlayer:
                            playerData[1] += byePoints
                            break
                tournamentObj.tournamentPointsData = json.dumps(pointsList)

    # Start the games
    gamesPlayers = ret["gamesPlayers"]
    ### MOVE TO RET ????
    roundNumberString = ret["roundNumberString"]
    tournamentGameName = f"[{tournamentObj.tournamentName}] {roundNumberString}"
    for i, currentPlayers in enumerate(gamesPlayers):
        if tournamentObj.tournamentType == "MG":
            # NB the roundNumberString is whateber comes after [tourneyName] (and a space)
            # So eg - R2-A1/B1/R1-1
            if len(gamesPlayers) == 1:
                tournamentGameName = f"[{tournamentObj.tournamentName}] Final"
            elif len(gamesPlayers) == 14:
                gameNames = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "B1", "B2", "B3", "B4", "B5", "B6", "B7"]
                tournamentGameName = f"[{tournamentObj.tournamentName}] R2 - {gameNames[i]}"
            else:
                tournamentGameName = f"[{tournamentObj.tournamentName}] R1 - {i+1}"
        ## END MOVE TO RET???
        
        if tournamentObj.gameCode == "FCM":
            newGameID = create_fcm_game(request, mainORmini, tournamentObj, tournamentGameName, currentPlayers)
        elif tournamentObj.gameCode == "TGZ":
            newGameID = create_tgz_game(request, mainORmini, tournamentObj, tournamentGameName, currentPlayers)
        elif tournamentObj.gameCode == "AQY":
            newGameID = create_aqy_game(request, mainORmini, tournamentObj, tournamentGameName, currentPlayers)
        else:
            # LEGACY CODE FOR SEPERARTE TOURNAMENT MODELS
            newGameID = tournamentObj.createTournamentGame(request, roundNumberString, currentPlayers)
        roundData.append([currentPlayers, newGameID, [], tournamentGameName])

    # Save round data
    if roundData:
        tournamentProgressionDataArray = json.loads(tournamentObj.tournamentProgressionData)
        tournamentProgressionDataArray.append(roundData)
        tournamentObj.tournamentProgressionData = json.dumps(tournamentProgressionDataArray)

    tournamentObj.save()

# Pass in a tournament. Returns an object of { gamesPlayers: [[p1, p2...], [p5,p6...]], byePlayers: [p3, p4] }
def SF_createNextRoundGamesSetup(tournamentObj, mainORmini):
    ret = {}
    byePlayers = []
    gamesPlayers = []
    
    tournamentType = tournamentObj.tournamentType

    # Load tournament data
    TPDA = json.loads(tournamentObj.tournamentProgressionData)
    roundNumberString = gettext("Round") + f" {len(TPDA) + 1}"

    # Get players sorted by points (weakest first) for RR, PT, or TL
    # This first call ist just for KO - it gets overwritten later for RR / TL / PT
    allPlayersList = list(tournamentObj.nextRoundPlayers.all().order_by("?").values_list("username", flat=True))

    if tournamentType in ["RR", "PT", "TL"] and len(TPDA) < tournamentObj.roundsBeforeKnockout:
        pointsList = json.loads(tournamentObj.tournamentPointsData)
        # Being lowest points to front, in case a bye is needed
        pointsList.sort(key=lambda x: x[1])
        allPlayersList = [row[0] for row in pointsList if row[0] in allPlayersList]
        # Remove players with 0 lives in TwoLives (TL) tournaments
        if tournamentType == "TL":
            livesList = json.loads(tournamentObj.tournamentSideData)
            # Being lowest points to front, in case a bye is needed
            livesList.sort(key=lambda x: x[1])
            allPlayersList = [p for p in allPlayersList if any(p == row[0] and row[1] > 0 for row in livesList)]

    # Switch to knockout mode for RR after roundsBeforeKnockout
    if tournamentType == "RR" and len(TPDA) >= tournamentObj.roundsBeforeKnockout:
        pointsList = json.loads(tournamentObj.tournamentPointsData)
        pointsList.sort(key=lambda x: x[1], reverse=True)  # Sort by points (descending)
        maxPoints = pointsList[0][1]
        allPlayersList = [row[0] for row in pointsList if row[1] >= maxPoints]
        #if len(allPlayersList) < tournament.maxGamePlayers:
        #    ret["endTournament"] = True
        #    return ret
        roundNumberString += " (KO)"

    # Set final round label if exactly maxGamePlayers remain
    if len(allPlayersList) == tournamentObj.maxGamePlayers:
        roundNumberString = gettext("Final Round") + (
            " (KO)" if tournamentType == "RR" and len(TPDA) >= tournamentObj.roundsBeforeKnockout else ""
        )

    # HANDLE BYES HERE = MAX 1 for MiniT, otherwise leftover players for MainT
    maxRemainder = tournamentObj.maxGamePlayers -1
    if mainORmini == MINI_T_FLAG:
        maxRemainder = 1
    
    # Check if there is leftover players after at least some players have been put in a game
    if len(allPlayersList) % tournamentObj.maxGamePlayers <= maxRemainder and len(allPlayersList) > tournamentObj.maxGamePlayers:
        while maxRemainder > 0:
            # Create dictionary to count byes for each player
            byeCountDict = {}

            # Count byes from byedPlayerList
            byedPlayerList = [player for round in TPDA for row in round if row[0] == "BYEPLAYERS" for player in row[1:]]
            for player in byedPlayerList:
                byeCountDict[player] = byeCountDict.get(player, 0) + 1

            # Add players from allPlayersList who haven't had byes
            for player in allPlayersList:
                if player not in byeCountDict:
                    byeCountDict[player] = 0

            # Find the minimum number of byes
            minByes = min(byeCountDict.values())

            # Select the first player from allPlayersList with minimum byes
            selectedByePlayer = next(player for player in allPlayersList if byeCountDict[player] == minByes)
            byePlayers.append(selectedByePlayer)

            # Remove the selected player from allPlayersList
            allPlayersList.remove(selectedByePlayer)
            
            # Decreade number of required byes
            maxRemainder -= 1

    # MG use MG creation
    if tournamentType == "MG":
        # First round MUST have more than 14 people
        if len(allPlayersList) >= 15:
            gamesPlayers = multiGamePlayers4p(allPlayersList)
        # Second round is 2 groups of 7 players, total 14
        elif len(allPlayersList) == 14:
            allPlayersList  = []
            # In this case, pull out the round 2 points data, and get players in order, group A then group B
            tournamentPointsData = json.loads(tournamentObj.tournamentPointsData)
            round2playersData = tournamentPointsData[-1]
            allPlayersList = [row[0] for row in round2playersData]
            
            gamesPlayers = multiGamePlayersRound2(allPlayersList)
        # Final is the top 2 from each group
        elif len(allPlayersList) == 4:
            gamesPlayers = [allPlayersList]
            
    # OTHERWISE USE STANDARD MATCHMAKING
    else:
        # Build dictionary of previous matchup counts (pairwise)
        matchupCounts = defaultdict(int)
        for round in TPDA:
            for game in round:
                if game[0] != "BYEPLAYERS":
                    players = game[0]
                    # Increment count for each pair in the game
                    for pair in itertools.combinations(players, 2):
                        matchupCounts[frozenset(pair)] += 1

        # Reverse allPlayersList to get best players to front, then create games starting from front
        allPlayersList.reverse()

        # Create games, prioritizing new matchups and minimizing max pair repeats
        while len(allPlayersList) >= tournamentObj.maxGamePlayers:
            currentPlayers = [allPlayersList.pop(0)]
            candidates = allPlayersList.copy()

            # Try to find players, preferring those with least previous matchups with current group
            while len(currentPlayers) < tournamentObj.maxGamePlayers and candidates:
                # Calculate max matchup count for each candidate with current group
                candidate_scores = {}
                for candidate in candidates:
                    # Find the maximum matchup count for any pair involving this candidate
                    max_count = max(matchupCounts[frozenset({player, candidate})] for player in currentPlayers)
                    candidate_scores[candidate] = max_count

                # Prefer candidates with max_count == 0 (no previous matchups with group)
                min_score = min(candidate_scores.values())
                min_score_candidates = [c for c, s in candidate_scores.items() if s == min_score]

                # If there are candidates with no previous matchups, prioritize them
                if min_score == 0:
                    min_score_candidates = [
                        c
                        for c in min_score_candidates
                        if all(matchupCounts[frozenset({c, p})] == 0 for p in currentPlayers)
                    ]

                # Select the first candidate in the original order (to respect points)
                selected_candidate = next(c for c in candidates if c in min_score_candidates)

                # Add the selected candidate
                currentPlayers.append(selected_candidate)
                allPlayersList.remove(selected_candidate)
                candidates.remove(selected_candidate)

            # Fill game if needed (edge case, though unlikely now)
            while len(currentPlayers) < tournamentObj.maxGamePlayers and allPlayersList:
                currentPlayers.append(allPlayersList.pop(0))

            gamesPlayers.append(currentPlayers)

        # Handle remaining players (>2 for MiniT -- Byes have been removed first)
        # MT just make games if possible
        if tournamentType == MINI_T_FLAG and len(allPlayersList) >= 2:
            currentPlayers = allPlayersList[:]
            gamesPlayers.append(currentPlayers)
            allPlayersList.clear()

    ret["roundNumberString"] = roundNumberString
    ret["byePlayers"] = byePlayers
    ret["gamesPlayers"] = gamesPlayers

    return ret


def SF_checkForAnyTournamentEnd(tournamentObj, mainORmini):
    # For any tournament, check if there's a winner or not enough players for a FULL game
    if tournamentObj.nextRoundPlayers.count() < tournamentObj.maxGamePlayers:
        return True

    return False

# _winnerArray is an array of [winner_username, winner_username, ...]
# _finalPositionNamesAndScore is an array [ [username], [username, username,... TB_VALUE], [username, username,..., TB_VALUE], [...etc] ]
# NB THE FIRST ENTRY IS AN ARRAY OF (MULTIPLE) WINNER(S)
def SF_M_ProcessAnyTournamentEndGame(request, mainORmini, tournamanetObj, _currentGame, _winnerArray, _finalPositionNamesAndScore):
    
    ### Add winner(s) into results
    tournamentProgressionDataArray = json.loads(tournamanetObj.tournamentProgressionData)
    # Find correct index in latest round using game id
    match = next((row for row in tournamentProgressionDataArray[-1] if row[1] == _currentGame.id), None)
    if match is not None:
        match[2].extend(_winnerArray)  # this modifies the original data!
    else:
        print("gameID not found")
    tournamanetObj.tournamentProgressionData = json.dumps(tournamentProgressionDataArray)

    # This is an array, with all tied player usernames at each subarray
    finalPositionNames = []
    for i, finalPositionNameAndScore in enumerate(_finalPositionNamesAndScore):
        finalPositionNames.append([])
        if i == 0:
            # Add every name in the winners sub-array
            for name in finalPositionNameAndScore:
                finalPositionNames[i].append(name)
        else:
            # Add every entry except the TB in other sub-arrays
            for name in finalPositionNameAndScore[:-1]:
                finalPositionNames[i].append(name)

    ############################## Add players to next round players
    # KO JUST ADD THE WINNER
    if tournamanetObj.tournamentType == "KO":
        for playerUsername in _winnerArray:
            tournamanetObj.nextRoundPlayers.add(User.objects.get(username=playerUsername))
    # RR/PT Add all players not kickied
    elif tournamanetObj.tournamentType == "RR" or tournamanetObj.tournamentType == "PT":
        # Just add winner for KO part
        if len(tournamentProgressionDataArray) >= tournamanetObj.roundsBeforeKnockout:
            for playerUsername in _winnerArray:
                if playerUsername not in NAMES_NOT_TO_ADD_TO_NEXT_TOURNAMENT_ROUND:
                    tournamanetObj.nextRoundPlayers.add(User.objects.get(username=playerUsername))
        # Else add everyone
        else:
            for playerObj in _currentGame.allPlayers.all():
                if playerObj not in _currentGame.kickedPlayers.all() and playerObj.username not in NAMES_NOT_TO_ADD_TO_NEXT_TOURNAMENT_ROUND:
                    tournamanetObj.nextRoundPlayers.add(playerObj)
    # TL Process lives, remove kicks, add players with lives
    elif tournamanetObj.tournamentType == "TL":
        # Process the lives list - DEDUCT lives from the losers
        livesList = json.loads(tournamanetObj.tournamentSideData)
        for playerObj in _currentGame.allPlayers.all():
            isWinner = playerObj.username in _winnerArray
            if not isWinner and playerObj.username not in NAMES_NOT_TO_ADD_TO_NEXT_TOURNAMENT_ROUND:
                # Step BACKWARDS through entire lives list
                for i in range(len(livesList) - 1, -1, -1):
                    player, lives = livesList[i]
                    if player == playerObj.username:
                        lives -= 1
                        if lives <= 0:
                            livesList.pop(i)
                        else:
                            livesList[i][1] = lives
        # Go BACKWARDS through livesList and delete all kicked players
        for playerObj in _currentGame.kickedPlayers.all():
            for i in range(len(livesList) - 1, -1, -1):
                player = livesList[0]
                if player == playerObj.username:
                    livesList.pop(i)

        # Now add players to next round with 1/2 lives and not kicked
        for playerObj in _currentGame.allPlayers.all():
            if any(playerObj.username == subarr[0] and subarr[1] > 0 for subarr in livesList):
                tournamanetObj.nextRoundPlayers.add(playerObj)

        tournamanetObj.tournamentSideData = json.dumps(livesList)

    ########################## Update the points
    # Update the winners count for TL and RR
    if tournamanetObj.tournamentType == "TL" or tournamanetObj.tournamentType == "RR":
        pointsList = json.loads(tournamanetObj.tournamentPointsData)
        for i in range(len(pointsList)):
            if pointsList[i][0] in _winnerArray:
                pointsList[i][1] += 1
        tournamanetObj.tournamentPointsData = json.dumps(pointsList)
    # Update the points for PT
    elif tournamanetObj.tournamentType == "PT":
        pointsList = json.loads(tournamanetObj.tournamentPointsData)

        for i, subArr in enumerate(finalPositionNames):
            for player_name in subArr:
                # Find the index of the player in pointsList
                points_list_idx = next((idx for idx, x in enumerate(pointsList) if x[0] == player_name), -1)
                if points_list_idx != -1:  # Ensure player was found
                    pointsList[points_list_idx][1] += SR_getPointsForPosition(i, tournamanetObj.maxGamePlayers)
        tournamanetObj.tournamentPointsData = json.dumps(pointsList)

    # Update the tiebreakers for TGZ MG
    if tournamanetObj.tournamentType == "MG":    
        pointsList = json.loads(tournamanetObj.tournamentPointsData)
        currentGameID = _currentGame.id

        for i, row in enumerate(_finalPositionNamesAndScore):
            tie_breaker_value = 0
            # Determine which entries in this row are player names
            if i == 0:
                # First row: Everyone is a winner, no tie-breaker at the end
                players_in_row = row
            else:
                # Subsequent rows: All entries except the last one are names
                players_in_row = row[:-1]
                tie_breaker_value = row[-1] if len(row) > 1 else 0

            for player_name in players_in_row:
                # Find the player's index in pointsList
                points_list_idx = next((idx for idx, x in enumerate(pointsList[-1]) if x[0] == player_name), -1)
                
                if points_list_idx != -1:
                    # 1. Increment games played for everyone
                    pointsList[-1][points_list_idx][1] += 1
                    
                    if i == 0:
                        # 2. Increment wins for first-row players
                        pointsList[-1][points_list_idx][2] += 1
                    else:
                        # 3. Add tie-breaker and Game ID for everyone else
                        pointsList[-1][points_list_idx].append([tie_breaker_value, currentGameID])

        # Save once after all loops are finished
        tournamanetObj.tournamentPointsData = json.dumps(pointsList)

    tournamanetObj.save()

    # Check all games from previous round are finished
    tournamentRoundFinished = False

    # Check all games from previous round are finished
    finishedRows = 0
    for row in tournamentProgressionDataArray[-1]:
        if row[0] == "BYEPLAYERS":
            finishedRows += 1
        else:
            # Otherwise, check the row has a winner
            if len(row[2]) >= 1:
                finishedRows += 1
    if finishedRows == len(tournamentProgressionDataArray[-1]):
        tournamentRoundFinished = True

    # All games done; either end tourny or start new round
    if tournamentRoundFinished:
        start_next_any_tournament_round(request, mainORmini, tournamanetObj, _currentGame, _winnerArray, _finalPositionNamesAndScore)

    tournamanetObj.save()
    
# This could be tidied up by removing _finalPositionNamesAndScore input and getting it from tournamentObj directly
def SF_endAnyTournament(request, mainORmini, tournamentObj, _currentGame, _winnerArray, _finalPositionNamesAndScore):
    tournamentObj.nextRoundPlayers.clear()
    gameCode = tournamentObj.gameCode
    winnersData = []

    # End the tournament
    tournamentObj.tournamentStatus = "FN"
    # RR / TL / PT
    if (
        tournamentObj.tournamentType == "RR"
        or tournamentObj.tournamentType == "TL"
        or tournamentObj.tournamentType == "PT"
    ):
        # get winners based on points
        pointsList = json.loads(tournamentObj.tournamentPointsData)
        pointsList = sorted(pointsList, key=lambda x: -x[1])
        # Now points list has strongest players at the top
        currentTopPoints = 0
        firsts = []
        seconds = []
        thirds = []
        ranking = 1
        for entry in pointsList:
            if currentTopPoints > entry[1]:
                if ranking == 3:
                    ranking = 4
                if ranking == 2:
                    ranking = 3
                if ranking == 1:
                    ranking = 2
            currentTopPoints = entry[1]
            if ranking == 1:
                firsts.append(entry[0])
            if ranking == 2:
                seconds.append(entry[0])
            if ranking == 3:
                thirds.append(entry[0])

        winnersData.append(firsts)
        winnersData.append(seconds)
        winnersData.append(thirds)
        tournamentObj.winnersData = json.dumps(winnersData)
        tournamentObj.save()
    # MG
    elif (
        tournamentObj.tournamentType == "MG"
    ):
        # This has a single final game. So use _finalPositionNamesAndScore        
        # firsts gets the whole sub-array
        firsts = _finalPositionNamesAndScore[0]
        # seconds and thirds get the sub-array except for the last entry (the TB score)
        seconds = _finalPositionNamesAndScore[1][:-1]
        thirds = _finalPositionNamesAndScore[2][:-1]

        winnersData.append(firsts)
        winnersData.append(seconds)
        winnersData.append(thirds)
        tournamentObj.winnersData = json.dumps(winnersData)
        tournamentObj.save()

    # If not RR / TL / PT / MG
    elif tournamentObj.tournamentType == "KO":
        # First place is winner, 2nd place everyone else in game
        firsts = []
        seconds = []
        finalPlayersList = _currentGame.getAllPlayersOrderedySeat(True)
        # add BYES from next round first
        nextRoundPlayersList = list(
            tournamentObj.nextRoundPlayers.all().order_by("?").values_list("username", flat=True)
        )

        for player in nextRoundPlayersList:
            firsts.append(player)

        for player in finalPlayersList:
            if player in _winnerArray and player not in firsts:
                firsts.append(player)
            elif player not in firsts:
                seconds.append(player)

        winnersData.append(firsts)
        winnersData.append(seconds)
        tournamentObj.winnersData = json.dumps(winnersData)
        tournamentObj.save()

    # now update the players profiles with th new wins
    for i in range(len(winnersData)):
        for player in winnersData[i]:
            # Award trophies only for main tournaments
            if mainORmini == MAIN_T_FLAG:
                playerObject = User.objects.get(username=player)
                relatedProfile = Profile.objects.get(user=playerObject)
                FCMtournamentTrophies = json.loads(relatedProfile.FCMtournamentTrophies) if relatedProfile.FCMtournamentTrophies else []
                while len(FCMtournamentTrophies) < 7:
                    FCMtournamentTrophies.append([0,0,0])
                baseIndex = 0
                if gameCode == "FCM":
                    baseIndex = 1
                if gameCode == "HC":
                    baseIndex = 2
                if gameCode == "Bus":
                    baseIndex = 3
                if gameCode == "TGZ":
                    baseIndex = 4
                if gameCode == "AQY":
                    baseIndex = 5
                if gameCode == "IND":
                    baseIndex = 6
                FCMtournamentTrophies[baseIndex][i] += 1
                relatedProfile.FCMtournamentTrophies = json.dumps(FCMtournamentTrophies)
                relatedProfile.save()
            # In all cases, notify the winner(s)
            if i == 0:
                SN_M_T_sendTournamentWinNotification(tournamentObj, request, player, gameCode, mainORmini)

# End common main/mini functions