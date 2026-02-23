## TODO:
# Simplify seatPosition once all games converted


import base64
import gzip
import time
import json
import random

from django.contrib.sites.shortcuts import get_current_site
from django.utils.translation import gettext
from django.db.models import Q
from django.urls import reverse

from Lobby.sharedFunctions.sharedRefs import (
    SR_currentTurnString,
)

from Lobby.sharedFunctions.constants import STATS_EXCLUDE_VOTE_TOPIC, DELETE_VOTE_TOPIC, REWIND_CONSENT_VOTE_TOPIC, BLANK_MESSAGE_TEMPLATE


class GamePresenter:
    def __init__(self, gameObj):
        self.gameObj = gameObj

    ####### THESE FUNCTIONS HAVE MINOR CHANGES DEPEDNGIN ON THE GAME
    # - NEED TO BE UPDATED WITH EACH NEW MIGRATION TO GENERAL GAME MODEL
    def isMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        current_players = self.gameObj.players.filter(is_current=True).select_related("player")

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

        return loggedInPlayerUsername in current_usernames or any(username in shadow_values for username in current_usernames)

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return True

        current_players = self.gameObj.players.filter(is_current=True).select_related("player")

        if not current_players.exists():
            SN_sendAdminErrorMessage(
                None,
                f"*****************************************************************************quickIsMyMove: no current players - gameCode: {self.gameObj.gameCode} - GameID: {self.gameObj.id} - loggedInPlayerUsername: {loggedInPlayerUsername}",
            )
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

        return loggedInPlayerUsername in current_usernames or any(username in shadow_values for username in current_usernames)

    ########### END OF FUNCTIONS THAT DEPEND ON THE GAME

    def getGameName(self):
        # Use fields already on the model. DO NOT call .all() or .count() here.
        name = self.gameObj.gameName or f"{getattr(self.gameObj.creator, 'username', 'Unknown')}'s Game"
        if self.gameObj.gameStatus == "PRIVATE":
            name += " [Private]"
        return name

    def currentTurnString(self):
        return SR_currentTurnString(self.gameObj.gameCode, self.gameObj.turn, self.gameObj.phase)

    def getArrayOfIsCurrentPlayers(self):
        current_players = self.gameObj.players.filter(is_current=True).select_related("player")
        return [gp.player.username for gp in current_players if gp.player]

    def getStringOfIsCurrentPlayers(self, noSpaces=False):
        if noSpaces:
            return ",".join(self.getArrayOfIsCurrentPlayers())
        return ", ".join(self.getArrayOfIsCurrentPlayers())

    def seatPosition(self, _username, withoutBots=False):
        # 1. Attempt DB lookup for real users
        gp = self.gameObj.players.filter(player__username=_username).first()
        if gp:
            return gp.seat_order

        # 2. Fallback for Bots (or missing users)
        # This uses your existing logic that converts 'missing' players to strings
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            print(f"NO PLAYER FOUND: {_username}")
            return playerList.index(_username)
        except (ValueError, TypeError):
            print(f"NO PLAYER FOUND: {_username}")
            return -1

    def getAllPlayersOrderedySeat(self, withoutBots=False, excludeBots=False):
        all_players_gp = self.gameObj.players.select_related("player").order_by("seat_order")

        if excludeBots:
            return [gp.player.username for gp in all_players_gp if gp.player and not gp.is_missing]

        if withoutBots:
            return [gp.player.username for gp in all_players_gp if gp.player]

        # Map gameCode to Bot Name Prefix
        game_code_map = {
            "FCM": "Fcm",
            "HC": "Hc",
            "Bus": "Bus",
            "TGZ": "Tgz",
            "CNS": "Cns",
            "AQY": "Aqy",
            "IND": "Ind",
            "KFW": "Kfw",
            "WEB": "Web",
            "RNB": "Rnb",
            "BOB": "Bob",
        }
        prefix = game_code_map.get(self.gameObj.gameCode, "")
        bot_name = f"{prefix}Bot"

        result = []
        for gp in all_players_gp:
            if gp.is_missing:
                result.append(bot_name)
            elif gp.player:
                result.append(gp.player.username)
        return result

    #    def getAllPlayersOrderedySeat(self, withoutBots=False):
    #        # Use list comprehension on .all() to access the prefetch cache
    #        all_players_gp = list(self.gameObj.players.select_related("player").all())
    #        playerList = [gp.player.username for gp in all_players_gp if gp.player]
    #        random.Random(self.gameObj.playerOrderSeed).shuffle(playerList)
    #
    #        if withoutBots:
    #            return playerList
    #
    #        # Access prefetched missingPlayers usernames in memory
    #        missingPlayerUsernames = {gp.player.username for gp in all_players_gp if gp.player and gp.is_missing}
    #
    #        # Use a set for missingPlayerUsernames for O(1) lookup speed
    #        for count, player in enumerate(playerList):
    #            if player in missingPlayerUsernames:
    #                playerList[count] = "BusBot" + str(count)
    #
    #        return playerList

    def isExperiencedGame(self):
        starting_options = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
        if 120 in starting_options:
            return True
        return False

    def isLearningGame(self):
        starting_options = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
        if 110 in starting_options:
            return True
        return False

    def isTrainingGame(self):
        startingOptions = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
        if 102 in startingOptions:
            return True
        return False

    # KICKOUT STUFF
    def getSecondsToNextKickout(self):
        from Lobby.sharedFunctions.sharedFunctions import SF_getSecondsToNextKickout

        return SF_getSecondsToNextKickout(self.gameObj.latestUpdate, self.gameObj.kickoutDuration)

    def getMissingPlayersNamesArray(self):
        return list(
            self.gameObj.players.filter(is_missing=True, player__isnull=False).values_list(  # Ensures no None values in your list
                "player__username", flat=True
            )
        )

    def kickoutRequired(self):
        from Lobby.sharedFunctions.sharedFunctions import SF_kickoutRequired

        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        all_player_usernames = [gp.player.username for gp in all_players if gp.player]

        current_players = self.getArrayOfIsCurrentPlayers()
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
        """Mark a player as missing"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp and not gp.is_missing:
            gp.is_missing = True
            gp.save()

    def addKickedPlayer(self, user):
        """Mark a player as kicked"""
        gp = self.gameObj.players.filter(player=user).first()
        if gp and not gp.is_kicked:
            gp.is_kicked = True
            gp.save()

    def setCurrentPlayers(self, player_usernames_string):
        """Set current players from comma-separated string of usernames"""
        if self.gameObj.gameCode == "HC":
            self.gameObj.currentPlayersInTurnOrder = json.dumps(player_usernames_string.split(",")) if player_usernames_string else ""
            self.gameObj.save()
        if not player_usernames_string:
            # Clear all current players
            self.gameObj.players.all().update(is_current=False)
            return

        current_usernames = {name.strip() for name in player_usernames_string.split(",") if name.strip()}

        game_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")

        for gp in game_players:
            if gp.player:
                gp.is_current = gp.player.username in current_usernames
                gp.save()

    def setCurrentPlayersFromArrInTurnOrder(self, current_players_array):
        """Set current players by updating is_current on GamePlayer instances"""
        if not current_players_array or len(current_players_array) == 0:
            # Clear all current players
            self.gameObj.players.all().update(is_current=False)
            self.gameObj.serverCurrentPlayerNamesInTurnOrder = []
            self.gameObj.save()
            return

        self.gameObj.serverCurrentPlayerNamesInTurnOrder = current_players_array
        self.gameObj.save()

        game_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")

        for gp in game_players:
            if gp.player:
                gp.is_current = gp.player.username in current_players_array
                gp.save()

    def checkForHostChange(self, _missingUser):
        """Change host if current host is missing"""
        if _missingUser == self.gameObj.host:
            possibleHost = self.gameObj.players.exclude(is_kicked=True).filter(is_missing=False).select_related("player").order_by("?").first()
            if possibleHost and possibleHost.player:
                self.gameObj.host = possibleHost.player

    # Take an array of usernames, and set their has_chat_notification to True
    def addChatNotifications(self, usernames):
        """Add chat notifications for list of usernames"""
        self.gameObj.players.filter(player__username__in=usernames, has_chat_notification=False).update(has_chat_notification=True)

    def removeChatNotification(self, userObj):
        """Remove chat notification for a player"""
        self.gameObj.players.filter(player=userObj, has_chat_notification=True).update(has_chat_notification=False)

    def clearGeneralDataOnGameEndWithoutSave(self):
        self.gameObj.gameStatus = "FINISHED"
        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
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
            startingOptionsList = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
            if 99 in startingOptionsList:
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


class CNSpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

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

        SN_M_sendEndGameNotification(request, "CNS", _finalPositions, _gameID, self.gameObj)

    def startGame(self, request):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

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
            playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]
            if len(playerListToNotify) > 0:
                # SN_M_sendGameStartNotification(
                #    domain,  # Do not pass the 'request' object; it cannot be serialized for background tasks
                #    "CNS",
                #    playerListToNotify,
                #    self.gameObj.id,
                #    self.gameObj,
                #    username,
                # )
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "CNS"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers
                message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
                message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

                print("about to start CNS async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )

    def getGameCode(self):
        return "CNS"


class WEBpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
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

        new_names = [name for name in names if name not in [item for sublist in _finalPositions for item in sublist]]

        for name in new_names:
            finalResults.append([name, "Trapped in a dot matrix", 9])

        SN_M_sendEndGameNotificationTieGame(request, "WEB", finalResults, _gameID, self.gameObj)

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

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
            # self.gameObj.deleteGameVotes = {}
            # all_usernames = [gp.player.username for gp in game_players if gp.player]
            # self.gameObj.deleteGameVotes.update(
            #    {username: False for username in all_usernames}
            # )
            # self.gameObj.save()

            if not isTournamentGame:
                playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]
                if len(playerListToNotify) > 0:
                    message_data = BLANK_MESSAGE_TEMPLATE.copy()
                    message_data["gameID"] = self.gameObj.id
                    message_data["gameName"] = self.getGameName()
                    message_data["gameCode"] = "WEB"
                    message_data["username"] = request.user.username
                    message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                    message_data["maxPlayers"] = self.gameObj.maxPlayers
                    message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
                    message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

                    print("about to start WEB async task")
                    async_task(
                        "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                        playerListToNotify,
                        message_data,
                    )

    def getGameCode(self):
        return "WEB"


class AQYpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotificationTieGame,
        )
        from Lobby.sharedFunctions.sharedFunctions import (
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

        new_names = [name for name in names if name not in [item for sublist in _finalPositions for item in sublist]]

        for name in new_names:
            finalResults.append([name, "Lost in Antiquity", 9])

        SN_M_sendEndGameNotificationTieGame(request, "AQY", finalResults, _gameID, self.gameObj)

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

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

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
            playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]
            if len(playerListToNotify) > 0:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "AQY"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers
                message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
                message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

                print("about to start AQY async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )

    def getGameCode(self):
        return "AQY"

    def getCurrentPlayersArrayAQY(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")

        _currentPlayers = []
        for gp in all_players:
            if gp.player:
                if self.hasMoveEndData(gp.player.username):
                    pass
                elif gp.player.username != "AqyBot":
                    _currentPlayers.append(gp.player.username)

        return _currentPlayers

    def hasMoveEndData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if not gp:
            return False
        return bool(gp.currentMoveData != "" and gp.currentMoveTime != "MID_PHASE" and gp.currentMoveTime != "PRE_MOVE")

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
            gp.currentMoveData = base64.b64encode(gzip.compress(json.dumps(dataArray).encode("utf-8"))).decode("utf-8")
            gp.save()
            return

        current_data = json.loads(gzip.decompress(bytearray(base64.b64decode(gp.currentMoveData))).decode("utf-8"))
        index_to_remove = next(
            (index for index, entry in enumerate(current_data) if entry.get("phase") == phase),
            None,
        )
        if index_to_remove is not None:
            del current_data[index_to_remove]
        if data[0] != -999:
            current_data.append(newJsonEntry)
        gp.currentMoveData = base64.b64encode(gzip.compress(json.dumps(current_data).encode("utf-8"))).decode("utf-8")
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
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})
            else:
                readyPlayers.append(True)
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})

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
            jsonResponse.append({"allReady": False})  # ignore this linting error for now

        return jsonResponse

    def removePlayerTrade(self, entry):
        import json
        import base64
        import gzip

        if self.gameObj.playerTradeData == "":
            return

        playerTradeData = json.loads(gzip.decompress(bytearray(base64.b64decode(self.gameObj.playerTradeData))).decode("utf-8"))

        for subarray in playerTradeData["playerTrades"]:
            if subarray == entry:
                playerTradeData["playerTrades"].remove(subarray)

        self.gameObj.playerTradeData = base64.b64encode(gzip.compress(json.dumps(playerTradeData).encode("utf-8"))).decode("utf-8")

    def markPromiseComplete(self, promise):
        import json
        import base64
        import gzip

        if self.gameObj.playerTradeData != "":
            playerTradeData = json.loads(gzip.decompress(bytearray(base64.b64decode(self.gameObj.playerTradeData))).decode("utf-8"))

            for i, player in enumerate(playerTradeData["playerCityLockedData"]):
                if len(player) > 0:
                    playerData = json.loads(gzip.decompress(bytearray(base64.b64decode(player))).decode("utf-8"))
                    for playerPromise in playerData[8]:
                        if playerPromise == promise:
                            playerData[8].remove(promise)
                    playerTradeData["playerCityLockedData"][i] = base64.b64encode(gzip.compress(json.dumps(playerData).encode("utf-8"))).decode(
                        "utf-8"
                    )

            self.gameObj.playerTradeData = base64.b64encode(gzip.compress(json.dumps(playerTradeData).encode("utf-8"))).decode("utf-8")

        raw_data = json.loads(gzip.decompress(bytearray(base64.b64decode(self.gameObj.gameData))).decode("utf-8"))
        for playerData in raw_data[1]:
            for playerPromise in playerData[9]:
                if playerPromise == promise:
                    playerData[9].remove(promise)

        self.gameObj.gameData = base64.b64encode(gzip.compress(json.dumps(raw_data).encode("utf-8"))).decode("utf-8")


class TGZpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winnerUsername, _finalPositions, _tournamentData, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotification,
        )
        from Lobby.sharedFunctions.sharedFunctions import SF_M_ProcessAnyTournamentEndGame
        from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.gameStatus = "FINISHED"

        winner_user = User.objects.get(username=_winnerUsername)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        self.gameObj.save()

        SN_M_sendEndGameNotification(request, "TGZ", _finalPositions, _gameID, self.gameObj)

        if self.gameObj.relatedMainTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MAIN_T_FLAG,
                self.gameObj.relatedMainTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )
        if self.gameObj.relatedMiniTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MINI_T_FLAG,
                self.gameObj.relatedMiniTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )

    def seatPosition(self, name, withoutBots=False):
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            return playerList.index(name)
        except (ValueError, TypeError):
            return -1

    def startGame(self, request):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_sendNextTurnNotification,
        )

        self.gameObj.gameStatus = "ACTIVE"
        self.gameObj.playerOrderSeed = random.randint(1000, 32767)

        game_players = list(self.gameObj.players.exclude(is_kicked=True, player__username="TGZtourneyAdmin"))

        random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)

        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = idx == 0

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        allPlayersL = self.getAllPlayersOrderedySeat()

        self.gameObj.save()

        if not self.gameObj.players.filter(player__username="SHADOW").exists():
            playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]
            if len(playerListToNotify) > 0:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "TGZ"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers
                message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
                message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

                print("about to start TGZ async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )
            if request.user.username != allPlayersL[0]:
                SN_sendNextTurnNotification(
                    request,
                    "TGZ",
                    [allPlayersL[0]],
                    getattr(self.gameObj, "id"),
                    self.gameObj.gameName,
                    self.gameObj,
                    self.gameObj.latestUpdate,
                )

    def getGameCode(self):
        return "TGZ"

    def isExternalTournamentGame(self):
        """
        External tournament games are TGZ games created outside the normal tournament system.
        This is stored as a field on the game model.
        """
        return self.gameObj.externalTournamentGame


class INDpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotification,
        )
        from Lobby.sharedFunctions.sharedFunctions import (
            # TODO: get this working
            SF_M_ProcessAnyTournamentEndGame,
        )

        self.clearGeneralDataOnGameEndWithoutSave()
        self.clearAllPreMoveData()

        winner_user = User.objects.get(username=_winner)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        self.gameObj.save()

        # _finalPositions is just an array of playerIndexes
        # finalPositionsArr is an array of [pos, username]
        finalPositionsArr = []
        for seatPos in _finalPositions:
            finalPositionsArr.append(self.getAllPlayersOrderedySeat()[seatPos])
        # Now send winning notification
        SN_M_sendEndGameNotification(request, "IND", finalPositionsArr, _gameID, self.gameObj)

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_sendNextTurnNotification,
        )

        self.gameObj.gameStatus = "ACTIVE"
        # Only do this if no gameData ie not a form -- WHAT DOES THIS MEAN??
        if self.gameObj.gameData == "" or self.gameObj.gameData is None:
            self.gameObj.playerOrderSeed = random.randint(1000, 32767)
            game_players = list(self.gameObj.players.all())
            random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)

            for idx, gp in enumerate(game_players):
                gp.seat_order = idx
                gp.is_current = gp.player and idx == 0
            GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

            self.gameObj.save()

        if not self.gameObj.players.filter(player__username="SHADOW").exists():
            all_players = list(self.gameObj.players.select_related("player"))
            player_usernames = [gp.player.username for gp in all_players if gp.player]
            self.gameObj.save()

            playerListToNotify = [username for username in player_usernames if username != request.user.username]
            # The tournament sends out game start notifications
            if len(playerListToNotify) > 0:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "IND"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers

                print("about to start IND async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )
            allPlayersL = self.getAllPlayersOrderedySeat()
            if request.user.username != allPlayersL[0]:
                SN_sendNextTurnNotification(
                    request,
                    "IND",
                    [allPlayersL[0]],
                    getattr(self.gameObj, "id"),
                    self.gameObj.gameName,
                    self.gameObj,
                    self.gameObj.latestUpdate,
                )

    def getGameCode(self):
        return "IND"

    #########################################################
    #
    #   PRE MOVE FUNCTIONS (IND-specific simultaneous moves)
    #
    #########################################################

    def getOrScaffoldAllPreMoveData(self):
        """This always ensures you get a valid array return
        any bots are set to phase -99 here, so you know nothing is expected, ie they can't move"""
        try:
            data = json.loads(self.gameObj.playersPreMoveData)
            if len(data) != self.gameObj.maxPlayers:
                raise ValueError("Invalid number of players")
            # Validate structure further if needed
            return data
        except (json.JSONDecodeError, ValueError):
            # Scaffold default structure
            allPlayers = self.getAllPlayersOrderedySeat(True)
            return [[playerName, [-1], "", []] for playerName in allPlayers]

    def insertPlayerPreMoveData(self, name, phasesArr, moveArr):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersPreMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )

        playersPreMoveDataArr[arrIdx] = [
            name,
            phasesArr,
            str(int(time.time()) * 1000),
            moveArr,
        ]

        self.gameObj.playersPreMoveData = json.dumps(playersPreMoveDataArr)
        self.gameObj.save()

    def getAllPreMoveDataCompressed(self):
        import base64
        import gzip

        allData = self.getOrScaffoldAllPreMoveData()
        for entry in allData:
            if len(entry[3]) > 0 and entry[3][0] != self.gameObj.turn:
                entry[1] = [-1]
                entry[2] = ""
                entry[3] = []
        return base64.b64encode(gzip.compress(json.dumps(allData, separators=(",", ":")).encode("utf-8"))).decode("utf-8")

    def getCompressedPreMoveArr(self, name):
        import base64
        import gzip

        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersPreMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        # Only return the move if it is valid for current phase OR has a preset-cleanup
        playerMoveDataArr = playersPreMoveDataArr[arrIdx]
        # Check for invalid moves, and return ""
        if len(playerMoveDataArr) != 4:
            return ""
        if len(playerMoveDataArr[3]) == 0:
            return ""
        if playerMoveDataArr[3][0] != self.gameObj.turn:
            playerMoveDataArr[1] = [-1]
            playerMoveDataArr[2] = ""
            playerMoveDataArr[3] = []
            return ""
        return base64.b64encode(gzip.compress(json.dumps(playerMoveDataArr, separators=(",", ":")).encode("utf-8"))).decode("utf-8")

    def deleteSinglePlayersPreMove(self, name):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersPreMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        playersPreMoveDataArr[arrIdx] = [name, [-1], "", []]
        self.gameObj.playersPreMoveData = json.dumps(playersPreMoveDataArr)
        self.gameObj.save()

    def clearAllPreMoveData(self):
        self.gameObj.playersPreMoveData = ""
        self.gameObj.save()

    def doesPlayerHavePreMove(self, name):
        playersPreMoveDataArr = self.getOrScaffoldAllPreMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersPreMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        return len(playersPreMoveDataArr[arrIdx][3]) > 0


class BusPresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winnerUsername, _finalPositions, _tournamentData, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotification,
        )
        from Lobby.sharedFunctions.sharedFunctions import SF_M_ProcessAnyTournamentEndGame
        from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.gameStatus = "FINISHED"

        winner_user = User.objects.get(username=_winnerUsername)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        # Need to save here, so it is FN for tournament
        self.gameObj.save()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "Bus", _finalPositions, _gameID, self.gameObj)

        if self.gameObj.relatedMainTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MAIN_T_FLAG,
                self.gameObj.relatedMainTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )
        if self.gameObj.relatedMiniTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MINI_T_FLAG,
                self.gameObj.relatedMiniTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )

    def getCurrentPlayersArray(self):
        current_players = self.gameObj.players.filter(is_current=True).select_related("player")
        if not current_players.exists():
            return [""]
        return [gp.player.username for gp in current_players if gp.player]

    def getCurrentRewindConsent(self, _username):
        # rewindConsent is stored in activeVotes under 'rewind_consent' topic
        # Returns value at seat position
        from Lobby.sharedFunctions.constants import REWIND_CONSENT_VOTE_TOPIC

        seat = self.seatPosition(_username)
        if seat < 0:
            return 0
        votes = self.gameObj.activeVotes.get(REWIND_CONSENT_VOTE_TOPIC, {}) if self.gameObj.activeVotes else {}
        return votes.get(_username, 0)

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

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

        self.gameObj.gameStatus = "ACTIVE"
        if self.gameObj.playerOrderSeed == 0:
            self.gameObj.playerOrderSeed = random.randint(0, 32767)

        game_players = list(self.gameObj.players.exclude(is_kicked=True))
        random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)

        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = idx == 0

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        allPlayersL = self.getAllPlayersOrderedySeat()

        if self.isTrainingGame():
            # Set the first player by seat as current
            for gp in game_players:
                if gp.seat_order == 0:
                    gp.is_current = True
                else:
                    gp.is_current = False
            GamePlayer.objects.bulk_update(game_players, ["is_current"])

        # Initialize rewind consent in activeVotes
        from Lobby.sharedFunctions.constants import REWIND_CONSENT_VOTE_TOPIC

        rewind_votes = {}
        host_username = getattr(self.gameObj.host, "username") if self.gameObj.host else None
        for gp in game_players:
            if gp.player:
                username = gp.player.username
                if username == host_username:
                    rewind_votes[username] = 2
                else:
                    rewind_votes[username] = 0

        if self.gameObj.players.filter(player__username="SHADOW").exists():
            # For training games, all players get full rewind consent
            for username in rewind_votes:
                rewind_votes[username] = 2

        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}
        self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC] = rewind_votes

        # required to send correct start player notification
        self.gameObj.save()

        # The tournament sends out game start notifications ## TODO compare this to other starts
        if (
            self.gameObj.relatedMainTournament is None
            and self.gameObj.relatedMiniTournament is None
            and not self.gameObj.players.filter(player__username="SHADOW").exists()
        ):
            playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]

            if len(playerListToNotify) > 0:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "Bus"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers

                print("about to start Bus async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )

    def getGameCode(self):
        return "Bus"


class RNBpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        # Return False if no username is provided
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        currentPlayersList = self.gameObj.serverCurrentPlayerNamesInTurnOrder
        # If you are front of the queue, it is your turn
        if currentPlayersList[0] == loggedInPlayerUsername:
            return True
        # If you are IN the list, BUT have a preset move, return false
        if loggedInPlayerUsername in currentPlayersList:
            gp = self.gameObj.players.filter(player__username=loggedInPlayerUsername).first()
            presetMoves = gp.moveDataJSON
            for entry in presetMoves:
                if entry["turn"] == self.gameObj.turn and entry["phase"] == self.gameObj.phase:
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
        return not currentPlayersList or loggedInPlayerUsername in currentPlayersList or currentPlayersList[0] in shadow_values

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotificationTieGame,
        )
        from Lobby.sharedFunctions.sharedFunctions import (
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

        # TODO - Fix this for RnB - NO TIES
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

        new_names = [name for name in names if name not in [item for sublist in _finalPositions for item in sublist]]

        for name in new_names:
            finalResults.append([name, "Lost in Antiquity", 9])

        SN_M_sendEndGameNotificationTieGame(request, "AQY", finalResults, _gameID, self.gameObj)

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

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

        self.gameObj.gameStatus = "ACTIVE"
        # self.gameObj.playerOrderSeed = random.randint(1000, 32767)

        game_players = list(self.gameObj.players.exclude(is_kicked=True))

        random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)

        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = idx == 0

        self.gameObj.serverCurrentPlayerNamesInTurnOrder = [gp.player.username for gp in game_players]

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        self.gameObj.save()

        if not self.gameObj.players.filter(player__username="SHADOW").exists():
            playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]
            if len(playerListToNotify) > 0:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "RNB"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers
                message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
                message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

                print("about to start RNB async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )

    def getGameCode(self):
        return "RNB"

    def getCurrentPlayers(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")

        _currentPlayers = []
        for gp in all_players:
            if gp.player:
                if self.hasMoveEndData(gp.player.username):
                    pass
                elif gp.player.username != "RnbBot":
                    _currentPlayers.append(gp.player.username)

        return ", ".join(_currentPlayers)

    # TODO fix this for RNB
    def hasMoveEndData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if not gp:
            return False
        return bool(gp.currentMoveData != "" and gp.currentMoveTime != "MID_PHASE" and gp.currentMoveTime != "PRE_MOVE")

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
            gp.currentMoveData = base64.b64encode(gzip.compress(json.dumps(dataArray).encode("utf-8"))).decode("utf-8")
            gp.save()
            return

        current_data = json.loads(gzip.decompress(bytearray(base64.b64decode(gp.currentMoveData))).decode("utf-8"))
        index_to_remove = next(
            (index for index, entry in enumerate(current_data) if entry.get("phase") == phase),
            None,
        )
        if index_to_remove is not None:
            del current_data[index_to_remove]
        if data[0] != -999:
            current_data.append(newJsonEntry)
        gp.currentMoveData = base64.b64encode(gzip.compress(json.dumps(current_data).encode("utf-8"))).decode("utf-8")
        gp.save()

    def deleteAllPreMoves(self):
        for gp in self.gameObj.players.all():
            if gp.currentMoveTime == "PRE_MOVE":
                gp.currentMoveTime = ""
                gp.currentMoveData = ""
                gp.save()

    def getCurrentMoveData(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        gp_move_data = gp.moveDataJSON if gp.moveDataJSON else []
        for entry in gp_move_data:
            if entry["turn"] == self.gameObj.turn and entry["phase"] == self.gameObj.phase:
                return entry
        return {}

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
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})
            else:
                readyPlayers.append(True)
                jsonResponse.append({"timestamp": int(player_time), "content": player_data})

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
            jsonResponse.append({"allReady": False})  # ignore this linting error for now

        return jsonResponse


class FCMpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def startGame(self, request):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

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
        self.gameObj.playerOrderSeed = random.randint(1000, 32767)
        # Copy in an initial value to prevent forced LU values of 99999 overwriting maps
        self.gameObj.latestUpdate = self.gameObj.created
        self.gameObj.save()
        starting_options = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []

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
            numberOfModulesToPick = random.randrange(int(moduleRange[0]), int(moduleRange[1] + 1), 1)
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
            starting_options = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
            starting_options.extend(selectedModules)
            self.gameObj.startingOptions = json.dumps(starting_options, separators=(",", ":"))
            # self.startingOptions = (
            #  self.startingOptions + "," + (",".join(selectedModules))
            # )

        self.gameObj.gameStatus = "ACTIVE"

        # Shuffle GamePlayers to determine seat order
        # Exclude FCMtourneyAdmin from ordering (add at end), matching original FCM.Game behavior
        all_gps = list(self.gameObj.players.exclude(is_kicked=True).select_related("player"))
        game_players = [gp for gp in all_gps if gp.player and gp.player.username != "FCMtourneyAdmin"]
        fcm_tourney_admin_gps = [gp for gp in all_gps if gp.player and gp.player.username == "FCMtourneyAdmin"]

        random.Random(self.gameObj.playerOrderSeed).shuffle(game_players)
        game_players.extend(fcm_tourney_admin_gps)

        _currentPlayers = ""
        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            if idx == 0:
                gp.is_current = True
                _currentPlayers = gp.player.username
            else:
                gp.is_current = False

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        playerListToNotify = [gp.player.username for gp in game_players if gp.player and gp.player.username != request.user.username]

        # SN_M_sendGameStartNotification(
        #    get_current_site(request),
        #    "FCM",
        #    playerListToNotify,
        #    getattr(self, "id"),
        #    self,
        #    request.user.username,
        # )
        message_data = BLANK_MESSAGE_TEMPLATE.copy()
        message_data["gameID"] = self.gameObj.id
        message_data["gameName"] = self.getGameName()
        message_data["gameCode"] = "FCM"
        message_data["username"] = request.user.username
        message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
        message_data["maxPlayers"] = self.gameObj.maxPlayers
        message_data["relatedMainTournamentID"] = self.gameObj.relatedMainTournament.id if self.gameObj.relatedMainTournament else 0
        message_data["relatedMiniTournamentID"] = self.gameObj.relatedMiniTournament.id if self.gameObj.relatedMiniTournament else 0

        print("about to start FCM async task")
        async_task(
            "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
            playerListToNotify,
            message_data,
        )

        self.gameObj.save()

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
        from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

        missing_players = set(self.gameObj.players.filter(is_missing=True).values_list("player__username", flat=True))
        try:
            data = json.loads(self.gameObj.FCMplayersMoveData)
            # For some reason we need to check both here. A kickout can apparently result in missing data
            if len(data) != self.gameObj.maxPlayers:  # and len(data) != self.gameObj.maxPlayers - len(missing_players):
                SN_sendAdminErrorMessage(None, f"Invalid number of players - getOrScaffoldAllMoveData - FCM pres {self.gameObj.id}")

                raise ValueError("Invalid number of players")
            return data
        except (json.JSONDecodeError, ValueError):
            # Scaffold default structure
            allPlayers = self.getAllPlayersOrderedySeat(True, False)
            missing_players = set(self.gameObj.players.filter(is_missing=True).values_list("player__username", flat=True))
            # In a tournament, don't remove missing players, as FCMtA plays for them
            # if self.gameObj.relatedMainTournament:
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

        currentPlayers = self.getStringOfIsCurrentPlayers(True)

        # If there are no current players, add everyone
        if not currentPlayers:
            current_players = [gp.player.username for gp in self.gameObj.players.all().select_related("player") if gp.player]
            return ",".join(current_players)

        # Get an array of possible players to move
        current_players = [player.strip() for player in currentPlayers.split(",")]

        # Remove missing players
        missing_players = set(self.gameObj.players.filter(is_missing=True).values_list("player__username", flat=True))
        current_players = [username for username in current_players if username not in missing_players]

        # Remove players with move data in a single pass using a list comprehension
        current_players_str = ",".join(username for username in current_players if not self.hasValidActualMoveData(username))

        return current_players_str

    def hasAnyPlayerMovedThisPhase(self, phase):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        for playerMoveArr in playersMoveDataArr:
            if self.isThisValidActualMoveArrForPhase(self.gameObj.phase, playerMoveArr):
                return True

        return False

    def hasValidActualMoveData(self, name):
        if not self.gameObj.FCMplayersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            return False

        # Finally, check it is valid
        return self.isThisValidActualMoveArrForPhase(self.gameObj.phase, playerMoveArr)

    def hasValidActualCleanupPreset(self, name):
        if not self.gameObj.FCMplayersMoveData:
            return False
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found
        playerMoveArr = playersMoveDataArr[arrIdx]
        # If no phase/wrong phase / empty data is set, then there's no move Data
        if playerMoveArr[1] == [-1] or 9 not in playerMoveArr[1] or playerMoveArr[3] == []:
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
        from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

        # If the phase is < 0 then it is not an actual move
        if moveArr[1][0] < 0:
            return False
        # Check the game phase is in the move phase array
        if phase not in moveArr[1]:
            message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase1 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
            SN_sendAdminErrorMessage("", message)
            return False

        # Now we have move data that should match the phase. So just check it is valid
        if moveArr[3] == []:
            return False

        # Res card is single array of length one, containing 1,2,or 3
        if phase <= 2:
            data = moveArr[3]
            if not isinstance(data, list) or len(data) != 1 or data[0] not in [1, 2, 3]:
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase2 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
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
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase3 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
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
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase3.4 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
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
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase4 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # check there are 2 arrays, one for each phase
            if not isinstance(moveData[0], list) or not isinstance(moveData[1], list):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase5 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # First arr must be an arr then an arr
            if not isinstance(moveData[0][0], list) or not isinstance(moveData[0][1], list):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase6 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
                SN_sendAdminErrorMessage("", message)
                return False
            # Second arr must just contain at least one int
            if len(moveData[1]) < 1 or not isinstance(moveData[1][0], int):
                message = f"BAD MOVE DATA - PHASE ERROR - isThisValidActualMoveArrForPhase7 - GameID: {self.gameObj.id} - self.phase: {self.gameObj.phase} - input phase: {phase} -- moveArr: {moveArr}"
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
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        playersMoveDataArr[arrIdx] = [
            name,
            phasesArr,
            str(int(time.time()) * 1000),
            moveArr,
        ]

        self.gameObj.FCMplayersMoveData = json.dumps(playersMoveDataArr)

        self.gameObj.save()

    def getCompressedMoveArr(self, name, forceReturnForPresetCleanup=False):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        # Only return the move if it is valid for current phase OR has a preset-clenaup
        if self.isThisValidActualMoveArrForPhase(self.gameObj.phase, playersMoveDataArr[arrIdx]) or forceReturnForPresetCleanup:
            return base64.b64encode(gzip.compress(json.dumps(playersMoveDataArr[arrIdx], separators=(",", ":")).encode("utf-8"))).decode("utf-8")

    def deleteSinglePlayersMove(self, name):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        playersMoveDataArr[arrIdx] = [name, [-1], "", []]
        self.gameObj.FCMplayersMoveData = json.dumps(playersMoveDataArr)
        self.gameObj.save()

    def clearAllMoveDataV2(self):
        self.gameObj.FCMplayersMoveData = ""
        self.gameObj.save()

    def getJsonMoveResponseV2(self, notRequiedPlayerNames):
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        playersToMove = []
        missingPlayers = set(self.gameObj.players.filter(is_missing=True).values_list("player__username", flat=True))
        # if self.gameObj.relatedMainTournament:
        #    missingPlayers = {}
        for subArr in playersMoveDataArr:
            if (
                subArr[0] not in notRequiedPlayerNames
                and subArr[0] not in missingPlayers
                and not self.isThisValidActualMoveArrForPhase(self.gameObj.phase, subArr)
            ):
                playersToMove.append(subArr[0])
        # If players left to move, then return them
        if len(playersToMove) > 0:
            jsonResponse = {"allPlayersMoved": False, "playersToMove": playersToMove}
            return jsonResponse

        # All players have moved, so return move data
        jsonResponse = {
            "allPlayersMoved": True,
            "moveData": base64.b64encode(gzip.compress(json.dumps(playersMoveDataArr, separators=(",", ":")).encode("utf-8"))).decode("utf-8"),
        }
        # Don't clear moves at end of payday to preserve fridge data
        # Actually, clearing moves can cause no turn order if the players browser doesn't respond
        if self.gameObj.phase != 7 and self.gameObj.phase != 3:
            # self.clearAllMoveDataV2()
            pass

        # Add latest update to stop flex time being double deducted
        newVer = (int(self.gameObj.latestUpdate) % 1000) + 1
        self.gameObj.latestUpdate = str((int(time.time()) * 1000) + newVer)
        # jsonResponse.append({"latestUpdate": self.latestUpdate})
        jsonResponse["latestUpdate"] = self.gameObj.latestUpdate

        return jsonResponse

    #########################################################
    #
    #   END OF NEW SIMUL MOVE FUNCTIONS
    #
    #########################################################

    # This should be superfluouts, as data is updated after rewind anyway
    def addAllPlayersToCurrentPlayers(self):
        # Original code: getAllPlayersOrderedySeat(False) returns "FcmBot" for missing players
        # So missing players are NOT set as current (matching original behavior where
        # currentPlayers string contained "FcmBot" instead of the missing player's username)
        for gp in self.gameObj.players.exclude(is_kicked=True):
            should_be_current = not gp.is_missing
            if gp.is_current != should_be_current:
                gp.is_current = should_be_current
                gp.save()
        self.gameObj.save()

    def getCurrentSimulPlayers(self):
        # ASSUME THAT self.currentPlayers IS THE LATEST JSON INCOMING
        # ASSUME THAT phase is the start of simul phase

        currentPlayers = self.getStringOfIsCurrentPlayers(True)

        # If there ar no current players, add everyone
        if currentPlayers == "":
            _currentPlayers = ""
            for gp in self.gameObj.players.all().select_related("player"):
                if gp.player and gp.player.username != "FCMtourneyAdmin":
                    _currentPlayers += gp.player.username + ","
            # remove final comma
            _currentPlayers = _currentPlayers[:-1]
            return _currentPlayers

        # Get an array of possible player to move
        _currentPlayers = [player.strip() for player in currentPlayers.split(",")]
        # Remove missing players
        missing_players = set(self.gameObj.players.filter(is_missing=True).values_list("player__username", flat=True))
        # if self.gameObj.relatedMainTournament:
        #    missing_players = {}
        _currentPlayers = [username for username in _currentPlayers if username not in missing_players]

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

    # NEEDS TO HANDLE OLD CODE TO DISPLAY FINISHED GAMES
    def getRewindHostHTML(self):
        USE_NEW_CODE = False
        if int(self.gameObj.created) > 1744974000000:
            USE_NEW_CODE = True

        rewindConsentVotes = self.getFullSetOfVoteResults(REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0)

        rewindHTML = ""

        for player, vote_value in rewindConsentVotes.items():
            if player != getattr(self.gameObj.host, "username"):
                if vote_value == 0:
                    rewindHTML += "<span style='background-color:red'>" + player + ": " + gettext("No Permission") + "</span><BR/>"
                elif vote_value == 1:
                    rewindHTML += "<span style='background-color:green'>" + player + ": " + gettext("Single Permission") + "</span><BR/>"
                elif vote_value == 2:
                    rewindHTML += "<span style='background-color:green'>" + player + ": " + gettext("Permanent Permission") + "</span><BR/>"
        return rewindHTML

    def getRewindHostPossible(self):
        # TODO - move this to new vote system
        if self.isTrainingGame():
            return True
        rewindConsentVotes = self.getFullSetOfVoteResults(REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0)
        missingPlayerNames = self.getMissingPlayersNamesArray()
        hostUsername = getattr(self.gameObj.host, "username")
        possible = True
        for player in rewindConsentVotes:
            # If the player is not missing, and has a 0 vote, then it is not possible
            if player not in missingPlayerNames and rewindConsentVotes[player] == 0 and player != hostUsername:
                possible = False
        return possible

    def removeSingleRewindPermission(self):
        rewindConsentVotes = self.getFullSetOfVoteResults(REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0)
        for player in rewindConsentVotes:
            if rewindConsentVotes[player] == 1:
                rewindConsentVotes[player] = 0

        self.setVoteResults(REWIND_CONSENT_VOTE_TOPIC, rewindConsentVotes)

    def getCurrentRewindConsent(self, _username):
        # return 0,1, or 2
        rewindConsentVotes = self.getFullSetOfVoteResults(REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0)
        if _username in rewindConsentVotes:
            return rewindConsentVotes[_username]
        else:
            return 0

    # Takes in self, request, and then 3 JSON[""] pieces of string data
    def endGame(self, request, _winnerUsername, _finalScores, _tournamentData, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import SN_M_sendEndGameNotification
        from Lobby.sharedFunctions.sharedFunctions import (
            SF_M_ProcessAnyTournamentEndGame,
        )
        from Lobby.sharedFunctions.constants import MAIN_T_FLAG, MINI_T_FLAG

        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.activeVotes = None
        self.gameObj.gameStatus = "FINISHED"

        winner_user = User.objects.get(username=_winnerUsername)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        self.clearAllMoveDataV2()
        self.gameObj.save()

        # This is sorted with winner in [0][name, money]
        finalPositions = []
        for i in range(len(_finalScores)):
            finalPositions.append(_finalScores[i][0])
        SN_M_sendEndGameNotification(request, "FCM", finalPositions, _gameID, self.gameObj)

        if self.gameObj.relatedMainTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MAIN_T_FLAG,
                self.gameObj.relatedMainTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )
        elif self.gameObj.relatedMiniTournament:
            SF_M_ProcessAnyTournamentEndGame(
                request,
                MINI_T_FLAG,
                self.gameObj.relatedMiniTournament,
                self.gameObj,
                [_winnerUsername],
                _tournamentData,
            )

    def getOOBpreference(self, name):
        if not self.gameObj.FCMplayersMoveData:
            return 0
        seat = self.seatPosition(name)
        if seat < 0:
            return 0
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        if arrIdx == -1:
            return 0  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            return 0

        # Finally, check it is valid
        if self.isThisValidActualMoveArrForPhase(self.gameObj.phase, playerMoveArr):
            if self.gameObj.phase == 4:
                return playerMoveArr[3][2]

        return 0

    def setOOBpreference(self, name, OOBpreference):
        if not self.gameObj.FCMplayersMoveData:
            self.gameObj.FCMplayersMoveData = json.dumps(self.getOrScaffoldAllMoveData())
        seat = self.seatPosition(name)
        if seat < 0:
            return False
        playersMoveDataArr = self.getOrScaffoldAllMoveData()
        arrIdx = next(
            (i for i, sub_arr in enumerate(playersMoveDataArr) if len(sub_arr) > 0 and sub_arr[0] == name),
            -1,
        )
        if arrIdx == -1:
            return False  # Player's move data not found

        playerMoveArr = playersMoveDataArr[arrIdx]

        # If no phase is set, then there's no move Data
        if playerMoveArr[1] == [-1]:
            playerMoveArr[1] = [3, 4]

        # Finally, check it is valid
        if self.gameObj.phase == 4:
            while len(playerMoveArr[3]) < 2:
                playerMoveArr[3].append([])
            if len(playerMoveArr[3]) < 3:
                playerMoveArr[3].append(0)
            playerMoveArr[3][2] = OOBpreference
            self.gameObj.FCMplayersMoveData = json.dumps(playersMoveDataArr)
            self.gameObj.save()
            return True

        return False

    def getGameCode(self):
        return "FCM"


class HCpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def getCurrentPlayersInOrderString(self):
        """Get current players as a string (matching old currentPlayers field format)"""
        current_players_arr = (
            json.loads(self.gameObj.currentPlayersInTurnOrder)
            if self.gameObj.currentPlayersInTurnOrder and self.gameObj.currentPlayersInTurnOrder != ""
            else []
        )
        return ",".join(current_players_arr) if len(current_players_arr) > 0 and current_players_arr else ""

    def isMyMove(self, loggedInPlayerUsername="ADFSADASDASDASDASADADA"):
        currentPlayers = self.getCurrentPlayersInOrderString()
        if currentPlayers == "":
            return True
        currentPlayerrsList = currentPlayers.split(",")
        if self.gameObj.phase == 3 and self.hasMoveData(loggedInPlayerUsername) and loggedInPlayerUsername != currentPlayerrsList[0]:
            return False
        if (
            (loggedInPlayerUsername in currentPlayers)
            or (currentPlayers == "SHADOW")
            or (currentPlayers == "SHADOW_2")
            or (currentPlayers == "SHADOW_3")
            or (currentPlayers == "SHADOW_4")
        ):
            return True
        else:
            return False

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        # Return False if no username is provided
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        currentPlayers = self.getCurrentPlayersInOrderString()
        currentPlayerrsList = currentPlayers.split(",")
        if self.gameObj.phase == 3 and self.hasMoveData(loggedInPlayerUsername) and loggedInPlayerUsername != currentPlayerrsList[0]:
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
        return not currentPlayers or loggedInPlayerUsername in currentPlayers or currentPlayers in shadow_values

    def getCurrentPlayersArray(self):
        currentPlayers = self.getCurrentPlayersInOrderString()
        if not currentPlayers:
            return [""]
        if "," in currentPlayers:
            return [player.strip() for player in currentPlayers.split(",")]
        else:
            return [currentPlayers]

    def startGame(self, request):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

        self.gameObj.gameStatus = "ACTIVE"

        # Use rotation algorithm for seat order
        game_players = list(self.gameObj.players.exclude(is_kicked=True).select_related("player"))

        if self.gameObj.playerOrderSeed > 0:
            offset = self.gameObj.playerOrderSeed % len(game_players) if game_players else 0
            game_players = game_players[offset:] + game_players[:offset]

        _currentPlayers = ",".join([gp.player.username for gp in game_players if gp.player])

        for idx, gp in enumerate(game_players):
            gp.seat_order = idx
            gp.is_current = True  # HC starts with all players as current

        GamePlayer.objects.bulk_update(game_players, ["seat_order", "is_current"])

        # NOTE: Old HC_Game had `if self.startingOptions == 102:` which was dead code
        # (string field compared to int, always False in Python 3).
        # Keeping it commented out to preserve old behavior.
        # starting_options = json.loads(self.gameObj.startingOptions) if self.gameObj.startingOptions else []
        # if 102 in starting_options:
        #     for gp in game_players:
        #         gp.is_current = (gp.seat_order == 0)
        #     GamePlayer.objects.bulk_update(game_players, ["is_current"])

        # Initialize rewind consent in activeVotes
        rewind_votes = {}
        host_username = getattr(self.gameObj.host, "username") if self.gameObj.host else None
        for gp in game_players:
            if gp.player:
                username = gp.player.username
                if username == host_username:
                    rewind_votes[username] = 2
                else:
                    rewind_votes[username] = 0

        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}
        self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC] = rewind_votes

        self.gameObj.save()

        if "SHADOW" not in [gp.player.username for gp in game_players if gp.player]:
            player_usernames = [gp.player.username for gp in game_players if gp.player]

            playerListToNotify = list(player_usernames)
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            message_data = BLANK_MESSAGE_TEMPLATE.copy()
            message_data["gameID"] = self.gameObj.id
            message_data["gameName"] = self.getGameName()
            message_data["gameCode"] = "HC"
            message_data["username"] = request.user.username
            message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
            message_data["maxPlayers"] = self.gameObj.maxPlayers

            print("about to start HC async task")
            async_task(
                "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                playerListToNotify,
                message_data,
            )

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotification,
        )

        self.clearGeneralDataOnGameEndWithoutSave()
        self.clearAllMoveData()

        winner_user = User.objects.get(username=_winner)
        winner_gp = self.gameObj.players.filter(player=winner_user).first()
        if winner_gp:
            winner_gp.winner = True
            winner_gp.save()

        self.gameObj.save()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "HC", _finalPositions, _gameID, self.gameObj)

    def getCurrentPlayers(self):
        _currentPlayers = ""
        all_players_gps = list(self.gameObj.players.select_related("player").order_by("seat_order"))
        missing_player_ids = {gp.player.id for gp in all_players_gps if gp.player and gp.is_missing}
        for gp in all_players_gps:
            if gp.player:
                if self.hasMoveData(gp.player.username):
                    pass
                else:
                    if gp.player.id in missing_player_ids:
                        _currentPlayers += "HcBot,"
                    else:
                        _currentPlayers += gp.player.username + ","
        if _currentPlayers != "":
            # Remove trailing comma
            _currentPlayers = _currentPlayers[:-1]

        return _currentPlayers

    # Move data methods using GamePlayer.currentMoveTime/currentMoveData
    def updateSingleMove(self, name, data):
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name, True)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if gp:
            gp.currentMoveTime = currentTime
            gp.currentMoveData = data
            gp.save()

    def saveFactoryWithoutEndingTurn(self, name, data):
        currentTime = "NODATASFWET"
        seat = self.seatPosition(name, True)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if gp:
            gp.currentMoveTime = currentTime
            gp.currentMoveData = data
            gp.save()

    def getMoveResponse(self, action):
        readyAllPlayers = []
        current_time_ms = int(time.time() * 1000)

        all_gps = list(self.gameObj.players.order_by("seat_order").select_related("player"))

        # 1. Determine which players are ready
        for gp in all_gps:
            data = gp.currentMoveData
            move_time_str = str(gp.currentMoveTime)
            is_ready = data != "" and move_time_str[:6] != "NODATA"
            readyAllPlayers.append(is_ready)

        readyPlayers = readyAllPlayers[: self.gameObj.maxPlayers]

        readyWithBots = False

        if all(readyPlayers) or readyWithBots:
            jsonResponse = []

            for i in range(self.gameObj.maxPlayers):
                gp = all_gps[i]
                move_time = gp.currentMoveTime

                if move_time == "":
                    move_time = current_time_ms
                    gp.currentMoveTime = str(move_time)
                    gp.currentMoveData = "::"
                    gp.save()

                jsonResponse.append(
                    {
                        "date": int(move_time),
                        "content": gp.currentMoveData,
                    }
                )

            return jsonResponse

        return False

    def getSingleMoveForName(self, name):
        seat = self.seatPosition(name)
        gp = self.gameObj.players.filter(seat_order=seat).first()
        if gp:
            return gp.currentMoveData
        return ""

    def hasMoveData(self, name, includeIllegal=False):
        seat = self.seatPosition(name)
        if 0 <= seat <= 4:
            gp = self.gameObj.players.filter(seat_order=seat).first()
            if gp:
                move_time = gp.currentMoveTime
                move_data = gp.currentMoveData
                if str(move_time) == "ILLEGALMOVE" and not includeIllegal:
                    return False
                if move_data == "":
                    return False
                if str(move_time)[:6] != "NODATA":
                    return True

            return True

        return False

    def getMoveData(self, name):
        gp = self.gameObj.players.filter(player__username=name).first()
        return gp.currentMoveData

    def hasTemporaryMoveData(self, name):
        seat = self.seatPosition(name)
        if 0 <= seat <= 4:
            gp = self.gameObj.players.filter(seat_order=seat).first()
            if gp:
                move_time = gp.currentMoveTime
                move_data = gp.currentMoveData
                if str(move_time)[:6] == "NODATA":
                    return [move_time, move_data]
        return ""

    def clearAllMoveData(self):
        self.gameObj.players.all().update(currentMoveTime="", currentMoveData="")

    # Rewind methods using activeVotes
    def getCurrentRewindConsent(self, _username):
        seat = self.seatPosition(_username)
        if seat < 0:
            return 0
        votes = self.gameObj.activeVotes.get(REWIND_CONSENT_VOTE_TOPIC, {}) if self.gameObj.activeVotes else {}
        return votes.get(_username, 0)

    def setupRewindConsent(self):
        if self.gameObj.activeVotes and REWIND_CONSENT_VOTE_TOPIC in self.gameObj.activeVotes:
            return
        rewind_votes = {}
        all_players = self.getAllPlayersOrderedySeat(True)
        host_username = getattr(self.gameObj.host, "username") if self.gameObj.host else None
        for player in all_players:
            if player == host_username:
                rewind_votes[player] = 2
            else:
                rewind_votes[player] = 0
        if not self.gameObj.activeVotes:
            self.gameObj.activeVotes = {}
        self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC] = rewind_votes
        self.gameObj.save()

    def getRewindHostPossible(self):
        if self.gameObj.players.filter(is_missing=True).exists():
            if not self.gameObj.activeVotes:
                self.gameObj.activeVotes = {}
            rewind_votes = {}
            for gp in self.gameObj.players.select_related("player"):
                if gp.player:
                    rewind_votes[gp.player.username] = 2
            self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC] = rewind_votes
            self.gameObj.save()

        if not self.gameObj.activeVotes or REWIND_CONSENT_VOTE_TOPIC not in self.gameObj.activeVotes:
            return False

        rewind_votes = self.gameObj.activeVotes.get(REWIND_CONSENT_VOTE_TOPIC, {})
        for consent in rewind_votes.values():
            if consent == 0:
                return False
        return True

    def getRewindHostHTML(self):
        if not self.gameObj.activeVotes or REWIND_CONSENT_VOTE_TOPIC not in self.gameObj.activeVotes:
            self.setupRewindConsent()

        rewindConsentVotes = self.getFullSetOfVoteResults(REWIND_CONSENT_VOTE_TOPIC, self.getAllPlayersOrderedySeat(True), 0)

        rewindHTML = ""

        for player, vote_value in rewindConsentVotes.items():
            if player != getattr(self.gameObj.host, "username"):
                if vote_value == 0:
                    rewindHTML += "<span style='background-color:red'>" + player + ": " + gettext("No Permission") + "</span><BR/>"
                elif vote_value == 1:
                    rewindHTML += "<span style='background-color:green'>" + player + ": " + gettext("Single Permission") + "</span><BR/>"
                elif vote_value == 2:
                    rewindHTML += "<span style='background-color:green'>" + player + ": " + gettext("Permanent Permission") + "</span><BR/>"
        return rewindHTML

    def actionRewindAlterConsent(self):
        if not self.gameObj.activeVotes or REWIND_CONSENT_VOTE_TOPIC not in self.gameObj.activeVotes:
            return
        rewind_votes = self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC]
        for username in rewind_votes:
            if rewind_votes[username] == 1:
                rewind_votes[username] = 0
        self.gameObj.activeVotes[REWIND_CONSENT_VOTE_TOPIC] = rewind_votes

    def getGameCode(self):
        return "HC"


class KFWpresenter(GamePresenter):
    def __str__(self):
        all_players = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        allPlayersString = " / ".join(gp.player.username for gp in all_players if gp.player)
        return f"{self.gameObj.id}: {self.getGameName()} : {allPlayersString} : {self.gameObj.gameStatus} : {self.currentTurnString()}"

    def endGame(self, request, _winner, _finalPositions, _gameID):
        from Lobby.models import User
        from Lobby.sharedFunctions.sharedNotifications import (
            SN_M_sendEndGameNotificationTieGame,
        )

        self.gameObj.rewindData = ""
        self.gameObj.rewindTempData = ""
        self.gameObj.KFWserverData = ""
        self.gameObj.KFWplayersHiddenData = ""
        self.gameObj.KFWplayersMoveData = ""
        self.gameObj.kickoutFlexiData = ""
        self.gameObj.gameStatus = "FINISHED"

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
        SN_M_sendEndGameNotificationTieGame(request, "KFW", finalResults, _gameID, self.gameObj)

    def startGame(self, request, isTournamentGame=False):
        from django_q.tasks import async_task
        from Lobby.models import GamePlayer

        self.gameObj.gameStatus = "ACTIVE"
        self.gameObj.playerOrderSeed = random.randint(1000, 32767)

        # Get and sort all players alphabetically (matching old getAllPlayersOrderedySeat logic)
        all_players_gp = list(self.gameObj.players.exclude(is_kicked=True).select_related("player"))
        all_players_gp_sorted = sorted(all_players_gp, key=lambda gp: gp.player.username if gp.player else "")

        # Shuffle with seed (same as old code)
        random.Random(self.gameObj.playerOrderSeed).shuffle(all_players_gp_sorted)

        # Set seat_order
        for idx, gp in enumerate(all_players_gp_sorted):
            gp.seat_order = idx
        GamePlayer.objects.bulk_update(all_players_gp_sorted, ["seat_order"])

        allPlayersL = [gp.player.username for gp in all_players_gp_sorted if gp.player]

        # Set current players to first player
        self.setCurrentPlayers(allPlayersL[0])

        serverDataArr = json.loads(self.gameObj.KFWserverData)
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
        self.gameObj.KFWplayersHiddenData = json.dumps(playerHiddenArr)
        self.gameObj.KFWserverData = json.dumps([meeple_bag, skills_bag])

        # Scaffold the playersMoveData
        # This has one subarray per player. Index in arr is playerIndex ["name", compressedData]
        playerMoveArr = []
        for name in allPlayersL:
            # Name, TS, compressed data
            entry = [name, "", ""]
            playerMoveArr.append(entry)
        self.gameObj.KFWplayersMoveData = json.dumps(playerMoveArr)

        self.gameObj.save()

        # If not a training game, send out notifications
        if not self.gameObj.players.filter(player__username="SHADOW").exists():
            playerListToNotify = [gp.player.username for gp in all_players_gp_sorted if gp.player and gp.player.username != request.user.username]

            # The tournament sends out game start notifications
            if not isTournamentGame:
                message_data = BLANK_MESSAGE_TEMPLATE.copy()
                message_data["gameID"] = self.gameObj.id
                message_data["gameName"] = self.getGameName()
                message_data["gameCode"] = "KFW"
                message_data["username"] = request.user.username
                message_data["currentPlayersString"] = self.getStringOfIsCurrentPlayers()
                message_data["maxPlayers"] = self.gameObj.maxPlayers

                print("about to start KFW async task")
                async_task(
                    "Lobby.sharedFunctions.sharedNotifications.SN_M_sendGameStartNotification",
                    playerListToNotify,
                    message_data,
                )

    def getCurrentPlayers(self):
        _currentPlayers = []
        currentPlayersField = self.getStringOfIsCurrentPlayers()
        current_usernames_set = set(u.strip() for u in currentPlayersField.split(",") if u.strip())
        all_gps = self.gameObj.players.exclude(is_kicked=True).select_related("player")
        for gp in all_gps:
            if not gp.player:
                continue
            username = gp.player.username
            # If you have a move, then don't add
            if self.hasMoveEndData(username):
                pass
            # if you don't NEED to move (not in currentPlayers), then don't add
            elif username not in current_usernames_set:
                pass
            elif username != "KfwBot":
                _currentPlayers.append(username)

        return ",".join(_currentPlayers)

    #####################################################################
    ###################### Simul turns code
    #####################################################################

    def anyMoveData(self):
        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)
        for playerMoveData in playersMoveDataArr:
            if playerMoveData[2] != "":
                return True
        return False

    def getMoveData(self, name):
        if self.gameObj.KFWplayersMoveData == "":
            return ""
        seat = self.seatPosition(name)
        if seat < 0:
            return ""
        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)
        if playersMoveDataArr[seat][2] == "":
            return ""
        return playersMoveDataArr[seat][2]

    def updateSingleMove(self, name, data, deleteMove=False):
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name, True)

        if deleteMove:
            currentTime = 0
            data = ""

        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)

        playerMoveData = playersMoveDataArr[seat]
        playerMoveData[1] = currentTime
        playerMoveData[2] = data

        playersMoveDataArr[seat] = playerMoveData

        self.gameObj.KFWplayersMoveData = json.dumps(playersMoveDataArr)

        self.gameObj.save()

    def getJsonMoveResponse(self):
        readyPlayers = []
        jsonResponse = []

        currentPlayersArr = self.getArrayOfIsCurrentPlayers()
        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)

        for i in range(len(playersMoveDataArr)):
            player_time = playersMoveDataArr[i][1]
            player_data = playersMoveDataArr[i][2]
            # ALWAYS add the move data, even if blank, in case of bots
            # If you dont't have a move, AND you're in currentPlayers, then you need to move
            if player_data == "" and playersMoveDataArr[i][0] in currentPlayersArr:  # or allPlayersWithBots[self.getSeat]:
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

        if all(readyPlayers) or readyWithBots:
            self.clearAllMoveData()
            jsonResponse.append({"allReady": True})
        else:
            jsonResponse.append({"ready": readyPlayers})  # Corrected line
            jsonResponse.append({"allReady": False})

        return jsonResponse

    def getJsonMoveResponseFinalScoring(self):
        readyPlayers = []
        allPlayerReturnData = []
        jsonResponse = []

        currentPlayersArr = self.getArrayOfIsCurrentPlayers()
        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)

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

        if all(readyPlayers) or readyWithBots:
            jsonResponse.append({"allPlayerReturnData": allPlayerReturnData})
            self.clearAllMoveData()

            ### GAME DATA 1
            playersHiddenDataArr = json.loads(self.gameObj.KFWplayersHiddenData)
            returnData1 = []
            for playerData in playersHiddenDataArr:
                returnData1.append(playerData[1:])
            gameData1 = self.compressData(returnData1)

            ### GAME DATA 3
            serverDataArr = json.loads(self.gameObj.KFWserverData)
            meepleArr = serverDataArr[0]
            skillsArr = serverDataArr[1]
            returnData3 = [meepleArr, skillsArr]
            gameData3 = self.compressData(returnData3)

            jsonResponse.append({"gameData1": gameData1})
            jsonResponse.append({"gameData3": gameData3})

            ## THIS MUST BE LAST
            jsonResponse.append({"allReady": True})
        else:
            jsonResponse.append({"ready": readyPlayers})  # Corrected line
            jsonResponse.append({"allReady": False})

        return jsonResponse

    def hasMoveEndData(self, name):
        if self.gameObj.KFWplayersMoveData == "":
            return False
        seat = self.seatPosition(name)

        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)
        player_time = playersMoveDataArr[seat][1]
        player_move = playersMoveDataArr[seat][2]

        return bool(player_move != "" and player_time != "" and player_time != "MID_PHASE" and player_time != "PRE_MOVE")

    def clearAllMoveData(self):
        playersMoveDataArr = json.loads(self.gameObj.KFWplayersMoveData)
        for i in range(len(playersMoveDataArr)):
            playersMoveDataArr[i][1] = ""
            playersMoveDataArr[i][2] = ""

        self.gameObj.KFWplayersMoveData = json.dumps(playersMoveDataArr)

        self.gameObj.save()

    def getCurrentSimulPlayers(self):
        # ASSUME THAT players have move data <=> they have moved
        # ASSUME THAT phase is the start of simul phase

        currentPlayersField = self.getStringOfIsCurrentPlayers()

        # If there are no current players, add everyone
        if currentPlayersField == "":
            all_gps = self.gameObj.players.filter(is_missing=False, is_kicked=False).select_related("player")
            return ",".join(gp.player.username for gp in all_gps if gp.player)

        # Get an array of possible players to move
        _currentPlayers = [u.strip() for u in currentPlayersField.split(",") if u.strip()]
        # Remove missing players
        missing_gps = self.gameObj.players.filter(is_missing=True).select_related("player")
        missing_usernames = {gp.player.username for gp in missing_gps if gp.player}
        _currentPlayers = [username for username in _currentPlayers if username not in missing_usernames]

        # If any player has a move, then remove them
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
        return json.loads(gzip.decompress(bytearray(base64.b64decode(string_to_decompress))).decode("utf-8"))

    def getGameData3compressed(self):
        if self.gameObj.KFWserverData == "":
            return ""
        serverDataArr = json.loads(self.gameObj.KFWserverData)
        meepleArr = serverDataArr[0]
        skillsArr = serverDataArr[1]
        if self.isTrainingGame():
            returnData = [meepleArr, skillsArr]
            return self.compressData(returnData)
        returnData = [sum(meepleArr), sum(skillsArr)]
        return self.compressData(returnData)

    def getGameData1Compressed(self, username):
        if self.gameObj.KFWplayersHiddenData == "":
            return ""
        # This has one subarray per player. Index in arr is playerIndex ["name", [meeplesArray], [skillsArray], [historyArray] ]
        playersHiddenDataArr = json.loads(self.gameObj.KFWplayersHiddenData)
        if self.isTrainingGame():
            returnData = []
            for playerData in playersHiddenDataArr:
                returnData.append(playerData[1:])
            return self.compressData(returnData)

        # Find the subarray with the username we want to return data for
        for playerData in playersHiddenDataArr:
            if playerData[0] == username:
                # return the data without the username
                return self.compressData(playerData[1:])
        return self.compressData([[], [], []])

    def pull_items_from_bag(self, num_items, itmes_bag):
        pulled_meeples = [0, 0, 0, 0]
        for _ in range(num_items):
            bag_size = sum(itmes_bag)
            if bag_size == 0:
                break
            picked = _kfw_pick_random(bag_size, itmes_bag)
            if picked == -1:
                raise ValueError("Invalid pick from items bag")
            itmes_bag[picked] -= 1
            pulled_meeples[picked] += 1

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

        dataArr = self.decompressData(compressedString)
        newInformation = [[], [], -1]
        if len(dataArr) > 0:
            newInformation[2] = dataArr[0][0]
        allPlayersHiddenData = json.loads(self.gameObj.KFWplayersHiddenData)
        serverDataArr = json.loads(self.gameObj.KFWserverData)
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
                histEntry[0] = meeplesPulled[0]
                histEntry[1] = skillsPulled[0]

                histArr = [histIndex, histEntry]

                playerHiddenData[3].append(histArr)
                allPlayersHiddenData[playerIndex] = playerHiddenData

            ######### ACTIONS JUST TO CATCH THE SERVER UP WITH THE GAME
            elif serverAction == SERV_MEEPLES_JUST_TO_PLAYER:
                meeples = row[2]

                for num in meeples:
                    # Add to the player
                    playerHiddenData[1][num] += 1

                allPlayersHiddenData[playerIndex] = playerHiddenData

            elif serverAction == SERV_SKILLS_JUST_TO_PLAYER:
                skills = row[2]

                for num in skills:
                    # Add to the player
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

            elif serverAction == SERV_SKILLS_JUST_TO_BAG:
                skills = row[2]
                for num in skills:
                    # Add to the bag
                    skills_bag[num] += 1

        self.gameObj.KFWplayersHiddenData = json.dumps(allPlayersHiddenData)
        self.gameObj.KFWserverData = json.dumps([meeple_bag, skills_bag])

        return newInformation

    def getGameCode(self):
        return "KFW"


##########$
# UTILS for KFW
def _kfw_pick_random(count, selection):
    random_index = random.randint(0, count - 1)
    max_val = 0
    for i in range(len(selection)):
        max_val += selection[i]
        if max_val > random_index:
            return i
    return -1
