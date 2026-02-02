import time
import json

# import requests
import random

from django.contrib.sites.shortcuts import get_current_site
from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.template.loader import render_to_string
#from django.utils.translation import gettext  # , get_language

# from django.contrib.sites.shortcuts import get_current_site
# from django.utils import translation

from Lobby.models import User, GeneralGame

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessTournamentEndGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_T_sendTournamentGameStartNotification,
    #SN_M_sendGameStartNotification,
    SN_M_sendEndGameNotification,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getBUSstartingOptionsHTML,
    SR_getTournamentWinnerHTML,
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
    SR_getTournamentRoundsHTML,
)

from Lobby.sharedFunctions.constants import BLANK_MESSAGE_TEMPLATE


class Bus_Tournament(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field

    tournamentName = models.CharField(max_length=120)

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

    startingOptions = models.CharField(max_length=70, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_Bus", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="currentRoundPlayersRelName_Bus",
        blank=True,
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
        return f"{getattr(self, 'id')}: {self.tournamentName} : {self.tournamentType} : {self.tournamentStatus}"

    def isSignedUp(self, loggedInUser=None):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

    def createTournamentGame(
        self, request, _roundNumberString, _currentPlayersUsernames
    ):
        gameName = "[" + self.tournamentName + "]" + " " + _roundNumberString
        playerOrderSeed = random.randint(1000, 32767)
        pace = 30
        creator = User.objects.get(username="admin")

        newGame = Bus_Game(
            gameName=gameName,
            creator=creator,
            gamePace=pace,
            playerOrderSeed=playerOrderSeed,
            startingOptions=self.startingOptions,
            maxPlayers=self.maxGamePlayers,
            gameStatus="ACTIVE",
        )
        newGame.save()

        if _currentPlayersUsernames[0] != "":
            newGame.allPlayers.add(
                User.objects.get(username=_currentPlayersUsernames[0])
            )
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "Bus",
                _currentPlayersUsernames[0],
                self.maxGamePlayers,
                newGame.gameName,
                newGame.currentTurnString(),
                newGame.id,
                False,
                "normalTournament",
            )
        if _currentPlayersUsernames[1] != "":
            newGame.allPlayers.add(
                User.objects.get(username=_currentPlayersUsernames[1])
            )
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "Bus",
                _currentPlayersUsernames[1],
                self.maxGamePlayers,
                newGame.gameName,
                newGame.currentTurnString(),
                newGame.id,
                False,
                "normalTournament",
            )
        if self.maxGamePlayers >= 3 and _currentPlayersUsernames[2] != "":
            newGame.allPlayers.add(
                User.objects.get(username=_currentPlayersUsernames[2])
            )
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "Bus",
                _currentPlayersUsernames[2],
                self.maxGamePlayers,
                newGame.gameName,
                newGame.currentTurnString(),
                newGame.id,
                False,
                "normalTournament",
            )
        if self.maxGamePlayers >= 4 and _currentPlayersUsernames[3] != "":
            newGame.allPlayers.add(
                User.objects.get(username=_currentPlayersUsernames[3])
            )
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "Bus",
                _currentPlayersUsernames[3],
                self.maxGamePlayers,
                newGame.gameName,
                newGame.currentTurnString(),
                newGame.id,
                False,
                "normalTournament",
            )
        if self.maxGamePlayers >= 5 and _currentPlayersUsernames[4] != "":
            newGame.allPlayers.add(
                User.objects.get(username=_currentPlayersUsernames[4])
            )
            SN_M_T_sendTournamentGameStartNotification(
                request,
                "Bus",
                _currentPlayersUsernames[4],
                self.maxGamePlayers,
                newGame.gameName,
                newGame.currentTurnString(),
                newGame.id,
                False,
                "normalTournament",
            )

        newGame.kickoutDuration = 100
        # newGame.zoomLevels = "200" * self.maxGamePlayers
        newGame.relatedTournament = self
        newGame.host = newGame.allPlayers.all().order_by("?").first()
        # newGame.setupRewindConsent()
        newGame.tournamentGame = True

        newGame.save()
        newGame.startGame(request)
        return newGame.id

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
        startingOptionsHTML = "[None]"

        return {
            "tournamentID": getattr(self, "id"),
            "tournamentName": self.tournamentName,
            # "tournamentStatus": self.get_tournamentStatus_display(),
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": "Bus",
            "tournamentLink": f"/Bustournament/Bus/{self.id}/",
        }

    def getRoundsHTML(self):
        # Only for IP or FN tournaments
        roundsHTML = SR_getTournamentRoundsHTML(
            self.tournamentType,
            self.maxGamePlayers,
            self.tournamentProgressionData,
            self.tournamentPointsData,
            "Bus",
            self,
        )
        return roundsHTML

class Bus_Game(GeneralGame):     
    allPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="BusAllPlayersRelName"
    )
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="BusMissingPlayersRelName", blank=True
    )
    
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="BusGame_creator_relName",
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="BusGame_host_relName",
    )
    
    kickedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="BusKickedPlayersRelName", blank=True
    )
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="BusInvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="BusPlayersWithChatNotificationName",
        blank=True,
    )
    
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="BusGame_winner_relName",
        blank=True,
    )

    # TODOMODEL change to json, move to general
    rewindConsent = models.CharField(max_length=10, blank=False, default="00000")

    player4notes = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)
    relatedTournament = models.ForeignKey(
        Bus_Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tournament_relName_Bus",
    )

    def __str__(self):
        allPlayersString = " / ".join(user.username for user in self.allPlayers.all())
        return f"{self.id}: {self.getGameName()} : {allPlayersString} : {self.gameStatus} : {self.currentTurnString()}"

    def getGameName(self):
        _gameName = ""
        if self.gameName != "":
            _gameName = self.gameName
        else:
            _gameName = f"[{getattr(self.creator, 'username')}'s Game]"
        if self.gameStatus == "PRIVATE":
            _gameName += "[Private Game]"
        return _gameName

    # Takes in self, request, and then 3 JSON[""] pieces of string data
    def endGame(self, request, _winner, _finalPositions, _gameID):
        self.rewindData = ""
        self.rewindTempData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"
        self.winner = User.objects.get(username=_winner)
        self.deleteGameVotes = None

        # Need to save here, so it is FN for tournament
        self.save()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "Bus", _finalPositions, _gameID, self)

        if self.relatedTournament:
            SF_M_ProcessTournamentEndGame(request, "Bus", self, [_winner])

    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        _currentPlayersArray.append(self.currentPlayers)
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def currentTurnString(self):
        return SR_currentTurnString("Bus", self.turn, self.phase)

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.currentPlayers == "":
            return True
        if (
            (loggedInPlayerUsername in self.currentPlayers)
            or (self.currentPlayers == "SHADOW")
            or (self.currentPlayers == "SHADOW_2")
            or (self.currentPlayers == "SHADOW_3")
            or (self.currentPlayers == "SHADOW_4")
        ):
            return True
        else:
            return False

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        # Return False if no username is provided
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        # Use a set for faster membership testing
        shadow_values = {
            "SHADOW",
            "SHADOW_2",
            "SHADOW_3",
            "SHADOW_4",
            "SHADOW_5",
            "FcmAI",
        }
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

    def getCurrentRewindConsent(self, _username):
        return json.loads(self.rewindConsent)[self.seatPosition(_username)]

    def kickoutRequired(self):
        # return True
        all_player_usernames = [p.username for p in self.allPlayers.all()]
        return SF_kickoutRequired(
            self.gameStatus,
            all_player_usernames,
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            self.getCurrentPlayersArray()[0],
        )

    # Takes in a loggedInUser OBJECT
    def serialize(self, loggedInUser=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = ""
        for i in range(remainingPlayersInt):
            remainingPlayers += str(self.allPlayers.count() + i + 1)
        winner = ""
        if self.winner:
            winner = self.winner.username

        createdString = self.created
        latestUpdateString = self.latestUpdate

        latestUpdateElapsedTimeString = ""
        if (
            self.gameStatus == "WAITING"
            or self.gameStatus == "AVAILABLE"
            or self.gameStatus == "ACTIVE"
            or self.gameStatus == "PRIVATE"
        ):
            elapsedTotalSeconds = int(time.time()) - int(self.created) // 1000

            if (
                self.gameStatus == "WAITING"
                or self.gameStatus == "AVAILABLE"
                or self.gameStatus == "PRIVATE"
            ):
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

        if loggedInUser in self.allPlayers.all() and (
            loggedInUser not in self.missingPlayers.all()
        ):
            involvedPlayer = True

        if loggedInUser in self.playersWithChatNotification.all():
            chatNotification = True

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = SR_getBUSstartingOptionsHTML(self.startingOptions)

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
        deleteableGame = False
        if (
            "SHADOW" in self.allPlayers.all().values_list("username", flat=True)
            and loggedInUser in self.allPlayers.all()
        ):
            deleteableGame = True

        return {
            "gameID": self.id,
            "gameName": self.getGameName(),
            "gameDescription": self.gameDescription,
            "creator": getattr(self.creator, "username"),
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
            # "startingMap": self.startingMap,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "Bus",
            "remainingPlayers": remainingPlayers,  # WHAT DOES THIS DO???????
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

    # takes in a USERNAME
    def seatPosition(self, name, withoutBots=False):
        # 1. Get the list of players (this already uses the prefetch cache)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)

        # 2. Use 'index' to find the position.
        # If the name isn't in the list, it will raise a ValueError.
        try:
            return playerList.index(name)
        except ValueError:
            return -1

    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # Use list comprehension on .all() to access the prefetch cache
        playerList = [p.username for p in self.allPlayers.all()]
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        # Access prefetched missingPlayers usernames in memory
        missingPlayerUsernames = {p.username for p in self.missingPlayers.all()}

        # Use a set for missingPlayerUsernames for O(1) lookup speed
        for count, player in enumerate(playerList):
            if player in missingPlayerUsernames:
                playerList[count] = "BusBot" + str(count)

        return playerList

    def getCurrentPlayersString(self):
            return ", ".join(self.getCurrentPlayersArray())

    def startGame(self, request):
        from django_q.tasks import async_task
        self.gameStatus = "ACTIVE"
        if self.playerOrderSeed == 0:
            self.playerOrderSeed = random.randint(0, 32767)

        allPlayersL = self.getAllPlayersOrderedySeat()
        self.currentPlayers = allPlayersL[0]
        if self.startingOptions == 102:
            for user in self.allPlayers.all():
                if self.seatPosition(user.username) == 0:
                    _currentPlayers = user.username
                    self.currentPlayers = _currentPlayers

        rewindConsentString = ""
        for i in range(self.maxPlayers):
            rewindConsentString += "0"
        hostSeat = self.seatPosition(getattr(self.host, "username"))
        rewindConsentList = list(rewindConsentString)
        rewindConsentList[hostSeat] = "2"
        rewindConsentString = "".join(rewindConsentList)
        if "SHADOW" in self.allPlayers.all().values_list("username", flat=True):
            rewindConsentString = "22222"
        self.rewindConsent = rewindConsentString

        self.statsExcludeConsent = "0" * self.maxPlayers

        # required to send correct start player notification
        self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            self.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )
            self.save()

        # The tournament sends out game start notifications
        if (
            self.relatedTournament is None
            and "SHADOW" not in self.allPlayers.all().values_list("username", flat=True)
        ):
            playerListToNotify = list(
                self.allPlayers.all().values_list("username", flat=True)
            )
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            message_data = BLANK_MESSAGE_TEMPLATE.copy() 
            #message_data["gameName"] = self.gameObj.getGameName()
            message_data["gameID"] = self.id
            message_data["gameName"] = self.getGameName()
            message_data["gameCode"] = "Bus"
            message_data["username"] = request.user.username
            message_data["currentPlayersString"] = self.getCurrentPlayersString()
            message_data["maxPlayers"] = self.maxPlayers
            #message_data["relatedMainTournamentID"] = self.relatedMainTournament.id if self.relatedMainTournament else 0
            #message_data["relatedMiniTournamentID"] = self.relatedMiniTournament.id if self.relatedMiniTournament else 0
            
            print("about to start Bus async task")           
            async_task(
                "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                playerListToNotify,
                message_data,
            )
            #async_task(
            #    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
            #    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
            #    "Bus",
            #    playerListToNotify,
            #    self.id,
            #    self,
            #    username,
            #)

    # takes in a user object

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all()
                .filter(~Q(missingPlayersRelName=self.id))
                .order_by("?")
                .first()
            )
            self.host = possibleHost

    # takes in username
    def enableStatsExclude(self, _username):
        seatToChange = self.seatPosition(_username, True)
        if self.statsExcludeConsent == None:
            self.statsExcludeConsent = ""
        if (len(self.statsExcludeConsent)) < self.maxPlayers:
            self.statsExcludeConsent = "0" * self.maxPlayers
        self.statsExcludeConsent = (
            self.statsExcludeConsent[:seatToChange]
            + "1"
            + self.statsExcludeConsent[seatToChange + 1 :]
        )
        # CHECK TOTAL CONSENT
        totalConsent = 0
        for letter in self.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.maxPlayers:
            self.statsExcludedGame = True

    def getRewindHostPossible(self):
        # If any players are missing, enable rewind
        if len(self.missingPlayers.all()) > 0:
            self.rewindConsent = "222222"
            self.save()
        possible = True
        rewindConsentList = list(self.rewindConsent)
        for consent in rewindConsentList:
            if consent == "0":
                possible = False
        return possible

    # def isTournamentRoundFinished(self, tournamentProgressionDataArray):
    #    if self.relatedTournament is None:
    #        return False
    #
    #    # Check all games from previous round are finished
    #    finishedGames = 0
    #    for row in tournamentProgressionDataArray[-1]:
    #        if row[0] == "BYEPLAYERS":
    #            finishedGames += 1
    #        else:
    #            game = Bus_Game.objects.get(id=row[self.relatedTournament.maxGamePlayers])
    #            if game.gameStatus == "FINISHED":
    #                finishedGames += 1
    #    if finishedGames == len(tournamentProgressionDataArray[-1]):
    #        return True
    #    return False

    def getGameCode(self):
        return "Bus"

    def getDeleteVotesData(self):
        player_usernames = [p.username for p in self.allPlayers.all()]

        if self.gameStatus == "FINISHED":
            return {username: False for username in player_usernames}

        if self.deleteGameVotes is None:
            self.deleteGameVotes = {username: False for username in player_usernames}
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
            self.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )

        # If the playerName isn't found, wipe the votes and make sure all players are added
        if playerName not in self.deleteGameVotes:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )

        # Add the vote
        self.deleteGameVotes[playerName] = True
        self.save()
        return True
