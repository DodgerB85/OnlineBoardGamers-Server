import time
import json
import random

from django.db.models import Q

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getCNSstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    SN_M_sendGameStartNotification,
)


class CannesPresenter:
    def __init__(self, game):
        self.game = game

    def __str__(self):
        all_players = self.game.players.exclude(is_kicked=True).select_related('player')
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.game.id}: {self.getGameName()} : {allPlayersString} : {self.game.gameStatus} : {self.currentTurnString()}"

    def getGameName(self):
        _gameName = ""
        if self.game.gameName != "":
            _gameName = self.game.gameName
        else:
            _gameName = f"[{self.game.creator.username}'s Game]"
        if self.game.gameStatus == "PRIVATE":
            _gameName += "[Private Game]"
        return _gameName

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        
        self.game.rewindData = ""
        self.game.rewindTempData = ""
        self.game.kickoutFlexiData = ""
        self.game.gameStatus = "FINISHED"
        
        winner_user = User.objects.get(username=_winner)
        winner_gp = self.game.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()
        
        self.game.save()

        SN_M_sendEndGameNotification(request, "CNS", _finalPositions, _gameID, self.game)

    def currentTurnString(self):
        return SR_currentTurnString("CNS", self.game.turn, self.game.phase)

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        current_players = self.game.players.filter(is_current=True).select_related('player')
        
        if not current_players.exists():
            return True
        
        current_usernames = [gp.player.username for gp in current_players if gp.player]
        
        if (
            loggedInPlayerUsername in current_usernames
            or "SHADOW" in current_usernames
            or "SHADOW_2" in current_usernames
            or "SHADOW_3" in current_usernames
        ):
            return True
        return False

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        current_players = self.game.players.filter(is_current=True).select_related('player')
        
        if not current_players.exists():
            return True
        
        current_usernames = [gp.player.username for gp in current_players if gp.player]
        
        shadow_values = {
            "SHADOW",
            "SHADOW_2",
            "SHADOW_3",
            "SHADOW_4",
            "SHADOW_5",
            "FcmAI",
        }
        
        return (
            loggedInPlayerUsername in current_usernames
            or any(username in shadow_values for username in current_usernames)
        )

    def getSecondsToNextKickout(self):
        return SF_getSecondsToNextKickout(self.game.latestUpdate, self.game.kickoutDuration)

    def getMissingPlayersNamesArray(self):
        return list(
            self.game.players.filter(is_missing=True)
            .select_related('player')
            .values_list('player__username', flat=True)
        )

    def kickoutRequired(self):
        all_players = self.game.players.exclude(is_kicked=True).select_related('player')
        all_player_usernames = [gp.player.username for gp in all_players if gp.player]

        current_players = self.getCurrentPlayersArray()
        current_username = current_players[0] if current_players else ""

        return SF_kickoutRequired(
            self.game.gameStatus,
            all_player_usernames,
            self.game.latestUpdate,
            self.game.kickoutDuration,
            self.game.kickoutFlexiData,
            current_username,
        )

    def serialize(self, loggedInUserObj=None):
        all_players = self.game.players.exclude(is_kicked=True).select_related('player')
        
        remainingPlayersInt = self.game.maxPlayers - all_players.count()
        remainingPlayers = "".join(
            str(all_players.count() + i + 1) for i in range(remainingPlayersInt)
        )
        
        winner_gp = self.game.players.filter(winner=True).first()
        winner = winner_gp.player.username if (winner_gp and winner_gp.player) else ""

        createdString = self.game.created
        latestUpdateString = self.game.latestUpdate

        latestUpdateElapsedTimeString = ""
        if (
            self.game.gameStatus == "WAITING"
            or self.game.gameStatus == "AVAILABLE"
            or self.game.gameStatus == "ACTIVE"
            or self.game.gameStatus == "PRIVATE"
        ):
            elapsedTotalSeconds = (
                int(time.time()) - int(self.game.created) // 1000
                if self.game.gameStatus == "WAITING"
                or self.game.gameStatus == "AVAILABLE"
                or self.game.gameStatus == "PRIVATE"
                else int(time.time()) - int(self.game.latestUpdate) // 1000
            )
            latestUpdateElapsedTimeString = (
                SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds)
            )

        myMove = loggedInUserObj is not None and self.isMyMove(loggedInUserObj.username)

        chatNotification = False
        involvedPlayer = False
        if loggedInUserObj:
            user_gp = all_players.filter(player=loggedInUserObj).first()
            if user_gp:
                chatNotification = user_gp.has_chat_notification
                involvedPlayer = not user_gp.is_missing

        gamePaceString = SR_gamePaceString(self.game.gamePace)

        startingOptionsHTML = SR_getCNSstartingOptionsHTML(self.game.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

        deleteableGame = (
            all_players.filter(player__username="SHADOW").exists()
            and loggedInUserObj
            and all_players.filter(player=loggedInUserObj).exists()
        )

        return {
            "gameID": self.game.id,
            "gameName": self.getGameName(),
            "gameDescription": self.game.gameDescription,
            "creator": self.game.creator.username,
            "created": createdString,
            "allPlayers": [gp.player.username for gp in all_players if gp.player],
            "invitedPlayers": [user.username for user in self.game.invitedPlayers.all()],
            "currentPlayers": ", ".join(self.getCurrentPlayersArray()),
            "currentTurn": self.currentTurnString(),
            "pace": gamePaceString,
            "latestUpdate": latestUpdateString,
            "startingOptions": startingOptionsHTML,
            "kickoutDuration": self.game.kickoutDuration,
            "maxPlayers": self.game.maxPlayers,
            "winner": winner,
            "myMove": myMove,
            "involvedPlayer": involvedPlayer,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.game.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "CNS",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = (
            json.loads(self.game.startingOptions) if self.game.startingOptions else []
        )
        if 120 in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = (
            json.loads(self.game.startingOptions) if self.game.startingOptions else []
        )
        if 110 in startingOptionsListPrelim:
            return True
        return False

    def seatPosition(self, _username, withoutBots=False):
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            return playerList.index(_username)
        except (ValueError, TypeError):
            return -1

    def getAllPlayersOrderedySeat(self, withoutBots=False):
        players = self.game.players.exclude(is_kicked=True).select_related('player')
        
        if withoutBots:
            return [gp.player.username for gp in players if gp.player]
        
        result = []
        for gp in players:
            if gp.is_missing:
                result.append("CnsBot")
            elif gp.player:
                result.append(gp.player.username)
        return result

    def startGame(self, request):
        from Lobby.models import GamePlayer
        
        self.game.gameStatus = "ACTIVE"
        self.game.playerOrderSeed = random.randint(1000, 32767)
        
        game_players = list(self.game.players.exclude(is_kicked=True))
        
        random.Random(self.game.playerOrderSeed).shuffle(game_players)
        
        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = (idx == 0)
        
        GamePlayer.objects.bulk_update(game_players, ['seat_order', 'is_current'])
        
        self.game.save()

        if not self.game.players.filter(player__username="SHADOW").exists():
            playerListToNotify = [
                gp.player.username for gp in game_players 
                if gp.player and gp.player.username != request.user.username
            ]

            SN_M_sendGameStartNotification(
                request, "CNS", playerListToNotify, self.game.id, self.game
            )

    def getCurrentPlayersArray(self):
        current_players = self.game.players.filter(is_current=True).select_related('player')
        return [gp.player.username for gp in current_players if gp.player]

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.game.creator:
            possibleHost = (
                self.game.players
                .exclude(is_kicked=True)
                .filter(is_missing=False)
                .select_related('player')
                .order_by('?')
                .first()
            )
            if possibleHost and possibleHost.player:
                self.game.host = possibleHost.player

    def enableStatsExclude(self, _username):
        seatToChange = self.seatPosition(_username, True)
        if (len(self.game.statsExcludeConsent)) < self.game.maxPlayers:
            self.game.statsExcludeConsent = "0" * self.game.maxPlayers
        self.game.statsExcludeConsent = (
            self.game.statsExcludeConsent[:seatToChange]
            + "1"
            + self.game.statsExcludeConsent[seatToChange + 1 :]
        )
        totalConsent = 0
        for letter in self.game.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.game.maxPlayers:
            self.game.statsExcludedGame = True

    def getGameCode(self):
        return "CNS"
