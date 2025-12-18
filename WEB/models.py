import time
import json
import random
import gzip
import base64

from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.utils.translation import gettext

from Lobby.models import User

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
)  # , SF_M_ProcessTournamentEndGame
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getWEBstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    SR_GAME_STATUS_CHOICES,
    # SR_TOURNAMENT_STATUS_CHOICES,
    # SR_TOURNAMENT_TYPE_CHOICES,
    # SR_getTournamentWinnerHTML,
    # SR_getTournamentRoundsHTML,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotificationTieGame,
    SN_M_sendGameStartNotification,
)  # , SN_M_T_sendTournamentGameStartNotification


class WEB_Game(models.Model):
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

    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="WEBallPlayersRelName")
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="WEBmissingPlayersRelName", blank=True
    )
    currentPlayers = models.CharField(max_length=100, blank=True)

    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    #winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="WEBgame_winner_relName", blank=True)
    winner = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="WEBgame_winner_relName", blank=True)
    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=1)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=0)

    kickoutDuration = models.PositiveSmallIntegerField(null=False, blank=False, default=200)
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=40)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="WEBgame_creator_relName",
        default=None,
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="WEBgame_host_relName",
        default=None,
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    zoomLevels = models.CharField(max_length=30, blank=False, default=json.dumps([]))

    # statsExcludeConsent = models.CharField(max_length=4, blank=False, default="0000")

    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="WEBkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="WEBinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="WEBplayersWithChatNotificationName", blank=True
    )

    chatData = models.TextField(blank=True)

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)
  
    #tournamentGame = models.BooleanField(blank=False, default=False)
    # relatedTournament = models.ForeignKey(WEB_Tournament, on_delete=models.SET_NULL, null=True, blank=True, related_name="tournament_relName_WEB")

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    kickoutFlexiData = models.TextField(blank=True)
    
    deleteGameVotes = models.JSONField(default=dict, blank=True, null=True)

    def __str__(self):
        allPlayersString = " / ".join(user.username for user in self.allPlayers.all())
        return f"{getattr(self, 'id')}: {self.getGameName()} : {allPlayersString} : {self.gameStatus} : {self.currentTurnString()}"

    def getGameName(self):
        _gameName = ""
        if self.gameName != "":
            _gameName = self.gameName
        elif self.creator is not None:
            _gameName = f"[{self.creator.username}'s Game]"
        if self.gameStatus == "PRIVATE":
            _gameName += "[Private Game]"
        return _gameName

    # Takes in self, request, and then 3 JSON[""] pieces of string data
    def endGame(self, request, _winner, _finalPositions, _gameID):
        self.rewindData = ""
        self.rewindTempData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"
        self.deleteGameVotes = None

        # self.winner = User.objects.get(username=_winner)
        names = self.getAllPlayersOrderedySeat(False)
        winnerNamesArray = []
        for playerIndex in _winner:
            self.winner.add(User.objects.get(username=names[playerIndex]))
            winnerNamesArray.append(names[playerIndex])
        self.save()
        
        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                _finalPositions[i][j] = names[_finalPositions[i][j]]

        # Flatten the array to [username, position]
        finalResults = []
        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                text = "Trapped in a dot matrix"
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
            finalResults.append([name, "Trapped in a dot matrix", 9])

        # Now send winning notification
        SN_M_sendEndGameNotificationTieGame(request, "WEB", finalResults, _gameID, self)
        
        # if self.relatedTournament:
        #    SF_M_ProcessTournamentEndGame(request, "AQY", self, winnerNamesArray)

    def currentTurnString(self):
        return SR_currentTurnString("WEB", self.turn, self.phase)

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.currentPlayers == "":
            return True
        if (
            (loggedInPlayerUsername in self.currentPlayers)
            or (self.currentPlayers == "SHADOW")
            or (self.currentPlayers == "SHADOW_2")
            or (self.currentPlayers == "SHADOW_3")
            or (self.currentPlayers == "SHADOW_4")
            or (self.currentPlayers == "SHADOW_5")
        ):
            return True

        # Allow pre-move myMove
        # if self.phase == 1 and not self.hasMoveEndData(loggedInPlayerUsername) and loggedInPlayerUsername not in self.currentPlayers:
        #    return True
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
        all_player_usernames = [p.username for p in self.allPlayers.all()]
        return SF_kickoutRequired(
            self.gameStatus,
            all_player_usernames,
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            self.getCurrentPlayersArray()[0],
        )

    def serialize(self, loggedInUserObj=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = "".join(str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt))

        #winner = self.winner.username if self.winner else ""
        winner = ", ".join(list(self.winner.all().values_list("username", flat=True))) if self.winner.exists() else ""

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

        startingOptionsHTML = SR_getWEBstartingOptionsHTML(self.startingOptions)

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
            "creator": self.creator.username if self.creator else "",
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
            "game": "WEB",
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
        # 1. Get the list (this uses your optimized prefetched logic)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)

        # 2. Use 'index' directly; if the user isn't in the list, 
        # it will raise a ValueError which we catch to return -1.
        try:
            return playerList.index(_username)
        except ValueError:
            # This handles both: not a player OR user is currently replaced by "WebBot"
            return -1

    # NB withoutBots returns original players. with True it replaces with WebBot
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
                playerList[count] = f"WebBot{count}"
                
        return playerList
    
    
    def startGame(self, request, isTournamentGame=False):
        self.gameStatus = "ACTIVE"
        self.playerOrderSeed = random.randint(1000, 32767)
        allPlayersL = self.getAllPlayersOrderedySeat(True)
        self.currentPlayers = allPlayersL[0]
        self.save()

        # If not a training game, send out notifications
        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            self.deleteGameVotes.update({username: False for username in player_usernames})
            self.save()
            
            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # The tournament sends out game start notifications
            if not isTournamentGame:
                SN_M_sendGameStartNotification(request, "WEB", playerListToNotify, getattr(self, "id"), self)

    def getCurrentPlayers(self):
        return self.currentPlayers
        #_currentPlayers = []
        #_currentPlayers = self.currentPlayers.split(",")
        #for user in self.allPlayers.all():
        #    # If you have a move, then don't add
        #    if self.hasMoveEndData(user.username):
        #        pass
        #    # if you don't NEED to move (not in currentPlayers), then don't add
        #    elif user.username not in self.currentPlayers.split(","):
        #        pass
        #    elif user.username != "WebBot":
        #        _currentPlayers.append(user.username)

        #return ",".join(_currentPlayers)

    def getCurrentPlayersArray(self):
        # _currentPlayersArray = []
        # _currentPlayersArray.append(self.currentPlayers)
        _currentPlayersArray = [player.strip() for player in self.getCurrentPlayers().split(",")]
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all().filter(~Q(missingPlayersRelName=getattr(self, "id"))).order_by("?").first()
            )
            self.host = possibleHost

    def getGameCode(self):
        return "WEB"

    def getDeleteVotesData(self):
        if self.gameStatus == "FINISHED":
            # Access .all() directly to use the prefetched cache
            return {p.username: False for p in self.allPlayers.all()}

        if self.deleteGameVotes is None:
            # Accessing .all() here uses the cache; no DB hit
            self.deleteGameVotes = {p.username: False for p in self.allPlayers.all()}
            self.save() # Note: This .save() will still hit the DB to persist the change
            
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
    
    # def enableStatsExclude(self, _username):
    #    seatToChange = self.seatPosition(_username, True)
    #    self.statsExcludeConsent = self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
    #    # CHECK TOTAL CONSENT
    #    totalConsent = 0
    #    for letter in self.statsExcludeConsent:
    #        totalConsent += int(letter)
    #    if totalConsent == self.maxPlayers:
    #        self.statsExcludedGame = True

  