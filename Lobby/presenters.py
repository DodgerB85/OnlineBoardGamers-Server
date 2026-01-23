import time
import json
import random

from django.db.models import Q

from Lobby.sharedFunctions.sharedRefs import (
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getCNSstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
)


class GamePresenter:
    def __init__(self, gameObj):
        self.gameObj = gameObj

    def getGameName(self):
        # Use fields already on the model. DO NOT call .all() or .count() here.
        name = (
            self.gameObj.gameName
            or f"{getattr(self.gameObj.creator, 'username', 'Unknown')}'s Game"
        )
        if self.gameObj.gameStatus == "PRIVATE":
            name += " [Private]"
        return name

    def currentTurnString(self):
        return SR_currentTurnString(
            self.gameObj.gameCode, self.gameObj.turn, self.gameObj.phase
        )

    def clearGeneralDataOnGameEndWithoutSave(self):
        self.gameObj.gameStatus = "FINISHED"
        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.statsExcludeConsent = ""
        self.gameObj.deleteGameVotes = None
        self.gameObj.activeVotes = None

    ###### VOTING METHODS #######
    def castVote(self, topic, username, choice):
        """
        Saves a specific choice for a user.
        Example: topic='rewind', choice=2
        """
        # Double check player is in the game - WAIT FOR ALL PLAYERS TO MOVE HERE
        # if playerName not in [p.username for p in self.allPlayers.all()]:
        #    return False  # Player not in the game
        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}

        if topic not in self.gameObj.activeVotes:
            self.gameObj.activeVotes[topic] = {}

        # Store as {"username": choice}
        self.gameObj.activeVotes[topic][username] = choice
        return True

    def setVoteResults(self, topic, votes):
        self.gameObj.activeVotes[topic] = votes

    # The topic might not be in activeVotes, but sometimes we want a full return set of username: T/F
    def getFullSetOfVoteResults(self, topic, usernames, default):
        # Initialize the return dictionary with default for every provided username
        generalReturn = {username: default for username in usernames}

        # If game is finished or no votes exist at all, return the all-False set
        if self.gameObj.gameStatus == "FINISHED" or not self.gameObj.activeVotes:
            return generalReturn

        # If this specific topic hasn't been started, return the all-False set
        if topic not in self.gameObj.activeVotes:
            return generalReturn

        currentVotes = self.gameObj.activeVotes[topic]

        # Update the return set with actual votes where they exist
        for username in usernames:
            if username in currentVotes:
                generalReturn[username] = currentVotes[username]

        return generalReturn

    def getVoteResults(self, topic):
        """
        Returns a tally of choices.
        Example: {0: 1, 1: 3} (1 person voted '0', 3 people voted '1')
        """
        if not self.gameObj.activeVotes or topic not in self.gameObj.activeVotes:
            return {}

        results = {}
        for choice in self.gameObj.activeVotes[topic].values():
            results[choice] = results.get(choice, 0) + 1
        return results

    def check_unanimous_choice_in_set(self, topic, allowed_choices, total_required):
        """
        Checks if EVERY player has voted and their choices are within the allowed set.
        allowed_choices can be a single value (1) or a list ([1, 2]).
        """
        if not self.gameObj.activeVotes or topic not in self.gameObj.activeVotes:
            return False

        votes = self.gameObj.activeVotes.get(topic, {})

        # 1. Ensure everyone has voted
        if len(votes) < total_required:
            return False

        # 2. Ensure allowed_choices is a list for the 'in' check
        if not isinstance(allowed_choices, (list, tuple, set)):
            allowed_choices = [allowed_choices]

        # 3. Check if all submitted votes are in the allowed list
        # (e.g., if all values are 1 or 2)
        return all(val in allowed_choices for val in votes.values())

    # End voting methods


class CannesPresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )
        allPlayersString = " / ".join(
            gp.player.username for gp in all_players if gp.player
        )
        return f"{self.gameObj.id}: {self.gameObj.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.gameObj.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotification,
        )

        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.gameStatus = "FINISHED"

        winner_user = User.objects.get(username=_winner)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        self.gameObj.save()

        SN_M_sendEndGameNotification(
            request, "CNS", _finalPositions, _gameID, self.gameObj
        )

    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        current_players = self.gameObj.players.filter(is_current=True).select_related(
            "player"
        )

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

        current_players = self.gameObj.players.filter(is_current=True).select_related(
            "player"
        )

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

        return loggedInPlayerUsername in current_usernames or any(
            username in shadow_values for username in current_usernames
        )

    def getSecondsToNextKickout(self):
        from Lobby.sharedFunctions.sharedFunctions import SF_getSecondsToNextKickout

        return SF_getSecondsToNextKickout(
            self.gameObj.latestUpdate, self.gameObj.kickoutDuration
        )

    def getMissingPlayersNamesArray(self):
        return list(
            self.gameObj.players.filter(is_missing=True)
            .select_related("player")
            .values_list("player__username", flat=True)
        )

    def kickoutRequired(self):
        from Lobby.sharedFunctions.sharedFunctions import SF_kickoutRequired

        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )
        all_player_usernames = [gp.player.username for gp in all_players if gp.player]

        current_players = self.getCurrentPlayersArray()
        current_username = current_players[0] if current_players else ""

        return SF_kickoutRequired(
            self.gameObj.gameStatus,
            all_player_usernames,
            self.gameObj.latestUpdate,
            self.gameObj.kickoutDuration,
            self.gameObj.kickoutFlexiData,
            current_username,
        )

    def serialize(self, loggedInUserObj=None):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )

        remainingPlayersInt = self.gameObj.maxPlayers - all_players.count()
        remainingPlayers = "".join(
            str(all_players.count() + i + 1) for i in range(remainingPlayersInt)
        )

        winner_gp = self.gameObj.players.filter(winner=True).first()
        winner = winner_gp.player.username if (winner_gp and winner_gp.player) else ""

        createdString = self.gameObj.created
        latestUpdateString = self.gameObj.latestUpdate

        latestUpdateElapsedTimeString = ""
        if (
            self.gameObj.gameStatus == "WAITING"
            or self.gameObj.gameStatus == "AVAILABLE"
            or self.gameObj.gameStatus == "ACTIVE"
            or self.gameObj.gameStatus == "PRIVATE"
        ):
            elapsedTotalSeconds = (
                int(time.time()) - int(self.gameObj.created) // 1000
                if self.gameObj.gameStatus == "WAITING"
                or self.gameObj.gameStatus == "AVAILABLE"
                or self.gameObj.gameStatus == "PRIVATE"
                else int(time.time()) - int(self.gameObj.latestUpdate) // 1000
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

        gamePaceString = SR_gamePaceString(self.gameObj.gamePace)

        startingOptionsHTML = SR_getCNSstartingOptionsHTML(self.gameObj.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

        deleteableGame = (
            all_players.filter(player__username="SHADOW").exists()
            and loggedInUserObj
            and all_players.filter(player=loggedInUserObj).exists()
        )

        return {
            "gameID": self.gameObj.id,
            "gameName": self.gameObj.getGameName(),
            "gameDescription": self.gameObj.gameDescription,
            "creator": self.gameObj.creator.username,
            "created": createdString,
            "allPlayers": [gp.player.username for gp in all_players if gp.player],
            "invitedPlayers": [
                user.username for user in self.gameObj.invitedPlayers.all()
            ],
            "currentPlayers": ", ".join(self.getCurrentPlayersArray()),
            "currentTurn": self.gameObj.currentTurnString(),
            "pace": gamePaceString,
            "latestUpdate": latestUpdateString,
            "startingOptions": startingOptionsHTML,
            "kickoutDuration": self.gameObj.kickoutDuration,
            "maxPlayers": self.gameObj.maxPlayers,
            "winner": winner,
            "myMove": myMove,
            "involvedPlayer": involvedPlayer,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.gameObj.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "gameCode": "CNS",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = (
            json.loads(self.gameObj.startingOptions)
            if self.gameObj.startingOptions
            else []
        )
        if 120 in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = (
            json.loads(self.gameObj.startingOptions)
            if self.gameObj.startingOptions
            else []
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
        players = (
            self.gameObj.players#.exclude(is_kicked=True)
            .select_related("player")
            .order_by("seat_order")
        )

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
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendGameStartNotification,
        )

        self.gameObj.gameStatus = "ACTIVE"
        self.gameObj.playerOrderSeed = random.randint(1000, 32767)

        game_players = list(self.gameObj.players.exclude(is_kicked=True))

        random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)

        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = idx == 0

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        self.gameObj.save()

        if not self.gameObj.players.filter(player__username="SHADOW").exists():
            playerListToNotify = [
                gp.player.username
                for gp in game_players
                if gp.player and gp.player.username != request.user.username
            ]

            SN_M_sendGameStartNotification(
                request, "CNS", playerListToNotify, self.gameObj.id, self.gameObj
            )

    def getCurrentPlayersArray(self):
        current_players = self.gameObj.players.filter(is_current=True).select_related(
            "player"
        )
        return [gp.player.username for gp in current_players if gp.player]

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def checkForHostChange(self, _missingUser):
        if _missingUser == self.gameObj.creator:
            possibleHost = (
                self.gameObj.players.exclude(is_kicked=True)
                .filter(is_missing=False)
                .select_related("player")
                .order_by("?")
                .first()
            )
            if possibleHost and possibleHost.player:
                self.gameObj.host = possibleHost.player

    def enableStatsExclude(self, _username):
        seatToChange = self.seatPosition(_username, True)
        if (len(self.gameObj.statsExcludeConsent)) < self.gameObj.maxPlayers:
            self.gameObj.statsExcludeConsent = "0" * self.gameObj.maxPlayers
        self.gameObj.statsExcludeConsent = (
            self.gameObj.statsExcludeConsent[:seatToChange]
            + "1"
            + self.gameObj.statsExcludeConsent[seatToChange + 1 :]
        )
        totalConsent = 0
        for letter in self.gameObj.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.gameObj.maxPlayers:
            self.gameObj.statsExcludedGame = True

    def getGameCode(self):
        return "CNS"
