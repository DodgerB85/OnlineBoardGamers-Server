from random import randint

import base64
import gzip
import time
import json
import logging

# from django.template.loader import render_to_string
# from django.contrib.sites.shortcuts import get_current_site
from unittest.mock import MagicMock
from django.contrib.sites.models import Site

from django.db.models import Q

from django.db import models
from django.conf import settings

# from django.db.models.signals import post_save
# from django.dispatch import receiver

from django.utils.translation import gettext, gettext_lazy

# from django.utils import translation
import random

# from django.contrib.auth import get_user_model
# User = get_user_model()

#from .common import create_fcm_game

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessTournamentEndGame,
    SF_M_ProcessMiniTournamentEndGame
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getFCMstartingOptionsHTML,
    SR_GAME_STATUS_CHOICES,
    SR_getTournamentWinnerHTML,
    SR_getTournamentRoundsHTML,
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    SN_M_sendGameStartNotification,
    #SN_M_T_sendTournamentGameStartNotification,
)

from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage, SN_sendNextTurnNotification

from Lobby.models import User, Mini_Tournaments  # , Profile

logger = logging.getLogger(__name__)

# from Lobby import createTournamentGame
# import Lobby

# from datetime import datetime
# import tzlocal
# from Lobby.models import User

# ANY CHANGES YOU HAVE TO RUN DOUBLE MIGRATIONS
# python manage.py makemigrations
# python manage.py migrate
# Any NEW models, consider adding to admin.py - need to IMPORT and REGISTER

USE_NEW_CODE = False


class FCM_Tournament(models.Model):
    # custom_primary_key = models.CharField(max_length=6, editable=False, unique=True)
    tournamentName = models.CharField(max_length=120)
    # tournamentStatus = models.CharField(max_length=30)
    tournamentStatus = models.CharField(
        max_length=2,
        choices=SR_TOURNAMENT_STATUS_CHOICES,
        default="OP",
    )

    tournamentType = models.CharField(
        max_length=2,
        choices=SR_TOURNAMENT_TYPE_CHOICES,
        default="RR",
    )

    startingOptions = models.CharField(max_length=80, blank=True)
    # startingMap = models.CharField(max_length=150, blank=True)
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="currentRoundPlayersRelName", blank=True
    )

    maxTournamentPlayers = models.PositiveSmallIntegerField(blank=False)
    maxGamePlayers = models.PositiveSmallIntegerField(blank=False)
    roundsBeforeKnockout = models.PositiveSmallIntegerField(blank=False, default=4)

    winnersData = models.TextField(blank=True)

    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)
    tournamentProgressionData = models.TextField(blank=True)
    tournamentSideData = models.TextField(blank=True)
    tournamentPointsData = models.TextField(blank=True)
    
    def __str__(self):
        # Use currentPlayers if available, otherwise fall back to gameName and status
        return f"{getattr(self, 'id')}: {self.tournamentName} : {self.tournamentStatus}: {self.maxTournamentPlayers} players"


    def isSignedUp(self, loggedInUser=None):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

#    def createTournamentGame(self, request, _roundNumberString, _currentPlayersUsernames):
#        return
#        new_game = create_fcm_game(request, True, self, _roundNumberString, _currentPlayersUsernames)
#        return new_game
#        
#        gameName = "[" + self.tournamentName + "]" + " " + _roundNumberString
#
#        playerSeatOffset = random.randint(1000, 32767)
#
#        # _startingOptions = request.POST["startingOptions"]
#        created = SR_getTimeNow()
#        pace = 30
#        creator = User.objects.get(username="admin")
#
#        newGame = FCM_Game(
#            gameName=gameName,
#            creator=creator,
#            gamePace=pace,
#            turn=0,
#            phase=0,
#            created=created,
#            latestUpdate=created,
#            seatOffset=playerSeatOffset,
#            startingOptions=self.startingOptions,
#            maxPlayers=self.maxGamePlayers,
#            gameStatus="ACTIVE",
#        )
#        newGame.save()
#
#        for i in range(self.maxGamePlayers):
#            if i < len(_currentPlayersUsernames) and _currentPlayersUsernames[i] != "":
#                newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[i]))
#                SN_M_T_sendTournamentGameStartNotification(
#                    request,
#                    "FCM",
#                    _currentPlayersUsernames[i],
#                    self.maxGamePlayers,
#                    newGame.gameName,
#                    newGame.currentTurnString(),
#                    getattr(newGame, "id"),
#                    False,
#                )
#
#        newGame.kickoutDuration = 100
#        newGame.zoomLevels = "200" * self.maxGamePlayers
#        newGame.notificationSuppression = "0" * self.maxGamePlayers
#        newGame.relatedTournament = self
#        newGame.host = newGame.allPlayers.all().order_by("?").first()
#        newGame.setupRewindConsent()
#
#        newGame.save()
#        newGame.startGame(request)
#        return getattr(newGame, "id")

    def getByedPlayersList(self):
        byedPlayerList = []
        TPDA = json.loads(self.tournamentProgressionData)
        for round in TPDA:
            for row in round:
                if row[0] == "BYEPLAYERS":
                    byedPlayerList.extend(row)

        return byedPlayerList
    
    def get_tournamentType_display(self):
        return dict(SR_TOURNAMENT_TYPE_CHOICES)[self.tournamentType]

    def serialize(self, loggedInUser=None):
        # Used for Finished Games
        winnerHTML = SR_getTournamentWinnerHTML(self.tournamentStatus, self.winnersData)

        createdTS = str(self.created)
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(self.startingOptions)

        return {
            "tournamentID": getattr(self, "id"),
            "tournamentName": self.tournamentName,
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": "FCM",
        }

    def getRoundsHTML(self):
        # Only for IP or FN tournaments
        roundsHTML = SR_getTournamentRoundsHTML(
            self.tournamentType, self.maxGamePlayers, self.tournamentProgressionData, self.tournamentPointsData, "FCM", self
        )
        return roundsHTML

class FCM_Game(models.Model):
    # custom_primary_key = models.CharField(max_length=6, editable=False, unique=True)
    gameName = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")
    gameDescription = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

    gameStatus = models.CharField(
        max_length=9,
        choices=SR_GAME_STATUS_CHOICES,
        default="AVAILABLE",
        db_index=True, 
    )
    latestUpdate = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)
    startingOptions = models.CharField(max_length=80, blank=True)
    startingMap = models.CharField(max_length=190, blank=True)
    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="allPlayersRelName")
    missingPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="missingPlayersRelName", blank=True)

    currentPlayers = models.CharField(max_length=100, blank=True)
    seatOffset = models.PositiveSmallIntegerField(blank=False, default=0)
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="game_winner_relName", blank=True
    )

    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=0)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=9)

    kickoutDuration = models.PositiveSmallIntegerField(null=False, blank=False, default=200)
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=20)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="game_creator_relName"
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="game_host_relName"
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    zoomLevels = models.CharField(max_length=30, blank=True)
    notificationSuppression = models.CharField(max_length=30, blank=False, default="000000")

    rewindConsent = models.CharField(max_length=10, blank=True)
    statsExcludeConsent = models.CharField(max_length=10, blank=False, default="00")

    chatData = models.TextField(blank=True)

    playersMoveData = models.TextField(blank=True)

    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="kickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="invitedPlayersRelName", blank=True)
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="playersWithChatNotificationName", blank=True
    )

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)
    player4notes = models.TextField(blank=True)
    player5notes = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)
    # preMoveData = models.TextField(blank=True)

    relatedTournament = models.ForeignKey(
        FCM_Tournament, on_delete=models.SET_NULL, null=True, blank=True, related_name="tournament_relName"
    )
    
    relatedMiniTournament = models.ForeignKey(
        Mini_Tournaments, on_delete=models.SET_NULL, null=True, blank=True, related_name="minitournamentFCM_relName"
    )

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    kickoutFlexiData = models.TextField(blank=True)
    
    deleteGameVotes = models.JSONField(default=dict, blank=True, null=True)

#    def __str__(self):
#        allPlayersString = " / ".join(user.username for user in self.allPlayers.all())
#        return f"{getattr(self, 'id')}: {self.getGameName()} : {allPlayersString} : {self.gameStatus} : {self.currentTurnString()}"

    def __str__(self):
        # Use currentPlayers if available, otherwise fall back to gameName and status
        players = self.currentPlayers if self.currentPlayers else f"{self.allPlayers.count()} players"
        return f"Game {getattr(self, 'id')}: {self.getGameName()} : {players} : {self.gameStatus} : {self.currentTurnString()}"

    def currentTurnString(self):
        return SR_currentTurnString("FCM", self.turn, self.phase)

    def getGameName(self):
        _gameName = ""
        if self.gameName != "":
            _gameName = self.gameName
        else:
            _gameName = f"[{getattr(self.creator, 'username')}'s Game]"
        if self.gameStatus == "PRIVATE":
            _gameName += "[Private Game]"
        return _gameName

    def isMyMove(self, loggedInPlayerUsername="ADFSADASDASDASDASADADA"):
        allowed_players = {"SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5", "FcmAI"}

        if not self.currentPlayers or self.currentPlayers == "":
            return True

        if loggedInPlayerUsername in self.currentPlayers or self.currentPlayers in allowed_players:
            return True

        return False

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        # Return False if no username is provided
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        # Use a set for faster membership testing
        shadow_values = {"SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5", "FcmAI"}
        return (
            not self.currentPlayers
            or loggedInPlayerUsername in self.currentPlayers
            or self.currentPlayers in shadow_values
        )

    def getSecondsToNextKickout(self):
        return SF_getSecondsToNextKickout(self.latestUpdate, self.kickoutDuration)

    def getMissingPlayersNamesArray(self):
        ret = []
        for user in self.missingPlayers.all():
            ret.append(user.username)
        return ret

    def kickoutRequired(self):
        # return True
        return SF_kickoutRequired(
            self.gameStatus,
            self.allPlayers.all().values_list("username", flat=True),
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            self.getCurrentPlayersArray()[0],
        )

    def serialize(self, loggedInUser=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = ""
        for i in range(remainingPlayersInt):
            remainingPlayers += str(self.allPlayers.count() + i + 1)

        # Used for Finished Games
        winner = ""
        if self.winner:
            winner = self.winner.username

        createdString = str(self.created)
        latestUpdateString = str(self.latestUpdate)

        latestUpdateElapsedTimeString = ""
        if (
            self.gameStatus == "WAITING"
            or self.gameStatus == "AVAILABLE"
            or self.gameStatus == "ACTIVE"
            or self.gameStatus == "PRIVATE"
        ):
            elapsedTotalSeconds = 0
            if self.gameStatus == "WAITING" or self.gameStatus == "AVAILABLE" or self.gameStatus == "PRIVATE":
                elapsedTotalSeconds = int(time.time()) - int(self.created) // 1000
            if self.gameStatus == "ACTIVE":
                elapsedTotalSeconds = int(time.time()) - int(self.latestUpdate) // 1000
            elapsedDays = elapsedTotalSeconds // (60 * 60 * 24)
            elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60 * 24)
            elapsedHours = elapsedTotalSeconds // (60 * 60)
            elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60)
            elapsedmins = elapsedTotalSeconds // (60)
            elapsedTotalSeconds = elapsedTotalSeconds % (60)

            if elapsedDays > 0:
                latestUpdateElapsedTimeString += str(elapsedDays) + "d"

            if elapsedHours > 0:
                latestUpdateElapsedTimeString += " " + str(elapsedHours) + "h"
            if elapsedmins > 0:
                latestUpdateElapsedTimeString += " " + str(elapsedmins) + "m"
            latestUpdateElapsedTimeString += " " + str(elapsedTotalSeconds) + "s"

        myMove = False
        if loggedInUser is not None:
            myMove = self.isMyMove(loggedInUser.username)

        chatNotification = False
        involvedPlayer = False

        if loggedInUser in self.allPlayers.all() and loggedInUser not in self.missingPlayers.all():
            involvedPlayer = True
        if loggedInUser in self.playersWithChatNotification.all():
            chatNotification = True

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = SR_getFCMstartingOptionsHTML(self.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

        startingOptionsListPrelim = self.startingOptions.split(",")
        if startingOptionsListPrelim[0] != "":
            startingOptionsListPrelim = list(map(int, startingOptionsListPrelim))

        #######
        #   Check if SHADOW in currentGame.allPlayers
        #   Check currentGame.involvedPlayer
        #   Use currentGame.gameName
        #   Use if currentGame.startingOptionsLiteral
        #   Use currentGame.startingMap
        #   use currentGame.gameID
        #   Use currentGame.currentPlayers
        #   Use currentGame.latestUpdateLiteral
        #   Use currentGame.myMove to prevent self kickout
        deleteableGame = False
        if (
            "SHADOW" in self.allPlayers.all().values_list("username", flat=True)
            and loggedInUser in self.allPlayers.all()
        ):
            deleteableGame = True
        if (
            "FcmAI" in self.allPlayers.all().values_list("username", flat=True)
            and loggedInUser in self.allPlayers.all()
        ):
            deleteableGame = True

        return {
            "gameID": getattr(self, "id"),
            "gameName": self.getGameName(),
            "gameDescription": self.gameDescription,
            "creator": getattr(self.creator, "username"),
            "created": createdString,
            "allPlayers": [user.username for user in self.allPlayers.all()],
            "invitedPlayers": [user.username for user in self.invitedPlayers.all()],
            # "allPlayers": allPlayersList,
            # "currentPlayers": self.getCurrentPlayers(), # DO NOT USE THIS!!! MEANS  =ALL= CURRENT PLAYERS!!!
            "currentPlayers": self.currentPlayers,
            "currentTurn": self.currentTurnString(),
            "pace": gamePaceString,
            "latestUpdate": latestUpdateString,
            # "latestUpdateLiteral": self.latestUpdate, ### remove
            "startingOptions": startingOptionsHTML,
            "kickoutDuration": self.kickoutDuration,
            # "startingOptionsLiteral": self.startingOptions,### remove
            "maxPlayers": self.maxPlayers,
            "winner": winner,  # Used for Finished Games
            "myMove": myMove,
            # Used to not allow join in available games // set join / leave
            "involvedPlayer": involvedPlayer,
            "startingMap": self.startingMap,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "FCM",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = self.startingOptions.split(",")
        if "120" in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = self.startingOptions.split(",")
        if "110" in startingOptionsListPrelim:
            return True
        return False

    def startGame(self, request):
        # 8-hardChoices (original MS only)
        # 20-ketchupMilestone
        # 23-reservePrice
        # 18-newDistricts
        #      181-newDistrictsApp
        #      183-newDistrictsPark
        # 22-lobbyists
        # 19-coffee
        # 10-kimchi
        # 11-sushi
        # 12-noodles
        # 9-frychefs
        # 15-massMarketers
        # 13-gourmet
        # 17-ruralMarketers
        # 14-movieStars
        # 16-nightShift

        # Check for new player order seed
        self.seatOffset = random.randint(1000, 32767)
        # Copy in an initial value to prevent forced LU values of 99999 overwriting maps
        self.latestUpdate = self.created
        self.save()

        # need to add in possible new dist options
        startingOptions = self.startingOptions.split(",")
        if "200" in startingOptions:
            availableModules = [20, 23, 18, 22, 19, 10, 11, 12, 9, 15, 13, 17, 14, 16]
            # Add hard choices only with original MS
            if "21" not in startingOptions:
                availableModules.append(8)
            selectedModules = []
            moduleRange = []
            for i in range(len(startingOptions)):
                if len(startingOptions[i]) == 5:
                    moduleRange.append(startingOptions[i])
            for i in range(len(moduleRange)):
                moduleRange[i] = int(moduleRange[i][-2:])
            numberOfModulesToPick = random.randrange(moduleRange[0], moduleRange[1] + 1, 1)
            for i in range(numberOfModulesToPick):
                currentIndex = random.randrange(0, len(availableModules), 1)
                selectedModules.append(str(availableModules.pop(currentIndex)))
            # _tournamentType = random.choice(["RR", "KO", "TL"])
            if "18" in selectedModules:
                currentIndex = random.randrange(0, 3, 1)
                distOptions = ["", "181", "183"]
                chosenDistOption = distOptions[currentIndex]
                if chosenDistOption != "":
                    selectedModules.append(chosenDistOption)
            self.startingOptions = self.startingOptions + "," + (",".join(selectedModules))

        self.gameStatus = "ACTIVE"
        _currentPlayers = ""
        # Set starting player as currentPlayers
        for user in self.allPlayers.all():
            if self.seatPosition(user.username) == 0:
                _currentPlayers = user.username
                self.currentPlayers = _currentPlayers
                self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            self.deleteGameVotes.update({username: False for username in player_usernames})
            self.save()
            
            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            SN_M_sendGameStartNotification(request, "FCM", playerListToNotify, getattr(self, "id"), self)



    # NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
    def getAllPlayersOrderedySeat(self, withoutBots=False, useNewCode=True):
        if useNewCode:
            playerList = [
                username
                for username in self.allPlayers.all().values_list("username", flat=True)
                if username != "FCMtourneyAdmin"
            ]
            random.Random(self.seatOffset).shuffle(playerList)
            if withoutBots:
                return playerList

            missingPlayerList = list(self.missingPlayers.all().values_list("username", flat=True))
            # REPLACE WITH KICKOUTS
            for count, player in enumerate(playerList):
                if player in missingPlayerList:
                    playerList[count] = "FcmBot"  # + str(count)
            return playerList

        ############ OLD CODE -- NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
        else:
            playerString = ",".join(
                [player.username for player in self.allPlayers.all() if player.username != "FCMtourneyAdmin"]
            )
            playerList = playerString.split(",")
            if self.seatOffset > 0:
                for i in range(self.seatOffset):
                    playerList.append(playerList.pop(0))
            if withoutBots:
                return playerList

            missingPlayerString = ",".join([player.username for player in self.missingPlayers.all()])
            missingPlayerList = missingPlayerString.split(",")

            # REPLACE WITH KICKOUTS
            newPlayerList = []
            for count, player in enumerate(playerList):
                if player in missingPlayerList:
                    newPlayerList.append("FcmBot")
                else:
                    newPlayerList.append(player)

            return newPlayerList

    # takes in a USERNAME
    def seatPosition(self, name, withoutBots=False):
        if name != "FCMtourneyAdmin":
            playerList = self.getAllPlayersOrderedySeat(withoutBots)
            try:
                return playerList.index(name)
            except Exception:
                return -1
        return -1

    #########################################################
    #
    #   NEW SIMUL MOVE FUNCTIONS
    #
    #########################################################

    # This always ensures you get a valid array return
    # any bots are set to phase -99 here, so you know nothing is expcected, ie they can't move
    def getOrScaffoldAllMoveData(self):
        try:
            data = json.loads(self.playersMoveData)
            if len(data) != self.maxPlayers:
                raise ValueError("Invalid number of players")
            # Validate structure further if needed
            return data
        except (json.JSONDecodeError, ValueError):
            # Scaffold default structure
            allPlayers = self.getAllPlayersOrderedySeat(True, True)
            missing_players = set(self.missingPlayers.values_list("username", flat=True))
            # In a tournament, don't remove missing players, as FCMtA plays for them
            if self.relatedTournament:
                missing_players = {}
            return [
                [playerName, [-1] if playerName not in missing_players else [-99], "", []] for playerName in allPlayers
            ]

    def getCurrentSimulPlayersV2(self):
        # ASSUME THAT self.currentPlayers IS THE LATEST JSON INCOMING
        # ASSUME THAT phase is the start of simul phase

        # If there are no current players, add everyone
        if not self.currentPlayers:
            current_players = [user.username for user in self.allPlayers.all()]
            return ",".join(current_players)

        # Get an array of possible players to move
        current_players = [player.strip() for player in self.currentPlayers.split(",")]

        # Remove missing players
        missing_players = set(self.missingPlayers.values_list("username", flat=True))
        current_players = [username for username in current_players if username not in missing_players]

        # Remove players with move data in a single pass using a list comprehension
        current_players_str = ",".join(
            username for username in current_players if not self.hasValidActualMoveData(username)
        )

        return current_players_str

    def hasAnyPlayerMovedThisPhase(self, phase):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        for playerMoveArr in playersMoveDataArr:
            if self.isThisValidActualMoveArrForPhase(self.phase, playerMoveArr):
                return True

        return False

    def hasValidActualMoveData(self, name):
        if not self.playersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name), -1
        )
        if arrIdx == -1:
            return False  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            return False

        # Finally, check it is valid
        return self.isThisValidActualMoveArrForPhase(self.phase, playerMoveArr)

    def hasValidActualCleanupPreset(self, name):
        if not self.playersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name), -1
        )
        if arrIdx == -1:
            return False  # Player's move data not found
        playerMoveArr = playersMoveDataArr[arrIdx]
        # If no phase/wrong phase / empty data is set, then there's no move Data
        if playerMoveArr[1] == [-1] or 9 not in playerMoveArr[1] or playerMoveArr[3] == []:
            return False
        if (
            len(playerMoveArr) >= 4
            and len(playerMoveArr[3]) >= 2
            and isinstance(playerMoveArr[3][1], list)
            and len(playerMoveArr[3][1]) > 0
            and playerMoveArr[3][1][0] != -9
        ):
            return True

        return False

    # rf.PHASE_SETUP_RESTAURANT1 = 0
    # rf.PHASE_SETUP_RESTAURANT2 = 1
    # rf.PHASE_SETUP_RESERVE = 2
    # rf.PHASE_RESTRUCTURING = 3
    # rf.PHASE_TURN_ORDER = 4
    # rf.PHASE_WORKING_DAY = 5
    # rf.PHASE_DINNERTIME = 6
    # rf.PHASE_PIZZA_BOMB = 11
    # rf.PHASE_PAYDAY = 7
    # rf.PHASE_MARKETING_CAMPAIGNS = 8
    # rf.PHASE_COFFE_SHOP_MS = 12
    # rf.PHASE_CLEAN_UP = 9
    # rf.PHASE_GAME_OVER = 10
    # rf.PHASE_SETUP_MODULES = 13

    def isThisValidActualMoveArrForPhase(self, phase, moveArr):
        # If the phase is < 0 then it is not an actual move
        if moveArr[1][0] < 0:
            return False
        # Check the game phase is in the move phase array
        if phase not in moveArr[1]:
            message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase1 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
            SN_sendAdminErrorMessage("", message)
            return False

        # Now we have move data that should match the phase. So just check it is valid
        if moveArr[3] == []:
            return False

        # Res card is single array of length one, containing 1,2,or 3
        if phase <= 2:
            data = moveArr[3]
            if not isinstance(data, list) or len(data) != 1 or data[0] not in [1, 2, 3]:
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase2 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            return True

        # Restruc is an arrayy, like [arr,arr,int]
        if phase == 3:
            moveData = moveArr[3]
            # Make sure it's an array, Make sure it has a length of 3, Make sure the first element is an array, second element is an array, and third element is a single int of 0,1,2
            validData = True
            if not isinstance(moveData, list) or len(moveData) != 3:
                validData = False
            if not isinstance(moveData[0], list) or not isinstance(moveData[1], list):
                validData = False
            if not isinstance(moveData[2], int) or moveData[2] not in [0, 1, 2]:
                validData = False

            # If the daya is not valid, delete it and return false
            if not validData:
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase3 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False

                # Send a message out
                request = MagicMock()
                # Mock the user
                user = MagicMock(spec=User)
                user.username = name  # Set the desired username
                request.user = user
                # Mock the site
                site = Site.objects.get_current()  # Or create a mock Site object if needed
                request.site = site  # Attach the site to the request
                SN_sendNextTurnNotification(request, "FCM", [name], getattr(self, "id"), self.getGameName(), self, "0")
                return False

            return True
        
        if phase == 4:
            moveData = moveArr[3]
            # Make sure it's an array, Make sure it has a length of 3, Make sure the first element is an array, second element is an array, and third element is a single int of 0,1,2
            validData = True
            if not isinstance(moveData, list) or len(moveData) != 3:
                validData = False
            if not isinstance(moveData[0], list) or not isinstance(moveData[1], list):
                validData = False
            if not isinstance(moveData[2], int) or moveData[2] not in [0, 1, 2]:
                validData = False
            
            if not validData:
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase3.4 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            
            if moveData[2] == 1 or moveData[2] == 2:
                return True
            
            return False

        # Now phase is 7 or 9, AND there is move data
        # moveData = [[[-9],[]],[-9]]
        if phase in [5, 6, 7, 8, 9, 11, 12, 15]:
            moveData = moveArr[3]
            # check the move array is a list with 2 items (one for each phase)
            if not isinstance(moveData, list) or len(moveData) != 2:
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase4 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # check there are 2 arrays, one for each phase
            if not isinstance(moveData[0], list) or not isinstance(moveData[1], list):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase5 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # First arr must be an arr then an arr
            if not isinstance(moveData[0][0], list) or not isinstance(moveData[0][1], list):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase6 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # Second arr must just contain at least one int
            if len(moveData[1]) < 1 or not isinstance(moveData[1][0], int):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase7 - GameID: {getattr(self, 'id')} - self.phase: {self.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False

            # Now there is valid data, so check it is an ACTUAL move
            if phase == 7 and moveData[0][0][0] == -9:
                return False
            if phase == 9 and moveData[1][0] == -9:
                return False

            # if len(moveData[0][0]) == 0:#phase == 7 and
            #    return False
            # if phase == 7 and len(moveData[0][0]) > 0 and moveData[0][0][0] == -9:
            #    return False
            # if phase == 9 and len(moveData) < 2:
            #    return False
            # if phase == 9 and len(moveData[1]) == 0:
            #    return False
            # if phase == 9 and len(moveData[1]) > 0 and moveData[1][0] == -9:
            #    return False
            return True

    def insertPlayerMoveData(self, name, phasesArr, moveArr):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name), -1
        )

        playersMoveDataArr[arrIdx] = [name, phasesArr, str(int(time.time()) * 1000), moveArr]

        self.playersMoveData = json.dumps(playersMoveDataArr)

        self.save()

    def getCompressedMoveArr(self, name, forceReturnForPresetCleanup=False):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name), -1
        )
        # Only return the move if it is valid for current phase OR has a preset-clenaup
        if self.isThisValidActualMoveArrForPhase(self.phase, playersMoveDataArr[arrIdx]) or forceReturnForPresetCleanup:
            return base64.b64encode(
                gzip.compress(json.dumps(playersMoveDataArr[arrIdx], separators=(",", ":")).encode("utf-8"))
            ).decode("utf-8")

    def deleteSinglePlayersMove(self, name):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name), -1
        )
        playersMoveDataArr[arrIdx] = [name, [-1], "", []]
        self.playersMoveData = json.dumps(playersMoveDataArr)
        self.save()

    def clearAllMoveDataV2(self):
        self.playersMoveData = ""
        self.save()

    def getJsonMoveResponseV2(self, movedPlayerArr):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        playersToMove = []
        missingPlayers = set(self.missingPlayers.values_list("username", flat=True))
        if self.relatedTournament:
            missingPlayers = {}
        for subArr in playersMoveDataArr:
            if (
                subArr[0] not in movedPlayerArr
                and subArr[0] not in missingPlayers
                and not self.isThisValidActualMoveArrForPhase(self.phase, subArr)
            ):
                playersToMove.append(subArr[0])

        # If players left to move, then return them
        if len(playersToMove) > 0:
            jsonResponse = {"allPlayersMoved": False, "playersToMove": playersToMove}
            return jsonResponse

        # All players have moved, so return move data
        jsonResponse = {
            "allPlayersMoved": True,
            "moveData": base64.b64encode(
                gzip.compress(json.dumps(playersMoveDataArr, separators=(",", ":")).encode("utf-8"))
            ).decode("utf-8"),
        }
        # Don't clear moves at end of payday to preserve fridge data
        if self.phase != 7 and self.phase != 3:
            self.clearAllMoveDataV2()

        # Add latest update to stop flex time being double deducted
        newVer = (int(self.latestUpdate) % 1000) + 1
        self.latestUpdate = str((int(time.time()) * 1000) + newVer)
        # jsonResponse.append({"latestUpdate": self.latestUpdate})
        jsonResponse["latestUpdate"] = self.latestUpdate

        return jsonResponse

    #########################################################
    #
    #   END OF NEW SIMUL MOVE FUNCTIONS
    #
    #########################################################

    # This should be superfluouts, as data is updated after rewind anyway
    def addAllPlayersToCurrentPlayers(self):
        playerList = self.getAllPlayersOrderedySeat(False)
        self.currentPlayers = ",".join(playerList)
        self.save()

    #    def updateWholeMoveData(self, name, dataString):
    #        seat = self.seatPosition(name, True)
    #        player_moves = {
    #            0: [self.player0currentMoveTime, self.player0currentMoveData],
    #            1: [self.player1currentMoveTime, self.player1currentMoveData],
    #            2: [self.player2currentMoveTime, self.player2currentMoveData],
    #            3: [self.player3currentMoveTime, self.player3currentMoveData],
    #            4: [self.player4currentMoveTime, self.player4currentMoveData],
    #            5: [self.player5currentMoveTime, self.player5currentMoveData],
    #        }
    #
    #        player_moves[seat][0] = str(int(time.time()) * 1000)
    #        player_moves[seat][1] = dataString
    #
    #        # Update the individual player move data
    #        for seat, (move_time, move_data) in player_moves.items():
    #            setattr(self, f"player{seat}currentMoveTime", move_time)
    #            setattr(self, f"player{seat}currentMoveData", move_data)
    #
    #        self.save()

    # Phase <=3 diverts to updatWholeMoveData
    # Otherwise, a valid single premove for phase 7/9 the is compressed should be used
    #    def updateSingleMove(self, name, data, deleteMove=False):
    #        if self.phase <= 3:
    #            self.updateWholeMoveData(name, data)
    #            return
    #        currentTime = str(int(time.time()) * 1000)
    #        seat = self.seatPosition(name, True)
    #
    #        if deleteMove:
    #            currentTime = ""
    #            data = ""
    #
    #        player_moves = {
    #            0: (self.player0currentMoveTime, self.player0currentMoveData),
    #            1: (self.player1currentMoveTime, self.player1currentMoveData),
    #            2: (self.player2currentMoveTime, self.player2currentMoveData),
    #            3: (self.player3currentMoveTime, self.player3currentMoveData),
    #            4: (self.player4currentMoveTime, self.player4currentMoveData),
    #            5: (self.player5currentMoveTime, self.player5currentMoveData),
    #        }
    #
    #        # if payday or cleanup, set the correct entry in the array
    #        # Payday
    #        if self.phase == 7:  # Payday is [firedEmployees], [resources Used]
    #            preMoveData = json.loads(player_moves[seat][1]) if player_moves[seat][1] != "" else [[[-9], []], [-9]]
    #            preMoveData[0] = json.loads(gzip.decompress(bytearray(base64.b64decode(data))).decode("utf-8"))
    #            data = json.dumps(preMoveData, separators=(',', ':'))
    #            player_moves[seat] = (currentTime, data)
    #        elif self.phase == 9:
    #            preMoveData = json.loads(player_moves[seat][1]) if player_moves[seat][1] != "" else [[[-9], []], [-9]]
    #            preMoveData[1] = json.loads(gzip.decompress(bytearray(base64.b64decode(data))).decode("utf-8"))
    #            data = json.dumps(preMoveData, separators=(',', ':'))
    #            player_moves[seat] = (currentTime, data)
    #
    #        # Update the individual player move data
    #        for seat, (move_time, move_data) in player_moves.items():
    #            setattr(self, f"player{seat}currentMoveTime", move_time)
    #            setattr(self, f"player{seat}currentMoveData", move_data)
    #
    #        self.save()

    #    def getMoveData(self, name):
    #        seat = self.seatPosition(name)
    #        if seat == 0:
    #            return self.player0currentMoveData
    #        if seat == 1:
    #            return self.player1currentMoveData
    #        if seat == 2:
    #            return self.player2currentMoveData
    #        if seat == 3:
    #            return self.player3currentMoveData
    #        if seat == 4:
    #            return self.player4currentMoveData
    #        if seat == 5:
    #            return self.player5currentMoveData
    #        return ""

    #    def hasMoveData(self, name):
    #        players_data = {0: self.player0currentMoveData, 1: self.player1currentMoveData, 2: self.player2currentMoveData, 3: self.player3currentMoveData, 4: self.player4currentMoveData, 5: self.player5currentMoveData}
    #        seat = self.seatPosition(name)
    #        if seat == -1:
    #            return False
    #
    #        moveDataRaw = players_data.get(seat, "")
    #        #print(f"hasMoveData  name: {name}, seat: {seat}, moveDataRaw: {moveDataRaw}")
    #        # If move data ever empty, then you dont have a move
    #        if moveDataRaw == "":
    #            return False
    #        # If move data is not empty, then you have a res card if phase <=2 or structure if <= 3
    #        if self.phase <= 3:
    #            print(f"The current phase is: {self.phase}, and the move data is: {moveDataRaw}")
    #            ###########################################
    #            #   VERIFY RESTRUC / RESVER MOVE DATA
    #            #
    #            ###########################################
    #            validData = True
    #            if self.phase == 2:
    #                decompressedMoveData = []
    #                try:
    #                    decompressedMoveData = json.loads(gzip.decompress(bytearray(base64.b64decode(moveDataRaw))).decode("utf-8"))
    #                except:
    #                    validData = False
    #                # Make sure it's an array, Make sure it has a length of 1, Make sure the first element is a single int of 1,2,or 3
    #                if validData:
    #                    if not isinstance(decompressedMoveData, list) or len(decompressedMoveData) != 1 or decompressedMoveData[0] not in [1, 2, 3]:
    #                        validData = False
    #            if self.phase == 3:
    #                decompressedMoveData = []
    #                try:
    #                    decompressedMoveData = json.loads(gzip.decompress(bytearray(base64.b64decode(moveDataRaw))).decode("utf-8"))
    #                except:
    #                    validData = False
    #                # Make sure it's an array, Make sure it has a length of 3, Make sure the first element is an array, second element is an array, and third element is a single int of 0,1,2
    #                if validData:
    #                    if not isinstance(decompressedMoveData, list) or len(decompressedMoveData) != 3:
    #                        validData = False
    #                    if not isinstance(decompressedMoveData[0], list) or not isinstance(decompressedMoveData[1], list):
    #                        validData = False
    #                    if not isinstance(decompressedMoveData[2], int) or decompressedMoveData[2] not in [0, 1, 2]:
    #                        validData = False
    #            print(f"name: {name}, seat: {seat}, moveDataRaw: {moveDataRaw}, validData: {validData}")
    #            # If the daya is not valid, delete it and return false
    #            if not validData:
    #                message = (
    #                    f"BAD DATA FOUND IN FCM PHASE 2 OR 3 - GameID: {getattr(self, 'id')} - Name: {name} - Phase: {self.phase}  "
    #                    f"- Turn: {self.turn} -- MoveTime: {getattr(self, f'player{seat}currentMoveTime')} -- MoveData: {moveDataRaw} "
    #                )
    #                SN_sendAdminErrorMessage("", message)
    #                setattr(self, f"player{seat}currentMoveData", "")
    #                setattr(self, f"player{seat}currentMoveTime", "")
    #                # Readd to currentPlayers
    #                if self.currentPlayers == "":
    #                    self.currentPlayers = name
    #                else:
    #                    self.currentPlayers = self.currentPlayers + "," + name
    #                self.save()
    #                # Send a message out
    #                request = MagicMock()
    #                # Mock the user
    #                user = MagicMock(spec=User)
    #                user.username = name  # Set the desired username
    #                request.user = user
    #                # Mock the site
    #                site = Site.objects.get_current()  # Or create a mock Site object if needed
    #                request.site = site  # Attach the site to the request
    #                SN_sendNextTurnNotification(request, "FCM", [name], getattr(self, 'id'), self.getGameName(), self, "0")
    #                return False
    #
    #            return True
    #        # Now phase is 7 or 9, AND there is move data
    #        moveData = [[[-9],[]],[-9]]
    #        try:
    #            moveData = json.loads(moveDataRaw)
    #        except Exception as e:
    #            logger.warning(f"ERROR LOADING FCM MOVE DATA: id: {getattr(self, 'id')}, moveData: {moveDataRaw}, phase: {self.phase}, Reason: {e}")
    #            ### TODO discord failed to load
    #        if self.phase == 7 and len(moveData[0][0]) == 0:
    #            return False
    #        if self.phase == 7 and len(moveData[0][0]) > 0 and moveData[0][0][0] == -9:
    #            return False
    #        if self.phase == 9 and len(moveData) < 2:
    #            return False
    #        if self.phase == 9 and len(moveData[1]) == 0:
    #            return False
    #        if self.phase == 9 and len(moveData[1]) > 0 and moveData[1][0] == -9:
    #            return False
    #        return True

    #    def getPaydayPreturns(self):
    #        preTurnArray = []
    #        player_moves = {
    #            0: (self.player0currentMoveTime, self.player0currentMoveData),
    #            1: (self.player1currentMoveTime, self.player1currentMoveData),
    #            2: (self.player2currentMoveTime, self.player2currentMoveData),
    #            3: (self.player3currentMoveTime, self.player3currentMoveData),
    #            4: (self.player4currentMoveTime, self.player4currentMoveData),
    #            5: (self.player5currentMoveTime, self.player5currentMoveData),
    #        }
    #        for playerIndex in range(self.maxPlayers):
    #            content = player_moves[playerIndex][1]
    #            if len(content) == 0 or content == "" or content == "[]":
    #                    content = "[[[-9], []], [-9]]"
    #            preTurnArray.append(json.loads(content))
    #
    #        return base64.b64encode(gzip.compress(json.dumps(preTurnArray, separators=(',', ':')).encode("utf-8"))).decode("utf-8")
    #
    #    def getFridgePreturns(self):
    #        preTurnArray = []
    #        player_moves = {
    #            0: (self.player0currentMoveTime, self.player0currentMoveData),
    #            1: (self.player1currentMoveTime, self.player1currentMoveData),
    #            2: (self.player2currentMoveTime, self.player2currentMoveData),
    #            3: (self.player3currentMoveTime, self.player3currentMoveData),
    #            4: (self.player4currentMoveTime, self.player4currentMoveData),
    #            5: (self.player5currentMoveTime, self.player5currentMoveData),
    #        }
    #        for playerIndex in range(self.maxPlayers):
    #            content = player_moves[playerIndex][1]
    #            if len(content) == 0 or content == "" or content == "[]":
    #                    content = "[[[-9], []], [-9]]"
    #            preTurnArray.append(json.loads(content))
    #
    #        return base64.b64encode(gzip.compress(json.dumps(preTurnArray, separators=(',', ':')).encode("utf-8"))).decode("utf-8")
    #
    # This is just checked to see if rewind should clear data, or rewind
    #    def anyMoveData(self):
    #        if self.phase not in [7, 9]:
    #            # If not phase 7 or 9, any non-empty move data indicates a move.
    #            if (self.player0currentMoveData != "" or
    #                self.player1currentMoveData != "" or
    #                self.player2currentMoveData != "" or
    #                self.player3currentMoveData != "" or
    #                self.player4currentMoveData != "" or
    #                self.player5currentMoveData != ""):
    #                return True
    #            else:
    #                return False # No move data in non-7/9 phase
    #
    #        # So now it must ba phase 7 or 9
    #        for i in range(6):  # Iterate through players 0 to 5
    #            move_data_attr = f"player{i}currentMoveData"
    #            move_data = getattr(self, move_data_attr, "")  # Get attribute value safely
    #
    #            if move_data != "":
    #                try:
    #                    move_data_json = json.loads(move_data)
    #                    if self.phase == 7:
    #                        if isinstance(move_data_json, list) and len(move_data_json) > 0 and move_data_json[0][0][0] != -9 and move_data_json[0][0][0] != -8:
    #                            return True  # Valid move data found
    #                    if self.phase == 9:
    #                        if isinstance(move_data_json, list) and len(move_data_json) > 0 and move_data_json[1][0] != -9 and move_data_json[1][0] != -8:
    #                            return True  # Valid move data found
    #                except (json.JSONDecodeError, TypeError, IndexError):
    #                    # Handle cases where the data is not valid JSON or doesn't have the expected structure
    #                    # Decide how to handle invalid data:
    #                    # - Option 1: Treat as no move (return False later)
    #                    # - Option 2: Treat as a move (return True immediately)
    #                    # For now, I'm treating it as no move, but you might want to change this.
    #                    pass # Treat as no move for now
    #
    #        return False  # No valid move data found in phase 7 or 9

    def getCurrentSimulPlayers(self):
        # ASSUME THAT self.currentPlayers IS THE LATEST JSON INCOMING
        # ASSUME THAT phase is the start of simul phase

        # If there ar no current players, add everyone
        if self.currentPlayers == "":
            _currentPlayers = ""
            for user in self.allPlayers.all():
                if user.username != "FCMtourneyAdmin":
                    _currentPlayers += user.username + ","
            # remove final comma
            _currentPlayers = _currentPlayers[:-1]
            return _currentPlayers

        # Get an array of possible player to move
        # _currentPlayers = self.currentPlayers.split(",")
        _currentPlayers = [player.strip() for player in self.currentPlayers.split(",")]
        # Remove missing players
        missing_players = set(self.missingPlayers.values_list("username", flat=True))
        if self.relatedTournament:
            missing_players = {}
        _currentPlayers = [username for username in _currentPlayers if username not in missing_players]

        # If any play has a move, then remove them
        playersToRemove = []
        for username in _currentPlayers:
            if self.hasValidActualMoveData(username):
                playersToRemove.append(username)

        for username in playersToRemove:
            _currentPlayers.remove(username)

        # If it's reserve phase, remove anyone with move

        ## Build the list of usernames efficiently
        # for user in self.allPlayers.exclude(username="FCMtourneyAdmin"):
        #    # Has move data correctly checks for flags for phases 7/9
        #    if not self.hasMoveData(user.username):
        #        if user.username not in missing_players:
        #            _currentPlayers.append(user.username)
        #
        ## Check if FCMtourneyAdmin needs to be added
        # if "FCMtourneyAdmin" in [player.username for player in self.allPlayers.all()]:
        #    needs_to_move = any(getattr(self, f"player{seat_pos}currentMoveData", "") == "" for seat_pos, player in enumerate(self.getAllPlayersOrderedySeat(True, True)))
        #    if needs_to_move:
        #        _currentPlayers.append("FCMtourneyAdmin")

        # Join the list elements with ','
        _currentPlayers = ",".join(_currentPlayers)

        return _currentPlayers

    # This just converts to array
    def getCurrentPlayersArray(self):
        current_players = self.currentPlayers
        return [player.strip() for player in current_players.split(",")]

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def setupRewindConsent(self):
        if self.rewindConsent != "":
            return
        else:
            rewindConsentString = ""
            for i in range(self.maxPlayers):
                rewindConsentString += "0"
            hostSeat = self.seatPosition(getattr(self.host, "username"))
            rewindConsentList = list(rewindConsentString)
            rewindConsentList[hostSeat] = "2"
            rewindConsentString = "".join(rewindConsentList)
            self.rewindConsent = rewindConsentString
            self.save()

    # NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
    def getRewindHostHTML(self):
        USE_NEW_CODE = False
        if int(self.created) > 1744974000000:
            USE_NEW_CODE = True

        if self.rewindConsent == "":
            self.setupRewindConsent()
        allPlayersList = self.getAllPlayersOrderedySeat(False, USE_NEW_CODE)
        rewindConsentList = list(self.rewindConsent)
        rewindHTML = ""

        for index, player in enumerate(allPlayersList):
            if player[0:11] == "FcmBot":
                player = "FcmBot" + player[-1]
            if player != getattr(self.host, "username"):
                if rewindConsentList[index] == "0":
                    rewindHTML += (
                        "<span style='background-color:red'>"
                        + player
                        + ": "
                        + gettext("No Permission")
                        + "</span><BR/>"
                    )
                elif rewindConsentList[index] == "1":
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Single Permission")
                        + "</span><BR/>"
                    )
                elif rewindConsentList[index] == "2":
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Permanent Permission")
                        + "</span><BR/>"
                    )
        return rewindHTML

    def getRewindHostPossible(self):
        if len(self.missingPlayers.all()) > 0:
            self.rewindConsent = "222222"
            self.save()
        possible = True
        rewindConsentList = list(self.rewindConsent)
        for consent in rewindConsentList:
            if consent == "0":
                possible = False
        return possible

    def removeSingleRewindPermission(self):
        rewindConsentList = list(self.rewindConsent)
        for i in range(len(rewindConsentList)):
            if rewindConsentList[i] == "1":
                rewindConsentList[i] = "0"
        self.rewindConsent = "".join(rewindConsentList)
        self.save()

    def getCurrentRewindConsent(self, _username):
        if self.rewindConsent == "":
            return "0"
        currentSeat = self.seatPosition(_username)
        rewindConsentList = list(self.rewindConsent)
        return rewindConsentList[currentSeat]

    # takes in a user object
    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all().filter(~Q(missingPlayersRelName=getattr(self, "id"))).order_by("?").first()
            )
            self.host = possibleHost
            self.save()

    # takes in username
    def enableStatsExclude(self, _username):
        if (len(self.statsExcludeConsent)) < self.maxPlayers:
            self.statsExcludeConsent = "0" * self.maxPlayers
        seatToChange = self.seatPosition(_username, True)
        self.statsExcludeConsent = (
            self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
        )
        # CHECK TOTAL CONSENT
        totalConsent = 0
        for letter in self.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.maxPlayers:
            self.statsExcludedGame = True
        self.save()

    def isTournamentRoundFinished(self, tournamentProgressionDataArray):
        if self.relatedTournament is None:
            return False

        # Check all games from previous round are finished
        finishedGames = 0
        for row in tournamentProgressionDataArray[-1]:
            if row[0] == "BYEPLAYERS":
                finishedGames += 1
            else:
                game = FCM_Game.objects.get(id=row[self.relatedTournament.maxGamePlayers])
                if game.gameStatus == "FINISHED":
                    finishedGames += 1
        if finishedGames == len(tournamentProgressionDataArray[-1]):
            return True
        return False

    # Takes in self, request, and then 3 JSON[""] pieces of string data

    def endGame(self, request, _winner, _finalScores, _gameID):
        self.rewindData = ""
        self.rewindTempData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"
        self.winner = User.objects.get(username=_winner)
        self.deleteGameVotes = None
        self.clearAllMoveDataV2()
        self.save()

        # This is sorted with winner in [0][name, money]
        finalPositions = []
        for i in range(len(_finalScores)):
            finalPositions.append(_finalScores[i][0])
        SN_M_sendEndGameNotification(request, "FCM", finalPositions, _gameID, self)

        if self.relatedTournament:
            SF_M_ProcessTournamentEndGame(request, "FCM", self, [_winner])
        elif self.relatedMiniTournament:
            SF_M_ProcessMiniTournamentEndGame(request, self.relatedMiniTournament, self, [_winner], finalPositions)

    def getGameCode(self):
        return "FCM"

    def getDeleteVotesData(self):
        if self.gameStatus == "FINISHED":
            deleteGameVotes = {}
            player_usernames = [p.username for p in self.allPlayers.all()]
            deleteGameVotes.update({username: False for username in player_usernames})
            return deleteGameVotes
        if self.deleteGameVotes is None:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update({username: False for username in player_usernames})
            self.save()
        return self.deleteGameVotes
    
    def addDeleteVote(self, playerName):
        """Records the vote of a player."""
        # Double check player is in the game
        if playerName not in [p.username for p in self.allPlayers.all()]:
            return False  # Player not in the game
        
        # Ensure deleteGameVotes is a dictionary
        if self.deleteGameVotes is None:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update({username: False for username in player_usernames})

        # If the playerName isn't found, wipe the votes and make sure all players are added
        if playerName not in self.deleteGameVotes:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update({username: False for username in player_usernames})

        # Add the vote
        self.deleteGameVotes[playerName] = True
        self.save()
        return True

# class FCM_Chat(models.Model):
#    welcomeChat = '{"name":"WelcomeBot","timestamp":' + str(int(time.time(
#    ))*1000) + ',"message":"' + gettext("Welcome to Food Chain Magnate Online!=-NEWLINE-==-NEWLINE-=If you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!") + '"},'
#    relatedGame = models.OneToOneField(FCM_Game, on_delete=models.CASCADE)
#    chatData = models.TextField(blank=False, default=welcomeChat)
#    timeStamp = models.CharField(max_length=30)

#    def __str__(self):
#        return f"{self.relatedGame}"


# @ receiver(post_save, sender=FCM_Game)
# def create_FCM_Game_FCM_Chat(sender, instance, created, **kwargs):
#    if created:
#        newChat = FCM_Chat.objects.create(relatedGame=instance)
# instance.FCM_Chat.save()
# FCM_Chat.save(self)
#        newChat.save()


# @ receiver(post_save, sender=FCM_Game)
# def save_FCM_Game_FCM_Chat(sender, instance, **kwargs):
# instance.FCM_Chat.save()
# FCM_Chat.save()
#    pass
