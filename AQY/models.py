import time
import json
import random
import base64
import gzip

from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.utils.translation import gettext, gettext_lazy

from Lobby.models import User, Main_Tournament

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessTournamentEndGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_T_sendTournamentGameStartNotification,
    SN_M_sendEndGameNotificationTieGame,
    SN_M_sendGameStartNotification,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
    SR_GAME_STATUS_CHOICES,
    SR_currentTurnString,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    SR_gamePaceString,
    SR_getAQYstartingOptionsHTML,
    SR_getTournamentWinnerHTML,
    SR_getTournamentRoundsHTML,
    SR_getTimeNow,
)


class AQY_Tournament(models.Model):
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
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_AQY", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="currentRoundPlayersRelName_AQY",
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

        newGame = AQY_Game(
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
                    "AQY",
                    _currentPlayersUsernames[i],
                    self.maxGamePlayers,
                    newGame.gameName,
                    newGame.currentTurnString(),
                    newGame.id,
                    False,
                    "normalTournament",
                )

        newGame.kickoutDuration = 100
        newGame.relatedTournament = self
        newGame.host = newGame.allPlayers.all().order_by("?").first()
        newGame.tournamentGame = True

        newGame.save()
        newGame.startGame(request, True)
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
            "tournamentID": self.id,
            "tournamentName": self.tournamentName,
            # "tournamentStatus": self.get_tournamentStatus_display(),
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": "AQY",
            "tournamentLink": f"/AQYtournament/AQY/{self.id}/",
        }

    def getRoundsHTML(self):
        # Only for IP or FN tournaments
        roundsHTML = SR_getTournamentRoundsHTML(
            self.tournamentType,
            self.maxGamePlayers,
            self.tournamentProgressionData,
            self.tournamentPointsData,
            "AQY",
            self,
        )
        return roundsHTML


class AQY_Game(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field
    gameName = models.CharField(
        max_length=120, blank=True, db_collation="utf8mb4_general_ci"
    )

    gameDescription = models.CharField(
        max_length=120, blank=True, db_collation="utf8mb4_general_ci"
    )

    gameStatus = models.CharField(
        max_length=9,
        choices=SR_GAME_STATUS_CHOICES,
        default="AVAILABLE",
        db_index=True,
    )

    latestUpdate = models.CharField(
        max_length=15, blank=False, default=SR_getTimeNow, db_index=True
    )
    startingOptions = models.CharField(max_length=20, blank=True)
    startingMap = models.CharField(max_length=80, blank=True)

    allPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="AQYallPlayersRelName"
    )
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="AQYmissingPlayersRelName", blank=True
    )
    currentPlayers = models.CharField(max_length=100, blank=True)

    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    # winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
    #                           null=True, related_name='AQYgame_winner_relName', blank=True)
    winner = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="AQYgame_winner_relName", blank=True
    )

    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=1)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=0)

    kickoutDuration = models.PositiveSmallIntegerField(
        null=False, blank=False, default=200
    )
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=40)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="AQYgame_creator_relName",
        default=None,
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="AQYgame_host_relName",
        default=None,
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    zoomLevels = models.CharField(
        max_length=30, blank=False, default=json.dumps([16, 16, 16, 16])
    )

    statsExcludeConsent = models.CharField(max_length=4, blank=False, default="0000")

    player0currentMoveTime = models.CharField(max_length=15, blank=True)
    player0currentMoveData = models.TextField(blank=True)
    player1currentMoveTime = models.CharField(max_length=15, blank=True)
    player1currentMoveData = models.TextField(blank=True)
    player2currentMoveTime = models.CharField(max_length=15, blank=True)
    player2currentMoveData = models.TextField(blank=True)
    player3currentMoveTime = models.CharField(max_length=15, blank=True)
    player3currentMoveData = models.TextField(blank=True)

    kickedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="AQYkickedPlayersRelName", blank=True
    )
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="AQYinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="AQYplayersWithChatNotificationName",
        blank=True,
    )

    chatData = models.TextField(blank=True)

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)
    relatedTournament = models.ForeignKey(
        AQY_Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tournament_relName_AQY",
    )
    
    relatedMainTournament = models.ForeignKey(
        Main_Tournament, on_delete=models.SET_NULL, null=True, blank=True, related_name="maintournamentAQY_relName"
    )

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    kickoutFlexiData = models.TextField(blank=True)

    playerTradeData = models.TextField(blank=True)

    deleteGameVotes = models.JSONField(default=dict, blank=True, null=True)

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
        self.player0currentMoveData = ""
        self.player1currentMoveData = ""
        self.player2currentMoveData = ""
        self.player3currentMoveData = ""
        self.playerTradeData = ""
        # self.winner = User.objects.get(username=_winner)
        names = self.getAllPlayersOrderedySeat(False)
        winnerNamesArray = []
        for playerIndex in _winner:
            self.winner.add(User.objects.get(username=names[playerIndex]))
            winnerNamesArray.append(names[playerIndex])
        self.clearAllMoveData()
        self.deleteGameVotes = None

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
        new_names = [
            name
            for name in names
            if name not in [item for sublist in _finalPositions for item in sublist]
        ]

        for name in new_names:
            finalResults.append([name, "Lost in Antiquity", 9])

        # Now send winning notification
        SN_M_sendEndGameNotificationTieGame(request, "AQY", finalResults, _gameID, self)

        if self.relatedTournament:
            SF_M_ProcessTournamentEndGame(request, "AQY", self, winnerNamesArray)

    def currentTurnString(self):
        return SR_currentTurnString("AQY", self.turn, self.phase)

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
        # 1. Use a list comprehension to stay in Python memory (0 Hits)
        # This uses the data already loaded by prefetch_related('allPlayers')
        all_player_usernames = [p.username for p in self.allPlayers.all()]

        # 2. Get the current players array
        # Ensure this method uses self.currentPlayers (the string field)
        # instead of doing a new DB query
        current_players = self.getCurrentPlayersArray()

        # Safety check for empty arrays
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
        remainingPlayers = "".join(
            str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt)
        )
        winner = (
            ", ".join(list(self.winner.all().values_list("username", flat=True)))
            if self.winner.exists()
            else ""
        )
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

        startingOptionsHTML = SR_getAQYstartingOptionsHTML(self.startingOptions)

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
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "AQY",
            "remainingPlayers": remainingPlayers,  # Used in lobby somewhere
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
            "startingMap": self.startingMap,
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
        # 1. Get the list (This is 0 hits if getAllPlayersOrderedySeat uses .all())
        playerList = self.getAllPlayersOrderedySeat(withoutBots)

        # 2. Use Python's index to find the position.
        # This replaces the need for the redundant .values_list() query.
        try:
            return playerList.index(_username)
        except (ValueError, TypeError):
            # ValueError is raised if the username is not in the list
            return -1

    # NB withoutBots returns original players. with True it replaces with AqyBot
    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # 1. Access the prefetched list in memory (0 hits if prefetched in view)
        all_players_prefetched = list(self.allPlayers.all())

        # 2. Extract usernames in Python (0 hits)
        playerList = [p.username for p in all_players_prefetched]

        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        missing_usernames = {p.username for p in self.missingPlayers.all()}

        # REPLACE WITH KICKOUTS
        for count, player in enumerate(playerList):
            if player in missing_usernames:
                playerList[count] = "AqyBot"

        return playerList

    def startGame(self, request, isTournamentGame=False):
        self.gameStatus = "ACTIVE"
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
                    request, "AQY", playerListToNotify, self.id, self
                )

    def hasMoveEndData(self, name):
        seat = self.seatPosition(name)

        player_moves = {
            0: self.player0currentMoveData,
            1: self.player1currentMoveData,
            2: self.player2currentMoveData,
            3: self.player3currentMoveData,
        }
        player_moves_times = {
            0: self.player0currentMoveTime,
            1: self.player1currentMoveTime,
            2: self.player2currentMoveTime,
            3: self.player3currentMoveTime,
        }
        player_move = player_moves.get(seat, "")
        player_time = player_moves_times.get(seat, "")

        return bool(
            player_move != ""
            and player_time != "MID_PHASE"
            and player_time != "PRE_MOVE"
        )

    def hasMoveMidData(self, name):
        seat = self.seatPosition(name)

        player_moves = {
            0: self.player0currentMoveData,
            1: self.player1currentMoveData,
            2: self.player2currentMoveData,
            3: self.player3currentMoveData,
        }
        player_moves_times = {
            0: self.player0currentMoveTime,
            1: self.player1currentMoveTime,
            2: self.player2currentMoveTime,
            3: self.player3currentMoveTime,
        }
        player_move = player_moves.get(seat, "")
        player_time = player_moves_times.get(seat, "")

        return bool(player_move != "" and player_time == "MID_PHASE")

    def getCurrentPlayers(self):
        # 1. Use the prefetched cache (0 hits if allPlayers is prefetched)
        # Convert to a list once to ensure we stay in memory
        all_players_list = self.allPlayers.all()

        _currentPlayers = []
        for user in all_players_list:
            # 2. Check move status in memory
            # WARNING: Ensure hasMoveEndData() uses local fields/JSON, not DB lookups
            if self.hasMoveEndData(user.username):
                pass
            elif user.username != "AqyBot":
                _currentPlayers.append(user.username)

        return ", ".join(_currentPlayers)

    def getCurrentPlayersArray(self):
        _currentPlayersArray = [
            player.strip() for player in self.currentPlayers.split(",")
        ]
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def getJsonMoveResponse(self):
        readyPlayers = []
        jsonResponse = []

        # allPlayersWithBots = self.getAllPlayersOrderedySeat(False)

        for i in range(self.maxPlayers):
            player_data = getattr(self, f"player{i}currentMoveData")
            player_time = getattr(self, f"player{i}currentMoveTime")
            # ALWAYS add the move data, even if blank, in case of bots
            if player_data == "":  # or allPlayersWithBots[self.getSeat]:
                readyPlayers.append(False)
                if not player_time:
                    player_time = int(time.time() * 1000)
                jsonResponse.append(
                    {"timestamp": int(player_time), "content": player_data}
                )
            else:
                readyPlayers.append(True)
                # if readyPlayers[i]:
                jsonResponse.append(
                    {"timestamp": int(player_time), "content": player_data}
                )

        readyWithBots = False
        readyCount = sum(readyPlayers)
        nbBots = self.missingPlayers.count()
        if readyCount + nbBots == self.maxPlayers:
            readyWithBots = True

        if all(readyPlayers) or readyWithBots:
            self.clearAllMoveData()
            jsonResponse.append({"allReady": True})
        else:
            jsonResponse = [{"ready": readyPlayers}]
            jsonResponse.append({"allReady": False})

        return jsonResponse

    def clearAllMoveData(self):
        for i in range(self.maxPlayers):
            setattr(self, f"player{i}currentMoveTime", "")
            setattr(self, f"player{i}currentMoveData", "")

    # def letAllPlayersMove(self):
    #    playerList = self.getAllPlayersOrderedySeat(False)
    #    self.currentPlayers = ','.join([player for player in playerList if player != 'AqyBot'])

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all()
                .filter(~Q(missingPlayersRelName=self.id))
                .order_by("?")
                .first()
            )
            self.host = possibleHost

    def enableStatsExclude(self, _username):
        seatToChange = self.seatPosition(_username, True)
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

    def updateSingleMove(self, name, data, deleteMove=False):
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name)

        if deleteMove:
            currentTime = ""
            data = ""

        player_moves = {
            0: ("player0currentMoveTime", "player0currentMoveData"),
            1: ("player1currentMoveTime", "player1currentMoveData"),
            2: ("player2currentMoveTime", "player2currentMoveData"),
            3: ("player3currentMoveTime", "player3currentMoveData"),
        }

        current_time_field, current_data_field = player_moves.get(seat, (None, None))
        if current_time_field is not None and current_data_field is not None:
            setattr(self, current_time_field, currentTime)
            setattr(self, current_data_field, data)

        self.save()

    def updatePreMove(self, name, phase, data):
        seat = self.seatPosition(name)
        newJsonEntry = {"playerIndex": seat, "phase": phase, "data": data}

        player_moves = {
            0: ("player0currentMoveTime", "player0currentMoveData"),
            1: ("player1currentMoveTime", "player1currentMoveData"),
            2: ("player2currentMoveTime", "player2currentMoveData"),
            3: ("player3currentMoveTime", "player3currentMoveData"),
        }
        current_time_field, current_data_field = player_moves.get(seat, ("", ""))

        current_data = (
            getattr(self, current_data_field) if current_data_field is not None else ""
        )

        if (current_data == "" or current_data is None) and data[0] != -999:
            dataArray = []
            dataArray.append(newJsonEntry)
            setattr(self, current_time_field, "PRE_MOVE")
            setattr(
                self,
                current_data_field,
                base64.b64encode(
                    gzip.compress(json.dumps(dataArray).encode("utf-8"))
                ).decode("utf-8"),
            )
            self.save()
            return

        current_data = json.loads(
            gzip.decompress(bytearray(base64.b64decode(current_data))).decode("utf-8")
        )
        # Find and delete existing pre-move
        index_to_remove = next(
            (
                index
                for index, entry in enumerate(current_data)
                if entry.get("phase") == phase
            ),
            None,
        )
        if index_to_remove is not None:
            del current_data[index_to_remove]
        if data[0] != -999:
            current_data.append(newJsonEntry)
        setattr(
            self,
            current_data_field,
            base64.b64encode(
                gzip.compress(json.dumps(current_data).encode("utf-8"))
            ).decode("utf-8"),
        )
        self.save()

    def deleteAllPreMoves(self):
        if self.player0currentMoveTime == "PRE_MOVE":
            self.player0currentMoveTime = ""
            self.player0currentMoveData = ""
        if self.player1currentMoveTime == "PRE_MOVE":
            self.player1currentMoveTime = ""
            self.player1currentMoveData = ""
        if self.player2currentMoveTime == "PRE_MOVE":
            self.player2currentMoveTime = ""
            self.player2currentMoveData = ""
        if self.player3currentMoveTime == "PRE_MOVE":
            self.player3currentMoveTime = ""
            self.player3currentMoveData = ""

    def getMoveData(self, name):
        seat = self.seatPosition(name)
        if seat == 0:
            return self.player0currentMoveData
        if seat == 1:
            return self.player1currentMoveData
        if seat == 2:
            return self.player2currentMoveData
        if seat == 3:
            return self.player3currentMoveData
        return ""

    def getMoveDataTime(self, name):
        seat = self.seatPosition(name)
        if seat == 0:
            return self.player0currentMoveTime
        if seat == 1:
            return self.player1currentMoveTime
        if seat == 2:
            return self.player2currentMoveTime
        if seat == 3:
            return self.player3currentMoveTime
        return ""

    def removePlayerTrade(self, entry):
        if self.playerTradeData == "":
            return

        # Simply remove the entry from the trade list
        playerTradeData = json.loads(
            gzip.decompress(bytearray(base64.b64decode(self.playerTradeData))).decode(
                "utf-8"
            )
        )

        # Find and remove the entry from playerTradeData
        for subarray in playerTradeData["playerTrades"]:
            if subarray == entry:
                playerTradeData["playerTrades"].remove(subarray)

        # Now convert to gzip
        self.playerTradeData = base64.b64encode(
            gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
        ).decode("utf-8")

    def markPromiseComplete(self, promise):
        # reversePromise = promise[:2][::-1] + promise[2:]

        if self.playerTradeData != "":
            # remove the entry from the player data promises
            playerTradeData = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(self.playerTradeData))
                ).decode("utf-8")
            )

            # Find and remove the entry from playerTradeData
            for i, player in enumerate(playerTradeData["playerCityLockedData"]):
                if len(player) > 0:
                    playerData = json.loads(
                        gzip.decompress(bytearray(base64.b64decode(player))).decode(
                            "utf-8"
                        )
                    )
                    for playerPromise in playerData[8]:
                        if playerPromise == promise:
                            playerData[8].remove(promise)
                    playerTradeData["playerCityLockedData"][i] = base64.b64encode(
                        gzip.compress(json.dumps(playerData).encode("utf-8"))
                    ).decode("utf-8")

            # Now convert to gzip
            self.playerTradeData = base64.b64encode(
                gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
            ).decode("utf-8")

        # Now remove from main data
        raw_data = json.loads(
            gzip.decompress(bytearray(base64.b64decode(self.gameData))).decode("utf-8")
        )
        for playerData in raw_data[1]:
            for playerPromise in playerData[9]:
                if playerPromise == promise:
                    playerData[9].remove(promise)

        self.gameData = base64.b64encode(
            gzip.compress(json.dumps(raw_data).encode("utf-8"))
        ).decode("utf-8")

    def getGameCode(self):
        return "AQY"

    def getDeleteVotesData(self):
        if self.gameStatus == "FINISHED":
            deleteGameVotes = {}
            player_usernames = [p.username for p in self.allPlayers.all()]
            deleteGameVotes.update({username: False for username in player_usernames})
            return deleteGameVotes
        if self.deleteGameVotes is None:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )
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
