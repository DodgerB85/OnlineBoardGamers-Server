import time
import json
import random

from django.db import models
from django.db.models import Q

from django.conf import settings
from decouple import config, Csv

# from django.utils.translation import gettext

from Lobby.models import User

from Lobby.sharedFunctions.sharedFunctions import SF_getSecondsToNextKickout, SF_kickoutRequired
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getCNSstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    SR_GAME_STATUS_CHOICES,
)
from Lobby.sharedFunctions.sharedNotifications import SN_M_sendEndGameNotification, SN_M_sendGameStartNotification


class CNS_Game(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field
    
    gameName = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

    gameDescription = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

    gameStatus = models.CharField(
        max_length=9,
        choices=SR_GAME_STATUS_CHOICES,
        default="AVAILABLE",
        db_index=True, 
    )

    latestUpdate = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)
    startingOptions = models.CharField(max_length=20, blank=True)

    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="CNSallPlayersRelName")
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="CNSmissingPlayersRelName", blank=True
    )
    currentPlayers = models.CharField(max_length=100, blank=True)

    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="CNSgame_winner_relName",
        blank=True,
    )

    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=1)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=0)

    kickoutDuration = models.PositiveSmallIntegerField(null=False, blank=False, default=200)
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=40)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="CNSgame_creator_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="CNSgame_host_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    zoomLevels = models.CharField(max_length=30, blank=False, default=json.dumps([24, 24, 24, 24]))

    statsExcludeConsent = models.CharField(max_length=4, blank=False, default="0000")

    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="CNSkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="CNSinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="CNSplayersWithChatNotificationName", blank=True
    )

    chatData = models.TextField(blank=True)

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)

    # tournamentGame = models.BooleanField(blank=False, default=False)
    # relatedTournament = models.ForeignKey(HC_Tournament, on_delete=models.SET_NULL,
    #                                      null=True, blank=True, related_name='tournament_relName')

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    kickoutFlexiData = models.TextField(blank=True)

    def __str__(self):
        allPlayersString = " / ".join(user.username for user in self.allPlayers.all())
        return f"{getattr(self, 'id')}: {self.getGameName()} : {allPlayersString} : {self.gameStatus} : {self.currentTurnString()}"

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
        self.save()
        # self.clearAllMoveData()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "CNS", _finalPositions, _gameID, self)

        # if self.relatedTournament:
        # CODE REMOVED

    def currentTurnString(self):
        return SR_currentTurnString("CNS", self.turn, self.phase)

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.currentPlayers == "":
            return True
        if (
            (loggedInPlayerUsername in self.currentPlayers)
            or (self.currentPlayers == "SHADOW")
            or (self.currentPlayers == "SHADOW_2")
            or (self.currentPlayers == "SHADOW_3")
        ):
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
        # 1. Use a list comprehension to utilize the prefetch cache (0 Hits)
        all_player_usernames = [p.username for p in self.allPlayers.all()]
        
        # 2. Get the current players using your optimized string-split method
        current_players = self.getCurrentPlayersArray()
        
        # 3. Safety check: Ensure there is at least one current player to avoid IndexError
        current_username = current_players[0] if current_players else ""

        return SF_kickoutRequired(
            self.gameStatus,
            all_player_usernames,
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            current_username,
        )

    def serialize(self, loggedInUserObj=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = "".join(str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt))
        winner = self.winner.username if self.winner else ""

        createdString = self.created
        latestUpdateString = self.latestUpdate

        latestUpdateElapsedTimeString = ""
        if (
            self.gameStatus == "WAITING"
            or self.gameStatus == "AVAILABLE"
            or self.gameStatus == "ACTIVE"
            or self.gameStatus == "PRIVATE"
        ):
            elapsedTotalSeconds = (
                int(time.time()) - int(self.created) // 1000
                if self.gameStatus == "WAITING" or self.gameStatus == "AVAILABLE" or self.gameStatus == "PRIVATE"
                else int(time.time()) - int(self.latestUpdate) // 1000
            )
            latestUpdateElapsedTimeString = SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds)

        myMove = loggedInUserObj is not None and self.isMyMove(loggedInUserObj.username)

        chatNotification = loggedInUserObj in self.playersWithChatNotification.all()
        involvedPlayer = loggedInUserObj in self.allPlayers.all() and loggedInUserObj not in self.missingPlayers.all()

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = SR_getCNSstartingOptionsHTML(self.startingOptions)

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

        deleteableGame = (
            "SHADOW" in self.allPlayers.all().values_list("username", flat=True)
            and loggedInUserObj in self.allPlayers.all()
        )

        return {
            "gameID": getattr(self, "id"),
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
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "CNS",
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
        # 1. Get the list (0 hits if using prefetched .all() logic)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        
        # 2. Use Python's index to find the position. 
        # This replaces the need for the redundant .values_list() query.
        try:
            return playerList.index(_username)
        except (ValueError, TypeError):
            # ValueError is raised by .index() if the username is not in the list
            return -1

    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # 1. Access the prefetched list (0 hits if prefetched in view)
        all_players_prefetched = list(self.allPlayers.all())
        
        # 2. Extract usernames in Python (0 hits)
        playerList = [p.username for p in all_players_prefetched]
        
        # 3. Shuffle using your existing seed (0 hits)
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        # 4. Use prefetched missingPlayers cache (0 hits)
        # Convert to a set for O(1) membership lookup speed
        missing_usernames = {p.username for p in self.missingPlayers.all()}

        # 5. Replace missing players with Bots in Python (0 hits)
        for count, player in enumerate(playerList):
            if player in missing_usernames:
                # Using f-string for slightly better performance/readability
                playerList[count] = f"CnsBot{count}"
                
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

            SN_M_sendGameStartNotification(request, "CNS", playerListToNotify, getattr(self, "id"), self)

    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        _currentPlayersArray.append(self.currentPlayers)
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = self.allPlayers.all().filter(~Q(missingPlayersRelName=getattr(self, "id"))).order_by("?").first()
            self.host = possibleHost

    def enableStatsExclude(self, _username):
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

    def getGameCode(self):
        return "CNS"
