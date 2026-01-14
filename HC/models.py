from django.db import models
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site

import time
from random import randint
import json
from django.db.models import Q


from Lobby.models import User, GeneralGame

from Lobby.sharedFunctions.sharedFunctions import (
    SF_M_ProcessTournamentEndGame,
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_getHCstartingOptionsHTML,
    SR_getTournamentWinnerHTML,
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    SN_M_sendGameStartNotification,
    SN_M_T_sendTournamentGameStartNotification,
)

from django.utils.translation import gettext  # , gettext_lazy


class HC_Tournament(models.Model):
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

    startingOptions = models.CharField(max_length=70, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_HC", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="currentRoundPlayersRelName_HC", blank=True
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
        return f"{self.id}: {self.tournamentName} : {self.tournamentType} : {self.tournamentStatus}"

    def isSignedUp(self, loggedInUser=None):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

    def createTournamentGame(self, request, _roundNumberString, _currentPlayersUsernames):
        gameName = "[" + self.tournamentName + "]" + " " + _roundNumberString
        player_order_seed = randint(0, self.maxGamePlayers - 1)

        # _startingOptions = request.POST["startingOptions"]
        created = SR_getTimeNow()
        pace = 30
        creator = User.objects.get(username="admin")

        newGame = HC_Game(
            gameName=gameName,
            creator=creator,
            gamePace=pace,
            turn=0,
            phase=0,
            created=created,
            latestUpdate=created,
            playerOrderSeed=player_order_seed,
            startingOptions=self.startingOptions,
            maxPlayers=self.maxGamePlayers,
            gameStatus="ACTIVE",
        )
        newGame.save()

        # if _currentPlayersUsernames[0] != "":
        #    newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[0]))
        #    self.sendTournamentInviteNotification(request, _currentPlayersUsernames[0], newGame.id)
        # if _currentPlayersUsernames[1] != "":
        #    newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[1]))
        #    self.sendTournamentInviteNotification(request, _currentPlayersUsernames[1], newGame.id)
        # if self.maxGamePlayers >= 3 and _currentPlayersUsernames[2] != "":
        #    newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[2]))
        #    self.sendTournamentInviteNotification(request, _currentPlayersUsernames[2], newGame.id)
        # if self.maxGamePlayers >= 4 and _currentPlayersUsernames[3] != "":
        #    newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[3]))
        #    self.sendTournamentInviteNotification(request, _currentPlayersUsernames[3], newGame.id)
        # if self.maxGamePlayers >= 5 and _currentPlayersUsernames[4] != "":
        #    newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[4]))
        #    self.sendTournamentInviteNotification(request, _currentPlayersUsernames[4], newGame.id)
        for i in range(self.maxGamePlayers):
            if i < len(_currentPlayersUsernames) and _currentPlayersUsernames[i] != "":
                newGame.allPlayers.add(User.objects.get(username=_currentPlayersUsernames[i]))
                SN_M_T_sendTournamentGameStartNotification(
                    request,
                    "HC",
                    _currentPlayersUsernames[i],
                    self.maxGamePlayers,
                    newGame.gameName,
                    newGame.currentTurnString(),
                    newGame.id,
                    False,
                    "normalTournament",
                )

        newGame.kickoutDuration = 100
        # newGame.zoomLevels = "200" * self.maxGamePlayers
        newGame.relatedTournament = self
        newGame.host = newGame.allPlayers.all().order_by("?").first()
        newGame.setupRewindConsent()

        newGame.save()
        newGame.startGame(request)
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
        # startingOptionsHTML = getStartingOptionsHTML(self.startingOptions)
        # if (startingOptionsHTML == ""):
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
            "gameCode": "HC",
            "tournamentLink": f"/HCtournament/HC/{self.id}/",
        }

    def getRoundsHTML(self):
        TPDA = json.loads(self.tournamentProgressionData)

        # Only for IP or FN tournaments
        roundsHTML = '<div id="tournamentRoundsContainerDiv">'
        try:
            pointsList = json.loads(self.tournamentPointsData)
            pointsList = sorted(pointsList, key=lambda x: -x[1])
        except Exception:
            pointsList = []

        if len(pointsList) > 0:
            roundsHTML += '<div class="playerInfoStatsContainer tournyRoundDiv">'
            roundsHTML += "<h2>" + gettext("Points") + "</h2>"
            roundsHTML += '<div class="playerStatsDiv">'
            roundsHTML += '<table class="generalTable">'
            # roundsHTML += '<tr>'
            # roundsHTML += '<th>Player</th>'
            # roundsHTML += '<th>Points</th>'
            # roundsHTML += '</tr>'
            for i in range(len(pointsList)):
                roundsHTML += "<tr>"
                roundsHTML += "<th>" + pointsList[i][0] + "</th>"
                roundsHTML += "<th>" + str(pointsList[i][1]) + "</th>"
                roundsHTML += "</tr>"

            roundsHTML += "</table>"
            roundsHTML += "</div>"
            roundsHTML += "</div>"

        for i in range(len(TPDA)):
            roundsTitle = str(i + 1)
            if self.tournamentType == "RR" and i >= 4:
                roundsTitle += " (KO)"
            roundsHTML += '<div class="playerInfoStatsContainer tournyRoundDiv">'
            roundsHTML += "<h2>" + gettext("Round") + " " + roundsTitle + "</h2>"
            roundsHTML += '<div class="playerStatsDiv">'
            roundsHTML += '<table class="generalTable">'
            roundsHTML += "<tr>"
            roundsHTML += "<th>" + gettext("Game") + "</th>"
            roundsHTML += "<th>" + gettext("Winner") + "</th>"
            roundsHTML += "</tr>"
            j=0
            for row in TPDA[i]:
                if row[0] != "BYEPLAYERS":
                    roundsHTML += '<tr class="clickableGameRow HC" id="gamesRow' + str(row[self.maxGamePlayers]) + '">'

                    for j in range(len(row)):
                        if j == 0:
                            roundsHTML += '<td><a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                        elif j < self.maxGamePlayers:
                            roundsHTML += ' VS <a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                    roundsHTML += "</td>"
                    roundsHTML += "<td>"
                    if len(row) == (self.maxGamePlayers + 2):
                        roundsHTML += row[j]
                    roundsHTML += "</td>"

                    roundsHTML += "</tr>"
            # Add byes to end of rounds HTML
            for row in TPDA[i]:
                if row[0] == "BYEPLAYERS":
                    roundsHTML += "<tr>"
                    for j in range(len(row)):
                        if j == 1:
                            roundsHTML += (
                                "<td>" + gettext("BYES:") + ' <a href="/profile/' + row[j] + '">' + row[j] + "</a>"
                            )
                        elif j > 1:
                            roundsHTML += ', <a href="/profile/' + row[j] + '">' + row[j] + "</a>"

            roundsHTML += "</table>"
            roundsHTML += "</div>"
            roundsHTML += "</div>"
        roundsHTML += "</div>"
        return roundsHTML


class HC_Game(GeneralGame):
    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="HCallPlayersRelName")
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="HCmissingPlayersRelName", blank=True
    )
    
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="HCgame_creator_relName"
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="HCgame_host_relName"
    )
    
    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="HCkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="HCinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="HCplayersWithChatNotificationName", blank=True
    )
    
    # TODOMODEL: Replace this with proper turn order code
    #seatOffset = models.PositiveSmallIntegerField()

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="HCgame_winner_relName", blank=True
    )

    # TODOMODEL change to json, move to general game
    rewindConsent = models.CharField(max_length=10, blank=True)

    player0currentMoveTime = models.CharField(max_length=30, blank=True)
    player0currentMoveData = models.TextField(blank=True)
    player1currentMoveTime = models.CharField(max_length=30, blank=True)
    player1currentMoveData = models.TextField(blank=True)
    player2currentMoveTime = models.CharField(max_length=30, blank=True)
    player2currentMoveData = models.TextField(blank=True)
    player3currentMoveTime = models.CharField(max_length=30, blank=True)
    player3currentMoveData = models.TextField(blank=True)
    player4currentMoveTime = models.CharField(max_length=30, blank=True)
    player4currentMoveData = models.TextField(blank=True)

    player4notes = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)
    relatedTournament = models.ForeignKey(
        HC_Tournament, on_delete=models.SET_NULL, null=True, blank=True, related_name="tournament_relName"
    )

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
        self.winner = User.objects.get(username=_winner)
        self.deleteGameVotes = None
        self.clearAllMoveData()
        self.save()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "HC", _finalPositions, _gameID, self)

        if self.relatedTournament:
            SF_M_ProcessTournamentEndGame(request, "HC", self, [_winner])

    def getCurrentPlayers(self):
        _currentPlayers = ""
        for user in self.allPlayers.all():
            if self.hasMoveData(user.username):
                pass
            else:
                if user in self.missingPlayers.all():
                    _currentPlayers += "HcBot,"
                else:
                    _currentPlayers += user.username + ","
        if _currentPlayers != "":
            # Remove trailing comma
            _currentPlayers = _currentPlayers[:-1]

        return _currentPlayers

    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        currentPlayers = self.currentPlayers

        if "," in currentPlayers:
            # Multiple names separated by commas
            # names = currentPlayers.split(',')
            names = [player.strip() for player in self.currentPlayers.split(",")]
            _currentPlayersArray.extend(names)
        else:
            # Single name
            _currentPlayersArray.append(currentPlayers)
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        currentPlayersArray = self.getCurrentPlayersArray()
        # Create a new list to store players to keep
        playersToNotify = []

        for player in currentPlayersArray:
            if self.isMyMove(player):
                playersToNotify.append(player)

        return playersToNotify

    def getMoveResponse(self, action):
        readyAllPlayers = []
        current_time_ms = int(time.time() * 1000)

        # 1. Determine which players are ready
        for i in range(5):
            data = getattr(self, f"player{i}currentMoveData")
            # Fix: Cast to str to prevent slicing error if field is an int/None
            move_time_str = str(getattr(self, f"player{i}currentMoveTime"))
            
            is_ready = data != "" and move_time_str[:6] != "NODATA"
            readyAllPlayers.append(is_ready)

        readyPlayers = readyAllPlayers[: self.maxPlayers]

        # NB Turn 0 logic placeholder
        readyWithBots = False

        if all(readyPlayers) or readyWithBots:
            jsonResponse = []

            # 2. Fill empty timestamps and build response
            for i in range(self.maxPlayers):
                move_time = getattr(self, f"player{i}currentMoveTime")
                
                # If timestamp is empty string, initialize it
                if move_time == "":
                    move_time = current_time_ms
                    setattr(self, f"player{i}currentMoveTime", move_time)
                    setattr(self, f"player{i}currentMoveData", "::")
                
                # Build the response list
                jsonResponse.append({
                    "date": int(move_time), 
                    "content": getattr(self, f"player{i}currentMoveData")
                })
                
            return jsonResponse

        return False


#    def getMoveResponse(self, action):
#        readyAllPlayers = []
#        if self.player0currentMoveData == "" or self.player0currentMoveTime[:6] == "NODATA":
#            readyAllPlayers.append(False)
#        else:
#            readyAllPlayers.append(True)
#        if self.player1currentMoveData == "" or self.player1currentMoveTime[:6] == "NODATA":
#            readyAllPlayers.append(False)
#        else:
#            readyAllPlayers.append(True)
#        if self.player2currentMoveData == "" or self.player2currentMoveTime[:6] == "NODATA":
#            readyAllPlayers.append(False)
#        else:
#            readyAllPlayers.append(True)
#        if self.player3currentMoveData == "" or self.player3currentMoveTime[:6] == "NODATA":
#            readyAllPlayers.append(False)
#        else:
#            readyAllPlayers.append(True)
#        if self.player4currentMoveData == "" or self.player4currentMoveTime[:6] == "NODATA":
#            readyAllPlayers.append(False)
#        else:
#            readyAllPlayers.append(True)
#
#        readyPlayers = readyAllPlayers[: self.maxPlayers]
#
#        # NB Turn 0 inserts data for the bot
#        readyWithBots = False
#        # readyCount = sum(readyPlayers)
#        # nbBots = self.missingPlayers.count()
#        # if readyCount + nbBots == self.maxPlayers:
#        #    readyWithBots = True
#
#        if all(readyPlayers) or readyWithBots:
#            if self.player0currentMoveTime == "":
#                self.player0currentMoveTime = int(time.time()) * 1000
#                self.player0currentMoveData = "::"
#            if self.player1currentMoveTime == "":
#                self.player1currentMoveTime = int(time.time()) * 1000
#                self.player1currentMoveData = "::"
#            if self.player2currentMoveTime == "":
#                self.player2currentMoveTime = int(time.time()) * 1000
#                self.player2currentMoveData = "::"
#            if self.player3currentMoveTime == "":
#                self.player3currentMoveTime = int(time.time()) * 1000
#                self.player3currentMoveData = "::"
#            if self.player4currentMoveTime == "":
#                self.player4currentMoveTime = int(time.time()) * 1000
#                self.player4currentMoveData = "::"
#
#            jsonResponse = []
#
#            jsonResponse.append({"date": int(self.player0currentMoveTime), "content": self.player0currentMoveData})
#            jsonResponse.append({"date": int(self.player1currentMoveTime), "content": self.player1currentMoveData})
#            if self.maxPlayers >= 3:
#                jsonResponse.append({"date": int(self.player2currentMoveTime), "content": self.player2currentMoveData})
#            if self.maxPlayers >= 4:
#                jsonResponse.append({"date": int(self.player3currentMoveTime), "content": self.player3currentMoveData})
#            if self.maxPlayers >= 5:
#                jsonResponse.append({"date": int(self.player4currentMoveTime), "content": self.player4currentMoveData})
#
#            # self.clearAllMoveData()
#
#        else:
#            jsonResponse = False
#
#        return jsonResponse

    def currentTurnString(self):
        return SR_currentTurnString("HC", self.turn, self.phase)

    def isMyMove(self, loggedInPlayerUsername="ADFSADASDASDASDASADADA"):
        if self.currentPlayers == "":
            return True
        currentPlayerrsList = self.currentPlayers.split(",")
        if (
            self.phase == 3
            and self.hasMoveData(loggedInPlayerUsername)
            and loggedInPlayerUsername != currentPlayerrsList[0]
        ):
            return False
        if (
            (loggedInPlayerUsername in self.currentPlayers)
            or (self.currentPlayers == "SHADOW")
            or (self.currentPlayers == "SHADOW_2")
            or (self.currentPlayers == "SHADOW_3")
            or (self.currentPlayers == "SHADOW_4")
        ):
            return True
        else:
            return False

    def quickIsMyMove(self, loggedInPlayerUsername="NO_USER_LOGGED_IN"):
        # Return False if no username is provided
        if loggedInPlayerUsername == "NO_USER_LOGGED_IN":
            return False

        currentPlayerrsList = self.currentPlayers.split(",")
        if (
            self.phase == 3
            and self.hasMoveData(loggedInPlayerUsername)
            and loggedInPlayerUsername != currentPlayerrsList[0]
        ):
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

    def getCurrentRewindConsent(self, _username):
        # consent = "0"
        if self.rewindConsent == "":
            return "0"
        currentSeat = self.seatPosition(_username)
        rewindConsentList = list(self.rewindConsent)
        return rewindConsentList[currentSeat]

    def kickoutRequired(self):
        # return True
        return SF_kickoutRequired(
            self.gameStatus,
            self.allPlayers.all().values_list("username", flat=True),
            self.latestUpdate,
            self.kickoutDuration,
            self.kickoutFlexiData,
            self.getCurrentPlayersArray()[0],
        )

    def setupRewindConsent(self):
        if self.rewindConsent != "":
            return
        else:
            rewindConsentString = ""
            for i in range(self.maxPlayers):
                rewindConsentString += "0"
            hostSeat = self.seatPosition(getattr(self.host, "username"))
            rewindConsentList = list(rewindConsentString)
            rewindConsentList[hostSeat] = "2"
            rewindConsentString = "".join(rewindConsentList)
            self.rewindConsent = rewindConsentString
            self.save()

    def serialize(self, loggedInUser=None):
        # remainingPlayers = "x" * (self.maxPlayers - self.allPlayers.count())
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = ""
        for i in range(remainingPlayersInt):
            remainingPlayers += str(self.allPlayers.count() + i + 1)
        winner = ""
        if self.winner:
            winner = self.winner.username

        createdString = str(self.created)
        latestUpdateString = str(self.latestUpdate)

        latestUpdateElapsedTimeString = ""
        elapsedTotalSeconds = 0
        if (
            self.gameStatus == "WAITING"
            or self.gameStatus == "AVAILABLE"
            or self.gameStatus == "ACTIVE"
            or self.gameStatus == "PRIVATE"
        ):
            if self.gameStatus == "WAITING" or self.gameStatus == "AVAILABLE" or self.gameStatus == "PRIVATE":
                elapsedTotalSeconds = int(time.time()) - int(self.created) // 1000
            if self.gameStatus == "ACTIVE":
                elapsedTotalSeconds = int(time.time()) - int(self.latestUpdate) // 1000
            elapsedDays = elapsedTotalSeconds // (60 * 60 * 24)
            elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60 * 24)
            elapsedHours = elapsedTotalSeconds // (60 * 60)
            elapsedTotalSeconds = elapsedTotalSeconds % (60 * 60)
            elapsedmins = elapsedTotalSeconds // (60)
            elapsedTotalSeconds = elapsedTotalSeconds % (60)

            if elapsedDays > 0:
                latestUpdateElapsedTimeString += str(elapsedDays) + "d"
                # if (elapsedDays > 1): latestUpdateElapsedTimeString += "s"

            if elapsedHours > 0:
                latestUpdateElapsedTimeString += " " + str(elapsedHours) + "h"
                # if (elapsedHours > 1): latestUpdateElapsedTimeString += "s"
            if elapsedmins > 0:
                latestUpdateElapsedTimeString += " " + str(elapsedmins) + "m"
            latestUpdateElapsedTimeString += " " + str(elapsedTotalSeconds) + "s"

        myMove = False
        if loggedInUser is not None:
            myMove = self.isMyMove(loggedInUser.username)

        chatNotification = False
        involvedPlayer = False

        if loggedInUser in self.allPlayers.all() and loggedInUser not in self.missingPlayers.all():
            involvedPlayer = True

        if loggedInUser in self.playersWithChatNotification.all():
            chatNotification = True

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = SR_getHCstartingOptionsHTML(self.startingOptions)

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

        deleteableGame = False
        if (
            "SHADOW" in self.allPlayers.all().values_list("username", flat=True)
            and loggedInUser in self.allPlayers.all()
        ):
            deleteableGame = True

        currentPlayersDisplayList = self.currentPlayers.split(",")
        if loggedInUser is not None:
            if not myMove and loggedInUser.username in currentPlayersDisplayList:
                currentPlayersDisplayList.remove(loggedInUser.username)
        currentPlayersDisplayString = ",".join(currentPlayersDisplayList)

        return {
            "gameID": self.id,
            "gameName": self.getGameName(),
            "gameDescription": self.gameDescription,
            "creator": getattr(self.creator, "username"),
            "created": createdString,
            "allPlayers": [user.username for user in self.allPlayers.all()],
            "invitedPlayers": [user.username for user in self.invitedPlayers.all()],
            "currentPlayers": currentPlayersDisplayString,
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
            # "startingMap": self.startingMap,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "HC",
            "remainingPlayers": remainingPlayers,
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        startingOptionsListPrelim = self.startingOptions.split(",")
        if "120" in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        startingOptionsListPrelim = self.startingOptions.split(",")
        if "110" in startingOptionsListPrelim:
            return True
        return False

    def startGame(self, request):
        self.gameStatus = "ACTIVE"
        # self.currentPlayers = ','.join(
        #    [player.username for player in self.allPlayers.all()])
        self.currentPlayers = ",".join([player.username for player in self.allPlayers.all()])
        if self.startingOptions == 102:
            for user in self.allPlayers.all():
                if self.seatPosition(user.username) == 0:
                    _currentPlayers = user.username
                    self.currentPlayers = _currentPlayers
        self.setupRewindConsent()
        self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            self.deleteGameVotes.update({username: False for username in player_usernames})
            self.save()

            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            SN_M_sendGameStartNotification(request, "HC", playerListToNotify, self.id, self)

    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # Use prefetched cache; avoid .values_list() to prevent new SQL queries
        playerList = [p.username for p in self.allPlayers.all()]

        # Efficiently handle rotation (seatOffset)
        if self.playerOrderSeed > 0:
            offset = self.playerOrderSeed % len(playerList) if playerList else 0
            playerList = playerList[offset:] + playerList[:offset]

        if withoutBots:
            return playerList

        # Use a set for O(1) lookup speed for missing players
        missingPlayerNames = {p.username for p in self.missingPlayers.all()}

        # Replace missing players with Bots
        for count, player in enumerate(playerList):
            if player in missingPlayerNames:
                playerList[count] = f"HcBot{count}"
                
        return playerList

    # takes in a USERNAME
    def seatPosition(self, name, withoutBots=False):
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        try:
            return playerList.index(name)
        except Exception:
            return -1

    def clearAllMoveData(self):
        self.player0currentMoveTime = ""
        self.player0currentMoveData = ""
        self.player1currentMoveTime = ""
        self.player1currentMoveData = ""
        self.player2currentMoveTime = ""
        self.player2currentMoveData = ""
        self.player3currentMoveTime = ""
        self.player3currentMoveData = ""
        self.player4currentMoveTime = ""
        self.player4currentMoveData = ""
        # self.save()

    def updateSingleMove(self, name, data):
        currentTime = str(int(time.time()) * 1000)
        seat = self.seatPosition(name, True)
        if seat == 0:
            self.player0currentMoveTime = currentTime
            self.player0currentMoveData = data
        if seat == 1:
            self.player1currentMoveTime = currentTime
            self.player1currentMoveData = data
        if seat == 2:
            self.player2currentMoveTime = currentTime
            self.player2currentMoveData = data
        if seat == 3:
            self.player3currentMoveTime = currentTime
            self.player3currentMoveData = data
        if seat == 4:
            self.player4currentMoveTime = currentTime
            self.player4currentMoveData = data
        self.save()

    def saveFactoryWithoutEndingTurn(self, name, data):
        currentTime = "NODATASFWET"
        seat = self.seatPosition(name, True)
        if seat == 0:
            self.player0currentMoveTime = currentTime
            self.player0currentMoveData = data
        if seat == 1:
            self.player1currentMoveTime = currentTime
            self.player1currentMoveData = data
        if seat == 2:
            self.player2currentMoveTime = currentTime
            self.player2currentMoveData = data
        if seat == 3:
            self.player3currentMoveTime = currentTime
            self.player3currentMoveData = data
        if seat == 4:
            self.player4currentMoveTime = currentTime
            self.player4currentMoveData = data
        self.save()

    def getSingleMoveForName(self, name):
        seat = self.seatPosition(name)
        if seat == 0:
            # self.player0currentMoveTime = currentTime
            return self.player0currentMoveData
        if seat == 1:
            # self.player1currentMoveTime = currentTime
            return self.player1currentMoveData
        if seat == 2:
            # self.player2currentMoveTime = currentTime
            return self.player2currentMoveData
        if seat == 3:
            # self.player3currentMoveTime = currentTime
            return self.player3currentMoveData
        if seat == 4:
            # self.player4currentMoveTime = currentTime
            return self.player4currentMoveData

    def hasMoveData(self, name):
        seat = self.seatPosition(name)
        
        # Ensure seat is valid (seatPosition returns -1 if not found)
        if 0 <= seat <= 4:
            # Dynamically get the field names
            time_field = f"player{seat}currentMoveTime"
            data_field = f"player{seat}currentMoveData"
            
            # Get values from self
            move_time = getattr(self, time_field)
            move_data = getattr(self, data_field)

            # Fix: Cast move_time to string to prevent "int" slice error
            # and check if it starts with "NODATA"
            if str(move_time)[:6] != "NODATA":
                return move_data

        return ""

    def hasTemporaryMoveData(self, name):
        seat = self.seatPosition(name)
        
        # Check if seat is within the valid range (0-4)
        if 0 <= seat <= 4:
            time_attr = f"player{seat}currentMoveTime"
            data_attr = f"player{seat}currentMoveData"
            
            move_time = getattr(self, time_attr)
            move_data = getattr(self, data_attr)

            # Cast to str to ensure slicing [:6] doesn't fail on int or None types
            if str(move_time)[:6] == "NODATA":
                return [move_time, move_data]

        return ""

    # takes in a user object
    def checkForHostChange(self, _missingUser):
        if _missingUser == self.creator:
            possibleHost = self.allPlayers.all().filter(~Q(missingPlayersRelName=self.id)).order_by("?").first()
            self.host = possibleHost
            # self.save()

    # takes in username
    def enableStatsExclude(self, _username):
        if (len(self.statsExcludeConsent)) < self.maxPlayers:
            self.statsExcludeConsent = "0" * self.maxPlayers
        seatToChange = self.seatPosition(_username, True)
        self.statsExcludeConsent = (
            self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
        )
        #### CHECK TOTAL CONSENT
        totalConsent = 0
        for letter in self.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.maxPlayers:
            self.statsExcludedGame = True
        # self.save()

    def getRewindHostPossible(self):
        if len(self.missingPlayers.all()) > 0:
            self.rewindConsent = "222222"
            self.save()
        possible = True
        rewindConsentList = list(self.rewindConsent)
        for consent in rewindConsentList:
            if consent == "0":
                possible = False
        return possible   

    def getRewindHostHTML(self):
        if self.rewindConsent == "":
            self.setupRewindConsent()
        allPlayersList = self.getAllPlayersOrderedySeat()
        rewindConsentList = list(self.rewindConsent)
        rewindHTML = ""

        for index, player in enumerate(allPlayersList):
            if player == "HcBot":
                # player = "HcBot" + player[-1]
                player = "HcBot" + str(index)
            if player != getattr(self.host, "username"):
                if rewindConsentList[index] == "0":
                    rewindHTML += (
                        "<span style='background-color:red'>"
                        + player
                        + ": "
                        + gettext("No Permission")
                        + "</span><BR/>"
                    )
                elif rewindConsentList[index] == "1":
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Single Permission")
                        + "</span><BR/>"
                    )
                elif rewindConsentList[index] == "2":
                    rewindHTML += (
                        "<span style='background-color:green'>"
                        + player
                        + ": "
                        + gettext("Permanent Permission")
                        + "</span><BR/>"
                    )

        return rewindHTML

    def actionRewindAlterConsent(self):
        rewindConsentList = list(self.rewindConsent)
        for i in range(len(rewindConsentList)):
            if rewindConsentList[i] == "1":
                rewindConsentList[i] = "0"
        self.rewindConsent = "".join(rewindConsentList)
        # self.save()

    def isTournamentRoundFinished(self, tournamentProgressionDataArray):
        if self.relatedTournament is None:
            return False

        # Check all games from previous round are finished
        finishedGames = 0
        for row in tournamentProgressionDataArray[-1]:
            if row[0] == "BYEPLAYERS":
                finishedGames += 1
            else:
                game = HC_Game.objects.get(id=row[self.relatedTournament.maxGamePlayers])
                if game.gameStatus == "FINISHED":
                    finishedGames += 1
        if finishedGames == len(tournamentProgressionDataArray[-1]):
            return True
        return False

    def getGameCode(self):
        return "HC"

    def getDeleteVotesData(self):
        if self.gameStatus == "FINISHED":
            deleteGameVotes = {}
            player_usernames = [p.username for p in self.allPlayers.all()]
            deleteGameVotes.update({username: False for username in player_usernames})
            return deleteGameVotes
        if self.deleteGameVotes is None:
            self.deleteGameVotes = {}  # Initialize to an empty dictionary
            player_usernames = [p.username for p in self.allPlayers.all()]
            self.deleteGameVotes.update({username: False for username in player_usernames})
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
