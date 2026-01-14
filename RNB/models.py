import time
import json
import random

from decouple import config, Csv

from django.db import models
from django.db.models import Q

from django.conf import settings
# from django.utils.translation import gettext

from Lobby.models import User, GeneralGame

from Lobby.sharedFunctions.sharedFunctions import *
from Lobby.sharedFunctions.sharedRefs import *


class RNB_Game(GeneralGame):  
    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="RNBallPlayersRelName")
    missingPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="RNBmissingPlayersRelName", blank=True)
    
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="RNBgame_creator_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="RNBgame_host_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    
    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="RNBkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="RNBinvitedPlayersRelName", blank=True)
    playersWithChatNotification = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="RNBplayersWithChatNotificationName", blank=True)
    
    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)

    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="RNBgame_winner_relName", blank=True)

    rewRNBData = models.TextField(blank=True)
    rewRNBTempData = models.TextField(blank=True)

    def __str__(self):
        allPlayersString = " / ".join(user.username for user in self.allPlayers.all())
        return f"{self.id}: {self.getGameName()} : {allPlayersString} : {self.gameStatus} : {self.currentTurnString()}"

    def getGameName(self):
        _gameName = ""
        if self.gameName != "":
            _gameName = self.gameName
        else: 
            _gameName = f"[{self.creator.username}'s Game]"
        if self.gameStatus == "PRIVATE":
            _gameName += "[Private Game]"
        return _gameName

    # Takes in self, request, and then 3 JSON[""] pieces of string data
    def endGame(self, request, _winner, _finalPositions, _gameID):
        self.rewRNBData = ""
        self.rewRNBTempData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"

        self.winner = User.objects.get(username=_winner)
        names = self.getAllPlayersOrderedySeat(False)

        self.save()
        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                _finalPositions[i][j] = names[_finalPositions[i][j]]

        # Flatten the array to [username, position]
        finalResults = []
        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                text = "Lost in Antiquity (POS ERROR)"
                if i == 0 and len(_finalPositions[i]) == 1:
                    text = "1st - Congratulations!"
                elif i == 0 and len(_finalPositions[i]) > 1:
                    text = "Joint 1st - Congratulations!"
                elif i == 1 and len(_finalPositions[i]) == 1:
                    text = "Runner Up"
                elif i == 1 and len(_finalPositions[i]) > 1:
                    text = "Joint Runner Up"
                finalResults.append([_finalPositions[i][j], text, i])

        # Create a new array to store names not present in _finalPositions
        new_names = [name for name in names if name not in [item for sublist in _finalPositions for item in sublist]]

        for name in new_names:
            finalResults.append([name, "Lost in Antiquity", 9])

        # Now send winning notification
        SN_M_sendEndGameNotificationTieGame(request, "RNB", finalResults, _gameID, self)

        # if self.relatedTournament:
        # CODE REMOVED

    def currentTurnString(self):
        return SR_currentTurnString("RNB", self.turn, self.phase)

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.currentPlayers == "":
            return True
        if (loggedInPlayerUsername in self.currentPlayers) or (self.currentPlayers == "SHADOW") or (self.currentPlayers == "SHADOW_2") or (self.currentPlayers == "SHADOW_3")or (self.currentPlayers == "SHADOW_4"):
            return True
        return False

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

    def serialize(self, loggedInUserObj=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = "".join(str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt))
        winner = ", ".join(list(self.winner.all().values_list("username", flat=True))) if self.winner.exists() else ""
        createdString = self.created
        latestUpdateString = self.latestUpdate

        latestUpdateElapsedTimeString = ""
        if self.gameStatus == "WAITING" or self.gameStatus == "AVAILABLE" or self.gameStatus == "ACTIVE" or self.gameStatus == "PRIVATE":
            elapsedTotalSeconds = int(time.time()) - int(self.created) // 1000 if self.gameStatus == "WAITING" or self.gameStatus == "AVAILABLE" or self.gameStatus == "PRIVATE" else int(time.time()) - int(self.latestUpdate) // 1000
            latestUpdateElapsedTimeString = SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds)

        myMove = loggedInUserObj is not None and self.isMyMove(loggedInUserObj.username)

        chatNotification = loggedInUserObj in self.playersWithChatNotification.all()
        involvedPlayer = loggedInUserObj in self.allPlayers.all() and loggedInUserObj not in self.missingPlayers.all()

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = ""  # SR_getRNBstartingOptionsHTML(self.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

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

        deleteableGame = "SHADOW" in self.allPlayers.all().values_list("username", flat=True) and loggedInUserObj in self.allPlayers.all()

        return {
            "gameID": self.id,
            "gameName": self.getGameName(),
            "gameDescription": self.gameDescription,
            "creator": self.creator.username,
            "created": createdString,
            "allPlayers": [user.username for user in self.allPlayers.all()],
            "invitedPlayers": [user.username for user in self.invitedPlayers.all()],
            "currentPlayers": self.currentPlayers,
            "currentTurn": self.currentTurnString(),
            "pace": gamePaceString,
            "latestUpdate": latestUpdateString,
            "startingOptions": startingOptionsHTML,
            "kickoutDuration": self.kickoutDuration,
            "maxPlayers": self.maxPlayers,
            "winner": winner,  # Used for Finished Games
            "myMove": myMove,
            # Used to not allow join in available games // set join / leave
            "involvedPlayer": involvedPlayer,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "RNB",
            "remainingPlayers": remainingPlayers,  # Used in lobby somewhere
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = json.loads(self.startingOptions) if self.startingOptions else []

        if 120 in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = json.loads(self.startingOptions) if self.startingOptions else []
        if 110 in startingOptionsListPrelim:
            return True
        return False

    # takes in a USERNAME
    def seatPosition(self, _username, withoutBots=False):
        # If not a player, return -1
        if _username not in self.allPlayers.all().values_list("username", flat=True):
            return -1

        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            return playerList.index(_username)
        except Exception as e:
            print(e)
            return -1

    # NB withoutBots returns original players. with True it replaces with IndBot
    def getAllPlayersOrderedySeat(self, withoutBots=False):
        playerList = list(self.allPlayers.all().values_list("username", flat=True))
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        missingPlayerList = self.missingPlayers.all().values_list("username")

        # REPLACE WITH KICKOUTS
        for count, player in enumerate(playerList):
            if player in missingPlayerList:
                playerList[count] = "RnbBot"  # + str(count)
        return playerList

    def startGame(self, request):
        self.gameStatus = "ACTIVE"
        self.playerOrderSeed = random.randint(1000, 32767)
        allPlayersL = self.getAllPlayersOrderedySeat()
        self.currentPlayers = allPlayersL[0]

        self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            SN_M_sendGameStartNotification(request, "RNB", playerListToNotify, self.id, self)

    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        _currentPlayersArray.append(self.currentPlayers)
        return _currentPlayersArray
    
    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()
       

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = self.allPlayers.all().filter(~Q(missingPlayersRelName=self.id)).order_by("?").first()
            self.host = possibleHost

    def getGameCode(self):
        return "RNB"
    #def enableStatsExclude(self, _username):
    #    seatToChange = self.seatPosition(_username, True)
    #    self.statsExcludeConsent = self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
    #    # CHECK TOTAL CONSENT
    #    totalConsent = 0
    #    for letter in self.statsExcludeConsent:
    #        totalConsent += int(letter)
    #    if totalConsent == self.maxPlayers:
    #        self.statsExcludedGame = True
