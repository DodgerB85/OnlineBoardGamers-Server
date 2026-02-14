import base64
import gzip
import time
import json
import logging
import random

from django.db.models import Q
from django.contrib.sites.shortcuts import get_current_site

from django.db import models
from django.conf import settings

from django.utils.translation import gettext

# from django.utils import translation

# User = get_user_model()

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessTournamentEndGame,
    SF_M_ProcessAnyTournamentEndGame,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getFCMstartingOptionsHTML,
    SR_getTournamentWinnerHTML,
    SR_getTournamentRoundsHTML,
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    #SN_M_sendGameStartNotification,
    # SN_M_T_sendTournamentGameStartNotification,
)

from Lobby.sharedFunctions.sharedNotifications import (
    SN_sendAdminErrorMessage,
    SN_sendNextTurnNotification,
)

from Lobby.models import User, Mini_Tournaments, GeneralGame, Main_Tournament

from Lobby.sharedFunctions.constants import (
    MAIN_T_FLAG,
    MINI_T_FLAG,
    STATS_EXCLUDE_VOTE_TOPIC,
    DELETE_VOTE_TOPIC,
    REWIND_CONSENT_VOTE_TOPIC,
    BLANK_MESSAGE_TEMPLATE
)


logger = logging.getLogger(__name__)

USE_NEW_CODE = False

class FCM_Game(GeneralGame):
    allPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="allPlayersRelName"
    )
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="missingPlayersRelName", blank=True
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="game_creator_relName",
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="game_host_relName",
    )

    kickedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="kickedPlayersRelName", blank=True
    )
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="invitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="playersWithChatNotificationName",
        blank=True,
    )

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="game_winner_relName",
        blank=True,
    )

    notificationSuppression = models.CharField(
        max_length=30, blank=False, default="000000"
    )

    # TODOMODEL change to json, move to general game
    # rewindConsent = models.CharField(max_length=10, blank=True)

    playersMoveData = models.TextField(blank=True)

    player4notes = models.TextField(blank=True)
    player5notes = models.TextField(blank=True)

    relatedMainTournament = models.ForeignKey(
        Main_Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintournamentFCM_relName",
    )

    relatedMiniTournament = models.ForeignKey(
        Mini_Tournaments,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minitournamentFCM_relName",
    )

    def __str__(self):
        # Use currentPlayers if available, otherwise fall back to gameName and status
        players = (
            self.currentPlayers
            if self.currentPlayers
            else f"{self.allPlayers.count()} players"
        )
        return f"Game {getattr(self, 'id')}: {self.getGameName()} : {players} : {self.gameStatus} : {self.turn}:{self.phase} - {self.currentTurnString()}"

    def currentTurnString(self):
        return SR_currentTurnString("FCM", self.turn, self.phase)

    def getGameName(self):
        # Use fields already on the model. DO NOT call .all() or .count() here.
        name = self.gameName or f"{getattr(self.creator, 'username', 'Unknown')}'s Game"
        if self.gameStatus == "PRIVATE":
            name += " [Private]"
        return name

    def isMyMove(self, loggedInPlayerUsername="ADFSADASDASDASDASADADA"):
        allowed_players = {
            "SHADOW",
            "SHADOW_2",
            "SHADOW_3",
            "SHADOW_4",
            "SHADOW_5",
            "FcmAI",
        }

        if not self.currentPlayers or self.currentPlayers == "":
            return True

        # Split the string into a list of actual names
        player_list = [p.strip() for p in self.currentPlayers.split(",")]

        if (
            loggedInPlayerUsername in player_list
            or self.currentPlayers in allowed_players
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
        # USE the prefetched allPlayers list instead of .values_list()
        all_player_usernames = [p.username for p in self.allPlayers.all()]

        # Also ensure getCurrentPlayersArray() doesn't hit the DB.
        # If it does, extract the username from self.currentPlayers string directly.
        current_username = self.getCurrentPlayersArray()[0]

        return SF_kickoutRequired(
            self.gameStatus,
            all_player_usernames,  # Pass the Python list, not a QuerySet
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            current_username,
        )

    def serialize(self, loggedInUser=None):
        # USE len() instead of .count() to use the prefetch cache
        all_players_list = list(self.allPlayers.all())
        all_players_count = len(all_players_list)

        remainingPlayersInt = self.maxPlayers - all_players_count
        remainingPlayers = "".join(
            [str(all_players_count + i + 1) for i in range(remainingPlayersInt)]
        )

        # Use select_related('winner') in the view to make this 0 hits
        winner = self.winner.username if self.winner else ""

        # Timestamps are already in the object (0 hits)
        createdString = str(self.created)
        latestUpdateString = str(self.latestUpdate)
        latestUpdateElapsedTimeString = ""

        if self.gameStatus in ["WAITING", "AVAILABLE", "ACTIVE", "PRIVATE"]:
            now = int(time.time())
            # Use simple math; avoid repeated int() casts if possible
            elapsedTotalSeconds = now - (
                int(self.created) // 1000
                if self.gameStatus != "ACTIVE"
                else int(self.latestUpdate) // 1000
            )

            days, rem = divmod(elapsedTotalSeconds, 86400)
            hours, rem = divmod(rem, 3600)
            mins, secs = divmod(rem, 60)

            if days > 0:
                latestUpdateElapsedTimeString += f"{days}d"
            if hours > 0:
                latestUpdateElapsedTimeString += f" {hours}h"
            if mins > 0:
                latestUpdateElapsedTimeString += f" {mins}m"
            latestUpdateElapsedTimeString += f" {secs}s"

        # !!! WARNING: isMyMove probably has queries. Check its code!
        myMove = self.isMyMove(loggedInUser.username) if loggedInUser else False

        # Efficiency: use the prefetched lists already in memory
        missing_players_ids = {p.id for p in self.missingPlayers.all()}
        chat_notify_ids = {p.id for p in self.playersWithChatNotification.all()}

        involvedPlayer = False
        chatNotification = False
        if loggedInUser:
            involvedPlayer = (
                loggedInUser in all_players_list
                and loggedInUser.id not in missing_players_ids
            )
            chatNotification = loggedInUser.id in chat_notify_ids

        # Pace and Options (0 hits if these are just CharFields/TextFields)
        gamePaceString = SR_gamePaceString(self.gamePace)
        startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(self.startingOptions) if self.startingOptions else [])
        kickoutRequiredNum = self.kickoutRequired()  # Inspect this for queries!

        # Check for Shadow/AI without hitting the DB
        all_usernames = {u.username for u in all_players_list}
        deleteableGame = False
        if loggedInUser and (("SHADOW" in all_usernames) or ("FcmAI" in all_usernames)):
            if loggedInUser in all_players_list:
                deleteableGame = True

        return {
            "gameID": getattr(self, "id", None),
            "gameName": self.getGameName(),
            "gameDescription": self.gameDescription,
            "creator": getattr(self.creator, "username", None),
            "created": createdString,
            "allPlayers": list(all_usernames),
            "invitedPlayers": [user.username for user in self.invitedPlayers.all()],
            "currentPlayers": self.currentPlayers,
            "currentTurn": self.currentTurnString(),
            "pace": gamePaceString,
            "latestUpdate": latestUpdateString,
            "startingOptions": startingOptionsHTML,
            "maxPlayers": self.maxPlayers,
            "winner": winner,
            "myMove": myMove,
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
        starting_options = json.loads(self.startingOptions) if self.startingOptions else []
        if 120 in starting_options:
            return True
        return False

    def isLearningGame(self):
        starting_options = json.loads(self.startingOptions) if self.startingOptions else []
        if 110 in starting_options:
            return True
        return False

    def getCurrentPlayersString(self):
            return ", ".join(self.getCurrentPlayersArray())

    def startGame(self, request):
        from django_q.tasks import async_task

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
        self.playerOrderSeed = random.randint(1000, 32767)
        # Copy in an initial value to prevent forced LU values of 99999 overwriting maps
        self.latestUpdate = self.created
        self.save()
        starting_options = json.loads(self.startingOptions) if self.startingOptions else []

        # need to add in possible new dist options
        if 200 in starting_options:
            availableModules = [20, 23, 18, 22, 19, 10, 11, 12, 9, 15, 13, 17, 14, 16]
            # Add hard choices only with original MS
            if 21 not in starting_options:
                availableModules.append(8)
            selectedModules = []
            moduleRange = []
            for i in range(len(starting_options)):
                if len(str(starting_options[i])) == 5:
                    moduleRange.append(str(starting_options[i]))
            for i in range(len(moduleRange)):
                moduleRange[i] = int(moduleRange[i][-2:])
            numberOfModulesToPick = random.randrange(
                int(moduleRange[0]), int(moduleRange[1] + 1), 1
            )
            for i in range(numberOfModulesToPick):
                currentIndex = random.randrange(0, len(availableModules), 1)
                selectedModules.append(availableModules.pop(currentIndex))
            # _tournamentType = random.choice(["RR", "KO", "TL"])
            if 18 in selectedModules:
                currentIndex = random.randrange(0, 3, 1)
                distOptions = [0, 181, 183]
                chosenDistOption = distOptions[currentIndex]
                if chosenDistOption > 0:
                    selectedModules.append(chosenDistOption)
            starting_options = json.loads(self.startingOptions) if self.startingOptions else []
            starting_options.extend(selectedModules)
            self.startingOptions = json.dumps(starting_options, separators=(',', ':'))
            #self.startingOptions = (
            #  self.startingOptions + "," + (",".join(selectedModules))
            #)

        self.gameStatus = "ACTIVE"
        _currentPlayers = ""
        # Set starting player as currentPlayers
        for user in self.allPlayers.all():
            if self.seatPosition(user.username) == 0:
                _currentPlayers = user.username
                self.currentPlayers = _currentPlayers
                self.save()

        playerListToNotify = list(
            self.allPlayers.all().values_list("username", flat=True)
        )
        if request.user.username in playerListToNotify:
            playerListToNotify.remove(request.user.username)

        # SN_M_sendGameStartNotification(
        #    get_current_site(request),
        #    "FCM",
        #    playerListToNotify,
        #    getattr(self, "id"),
        #    self,
        #    request.user.username,
        # )
        message_data = BLANK_MESSAGE_TEMPLATE.copy() 
        #message_data["gameName"] = self.gameObj.getGameName()
        message_data["gameID"] = self.id
        message_data["gameName"] = self.getGameName()
        message_data["gameCode"] = "FCM"
        message_data["username"] = request.user.username
        message_data["currentPlayersString"] = self.getCurrentPlayersString()
        message_data["maxPlayers"] = self.maxPlayers
        message_data["relatedMainTournamentID"] = self.relatedMainTournament.id if self.relatedMainTournament else 0
        message_data["relatedMiniTournamentID"] = self.relatedMiniTournament.id if self.relatedMiniTournament else 0
        
        print("about to start FCM async task")           
        async_task(
            "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
            playerListToNotify,
            message_data,
        )

        self.save()

    # NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
    def getAllPlayersOrderedySeat(self, withoutBots=False, useNewCode=True):
        if useNewCode:
            all_players_list = list(self.allPlayers.all())
            playerList = [
                p.username for p in all_players_list if p.username != "FCMtourneyAdmin"
            ]
            random.Random(self.playerOrderSeed).shuffle(playerList)
            if withoutBots:
                return playerList

            missing_players_usernames = [p.username for p in self.missingPlayers.all()]
            # REPLACE WITH KICKOUTS
            for count, player in enumerate(playerList):
                if player in missing_players_usernames:
                    playerList[count] = "FcmBot"
            return playerList

        ############ OLD CODE -- NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
        else:
            playerString = ",".join(
                [
                    player.username
                    for player in self.allPlayers.all()
                    if player.username != "FCMtourneyAdmin"
                ]
            )
            playerList = playerString.split(",")
            if self.playerOrderSeed > 0:
                for i in range(self.playerOrderSeed):
                    playerList.append(playerList.pop(0))
            if withoutBots:
                return playerList

            missingPlayerString = ",".join(
                [player.username for player in self.missingPlayers.all()]
            )
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
            return data
        except (json.JSONDecodeError, ValueError):
            # Scaffold default structure
            allPlayers = self.getAllPlayersOrderedySeat(True, True)
            missing_players = set(
                self.missingPlayers.values_list("username", flat=True)
            )
            # In a tournament, don't remove missing players, as FCMtA plays for them
            #if self.relatedMainTournament:
            #    missing_players = {}
            return [
                [
                    playerName,
                    [-1] if playerName not in missing_players else [-99],
                    "",
                    [],
                ]
                for playerName in allPlayers
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
        current_players = [
            username for username in current_players if username not in missing_players
        ]

        # Remove players with move data in a single pass using a list comprehension
        current_players_str = ",".join(
            username
            for username in current_players
            if not self.hasValidActualMoveData(username)
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
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            return False

        # Finally, check it is valid
        return self.isThisValidActualMoveArrForPhase(self.phase, playerMoveArr)
    
    def getOOBpreference(self, name):
        if not self.playersMoveData:
            return 0
        seat = self.seatPosition(name)
        if seat < 0:
            return 0
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        if arrIdx == -1:
            return 0  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            return 0

        # Finally, check it is valid
        if self.isThisValidActualMoveArrForPhase(self.phase, playerMoveArr):
            if self.phase == 4:
                return playerMoveArr[3][2]
    
        return 0
    
    def setOOBpreference(self, name, OOBpreference):
        if not self.playersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            playerMoveArr[1] = [3,4]

        # Finally, check it is valid
        if self.phase == 4:
            playerMoveArr[3][2] = OOBpreference
            self.playersMoveData = json.dumps(playersMoveDataArr)
            print(playerMoveArr)
            print(self.playersMoveData)
            self.save()
            return True
    
        return False

    def hasValidActualCleanupPreset(self, name):
        if not self.playersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found
        playerMoveArr = playersMoveDataArr[arrIdx]
        # If no phase/wrong phase / empty data is set, then there's no move Data
        if (
            playerMoveArr[1] == [-1]
            or 9 not in playerMoveArr[1]
            or playerMoveArr[3] == []
        ):
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
            if not isinstance(moveData[0][0], list) or not isinstance(
                moveData[0][1], list
            ):
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

            return True

    def insertPlayerMoveData(self, name, phasesArr, moveArr):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )

        playersMoveDataArr[arrIdx] = [
            name,
            phasesArr,
            str(int(time.time()) * 1000),
            moveArr,
        ]

        self.playersMoveData = json.dumps(playersMoveDataArr)

        self.save()

    def getCompressedMoveArr(self, name, forceReturnForPresetCleanup=False):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        # Only return the move if it is valid for current phase OR has a preset-clenaup
        if (
            self.isThisValidActualMoveArrForPhase(
                self.phase, playersMoveDataArr[arrIdx]
            )
            or forceReturnForPresetCleanup
        ):
            return base64.b64encode(
                gzip.compress(
                    json.dumps(
                        playersMoveDataArr[arrIdx], separators=(",", ":")
                    ).encode("utf-8")
                )
            ).decode("utf-8")

    def deleteSinglePlayersMove(self, name):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (
                i
                for i, sub_arr in enumerate(playersMoveDataArr)
                if len(sub_arr) > 0 and sub_arr[0] == name
            ),
            -1,
        )
        playersMoveDataArr[arrIdx] = [name, [-1], "", []]
        self.playersMoveData = json.dumps(playersMoveDataArr)
        self.save()

    def clearAllMoveDataV2(self):
        self.playersMoveData = ""
        self.save()

    def getJsonMoveResponseV2(self, notRequiedPlayerNames):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        playersToMove = []
        missingPlayers = set(self.missingPlayers.values_list("username", flat=True))
        #if self.relatedTournament:
        #    missingPlayers = {}
        for subArr in playersMoveDataArr:
            if (
                subArr[0] not in notRequiedPlayerNames
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
                gzip.compress(
                    json.dumps(playersMoveDataArr, separators=(",", ":")).encode(
                        "utf-8"
                    )
                )
            ).decode("utf-8"),
        }
        # Don't clear moves at end of payday to preserve fridge data
        # Actually, clearing moves can cause no turn order if the players browser doesn't respond
        if self.phase != 7 and self.phase != 3:
            # self.clearAllMoveDataV2()
            pass

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
        _currentPlayers = [player.strip() for player in self.currentPlayers.split(",")]
        # Remove missing players
        missing_players = set(self.missingPlayers.values_list("username", flat=True))
        #if self.relatedMainTournament:
        #    missing_players = {}
        _currentPlayers = [
            username for username in _currentPlayers if username not in missing_players
        ]

        # If any play has a move, then remove them
        playersToRemove = []
        for username in _currentPlayers:
            if self.hasValidActualMoveData(username):
                playersToRemove.append(username)

        for username in playersToRemove:
            _currentPlayers.remove(username)

        # Join the list elements with ','
        _currentPlayers = ",".join(_currentPlayers)

        return _currentPlayers

    # This just converts to array
    def getCurrentPlayersArray(self):
        current_players = self.currentPlayers
        return [player.strip() for player in current_players.split(",")]

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    # NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
    def getRewindHostHTML(self):
        USE_NEW_CODE = False
        if int(self.created) > 1744974000000:
            USE_NEW_CODE = True

        rewindConsentVotes = self.tempPresenter().getFullSetOfVoteResults(
            REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0
        )
        missingPlayerNames = self.getMissingPlayersNamesArray()

        rewindHTML = ""

        for player, vote_value in rewindConsentVotes.items():
            if player != getattr(self.host, "username"):
                if vote_value == 0:
                    rewindHTML += (
                        "<span style='background-color:red'>"
                        + player
                        + ": "
                        + gettext("No Permission")
                        + "</span><BR/>"
                    )
                elif vote_value == 1:
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Single Permission")
                        + "</span><BR/>"
                    )
                elif vote_value == 2:
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Permanent Permission")
                        + "</span><BR/>"
                    )
        return rewindHTML

    def getRewindHostPossible(self):
        # TODO - move this to new vote system
        starting_options = json.loads(self.startingOptions) if self.startingOptions else []
        if 102 in starting_options:
            return True
        rewindConsentVotes = self.tempPresenter().getFullSetOfVoteResults(
            REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0
        )
        missingPlayerNames = self.getMissingPlayersNamesArray()
        hostUsername = getattr(self.host, "username")
        possible = True
        for player in rewindConsentVotes:
            # If the player is not missing, and has a 0 vote, then it is not possible
            if (
                player not in missingPlayerNames
                and rewindConsentVotes[player] == 0
                and player != hostUsername
            ):
                possible = False
        return possible

    def removeSingleRewindPermission(self):
        rewindConsentVotes = self.tempPresenter().getFullSetOfVoteResults(
            REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0
        )
        for player in rewindConsentVotes:
            if rewindConsentVotes[player] == 1:
                rewindConsentVotes[player] = 0

        self.tempPresenter().setVoteResults(
            REWIND_CONSENT_VOTE_TOPIC, rewindConsentVotes
        )

    def getCurrentRewindConsent(self, _username):
        # return 0,1, or 2
        rewindConsentVotes = self.tempPresenter().getFullSetOfVoteResults(
            REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0
        )
        if _username in rewindConsentVotes:
            return rewindConsentVotes[_username]
        else:
            return 0

    # takes in a user object
    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = (
                self.allPlayers.all()
                .filter(~Q(missingPlayersRelName=getattr(self, "id")))
                .order_by("?")
                .first()
            )
            self.host = possibleHost
            self.save()

    def isTournamentRoundFinished(self, tournamentProgressionDataArray):
        #if self.relatedTournament is None:
         #   return False

        # Check all games from previous round are finished
        finishedGames = 0
        for row in tournamentProgressionDataArray[-1]:
            if row[0] == "BYEPLAYERS":
                finishedGames += 1
            #else:
            #    #game = FCM_Game.objects.get(
            #    #    id=row[self.relatedTournament.maxGamePlayers]
            #    #)
            #    if game.gameStatus == "FINISHED":
            #        finishedGames += 1
        if finishedGames == len(tournamentProgressionDataArray[-1]):
            return True
        return False

    # Takes in self, request, and then 3 JSON[""] pieces of string data
    def endGame(self, request, _winnerUsername, _finalScores, _tournamentData, _gameID):
        self.rewindData = ""
        self.rewindTempData = ""
        self.kickoutFlexiData = ""
        self.activeVotes = None
        self.gameStatus = "FINISHED"
        self.winner = User.objects.get(username=_winnerUsername)
        try:
            self.deleteGameVotes = None
        except:
            pass
        self.clearAllMoveDataV2()
        self.save()

        # This is sorted with winner in [0][name, money]
        finalPositions = []
        for i in range(len(_finalScores)):
            finalPositions.append(_finalScores[i][0])
        SN_M_sendEndGameNotification(request, "FCM", finalPositions, _gameID, self)

        #if self.relatedTournament:
        #    SF_M_ProcessTournamentEndGame(request, "FCM", self, [_winnerUsername])
        if self.relatedMainTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MAIN_T_FLAG,
                self.relatedMainTournament,
                self,
                [_winnerUsername],
                _tournamentData,
            )
        elif self.relatedMiniTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MINI_T_FLAG,
                self.relatedMiniTournament,
                self,
                [_winnerUsername],
                _tournamentData,
            )

    def getGameCode(self):
        return "FCM"


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
