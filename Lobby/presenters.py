import time
import json
import random

from django.contrib.sites.shortcuts import get_current_site
from django.utils.translation import gettext
from django.db.models import Q
from django.urls import reverse

from Lobby.sharedFunctions.sharedRefs import (
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getCNSstartingOptionsHTML,
    SR_getAQYstartingOptionsHTML,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
)

from Lobby.sharedFunctions.constants import STATS_EXCLUDE_VOTE_TOPIC, DELETE_VOTE_TOPIC, REWIND_CONSENT_VOTE_TOPIC


class GamePresenter:
    def __init__(self, gameObj):
        self.gameObj = gameObj

    ####### THESE FUNCTIONS HAVE MINOR CHANGES DEPEDNGIN ON THE GAME
    # - NEED TO BE UPDATED WITH EACH NEW MIGRATION TO GENERAL GAME MODEL
    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.gameObj.gameCode not in ["CNS", "WEB", "AQY"]:
            print(
                f"isMyMove: gameCode: {self.gameObj.gameCode} ERROR: will always return False"
            )
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

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        if self.gameObj.gameCode not in ["CNS", "WEB", "AQY"]:
            print(
                f"quickIsMyMove: gameCode: {self.gameObj.gameCode} ERROR: will always return False"
            )
            return False

        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return True

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

    ########### END OF FUNCTIONS THAT DEPEND ON THE GAME

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

    def getCurrentPlayersArray(self):
        current_players = self.gameObj.players.filter(is_current=True).select_related(
            "player"
        )
        return [gp.player.username for gp in current_players if gp.player]

    def getCurrentPlayersString(self):
        return ", ".join(self.getCurrentPlayersArray())

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    def seatPosition(self, _username, withoutBots=False):
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            return playerList.index(_username)
        except (ValueError, TypeError):
            return -1

    def getAllPlayersOrderedySeat(self, withoutBots=False, excludeBots=False):
        players = self.gameObj.players.select_related(  # .exclude(is_kicked=True)
            "player"
        ).order_by("seat_order")

        if excludeBots:
            return [
                gp.player.username for gp in players if gp.player and not gp.is_missing
            ]

        if withoutBots:
            return [gp.player.username for gp in players if gp.player]

        result = []
        for gp in players:
            if gp.is_missing:
                result.append("CnsBot")
            elif gp.player:
                result.append(gp.player.username)
        return result

    # NOTE: HC/BUS MIGHT USE COMMA SEPERATE STRING. SO CHECK IF SOME GAMES NEED TO BE HANDLED SEPERATELY
    # TO GET THE startOptionsListPrelim
    def isExperiencedGame(self):
        startingOptionsListPrelim = (
            json.loads(self.gameObj.startingOptions)
            if self.gameObj.startingOptions
            else []
        )
        if 120 in startingOptionsListPrelim:
            return True
        return False

    # NOTE: HC/BUS MIGHT USE COMMA SEPERATE STRING. SO CHECK IF SOME GAMES NEED TO BE HANDLED SEPERATELY
    # TO GET THE startOptionsListPrelim
    def isLearningGame(self):
        startingOptionsListPrelim = (
            json.loads(self.gameObj.startingOptions)
            if self.gameObj.startingOptions
            else []
        )
        if 110 in startingOptionsListPrelim:
            return True
        return False

    # KICKOUT STUFF
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

    # END KICKOUT STUFF

    def addMissingPlayer(self, user):
        """Add a player to missing players"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp and not gp.is_missing:
            gp.is_missing = True
            gp.save()

    def addKickedPlayer(self, user):
        """Add a player to kicked players"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp and not gp.is_kicked:
            gp.is_kicked = True
            gp.save()

    def setCurrentPlayers(self, player_usernames_string):
        """Set current players from comma-separated string of usernames"""
        if not player_usernames_string:
            usernames = set()
        else:
            usernames = {
                name.strip()
                for name in player_usernames_string.split(",")
                if name.strip()
            }

        game_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )

        for gp in game_players:
            if gp.player:
                should_be_current = gp.player.username in usernames
                if gp.is_current != should_be_current:
                    gp.is_current = should_be_current
                    gp.save()

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

    # Take an array of usernames, and set their has_chat_notification to True
    def addChatNotifications(self, usernames):
        for username in usernames:
            gp = self.gameObj.players.filter(player__username=username).first()
            if gp and not gp.has_chat_notification:
                # print("Adding chat notification for " + username)
                gp.has_chat_notification = True
                gp.save()

    def removeChatNotification(self, userObj):
        """Remove chat notification for a player"""
        gp = self.gameObj.players.filter(player=userObj).first()
        if gp and gp.has_chat_notification:
            gp.has_chat_notification = False
            gp.save()

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

    def processVoteLogic(self, topic, username, choice):
        """
        Processes a vote and returns a dict ready for JsonResponse.
        """
        # 1. Cast the vote
        success = self.castVote(topic, username, choice)
        if not success:
            return {"voteChanged": False}

        # 2. Persist the vote
        self.gameObj.save()

        # 3. Check if all players have voted
        #### TEMP TODO - this is just models NOT on the unified model but who use the unified voting system
        if self.gameObj.getGameCode() in ["FCM"]:
            ordered_players = self.gameObj.getAllPlayersOrderedySeat()
            missing_players = {p.username for p in self.gameObj.missingPlayers.all()}
        else:
            # NB this "y" seat typo is everywhere! Leave for noe
            ordered_players = self.getAllPlayersOrderedySeat(True)
            missing_players = self.getMissingPlayersNamesArray()

        votes_map = self.getFullSetOfVoteResults(topic, ordered_players, False)

        all_voted = True
        for player, vote in votes_map.items():
            # If using gameObj methods, 'player' might be an object; ensure you compare names
            player_name = player.username if hasattr(player, "username") else player

            if not vote and player_name not in missing_players:
                all_voted = False
                break

        # Prepare base response data
        response_data = {"voteChanged": True, "votesData": json.dumps(votes_map)}

        # 4. Handle Terminal Actions
        if all_voted:
            if topic == DELETE_VOTE_TOPIC:
                self.gameObj.delete()
                response_data["message"] = gettext("Game successfully deleted")
                response_data["redirect_url"] = reverse("index")
            elif topic == STATS_EXCLUDE_VOTE_TOPIC:
                self.gameObj.statsExcludedGame = True
                self.gameObj.save()
                # response_data["message"] = gettext("Game stats excluded")

        return response_data

    def setVoteResults(self, topic, votes):
        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}
        # if the topic doesnt exist, then creat it
        if topic not in self.gameObj.activeVotes:
            self.gameObj.activeVotes[topic] = {}
        self.gameObj.activeVotes[topic] = votes

    # The topic might not be in activeVotes, but sometimes we want a full return set of username: T/F
    def getFullSetOfVoteResults(self, topic, usernames, default):
        # Initialize the return dictionary with default for every provided username
        generalReturn = {username: default for username in usernames}
        
        # If the game is statsExcluded, and you are checking that vote, return True
        if self.gameObj.statsExcludedGame and topic == STATS_EXCLUDE_VOTE_TOPIC:
            # set all to True
            for username in usernames:
                generalReturn[username] = True
            return generalReturn
        
        # If it is an FCM game with enabled rewinds, return 2 always
        if self.gameObj.getGameCode() == "FCM" and topic == REWIND_CONSENT_VOTE_TOPIC:
            startingOptionsList = self.gameObj.startingOptions.split(",")
            if "99" in startingOptionsList:
                for username in usernames:
                    generalReturn[username] = 2
                return generalReturn

        # If game is finished or no votes exist at all, return the all-False set
        if self.gameObj.gameStatus == "FINISHED" or not self.gameObj.activeVotes:
            return generalReturn

        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}

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

    def startGame(self, request):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer
        from Lobby.sharedFunctions.sharedNotifications import SN_M_sendGameStartNotification


        self.gameObj.gameStatus = "ACTIVE"
        self.gameObj.playerOrderSeed = random.randint(1000, 32767)
        # print(self.gameObj.gameStatus)
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

            domain = get_current_site(request)
            username = request.user.username
            #SN_M_sendGameStartNotification(
            #    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
            #    "CNS",
            #    playerListToNotify,
            #    self.gameObj.id,
            #    self.gameObj,
            #    username,
            #)
            async_task(
                "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
                "CNS",
                playerListToNotify,
                self.gameObj.id,
                self.gameObj,
                username,
            )

    def getGameCode(self):
        return "CNS"


class WebPresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )
        allPlayersString = " / ".join(
            gp.player.username for gp in all_players if gp.player
        )
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotificationTieGame,
        )

        self.clearGeneralDataOnGameEndWithoutSave()

        names = self.getAllPlayersOrderedySeat(False)
        winnerNamesArray = []
        for playerIndex in _winner:
            winner_user = User.objects.get(username=names[playerIndex])
            winner_gp = self.gameObj.players.filter(player=winner_user).first()
            if winner_gp:
                winner_gp.winner = True
                winner_gp.save()
            winnerNamesArray.append(names[playerIndex])

        self.gameObj.save()

        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                _finalPositions[i][j] = names[_finalPositions[i][j]]

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

        new_names = [
            name
            for name in names
            if name not in [item for sublist in _finalPositions for item in sublist]
        ]

        for name in new_names:
            finalResults.append([name, "Trapped in a dot matrix", 9])

        SN_M_sendEndGameNotificationTieGame(
            request, "WEB", finalResults, _gameID, self.gameObj
        )

    def serialize(self, loggedInUserObj=None):
        from Lobby.sharedFunctions.sharedRefs import (
            SR_gamePaceString,
            SR_getWEBstartingOptionsHTML,
            SR_latestUpdateElapsedTimeStringFromTotalSeconds,
        )

        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )

        remainingPlayersInt = self.gameObj.maxPlayers - all_players.count()
        remainingPlayers = "".join(
            str(all_players.count() + i + 1) for i in range(remainingPlayersInt)
        )

        winner_gps = self.gameObj.players.filter(winner=True).select_related("player")
        winner = ", ".join([gp.player.username for gp in winner_gps if gp.player])

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

        startingOptionsHTML = SR_getWEBstartingOptionsHTML(self.gameObj.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

        deleteableGame = (
            all_players.filter(player__username="SHADOW").exists()
            and loggedInUserObj
            and all_players.filter(player=loggedInUserObj).exists()
        )

        return {
            "gameID": self.gameObj.id,
            "gameName": self.getGameName(),
            "gameDescription": self.gameObj.gameDescription,
            "creator": self.gameObj.creator.username,
            "created": createdString,
            "allPlayers": [gp.player.username for gp in all_players if gp.player],
            "invitedPlayers": [
                user.username for user in self.gameObj.invitedPlayers.all()
            ],
            "currentPlayers": ", ".join(self.getCurrentPlayersArray()),
            "currentTurn": self.currentTurnString(),
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
            "game": "WEB",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer
        from Lobby.sharedFunctions.sharedNotifications import SN_M_sendGameStartNotification


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
            self.gameObj.deleteGameVotes = {}
            all_usernames = [gp.player.username for gp in game_players if gp.player]
            self.gameObj.deleteGameVotes.update(
                {username: False for username in all_usernames}
            )
            self.gameObj.save()

            if not isTournamentGame:
                playerListToNotify = [
                    gp.player.username
                    for gp in game_players
                    if gp.player and gp.player.username != request.user.username
                ]

                domain = get_current_site(request)
                username = request.user.username
                #SN_M_sendGameStartNotification(
                #    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
                #    "WEB",
                #    playerListToNotify,
                #    self.gameObj.id,
                #    self.gameObj,
                #    username,
                #)
                
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
                    "WEB",
                    playerListToNotify,
                    self.gameObj.id,
                    self.gameObj,
                    username,
                )

    def getGameCode(self):
        return "WEB"

    def getDeleteVotesData(self):
        if self.gameObj.gameStatus == "FINISHED":
            all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
                "player"
            )
            return {gp.player.username: False for gp in all_players if gp.player}

        if self.gameObj.deleteGameVotes is None:
            all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
                "player"
            )
            self.gameObj.deleteGameVotes = {
                gp.player.username: False for gp in all_players if gp.player
            }
            self.gameObj.save()

        return self.gameObj.deleteGameVotes

    def addDeleteVote(self, playerName):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )
        player_usernames = [gp.player.username for gp in all_players if gp.player]

        if playerName not in player_usernames:
            return False

        if self.gameObj.deleteGameVotes is None:
            self.gameObj.deleteGameVotes = {}
            self.gameObj.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )

        if playerName not in self.gameObj.deleteGameVotes:
            self.gameObj.deleteGameVotes = {}
            self.gameObj.deleteGameVotes.update(
                {username: False for username in player_usernames}
            )

        self.gameObj.deleteGameVotes[playerName] = True
        self.gameObj.save()
        return True


class AqyPresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )
        allPlayersString = " / ".join(
            gp.player.username for gp in all_players if gp.player
        )
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotificationTieGame,
        )
        from Lobby.sharedFunctions.sharedFunctions import (
            SF_M_ProcessTournamentEndGame,
            SF_M_ProcessAnyTournamentEndGame,
        )
        from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

        self.clearGeneralDataOnGameEndWithoutSave()

        names = self.getAllPlayersOrderedySeat(False)
        winnerNamesArray = []
        for playerIndex in _winner:
            winner_user = User.objects.get(username=names[playerIndex])
            winner_gp = self.gameObj.players.filter(player=winner_user).first()
            if winner_gp:
                winner_gp.winner = True
                winner_gp.save()
            winnerNamesArray.append(names[playerIndex])

        self.gameObj.save()

        for i in range(len(_finalPositions)):
            for j in range(len(_finalPositions[i])):
                _finalPositions[i][j] = names[_finalPositions[i][j]]

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

        new_names = [
            name
            for name in names
            if name not in [item for sublist in _finalPositions for item in sublist]
        ]

        for name in new_names:
            finalResults.append([name, "Lost in Antiquity", 9])

        SN_M_sendEndGameNotificationTieGame(
            request, "AQY", finalResults, _gameID, self.gameObj
        )

        if self.gameObj.relatedMainTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MAIN_T_FLAG,
                self.gameObj.relatedMainTournament,
                self.gameObj,
                winnerNamesArray,
                finalResults,
            )

        if self.gameObj.relatedMiniTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MINI_T_FLAG,
                self.gameObj.relatedMiniTournament,
                self.gameObj,
                winnerNamesArray,
                finalResults,
            )

    def getAllPlayersOrderedySeat(self, withoutBots=False, excludeBots=False):
        players = self.gameObj.players.select_related(
            "player"
        ).order_by("seat_order")

        if excludeBots:
            return [
                gp.player.username for gp in players if gp.player and not gp.is_missing
            ]

        if withoutBots:
            return [gp.player.username for gp in players if gp.player]

        result = []
        for gp in players:
            if gp.is_missing:
                result.append("AqyBot")
            elif gp.player:
                result.append(gp.player.username)
        return result

    def serialize(self, loggedInUserObj=None):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related(
            "player"
        )

        remainingPlayersInt = self.gameObj.maxPlayers - all_players.count()
        remainingPlayers = "".join(
            str(all_players.count() + i + 1) for i in range(remainingPlayersInt)
        )

        winner_gps = self.gameObj.players.filter(winner=True).select_related("player")
        winner = ", ".join([gp.player.username for gp in winner_gps if gp.player])

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

        startingOptionsHTML = SR_getAQYstartingOptionsHTML(self.gameObj.startingOptions)

        kickoutRequiredNum = self.kickoutRequired()

        deleteableGame = (
            all_players.filter(player__username="SHADOW").exists()
            and loggedInUserObj
            and all_players.filter(player=loggedInUserObj).exists()
        )

        return {
            "gameID": self.gameObj.id,
            "gameName": self.getGameName(),
            "gameDescription": self.gameObj.gameDescription,
            "creator": self.gameObj.creator.username,
            "created": createdString,
            "allPlayers": [gp.player.username for gp in all_players if gp.player],
            "invitedPlayers": [
                user.username for user in self.gameObj.invitedPlayers.all()
            ],
            "currentPlayers": ", ".join(self.getCurrentPlayersArray()),
            "currentTurn": self.currentTurnString(),
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
            "game": "AQY",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
            "startingMap": self.gameObj.startingMap,
        }

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer
        from Lobby.sharedFunctions.sharedNotifications import SN_M_sendGameStartNotification


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
            if not isTournamentGame:
                playerListToNotify = [
                    gp.player.username
                    for gp in game_players
                    if gp.player and gp.player.username != request.user.username
                ]

                domain = get_current_site(request)
                username = request.user.username
                SN_M_sendGameStartNotification(
                    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
                    "AQY",
                    playerListToNotify,
                    self.gameObj.id,
                    self.gameObj,
                    username,
                )
                #async_task(
                #    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                #    domain,
                #    "AQY",
                #    playerListToNotify,
                #    self.gameObj.id,
                #    self.gameObj,
                #    username,
                #)

    def getGameCode(self):
        return "AQY"

    def setCurrentPlayers(self, player_usernames_string):
        """Set current players by updating is_current on GamePlayer instances"""
        if not player_usernames_string:
            # Clear all current players
            self.gameObj.players.all().update(is_current=False)
            return
        
        current_usernames = set(
            name.strip() 
            for name in player_usernames_string.split(',') 
            if name.strip()
        )
        
        for gp in self.gameObj.players.all():
            if gp.player:
                gp.is_current = gp.player.username in current_usernames
                gp.save()

    def addMissingPlayer(self, user):
        """Mark a player as missing"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp:
            gp.is_missing = True
            gp.save()

    def addKickedPlayer(self, user):
        """Mark a player as kicked"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp:
            gp.is_kicked = True
            gp.save()

    def checkForHostChange(self, missing_user):
        """Change host if current host is missing"""
        if missing_user == self.gameObj.host:
            possible_hosts = self.gameObj.players.filter(
                is_missing=False, is_kicked=False
            ).exclude(player=missing_user).select_related('player')
            
            if possible_hosts.exists():
                new_host = possible_hosts.order_by('?').first()
                if new_host and new_host.player:
                    self.gameObj.host = new_host.player
                    self.gameObj.save()

    def addChatNotifications(self, usernames):
        """Add chat notifications for list of usernames"""
        for gp in self.gameObj.players.select_related('player').all():
            if gp.player and gp.player.username in usernames:
                gp.has_chat_notification = True
                gp.save()

    def getMissingPlayersNamesArray(self):
        """Get array of missing player names"""
        missing = self.gameObj.players.filter(is_missing=True).select_related('player')
        return [gp.player.username for gp in missing if gp.player]

    def getCurrentPlayers(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        
        _currentPlayers = []
        for gp in all_players:
            if gp.player:
                if self.hasMoveEndData(gp.player.username):
                    pass
                elif gp.player.username != "AqyBot":
                    _currentPlayers.append(gp.player.username)
        
        return ", ".join(_currentPlayers)

    def hasMoveEndData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if not gp:
            return False
        return bool(
            gp.currentMoveData != ""
            and gp.currentMoveTime != "MID_PHASE"
            and gp.currentMoveTime != "PRE_MOVE"
        )

    def hasMoveMidData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if not gp:
            return False
        return bool(gp.currentMoveData != "" and gp.currentMoveTime == "MID_PHASE")

    def updateSingleMove(self, name, data, deleteMove=False):
        import time
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name)

        if deleteMove:
            currentTime = ""
            data = ""

        gp = self.gameObj.players.filter(seat_order=seat).first()
        if gp:
            gp.currentMoveTime = currentTime
            gp.currentMoveData = data
            gp.save()

    def updatePreMove(self, name, phase, data):
        import base64
        import gzip
        import json

        seat = self.seatPosition(name)
        newJsonEntry = {"playerIndex": seat, "phase": phase, "data": data}

        gp = self.gameObj.players.filter(seat_order=seat).first()
        if not gp:
            return

        if (gp.currentMoveData == "" or gp.currentMoveData is None) and data[0] != -999:
            dataArray = []
            dataArray.append(newJsonEntry)
            gp.currentMoveTime = "PRE_MOVE"
            gp.currentMoveData = base64.b64encode(
                gzip.compress(json.dumps(dataArray).encode("utf-8"))
            ).decode("utf-8")
            gp.save()
            return

        current_data = json.loads(
            gzip.decompress(bytearray(base64.b64decode(gp.currentMoveData))).decode("utf-8")
        )
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
        gp.currentMoveData = base64.b64encode(
            gzip.compress(json.dumps(current_data).encode("utf-8"))
        ).decode("utf-8")
        gp.save()

    def deleteAllPreMoves(self):
        for gp in self.gameObj.players.all():
            if gp.currentMoveTime == "PRE_MOVE":
                gp.currentMoveTime = ""
                gp.currentMoveData = ""
                gp.save()

    def getMoveData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        return gp.currentMoveData if gp else ""

    def getMoveDataTime(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        return gp.currentMoveTime if gp else ""

    def clearAllMoveData(self):
        for gp in self.gameObj.players.all():
            gp.currentMoveTime = ""
            gp.currentMoveData = ""
            gp.save()

    def getJsonMoveResponse(self):
        import time
        import json

        readyPlayers = []
        jsonResponse = []

        for i in range(self.gameObj.maxPlayers):
            gp = self.gameObj.players.filter(seat_order=i).first()
            player_data = gp.currentMoveData if gp else ""
            player_time = gp.currentMoveTime if gp else ""
            
            if player_data == "":
                readyPlayers.append(False)
                if not player_time:
                    player_time = int(time.time() * 1000)
                jsonResponse.append(
                    {"timestamp": int(player_time), "content": player_data}
                )
            else:
                readyPlayers.append(True)
                jsonResponse.append(
                    {"timestamp": int(player_time), "content": player_data}
                )

        readyWithBots = False
        readyCount = sum(readyPlayers)
        nbBots = self.gameObj.players.filter(is_missing=True).count()
        if readyCount + nbBots == self.gameObj.maxPlayers:
            readyWithBots = True

        if all(readyPlayers) or readyWithBots:
            self.clearAllMoveData()
            jsonResponse.append({"allReady": True})
        else:
            jsonResponse = [{"ready": readyPlayers}]
            jsonResponse.append({"allReady": False})

        return jsonResponse

    def removePlayerTrade(self, entry):
        import json
        import base64
        import gzip

        if self.gameObj.playerTradeData == "":
            return

        playerTradeData = json.loads(
            gzip.decompress(bytearray(base64.b64decode(self.gameObj.playerTradeData))).decode(
                "utf-8"
            )
        )

        for subarray in playerTradeData["playerTrades"]:
            if subarray == entry:
                playerTradeData["playerTrades"].remove(subarray)

        self.gameObj.playerTradeData = base64.b64encode(
            gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
        ).decode("utf-8")

    def markPromiseComplete(self, promise):
        import json
        import base64
        import gzip

        if self.gameObj.playerTradeData != "":
            playerTradeData = json.loads(
                gzip.decompress(
                    bytearray(base64.b64decode(self.gameObj.playerTradeData))
                ).decode("utf-8")
            )

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

            self.gameObj.playerTradeData = base64.b64encode(
                gzip.compress(json.dumps(playerTradeData).encode("utf-8"))
            ).decode("utf-8")

        raw_data = json.loads(
            gzip.decompress(bytearray(base64.b64decode(self.gameObj.gameData))).decode("utf-8")
        )
        for playerData in raw_data[1]:
            for playerPromise in playerData[9]:
                if playerPromise == promise:
                    playerData[9].remove(promise)

        self.gameObj.gameData = base64.b64encode(
            gzip.compress(json.dumps(raw_data).encode("utf-8"))
        ).decode("utf-8")
