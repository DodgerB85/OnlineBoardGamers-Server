import time
import json
import random

# import requests
from decouple import config, Csv

from django.db import models
from django.db.models import Q

from django.conf import settings

# from django.template.loader import render_to_string
from django.utils.translation import gettext  # , get_language

# from django.contrib.sites.shortcuts import get_current_site
# from django.utils import translation

from Lobby.models import User, Mini_Tournaments, Main_Tournament, AbstractGame

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getSecondsToNextKickout,
    SF_kickoutRequired,
    SF_M_ProcessMiniTournamentEndGame,
    SF_M_ProcessMainTournamentEndGame,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
    SR_currentTurnString,
    SR_gamePaceString,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    SR_GAME_STATUS_CHOICES,
    SR_getTGZstartingOptionsHTML,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_sendEndGameNotification,
    SN_M_sendGameStartNotification,
    SN_sendNextTurnNotification,
)


class TGZ_Game(AbstractGame):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field
    gameName = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

    # db_collation='utf8mb4_general_ci'  # Specify the appropriate collation

    gameDescription = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

    gameStatus = models.CharField(
        max_length=9,
        choices=SR_GAME_STATUS_CHOICES,
        default="AVAILABLE",
        db_index=True, 
    )

    latestUpdate = models.CharField(max_length=30, blank=False, default=SR_getTimeNow, db_index=True)
    startingOptions = models.CharField(max_length=100, blank=True)
    startingMap = models.CharField(max_length=80, blank=True)

    allPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="TGZallPlayersRelName")
    missingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="TGZmissingPlayersRelName", blank=True
    )
    currentPlayers = models.CharField(max_length=100, blank=True)

    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="TGZgame_winner_relName",
        blank=True,
    )

    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=0)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=0)

    kickoutDuration = models.PositiveSmallIntegerField(null=False, blank=False, default=200)
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=40)

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="TGZgame_creator_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="TGZgame_host_relName",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    autoMoves = models.CharField(max_length=30, blank=True, null=True, default=None)

    zoomLevels = models.CharField(max_length=30, blank=False, default=json.dumps([240, 240, 240, 240, 240]))
    statsExcludeConsent = models.CharField(max_length=5, blank=False, default="00000")

    kickedPlayers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="TGZkickedPlayersRelName", blank=True)
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="TGZinvitedPlayersRelName", blank=True
    )
    playersWithChatNotification = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="TGZplayersWithChatNotificationName", blank=True
    )

    chatData = models.TextField(blank=True)

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)
    player4notes = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)

    tournamentGame = models.BooleanField(blank=False, default=False)
    externalTournamentGame = models.BooleanField(blank=False, default=False)
    relatedMainTournament = models.ForeignKey(
        Main_Tournament, on_delete=models.SET_NULL, null=True, blank=True, related_name="maintournamentTGZ_relName"
    )

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    kickoutFlexiData = models.TextField(blank=True)

    relatedMiniTournament = models.ForeignKey(
        Mini_Tournaments, on_delete=models.SET_NULL, null=True, blank=True, related_name="minitournamentTGZ_relName"
    )

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
    def endGame(self, request, _winner, _finalPositions, _tournamentData, _gameID):
        self.rewindData = ""
        self.rewindTempData = ""
        self.kickoutFlexiData = ""
        self.gameStatus = "FINISHED"
        self.winner = User.objects.get(username=_winner)
        self.autoMoves = None
        self.save()

        # Now send winning notification
        SN_M_sendEndGameNotification(request, "TGZ", _finalPositions, _gameID, self)

        if self.relatedMainTournament:
            SF_M_ProcessMainTournamentEndGame(request, self.relatedMainTournament, self, [_winner], _tournamentData)
        if self.relatedMiniTournament:
            SF_M_ProcessMiniTournamentEndGame(request, self.relatedMiniTournament, self, [_winner], _finalPositions)

    def currentTurnString(self):
        return SR_currentTurnString("TGZ", self.turn, self.phase)

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

    # Takes in a loggedInUser OBJECT
    def serialize(self, loggedInUser=None):
        remainingPlayersInt = self.maxPlayers - self.allPlayers.count()
        remainingPlayers = ""
        for i in range(remainingPlayersInt):
            remainingPlayers += str(self.allPlayers.count() + i + 1)
        winner = ""
        if self.winner:
            winner = self.winner.username

        createdString = self.created
        latestUpdateString = self.latestUpdate

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
            latestUpdateElapsedTimeString = SR_latestUpdateElapsedTimeStringFromTotalSeconds(elapsedTotalSeconds)

        myMove = False
        if loggedInUser is not None:
            myMove = self.isMyMove(loggedInUser.username)

        chatNotification = False
        involvedPlayer = False
        if loggedInUser in self.allPlayers.all() and (loggedInUser not in self.missingPlayers.all()):
            involvedPlayer = True
        if loggedInUser in self.playersWithChatNotification.all():
            chatNotification = True

        gamePaceString = SR_gamePaceString(self.gamePace)

        startingOptionsHTML = self.getStartingOptionsHTML()

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
            "startingMap": self.startingMap,
            "chatNotification": chatNotification,
            "kickoutRequiredNum": kickoutRequiredNum,
            "kickoutDuration": self.kickoutDuration,
            "latestUpdateElapsedTimeString": latestUpdateElapsedTimeString,
            "game": "TGZ",
            "remainingPlayers": remainingPlayers,  # WHAT DOES THIS DO???????
            "deleteableGame": deleteableGame,
            "learningGame": self.isLearningGame(),
            "experiencedGame": self.isExperiencedGame(),
        }

    def isExperiencedGame(self):
        if self.startingOptions == "":
            return False
        startingOptionsListPrelim = json.loads(self.startingOptions) if self.startingOptions else []
        if 120 in startingOptionsListPrelim:
            return True
        return False

    def isLearningGame(self):
        if self.startingOptions == "":
            return False
        startingOptionsListPrelim = json.loads(self.startingOptions) if self.startingOptions else []
        if 110 in startingOptionsListPrelim:
            return True
        return False

    # takes in a USERNAME
    def seatPosition(self, name, withoutBots=False):
        # 1. Get the list (this now uses the prefetched cache we optimized earlier)
        playerList = self.getAllPlayersOrderedySeat(withoutBots)
        
        # 2. Try to find the index directly in the Python list
        try:
            return playerList.index(name)
        except (ValueError, TypeError):
            # ValueError occurs if the name is not in the list
            return -1


    def getAllPlayersOrderedySeat(self, withoutBots=False):
        # 1. Access the prefetched cache (0 hits)
        all_players_prefetched = list(self.allPlayers.all())
        
        # 2. Filter out Admin in Python memory
        playerList = [
            p.username for p in all_players_prefetched 
            if p.username != "TGZtourneyAdmin"
        ]
        
        # 3. Shuffle using the seed
        random.Random(self.playerOrderSeed).shuffle(playerList)

        if withoutBots:
            return playerList

        # 4. Use prefetched missingPlayers cache (0 hits)
        # Convert to a set of usernames for faster lookup
        missing_usernames = {p.username for p in self.missingPlayers.all()}

        # 5. Replace with Bots in Python memory
        for count, player in enumerate(playerList):
            if player in missing_usernames:
                playerList[count] = f"TgzBot{count}"
                
        return playerList

    def startGame(self, request):
        self.gameStatus = "ACTIVE"
        self.playerOrderSeed = random.randint(1000, 32767)
        allPlayersL = self.getAllPlayersOrderedySeat()
        self.currentPlayers = allPlayersL[0]
        # required to send correct start player notification
        self.save()

        if "SHADOW" not in self.allPlayers.all().values_list("username", flat=True):
            playerListToNotify = list(self.allPlayers.all().values_list("username", flat=True))
            #playerListToNotify.remove(allPlayersL[0])
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)

            # This ALWAYS send a start email, for game/tourny/MiniT
            SN_M_sendGameStartNotification(request, "TGZ", playerListToNotify, getattr(self, "id"), self)
            if request.user.username != allPlayersL[0]:
                SN_sendNextTurnNotification(
                    request,
                    "TGZ",
                    [allPlayersL[0]],
                    getattr(self, "id"),
                    self.gameName,
                    self,
                    self.latestUpdate,
                )

    # def clearAllMoveData(self):
    def getCurrentPlayersArray(self):
        _currentPlayersArray = []
        _currentPlayersArray.append(self.currentPlayers)
        return _currentPlayersArray

    def getCurrentPlayersArrayForReminderEmail(self):
        return self.getCurrentPlayersArray()

    # takes in a user object
    def checkForHostChange(self, _missingUser):
        if self.host == _missingUser:
            # Find a new host from the players who are *not* in missingPlayers
            possibleHost = (
                self.allPlayers.exclude(id__in=self.missingPlayers.all().values_list("id", flat=True))
                .order_by("?")
                .first()
            )

            if possibleHost:
                self.host = possibleHost
            else:
                self.host = None  # No other players available

            self.save()

    # takes in username
    def enableStatsExclude(self, _username):
        seatToChange = self.seatPosition(_username, True)
        self.statsExcludeConsent = (
            self.statsExcludeConsent[:seatToChange] + "1" + self.statsExcludeConsent[seatToChange + 1 :]
        )
        # CHECK TOTAL CONSENT
        totalConsent = 0
        for letter in self.statsExcludeConsent:
            totalConsent += int(letter)
        if totalConsent == self.maxPlayers:
            self.statsExcludedGame = True

    def getStartingOptionsHTML(self):
        return SR_getTGZstartingOptionsHTML(self.startingOptions)

    #    def getgodsVRoptionsHTML(self):
    #        locStartingOptions = json.loads(self.startingOptions).copy() if self.startingOptions else []
    #        customgods = []
    #        customVR = []
    #        specVR = []
    #        for index, entry in enumerate(locStartingOptions):
    #            if isinstance(entry, list) and len(entry) > 0 and entry[0] == 90:
    #                customgods = copy.deepcopy(entry)  # Make a copy of the entry array
    #            elif isinstance(entry, list) and len(entry) > 0 and entry[0] == 91:
    #                customVR = copy.deepcopy(entry)  # Make a copy of the entry array
    #            elif isinstance(entry, list) and len(entry) > 0 and entry[0] == 92:
    #                specVR = copy.deepcopy(entry)  # Make a copy of the entry array
    #            elif entry == 110 or entry == 120:
    #                pass
    #                #requiresHTML = True
    #
    #        retHTML = ""
    #        gods = 1  # Start checking customVR at 1, because entry [0] is 91
    #        if 0 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_shadipinyi.jpg' title='" + gettext("Shadipinyi") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 4:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 1 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_elegua.jpg' title='" + gettext("Elegua") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 4:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 2 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_dziva.jpg' title='" + gettext("Dziva") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 2:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 3 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_eshu.jpg' title='" + gettext("Eshu") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 4:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 4 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_gu.jpg' title='" + gettext("Gu") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 4:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 5 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_obatala.jpg' title='" + gettext("Obatala") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 7:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 6 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_atete.jpg' title='" + gettext("Atete") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 5:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 7 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_tg.jpg' title='" + gettext("Tsui-Goab") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 3:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 8 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_anansi.jpg' title='" + gettext("Anansi") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 5:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 9 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_qamata.jpg' title='" + gettext("Qamata") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 2:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 10 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_engai.jpg' title='" + gettext("Engai") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != 5:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        if 11 in customgods:
    #            retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/g_xango.jpg' title='" + gettext("Xango") + "'>"
    #            if len(customVR) > 0:
    #                retHTML += "<br/><span"
    #                if customVR[gods] != -2:
    #                    retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(customVR[gods]) + "</span>"
    #            retHTML += "</div>"
    #            gods += 1
    #            if gods == 5:
    #                retHTML += "<br/>"
    #        ## Now add any changed Specs
    #        if len(specVR) > 0:
    #            added = 0
    #            retHTML += "<br/>"
    #            if specVR[1] != 6:
    #                retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/s_herd.jpg' title='" + gettext("Herd") + "'>"
    #                retHTML += "<br/><span"
    #                retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(specVR[1]) + "</span>"
    #                retHTML += "</div>"
    #                added += 1
    #            if specVR[2] != 1:
    #                retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/s_nomads.jpg' title='" + gettext("Herd") + "'>"
    #                retHTML += "<br/><span"
    #                retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(specVR[2]) + "</span>"
    #                retHTML += "</div>"
    #                added += 1
    #            if specVR[3] != 1:
    #                retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/s_rain_ceremony.jpg' title='" + gettext("Herd") + "'>"
    #                retHTML += "<br/><span"
    #                retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(specVR[3]) + "</span>"
    #                retHTML += "</div>"
    #                added += 1
    #            if specVR[4] != 3:
    #                retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/s_shaman.jpg' title='" + gettext("Herd") + "'>"
    #                retHTML += "<br/><span"
    #                retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(specVR[4]) + "</span>"
    #                retHTML += "</div>"
    #                added += 1
    #            if specVR[5] != 2:
    #                # if added == 4: retHTML += "<br/>"
    #                retHTML += "<div class='godAndVRdiv'><img class ='godOptionImg' src='/static/TGZ/images/s_builder.jpg' title='" + gettext("Herd") + "'>"
    #                retHTML += "<br/><span"
    #                retHTML += " class='diffVR' "
    #                retHTML += ">VR: " + str(specVR[5]) + "</span>"
    #                retHTML += "</div>"
    #
    #        return retHTML

    def getGameCode(self):
        return "TGZ"
