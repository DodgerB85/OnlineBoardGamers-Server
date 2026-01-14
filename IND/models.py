import time
import json
import random
import base64
import gzip

from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.utils.translation import gettext

from Lobby.models import User, GeneralGame

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessTournamentEndGame,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getINDstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
    SR_getTournamentWinnerHTML,
    SR_getTournamentRoundsHTML,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    SN_M_sendGameStartNotification,
    SN_M_T_sendTournamentGameStartNotification,
)


class IND_Tournament(models.Model):
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

    startingOptions = models.CharField(max_length=20, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_IND", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="currentRoundPlayersRelName_IND",
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

    def isSignedUp(self, loggedInUser):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

    def createTournamentGame(
        self, request, _roundNumberString, _currentPlayersUsernames
    ):
        gameName = f"[{self.tournamentName}] {_roundNumberString}"
        playerOrderSeed = random.randint(1000, 32767)
        pace = 30
        creator = User.objects.get(username="admin")

        newGame = IND_Game(
            gameName=gameName,
            creator=creator,
            gamePace=pace,
            playerOrderSeed=playerOrderSeed,
            startingOptions=self.startingOptions,
            maxPlayers=self.maxGamePlayers,
            gameStatus="ACTIVE",
        )

        newGame.save()

        for i in range(self.maxGamePlayers):
            if _currentPlayersUsernames[i] != "":
                player = User.objects.get(username=_currentPlayersUsernames[i])
                newGame.allPlayers.add(player)
                SN_M_T_sendTournamentGameStartNotification(
                    request,
                    "IND",
                    _currentPlayersUsernames[i],
                    self.maxGamePlayers,
                    newGame.gameName,
                    newGame.currentTurnString(),
                    getattr(newGame, "id"),
                    False,
                    "normalTournament",
                )

        newGame.kickoutDuration = 100
        newGame.relatedTournament = self
        newGame.host = newGame.allPlayers.all().order_by("?").first()
        newGame.tournamentGame = True

        newGame.save()
        newGame.startGame(request, True)
        return getattr(newGame, "id")

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
            "gameCode": "IND",
            "tournamentLink": f"/INDtournament/IND/{self.id}/",
        }

    def getRoundsHTML(self):
        # Only for IP or FN tournaments
        roundsHTML = SR_getTournamentRoundsHTML(
            self.tournamentType,
            self.maxGamePlayers,
            self.tournamentProgressionData,
            self.tournamentPointsData,
            "IND",
            self,
        )
        return roundsHTML


class IND_Game(GeneralGame):        
    allPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="INDallPlayersRelName"
    )
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="INDmissingPlayersRelName", blank=True
    )
    
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="INDgame_creator_relName",
        default=None,
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="INDgame_host_relName",
        default=None,
    )
    
    kickedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="INDkickedPlayersRelName", blank=True
    )
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="INDinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="INDplayersWithChatNotificationName",
        blank=True,
    )
    
    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="INDgame_winner_relName",
        blank=True,
    )

    zoomLevels = models.CharField(
        max_length=30, blank=False, default=json.dumps([0, 0, 0, 0])
    )

    player4notes = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)
    relatedTournament = models.ForeignKey(
        IND_Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tournament_relName_IND",
    )

    playersPreMoveData = models.TextField(blank=True)

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
        self.clearAllPreMoveData()
        self.deleteGameVotes = None

        self.winner = User.objects.get(username=_winner)
        self.save()

        # _finalPositions is just an array of playerIndexes
        # finalPositionsArr is an array of [pos, username]
        finalPositionsArr = []
        for seatPos in _finalPositions:
            finalPositionsArr.append(self.getAllPlayersOrderedySeat()[seatPos])
        # Now send winning notification
        SN_M_sendEndGameNotification(request, "IND", finalPositionsArr, _gameID, self)

        if self.relatedTournament:
            SF_M_ProcessTournamentEndGame(request, "IND", self, [_winner])

    def currentTurnString(self):
        return SR_currentTurnString("IND", self.turn, self.phase)

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
        remainingPlayers = "".join(
            str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt)
        )
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
                if self.gameStatus == "WAITING"
                or self.gameStatus == "AVAILABLE"
                or self.gameStatus == "PRIVATE"
                else int(time.time()) - int(self.latestUpdate) // 1000
            )
            latestUpdateElapsedTimeString = (
                SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds)
            )

        myMove = loggedInUserObj is not None and self.isMyMove(loggedInUserObj.username)

        chatNotification = loggedInUserObj in self.playersWithChatNotification.all()
        involvedPlayer = (
            loggedInUserObj in self.allPlayers.all()
            and loggedInUserObj not in self.missingPlayers.all()
        )

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = SR_getINDstartingOptionsHTML(self.startingOptions)

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
            "game": "IND",
            "remainingPlayers": remainingPlayers,  # Used in lobby somewhere
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = (
            json.loads(self.startingOptions) if self.startingOptions else []
        )

        if 120 in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = (
            json.loads(self.startingOptions) if self.startingOptions else []
        )
        if 110 in startingOptionsListPrelim:
            return True
        return False

    # takes in a USERNAME
    def seatPosition(self, _username, withoutBots=False):
        # 1. Get the list (This uses the prefetched cache if getAllPlayersOrderedySeat is optimized)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        
        # 2. Use Python's 'index' to find the position. 
        # This replaces the need for the .values_list() existence check.
        try:
            return playerList.index(_username)
        except (ValueError, TypeError):
            # ValueError is raised if the username is not in the list
            return -1

    # NB withoutBots returns original players. with True it replaces with IndBot
    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # 1. Access the prefetched list in memory (0 hits)
        all_players_prefetched = list(self.allPlayers.all())

        # 2. Extract usernames in Python (0 hits)
        playerList = [p.username for p in all_players_prefetched]

        # 3. Shuffle using the existing seed (0 hits)
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        # 4. Use prefetched missingPlayers cache (0 hits)
        # Convert to a set for O(1) membership lookup speed
        missing_usernames = {p.username for p in self.missingPlayers.all()}

        # 5. Replace missing players with Bots in Python (0 hits)
        for count, player in enumerate(playerList):
            if player in missing_usernames:
                playerList[count] = "IndBot"

        return playerList

    def startGame(self, request, isTournamentGame=False):
        self.gameStatus = "ACTIVE"
        # Only do this if no gameData ie not a form
        if self.gameData == "" or self.gameData is None:
            self.playerOrderSeed = random.randint(1000, 32767)
            allPlayersL = self.getAllPlayersOrderedySeat()
            self.currentPlayers = allPlayersL[0]

        self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            self.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )
            self.save()

            playerListToNotify = list(
                self.allPlayers.all().values_list("username", flat=True)
            )
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # The tournament sends out game start notifications
            if not isTournamentGame:
                SN_M_sendGameStartNotification(
                    request, "IND", playerListToNotify, getattr(self, "id"), self
                )

    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        _currentPlayersArray.append(self.currentPlayers)
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all()
                .filter(~Q(missingPlayersRelName=getattr(self, "id")))
                .order_by("?")
                .first()
            )
            self.host = possibleHost

    def getGameCode(self):
        return "IND"

    #########################################################
    #
    #   NEW SIMUL MOVE FUNCTIONS
    #
    #########################################################

    # This always ensures you get a valid array return
    # any bots are set to phase -99 here, so you know nothing is expcected, ie they can't move
    def getOrScaffoldAllPreMoveData(self):
        try:
            data = json.loads(self.playersPreMoveData)
            if len(data) != self.maxPlayers:
                raise ValueError("Invalid number of players")
            # Validate structure further if needed
            return data
        except (json.JSONDecodeError, ValueError):
            # Scaffold default structure
            allPlayers = self.getAllPlayersOrderedySeat(True)
            # missing_players = set(self.missingPlayers.values_list("username", flat=True))
            return [[playerName, [-1], "", []] for playerName in allPlayers]

    def insertPlayerPreMoveData(self, name, phasesArr, moveArr):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersPreMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )

        playersPreMoveDataArr[arrIdx] = [
            name,
            phasesArr,
            str(int(time.time()) * 1000),
            moveArr,
        ]

        self.playersPreMoveData = json.dumps(playersPreMoveDataArr)

        self.save()

    def getAllPreMoveDataCompressed(self):
        allData = self.getOrScaffoldAllPreMoveData()
        for entry in allData:
            if len(entry[3]) > 0 and entry[3][0] != self.turn:
                entry[1] = [-1]
                entry[2] = ""
                entry[3] = []
        return base64.b64encode(
            gzip.compress(json.dumps(allData, separators=(",", ":")).encode("utf-8"))
        ).decode("utf-8")

    def getCompressedPreMoveArr(self, name):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersPreMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        # Only return the move if it is valid for current phase OR has a preset-clenaup
        playerMoveDataArr = playersPreMoveDataArr[arrIdx]
        # Check for invalid moves, and return ""
        if len(playerMoveDataArr) != 4:
            return ""
        if len(playerMoveDataArr[3]) == 0:
            return ""
        if len(playerMoveDataArr[3]) == 0:
            return ""
        if playerMoveDataArr[3][0] != self.turn:
            playerMoveDataArr[1] = [-1]
            playerMoveDataArr[2] = ""
            playerMoveDataArr[3] = []
            return ""
        return base64.b64encode(
            gzip.compress(
                json.dumps(playerMoveDataArr, separators=(",", ":")).encode("utf-8")
            )
        ).decode("utf-8")

    def deleteSinglePlayersPreMove(self, name):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersPreMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        playersPreMoveDataArr[arrIdx] = [name, [-1], "", []]
        self.playersMoveData = json.dumps(playersPreMoveDataArr)
        self.save()

    def clearAllPreMoveData(self):
        self.playersMoveData = ""
        self.save()

    #########################################################
    #
    #   END OF NEW SIMUL MOVE FUNCTIONS
    #
    #########################################################

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
