import time
import json
import random
import gzip
import base64

from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.utils.translation import gettext

from Lobby.models import User, AbstractGame

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
)  # , SF_M_ProcessTournamentEndGame
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getKFWstartingOptionsHTML,
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


class KFW_Game(AbstractGame):
    latestUpdate = models.CharField(max_length=15, blank=False, default=SR_getTimeNow, db_index=True)
    startingOptions = models.CharField(max_length=20, blank=True)
    
    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=1)
    
    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="KFWallPlayersRelName")
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="KFWmissingPlayersRelName", blank=True
    )
    
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="KFWgame_creator_relName",
        default=None,
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="KFWgame_host_relName",
        default=None,
    )
    
    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="KFWkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="KFWinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="KFWplayersWithChatNotificationName", blank=True
    )
    
    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)

    winner = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="KFWgame_winner_relName", blank=True)

    zoomLevels = models.CharField(max_length=30, blank=False, default=json.dumps([]))

    player4notes = models.TextField(blank=True)
    player5notes = models.TextField(blank=True)

    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)
    serverData = models.TextField(blank=True, default=json.dumps([[40, 40, 40, 0], [16, 16, 16]]))
    playersHiddenData = models.TextField(blank=True)
    playersMoveData = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)

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
        self.serverData = ""
        self.playersHiddenData = ""
        self.playersMoveData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"

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
                text = "Out to sea"
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
            finalResults.append([name, "Out to sea", 9])

        # Now send winning notification
        SN_M_sendEndGameNotificationTieGame(request, "KFW", finalResults, _gameID, self)

        # if self.relatedTournament:
        #    SF_M_ProcessTournamentEndGame(request, "AQY", self, winnerNamesArray)

    def currentTurnString(self):
        return SR_currentTurnString("KFW", self.turn, self.phase)

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
        # 1. Use list comprehension to access prefetched allPlayers in memory
        player_usernames = [p.username for p in self.allPlayers.all()]
        
        # 2. Extract the first current player safely from memory
        # Assumes getCurrentPlayersArray has been optimized to use prefetched data
        current_players = self.getCurrentPlayersArray()
        first_player = current_players[0] if current_players else None

        return SF_kickoutRequired(
            self.gameStatus,
            player_usernames,
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            first_player,
        )

    def serialize(self, loggedInUserObj=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = "".join(str(self.allPlayers.count() + i + 1) for i in range(remainingPlayersInt))

        # winner = self.winner.username if self.winner else ""
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

        startingOptionsHTML = SR_getKFWstartingOptionsHTML(self.startingOptions)

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
            "game": "KFW",
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
        # 1. Get the list of players (uses prefetch cache internally)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)

        # 2. Try to find the index directly. 
        # This replaces the .values_list() existence check with 0 DB hits.
        try:
            return playerList.index(_username)
        except (ValueError, AttributeError):
            # ValueError: _username is not in the list
            # AttributeError: playerList is None
            return -1

    # NB withoutBots returns original players. with True it replaces with KFWBot
    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # 1. Access prefetched cache and sort in Python memory
        #playerList = list(
        #    self.allPlayers.all().order_by("username").values_list("username", flat=True)
        #)
        # .all() uses the cache; sorting in Python replaces .order_by()
        # Sort in memory to avoid hitting the DB again
        playerList = sorted([p.username for p in self.allPlayers.all()])
        
        
        
        # 2. Shuffle using the seed
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        # 3. Access prefetched missing players and use a SET for O(1) speed
        missingPlayerNames = {p.username for p in self.missingPlayers.all()}

        # 4. Replace with Bots
        for count, player in enumerate(playerList):
            if player in missingPlayerNames:
                playerList[count] = "KfwBot"
                
        return playerList

    def startGame(self, request, isTournamentGame=False):
        self.gameStatus = "ACTIVE"
        self.playerOrderSeed = random.randint(1000, 32767)
        allPlayersL = self.getAllPlayersOrderedySeat(True)
        self.currentPlayers = allPlayersL[0]

        serverDataArr = json.loads(self.serverData)
        meeple_bag = serverDataArr[0]
        skills_bag = serverDataArr[1]

        # Scaffold the playersHiddenData
        # This has one subarray per player. Index in arr is playerIndex ["name", [meeplesArray], [skillsArray], [historyArray] ]
        playerHiddenArr = []
        for name in allPlayersL:
            entry = [name, [0, 0, 0, 0], [0, 0, 0], []]
            [startingMeeples, meeple_bag] = self.pull_items_from_bag(8, meeple_bag)
            entry[1] = startingMeeples
            playerHiddenArr.append(entry)
        self.playersHiddenData = json.dumps(playerHiddenArr)
        self.serverData = json.dumps([meeple_bag, skills_bag])

        # Scaffold the playersMoveData
        # # This has one subarray per player. Index in arr is playerIndex ["name", compressedData]
        playerMoveArr = []
        for name in allPlayersL:
            # Name, TS, compressed data
            entry = [name, "", ""]
            playerMoveArr.append(entry)
        self.playersMoveData = json.dumps(playerMoveArr)

        # Each player gets 8 random meeples

        self.save()

        # If not a training game, send out notifications
        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # The tournament sends out game start notifications
            if not isTournamentGame:
                SN_M_sendGameStartNotification(request, "KFW", playerListToNotify, getattr(self, "id"), self)

    def getCurrentPlayers(self):
        _currentPlayers = []
        for user in self.allPlayers.all():
            # If you have a move, then don't add
            if self.hasMoveEndData(user.username):
                pass
            # if you don't NEED to move (not in currentPlayers), then don't add
            elif user.username not in self.currentPlayers.split(","):
                pass
            elif user.username != "KfwBot":
                _currentPlayers.append(user.username)

        return ",".join(_currentPlayers)

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
        return "KFW"

    # def enableStatsExclude(self, _username):
    #    seatToChange = self.seatPosition(_username, True)
    #    self.statsExcludeConsent = self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
    #    # CHECK TOTAL CONSENT
    #    totalConsent = 0
    #    for letter in self.statsExcludeConsent:
    #        totalConsent += int(letter)
    #    if totalConsent == self.maxPlayers:
    #        self.statsExcludedGame = True

    #####################################################################
    ###################### Simul turns code
    #####################################################################

    def anyMoveData(self):
        playersMoveDataArr = json.loads(self.playersMoveData)
        for playerMoveData in playersMoveDataArr:
            if playerMoveData[2] != "":
                return True
        return False

    def getMoveData(self, name):
        if self.playersMoveData == "":
            return ""
        seat = self.seatPosition(name)
        if seat < 0:
            return ""
        playersMoveDataArr = json.loads(self.playersMoveData)
        if playersMoveDataArr[seat][2] == "":
            return ""
        return playersMoveDataArr[seat][2]

    def updateSingleMove(self, name, data, deleteMove=False):
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name, True)

        if deleteMove:
            currentTime = 0
            data = ""

        playersMoveDataArr = json.loads(self.playersMoveData)

        playerMoveData = playersMoveDataArr[seat]
        playerMoveData[1] = currentTime
        playerMoveData[2] = data

        playersMoveDataArr[seat] = playerMoveData

        self.playersMoveData = json.dumps(playersMoveDataArr)

        self.save()

    def getJsonMoveResponse(self):
        readyPlayers = []
        jsonResponse = []

        # allPlayersArr = self.getAllPlayersOrderedySeat(False)
        currentPlayersArr = self.getCurrentPlayersArray()
        # print(f"allPlayersArr: {allPlayersArr}, currentPlayersArr: {currentPlayersArr}")
        playersMoveDataArr = json.loads(self.playersMoveData)

        for i in range(len(playersMoveDataArr)):
            player_time = playersMoveDataArr[i][1]
            player_data = playersMoveDataArr[i][2]
            # ALWAYS add the move data, even if blank, in case of bots
            # If you dont't have a move, AND you're in currentPlayers, then you need to move
            if (
                player_data == "" and playersMoveDataArr[i][0] in currentPlayersArr
            ):  # or allPlayersWithBots[self.getSeat]:
                readyPlayers.append(False)
                if player_time == "":
                    player_time = int(time.time() * 1000)
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})
            else:
                readyPlayers.append(True)
                # if readyPlayers[i]:
                if player_time == "":
                    player_time = int(time.time() * 1000)
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})

        readyWithBots = False
        # readyCount = sum(readyPlayers)
        # nbBots = self.missingPlayers.count()
        # if readyCount + nbBots == self.maxPlayers:
        #    readyWithBots = True

        if all(readyPlayers) or readyWithBots:
            self.clearAllMoveData()
            jsonResponse.append({"allReady": True})
        else:
            # jsonResponse = [{"ready": readyPlayers}]
            jsonResponse.append({"ready": readyPlayers})  # Corrected line
            jsonResponse.append({"allReady": False})

        return jsonResponse

    def getJsonMoveResponseFinalScoring(self):
        readyPlayers = []
        allPlayerReturnData = []
        jsonResponse = []

        currentPlayersArr = self.getCurrentPlayersArray()
        playersMoveDataArr = json.loads(self.playersMoveData)

        for i in range(len(playersMoveDataArr)):
            player_time = playersMoveDataArr[i][1]
            player_data = playersMoveDataArr[i][2]
            # ALWAYS add the move data, even if blank, in case of bots
            # If you dont't have a move, AND you're in currentPlayers, then you need to move
            if player_data == "" and playersMoveDataArr[i][0] in currentPlayersArr:
                readyPlayers.append(False)
                if player_time == "":
                    player_time = int(time.time() * 1000)
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})
            else:
                readyPlayers.append(True)
                if player_time == "":
                    player_time = int(time.time() * 1000)
                # if readyPlayers[i]:
                allPlayerReturnData.append({"timestamp": int(player_time), "content": player_data})

        readyWithBots = False
        # readyCount = sum(readyPlayers)
        # nbBots = self.missingPlayers.count()
        # if readyCount + nbBots == self.maxPlayers:
        #    readyWithBots = True

        if all(readyPlayers) or readyWithBots:
            jsonResponse.append({"allPlayerReturnData": allPlayerReturnData})
            self.clearAllMoveData()

            ### GAME DATA 1
            playersHiddenDataArr = json.loads(self.playersHiddenData)
            returnData1 = []
            for playerData in playersHiddenDataArr:
                returnData1.append(playerData[1:])
            gameData1 = self.compressData(returnData1)

            ### GAME DATA 3
            serverDataArr = json.loads(self.serverData)
            meepleArr = serverDataArr[0]
            skillsArr = serverDataArr[1]
            returnData3 = [meepleArr, skillsArr]
            gameData3 = self.compressData(returnData3)

            jsonResponse.append({"gameData1": gameData1})
            jsonResponse.append({"gameData3": gameData3})

            ## THIS MUST BE LAST
            jsonResponse.append({"allReady": True})
        else:
            # jsonResponse = [{"ready": readyPlayers}]
            jsonResponse.append({"ready": readyPlayers})  # Corrected line
            jsonResponse.append({"allReady": False})

        return jsonResponse

    # def getJsonMoveResponseFinalScoring(self):
    #    readyPlayers = []
    #    allPlayerReturnData = []
    #    jsonResponse = []
    #
    #    playersMoveDataArr = json.loads(self.playersMoveData)
    #
    #    for i in range(len(playersMoveDataArr)):
    #        player_time = playersMoveDataArr[i][1]
    #        player_data = playersMoveDataArr[i][2]
    #        # ALWAYS add the move data, even if blank, in case of bots
    #        if player_data == "":  # or allPlayersWithBots[self.getSeat]:
    #            readyPlayers.append(False)
    #            if player_time == "":
    #                player_time = int(time.time() * 1000)
    #            jsonResponse.append({"timestamp": int(player_time), "content": player_data})
    #        else:
    #            readyPlayers.append(True)
    #            # if readyPlayers[i]:
    #            allPlayerReturnData.append({"timestamp": int(player_time), "content": player_data})
    #
    #    readyWithBots = False
    #    readyCount = sum(readyPlayers)
    #    nbBots = self.missingPlayers.count()
    #    if readyCount + nbBots == self.maxPlayers:
    #        readyWithBots = True
    #
    #    if all(readyPlayers) or readyWithBots:
    #        jsonResponse.append({"allPlayerReturnData": allPlayerReturnData})
    #        self.clearAllMoveData()
    #
    #
    #        ### GAME DATA 1
    #        playersHiddenDataArr = json.loads(self.playersHiddenData)
    #        returnData1 = []
    #        for playerData in playersHiddenDataArr:
    #            returnData1.append(playerData[1:])
    #        gameData1 = self.compressData(returnData1)
    #
    #        ### GAME DATA 3
    #        serverDataArr = json.loads(self.serverData)
    #        meepleArr = serverDataArr[0]
    #        skillsArr = serverDataArr[1]
    #        returnData3 = [meepleArr, skillsArr]
    #        gameData3 = self.compressData(returnData3)
    #
    #        jsonResponse.append({"gameData1": gameData1})
    #        jsonResponse.append({"gameData3": gameData3})
    #
    #        ## THIS MUST BE LAST
    #        jsonResponse.append({"allReady": True})
    #    else:
    #        jsonResponse = [{"ready": readyPlayers}]
    #        jsonResponse.append({"allReady": False})
    #
    #    return jsonResponse

    def hasMoveEndData(self, name):
        if self.playersMoveData == "":
            return False
        seat = self.seatPosition(name)

        playersMoveDataArr = json.loads(self.playersMoveData)
        player_time = playersMoveDataArr[seat][1]
        player_move = playersMoveDataArr[seat][2]

        return bool(
            player_move != "" and player_time != "" and player_time != "MID_PHASE" and player_time != "PRE_MOVE"
        )

    def clearAllMoveData(self):
        playersMoveDataArr = json.loads(self.playersMoveData)
        for i in range(len(playersMoveDataArr)):
            playersMoveDataArr[i][1] = ""
            playersMoveDataArr[i][2] = ""

        self.playersMoveData = json.dumps(playersMoveDataArr)

        self.save()

    def getCurrentSimulPlayers(self):
        # ASSUME THAT players have move data <=> they have moved
        # ASSUME THAT phase is the start of simul phase

        # If there ar no current players, add everyone
        if self.currentPlayers == "":
            _currentPlayers = ""
            for user in self.allPlayers.all():
                _currentPlayers += user.username + ","
            # remove final comma
            _currentPlayers = _currentPlayers[:-1]
            return _currentPlayers

        # Get an array of possible player to move
        _currentPlayers = self.currentPlayers.split(",")
        # Remove missing players
        missing_players = set(self.missingPlayers.values_list("username", flat=True))
        _currentPlayers = [username for username in _currentPlayers if username not in missing_players]

        # If any play has a move, then remove them
        playersToRemove = []
        for username in _currentPlayers:
            if self.hasMoveEndData(username):
                playersToRemove.append(username)

        for username in playersToRemove:
            _currentPlayers.remove(username)

        # Join the list elements with ','
        _currentPlayers = ",".join(_currentPlayers)

        return _currentPlayers

    #####################################################################
    ###################### KFW specific server code
    #####################################################################

    def compressData(self, data_to_compress):
        return base64.b64encode(gzip.compress(json.dumps(data_to_compress).encode("utf-8"))).decode("utf-8")

    def decompressData(self, string_to_decompress):
        # return json.loads(gzip.decompress(base64.b64decode(string_to_decompress)).decode("utf-8"))
        return json.loads(gzip.decompress(bytearray(base64.b64decode(string_to_decompress))).decode("utf-8"))

    def isTrainingGame(self):
        startingOptions = json.loads(self.startingOptions) if self.startingOptions else []
        return 102 in startingOptions

    def getGameData3compressed(self):
        if self.serverData == "":
            return ""
        serverDataArr = json.loads(self.serverData)
        meepleArr = serverDataArr[0]
        skillsArr = serverDataArr[1]
        if self.isTrainingGame():
            returnData = [meepleArr, skillsArr]
            return self.compressData(returnData)
        returnData = [sum(meepleArr), sum(skillsArr)]
        return self.compressData(returnData)

    def getGameData1Compressed(self, username):
        if self.playersHiddenData == "":
            return ""
        # This has one subarray per player. Index in arr is playerIndex ["name", [meeplesArray], [skillsArray], [historyArray] ]
        playersHiddenDataArr = json.loads(self.playersHiddenData)
        if self.isTrainingGame():
            returnData = []
            for playerData in playersHiddenDataArr:
                returnData.append(playerData[1:])
            return self.compressData(returnData)

        # Find the subarray with the username we want to return data for
        for playerData in playersHiddenDataArr:
            if playerData[0] == username:
                # retrun the data without the username
                return self.compressData(playerData[1:])
        return self.compressData([[], [], []])

    def pull_items_from_bag(self, num_items, itmes_bag):
        # serverDataArr = json.loads(self.serverData)
        # meeple_bag = serverDataArr[0]
        pulled_meeples = [0, 0, 0, 0]
        for _ in range(num_items):
            bag_size = sum(itmes_bag)
            if bag_size == 0:
                break
            picked = pick_random(bag_size, itmes_bag)
            if picked == -1:
                # This should never happen since we break on bag_size == 0
                # But just in case, throw an error
                raise ValueError("Invalid pick from items bag")
            itmes_bag[picked] -= 1
            pulled_meeples[picked] += 1

        # Save bag
        # serverDataArr[0] = meeple_bag
        # self.serverData = json.dumps(serverDataArr)
        # self.save()

        return [pulled_meeples, itmes_bag]

    def processEndOfTurnActions(self, compressedString):
        SERV_MEEPLES_FROM_PLAYER_TO_BAG = 0  # MOVE from player to bg --  then [MR, MR, ...]
        SERV_MEEPLES_FROM_BAG_TO_PLAYER = 1
        SERV_MEEPLES_REMOVE_FROM_PLAYER = 2  # JUST remove from player --
        SERV_MEEPLES_JUST_TO_PLAYER = 3  # JUST get meeples --  then [MR, MR, ...]
        SERV_MEEPLES_JUST_TO_BAG = 4  # JUST get meeples --  then [MR, MR, ...]
        SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER = 5  # then entry[3]

        MEEPLE_RANDOM = -4

        SERV_SKILLS_FROM_PLAYER_TO_BAG = 10  # MOVE from player to bg --  then [SS, SS, ...]
        SERV_SKILLS_FROM_BAG_TO_PLAYER = 11
        SERV_SKILLS_REMOVE_FROM_PLAYER = 12  # JUST remove from player --
        SERV_SKILLS_JUST_TO_PLAYER = 13  # JUST get meeples --  then [SS, SS, ...]
        SERV_SKILLS_JUST_TO_BAG = 14  # JUST get meeples --  then [SS, SS, ...]
        SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER = 15  # then entry[3]

        SKILL_ANY_RANDOM = -3

        SERV_GET_RANDOM_MEEPLE_RANDOM_SKILL = 20  # then entry[3]

        # SERV_GET_BOAT_ITEMS = 30  # eg [30, numMeeples, numSkills]

        dataArr = self.decompressData(compressedString)
        newInformation = [[], [], -1]
        if len(dataArr) > 0:
            newInformation[2] = dataArr[0][0]
        allPlayersHiddenData = json.loads(self.playersHiddenData)
        serverDataArr = json.loads(self.serverData)
        meeple_bag = serverDataArr[0]
        skills_bag = serverDataArr[1]

        for row in dataArr:
            # [playerindex, serverAction, num, histindex, [histData]]
            playerIndex = row[0]
            serverAction = row[1]

            playerHiddenData = allPlayersHiddenData[playerIndex]

            # Removing actions should be done first
            if serverAction == SERV_MEEPLES_FROM_BAG_TO_PLAYER:
                meeples = row[2]
                for num in meeples:
                    # Add to the player
                    playerHiddenData[1][num] += 1
                    # Remove from the bag
                    meeple_bag[num] -= 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_FROM_BAG_TO_PLAYER:
                skills = row[2]
                for num in skills:
                    # Add to the player
                    playerHiddenData[2][num] += 1
                    # Remove from the bag
                    skills_bag[num] -= 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            # Now draw random
            elif serverAction == SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER:
                # if playerIndex != newInformation[2]:
                #    raise ValueError("Mismatch in playerIndex")
                num = row[2]
                histIndex = row[3]
                histEntry = row[4]

                # Remove meeples from bag
                [meeplesPulledArr, meeple_bag] = self.pull_items_from_bag(num, meeple_bag)
                meeplesPulled = []
                for i in range(len(meeplesPulledArr)):
                    for _ in range(meeplesPulledArr[i]):
                        meeplesPulled.append(i)
                        newInformation[0].append(i)
                # Add meeples to player
                playerHiddenData[1] = [x + y for x, y in zip(playerHiddenData[1], meeplesPulledArr)]
                # Create the history
                # for i, value in enumerate(histEntry[len(histEntry) - 1]):
                #    if i < len(meeplesPulled):
                #        histEntry[len(histEntry) - 1][i] = meeplesPulled[i]
                # for i, value in enumerate(histEntry):
                #    if i < len(meeplesPulled):
                #        histEntry[i] = meeplesPulled[i]
                for i, value in enumerate(histEntry):
                    if value == MEEPLE_RANDOM and meeplesPulled:
                        histEntry[i] = meeplesPulled.pop()
                histArr = [histIndex, histEntry]

                playerHiddenData[3].append(histArr)
                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER:
                num = row[2]
                histIndex = row[3]
                histEntry = row[4]

                # Remove skills from bag
                [skillsPulledArr, skills_bag] = self.pull_items_from_bag(num, skills_bag)
                skillsPulled = []
                for i in range(len(skillsPulledArr)):
                    for _ in range(skillsPulledArr[i]):
                        skillsPulled.append(i)
                        newInformation[1].append(i)
                # Add skills to player
                playerHiddenData[2] = [x + y for x, y in zip(playerHiddenData[2], skillsPulledArr)]
                # Create the history
                for i, value in enumerate(histEntry):
                    if value == SKILL_ANY_RANDOM and skillsPulled:
                        histEntry[i] = skillsPulled.pop()
                histArr = [histIndex, histEntry]

                playerHiddenData[3].append(histArr)
                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_GET_RANDOM_MEEPLE_RANDOM_SKILL:
                num = row[2]
                histIndex = row[3]
                histEntry = row[4]

                # Remove meeples from bag
                [meeplesPulledArr, meeple_bag] = self.pull_items_from_bag(num, meeple_bag)
                meeplesPulled = []
                for i in range(len(meeplesPulledArr)):
                    for _ in range(meeplesPulledArr[i]):
                        meeplesPulled.append(i)
                        newInformation[0].append(i)
                # Add meeples to player
                playerHiddenData[1] = [x + y for x, y in zip(playerHiddenData[1], meeplesPulledArr)]

                # Remove skills from bag
                [skillsPulledArr, skills_bag] = self.pull_items_from_bag(num, skills_bag)
                skillsPulled = []
                for i in range(len(skillsPulledArr)):
                    for _ in range(skillsPulledArr[i]):
                        skillsPulled.append(i)
                        newInformation[1].append(i)

                # Add skills to player
                playerHiddenData[2] = [x + y for x, y in zip(playerHiddenData[2], skillsPulledArr)]
                # Create the history
                # for i, value in enumerate(histEntry):
                #    if value == SKILL_ANY_RANDOM and skillsPulled:
                #        histEntry[i] = skillsPulled.pop()
                histEntry[0] = meeplesPulled[0]
                histEntry[1] = skillsPulled[0]

                histArr = [histIndex, histEntry]

                playerHiddenData[3].append(histArr)
                allPlayersHiddenData[playerIndex] = playerHiddenData

            ######### ACTIONS JUST TO CATCH THE SERVER UP WITH THE GAME
            elif serverAction == SERV_MEEPLES_JUST_TO_PLAYER:
                meeples = row[2]

                for num in meeples:
                    # Add tp the player
                    playerHiddenData[1][num] += 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_JUST_TO_PLAYER:
                skills = row[2]

                for num in skills:
                    # Add tp the player
                    playerHiddenData[2][num] += 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_MEEPLES_REMOVE_FROM_PLAYER:
                meeples = row[2]

                for num in meeples:
                    # Remove from the player
                    playerHiddenData[1][num] -= 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_REMOVE_FROM_PLAYER:
                skills = row[2]

                for num in skills:
                    # Remove from the player
                    playerHiddenData[2][num] -= 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            # Depositing actions should be done last
            elif serverAction == SERV_MEEPLES_FROM_PLAYER_TO_BAG:
                meeples = row[2]
                for num in meeples:
                    # Remove from the player
                    playerHiddenData[1][num] -= 1
                    # Add to the bag
                    meeple_bag[num] += 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_FROM_PLAYER_TO_BAG:
                skills = row[2]
                for num in skills:
                    # Remove from the player
                    playerHiddenData[2][num] -= 1
                    # Add to the bag
                    skills_bag[num] += 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_MEEPLES_JUST_TO_BAG:
                meeples = row[2]
                for num in meeples:
                    # Add to the bag
                    meeple_bag[num] += 1

                # allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_JUST_TO_BAG:
                skills = row[2]
                for num in skills:
                    # Add to the bag
                    skills_bag[num] += 1

                # allPlayersHiddenData[playerIndex] = playerHiddenData

        self.playersHiddenData = json.dumps(allPlayersHiddenData)
        self.serverData = json.dumps([meeple_bag, skills_bag])

        return newInformation


##########$
# UTILS
def pick_random(count, selection):
    random_index = random.randint(0, count - 1)
    max_val = 0
    for i in range(len(selection)):
        max_val += selection[i]
        if max_val > random_index:
            return i
    return -1
