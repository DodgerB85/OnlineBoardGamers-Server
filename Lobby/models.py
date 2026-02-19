import time
import json

from decouple import config
from typing import Union, TYPE_CHECKING

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
#from django.db.models.manager import RelatedManager
from django.dispatch import receiver
from django.conf import settings
from django.utils.translation import gettext_lazy

from .presenters import GamePresenter, CannesPresenter, WebPresenter, AqyPresenter, TgzPresenter, IndPresenter, BusPresenter, FcmPresenter, RnbPresenter, HcPresenter

from Lobby.sharedFunctions.sharedRefs import (
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
    SR_getTimeNow,
    SR_getTournamentWinnerHTML,
    SR_GAME_STATUS_CHOICES,
    SR_currentTurnString,
)

from .sharedFunctions.sharedRefs import (
    SR_getFCMstartingOptionsHTML,
    SR_getTGZstartingOptionsHTML,
    SR_GAMES_CODES_AND_NAMES_CHOICES,
)

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager
    from .models import GamePlayer # Import your GamePlayer model

class User(AbstractUser):
    # Fields that you are not obliged to implement
    # username = models.CharField(max_length=100)
    # first_name = models.CharField(max_length=100)
    # last_name = models.CharField(max_length=100)
    def __str__(self):
        # field_names = [field.name for field in self._meta.fields]
        # return f"{self.username} : {field_names}"
        activeString = "" if self.is_active else " :A NOT AN ACTIVE USER"
        return f"{self.username} {activeString}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    sendEmailNotificationOnTurn = models.BooleanField(default=True)
    emailNotifications = models.CharField(
        blank=False,
        default=json.dumps([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], separators=(",", ":")),
        max_length=40,
    )
    stopEmailsUntil = models.PositiveIntegerField(null=True, blank=True)

    webhooks = models.TextField(blank=True, null=True)

    preferredRestaurantColour = models.SmallIntegerField(
        null=False, blank=False, default=-1
    )
    highContrastBoardItems = models.BooleanField(default=False)

    preferredHCcolour = models.SmallIntegerField(null=False, blank=False, default=-1)

    preferredBusColour = models.SmallIntegerField(null=False, blank=False, default=-1)
    preferredBusBoard = models.SmallIntegerField(null=False, blank=False, default=0)

    preferredTGZcolour = models.SmallIntegerField(null=False, blank=False, default=-1)
    TGZminimalText = models.BooleanField(blank=False, default=False)

    preferredCNScolour = models.PositiveSmallIntegerField(
        null=True, blank=True, default=None
    )

    preferredAQYoptions = models.CharField(max_length=30, blank=True)
    preferredINDoptions = models.CharField(max_length=30, blank=True)
    preferredKFWoptions = models.CharField(max_length=30, blank=True)
    preferredWEBoptions = models.CharField(max_length=30, blank=True)

    # preferredRNBcolour = models.PositiveSmallIntegerField(null=True, blank=True, default=None)

    FCMtournamentTrophies = models.CharField(
        max_length=100,
        blank=False,
        default=json.dumps([[0, 0, 0, 0, 0]], separators=(",", ":")),
    )

    liveNotification = models.SmallIntegerField(null=True, blank=False, default=1)
    email_confirmed = models.BooleanField(default=False)
    showAssistance = models.BooleanField(default=True)

    profileLanguage = models.CharField(
        max_length=10, choices=settings.LANGUAGES, default=settings.LANGUAGE_CODE
    )

    blacklistedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="blacklistedPlayers_relName", blank=True
    )

    def __str__(self):
        return f"{self.user} : {self.email_confirmed} : {self.user.email}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        instance.profile.save()


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class changelog(models.Model):
    update = models.CharField(max_length=120)
    timestamp = models.CharField(
        max_length=30, blank=False, default=SR_getTimeNow, db_index=True
    )

    def __str__(self):
        return f"{self.timestamp}: {self.update}"


class Main_Tournament(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field

    gameCode = models.CharField(
        max_length=3,
        choices=SR_GAMES_CODES_AND_NAMES_CHOICES,
        default="FCM",
    )

    tournamentName = models.CharField(max_length=120)
    tournamentDescription = models.CharField(
        max_length=120, blank=True, db_collation="utf8mb4_general_ci"
    )

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

    startingOptions = models.CharField(max_length=80, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="startingPlayersRelName_MainT",
        blank=True,
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="currentRoundPlayersRelName_MainT",
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

    chatData = models.TextField(blank=True)

    def __str__(self):
        return f"MainT {getattr(self, 'id')}: {self.tournamentName} : {self.tournamentType} : {self.tournamentStatus}"

    def isSignedUp(self, loggedInUser):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

    def getByedPlayersList(self):
        TPDA = json.loads(self.tournamentProgressionData)
        return [
            player
            for round in TPDA
            for row in round
            if row[0] == "BYEPLAYERS"
            for player in row[1:]
        ]

    def get_tournamentType_display(self):
        return dict(SR_TOURNAMENT_TYPE_CHOICES)[self.tournamentType]

    def serialize(self, loggedInUser=None):
        # Used for Finished Games
        winnerHTML = SR_getTournamentWinnerHTML(self.tournamentStatus, self.winnersData)

        createdTS = str(self.created)
        startingOptionsHTML = "[None]"
        if self.gameCode == "FCM":
            startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(self.startingOptions) if self.startingOptions else [])
        if self.gameCode == "TGZ":
            startingOptionsHTML = SR_getTGZstartingOptionsHTML(json.loads(self.startingOptions) if self.startingOptions else [])

        if startingOptionsHTML == "":
            startingOptionsHTML = "[None]"

        return {
            "Main_Tournament_id": self.id,
            "tournamentName": self.tournamentName,
            "tournamentDescription": self.tournamentDescription,
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": self.gameCode,
            "tournamentID": self.id,
            "tournamentLink": f"/MainTournament/{self.id}/",
        }


class Mini_Tournaments(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field

    MINI_TOURNAMENT_GAME_CHOICES = [
        ("FCM", gettext_lazy("Food Chain Magnate")),
        ("HC", gettext_lazy("Horseless Carriage")),
        ("TGZ", gettext_lazy("The Great Zimbabwe")),
        ("CNS", gettext_lazy("Cannes")),
        ("AQY", gettext_lazy("Antiquity")),
        ("IND", gettext_lazy("Indonesia")),
        ("KFW", gettext_lazy("Keyflower")),
    ]

    gameCode = models.CharField(
        max_length=3,
        choices=MINI_TOURNAMENT_GAME_CHOICES,
        default="FCM",
    )

    tournamentName = models.CharField(max_length=120)
    tournamentDescription = models.CharField(
        max_length=120, blank=True, db_collation="utf8mb4_general_ci"
    )

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

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="MT_creator_relName",
    )

    startingOptions = models.CharField(max_length=80, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_MT", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="currentRoundPlayersRelName_MT",
        blank=True,
    )
    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="invitedPlayersRelName_MT", blank=True
    )

    maxTournamentPlayers = models.PositiveSmallIntegerField(blank=False)
    maxGamePlayers = models.PositiveSmallIntegerField(blank=False)
    roundsBeforeKnockout = models.PositiveSmallIntegerField(blank=False, default=4)

    winnersData = models.TextField(blank=True)

    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)
    tournamentProgressionData = models.TextField(blank=True)
    tournamentSideData = models.TextField(blank=True)
    tournamentPointsData = models.TextField(blank=True)

    chatData = models.TextField(blank=True)

    def __str__(self):
        return f"{getattr(self, 'id')}: {self.tournamentName} : {self.tournamentType} : {self.tournamentStatus}"

    def isSignedUp(self, loggedInUser):
        if loggedInUser in self.startingPlayers.all():
            return True
        return False

    def isInvitedPlayer(self, loggedInUser):
        if loggedInUser in self.invitedPlayers.all():
            return True
        return False

    def getByedPlayersList(self):
        TPDA = json.loads(self.tournamentProgressionData)
        return [
            player
            for round in TPDA
            for row in round
            if row[0] == "BYEPLAYERS"
            for player in row[1:]
        ]

    def get_tournamentType_display(self):
        return dict(SR_TOURNAMENT_TYPE_CHOICES)[self.tournamentType]

    def serialize(self, loggedInUser=None):
        # Used for Finished Games
        winnerHTML = SR_getTournamentWinnerHTML(self.tournamentStatus, self.winnersData)

        createdTS = str(self.created)
        startingOptionsHTML = "[None]"
        if self.gameCode == "FCM":
            startingOptionsHTML = SR_getFCMstartingOptionsHTML(json.loads(self.startingOptions) if self.startingOptions else [])
        if self.gameCode == "TGZ":
            startingOptionsHTML = SR_getTGZstartingOptionsHTML(json.loads(self.startingOptions) if self.startingOptions else [])

        return {
            "Mini_Tournament_id": self.id,
            "tournamentName": self.tournamentName,
            "tournamentDescription": self.tournamentDescription,
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": self.gameCode,
        }


# Subclass of all game models, including the new, unified game model
class BaseGame(models.Model):
    """
    General base model for all game types.
    All game-specific models should inherit from this.
    """

    id = models.AutoField(primary_key=True)

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

    playerOrderSeed = models.PositiveSmallIntegerField(blank=False, default=0)

    # Set default as 2. Games with min 3 players explicity set the defult to 3 before creation
    maxPlayers = models.PositiveSmallIntegerField(blank=False, default=2)

    # I removed this these the models - I checked each record creation for each model,
    # and set it to 1 if a game starts at 1 instead of 0.
    # In any case, it is updated by the client on first save anyway, which happens as soon as you enter the game)
    # Set these explicity when creating a game, default to 0
    turn = models.PositiveSmallIntegerField(null=False, blank=False, default=0)
    phase = models.PositiveSmallIntegerField(null=False, blank=False, default=0)

    kickoutDuration = models.PositiveSmallIntegerField(
        null=False, blank=False, default=200
    )
    gamePace = models.PositiveSmallIntegerField(null=False, blank=False, default=30)

    chatData = models.TextField(blank=True)

    gameData = models.TextField(blank=True)
    gameDataBLOB = models.BinaryField(null=True, blank=True)
    rewindData = models.TextField(blank=True)
    rewindTempData = models.TextField(blank=True)

    kickoutFlexiData = models.TextField(blank=True)

    # TGZ only
    autoMoves = models.CharField(max_length=30, blank=True, null=True, default=None)

    statsExcludedGame = models.BooleanField(blank=False, default=False)

    zoomLevels = models.CharField(
        max_length=30, blank=False, default=json.dumps([16, 16, 16, 16])
    )

    # This has a few different lengths, but 15 should be plenty. It is just a unix timestamp
    # THESE MIGHT BE BETTER CONVERTED TO A DATE_TIME FIELD?!
    latestUpdate = models.CharField(
        max_length=15, blank=False, default=SR_getTimeNow, db_index=True
    )
    created = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    # Change to JSON field?
    startingMap = models.CharField(max_length=190, blank=True)

    # The longest was 100 chars, so i set it to that.
    # Not sure if that's inefficient?
    # IN ANY CASE THIS SHOULD BE REMODELED INTO A JSONFIELD AS IT SHOULD ONLY CONTAIN A JSON DUMPED
    # ARRAY OF INTS / SUBARRS. (Except legacy FCM games perhaps).
    startingOptions = models.CharField(max_length=100, blank=True)

    # THESE 2 GET DELETED ON GAME END. SO MAYBE COMBINE THESE INTO "votes" OPTIONS OR SOMETHING?
    # DELETE ON GAME END, SO NORMALLY TAKE UP ZERO SPACE
    statsExcludeConsent = models.CharField(max_length=40, blank=True, null=True)
    deleteGameVotes = models.JSONField(default=dict, blank=True, null=True)

    ####### THESE ITEMS ONLY EXIST IN THIS GENERAL GAME MODEL
    activeVotes = models.JSONField(default=dict, blank=True, null=True)

    class Meta:
        abstract = True


# Subclass of all existing games
# It includes fields that are needed for all existing game models, but which we don't want in the unified game model.
class GeneralGame(BaseGame):
    # This is a STRING of the currentPlayer username
    # IT SHOULD PROBABLY BE CHANGED TO M2M FIELD WITH USERS
    currentPlayers = models.CharField(max_length=100, blank=True)

    player0notes = models.TextField(blank=True)
    player1notes = models.TextField(blank=True)
    player2notes = models.TextField(blank=True)
    player3notes = models.TextField(blank=True)

    class Meta(BaseGame.Meta):
        abstract = True

    # Allow access early to the general presenter, before all games are converted and we can delete this
    def tempPresenter(self):
        return GamePresenter(self)


class Game(BaseGame):
    # Add this line to help the linter (type checking only)
    #if typing.TYPE_CHECKING:
    #    players: RelatedManager["GamePlayer"]

    gameCode = models.CharField(
        max_length=3,
        choices=SR_GAMES_CODES_AND_NAMES_CHOICES,
        default="FCM",
        db_column="gameCode",
    )

    original_id = models.PositiveIntegerField(null=True, blank=True)

    models.constraints.UniqueConstraint(
        fields=["gameCode", "original_id"], name="unique_game_code_and_original_id"
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_games",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="hosted_games",
        default=config("ADMIN_DB_KEY", default=1, cast=int),
    )

    invitedPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="invited_games", blank=True
    )

    relatedMainTournament = models.ForeignKey(
        Main_Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintournamentGEN_relName",
    )

    relatedMiniTournament = models.ForeignKey(
        Mini_Tournaments,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="minitournamentGEN_relName",
    )
    
    currentPlayersInTurnOrder = models.CharField(
        max_length=150, 
        blank=True, 
        null=True, 
        default=None
    )
    
    # CURRENTLY RnB ONLY
    serverRemainingPlayerOrderByNames = models.JSONField(default=list, blank=True)

    # TODO, only used in AQY. Remove from the Game model at some point.
    playerTradeData = models.TextField(blank=True)

    # TODO, only used in IND. Remove from the Game model at some point.
    playersPreMoveData = models.TextField(blank=True)

    # FCM-specific fields
    FCMplayersMoveData = models.TextField(blank=True)
    FCMnotificationSuppression = models.CharField(max_length=30, blank=False, default="000000")

    # HC-specific fields (temporary, for migration)
    relatedHCTournament = models.ForeignKey(
        'HC.HC_Tournament',
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name='hctournamentGEN_relName',
    )

    tournamentGame = models.BooleanField(blank=False, default=False)
    externalTournamentGame = models.BooleanField(blank=False, default=False)

    if TYPE_CHECKING:
        players: RelatedManager[GamePlayer]

    def presenter(self) -> Union[CannesPresenter, WebPresenter, AqyPresenter, TgzPresenter, IndPresenter, BusPresenter, FcmPresenter, RnbPresenter, HcPresenter]:
        if self.gameCode == "CNS":
            return CannesPresenter(self)
        if self.gameCode == "WEB":
            return WebPresenter(self)
        if self.gameCode == "AQY":
            return AqyPresenter(self)
        if self.gameCode == "TGZ":
            return TgzPresenter(self)
        if self.gameCode == "IND":
            return IndPresenter(self)
        if self.gameCode == "Bus":
            return BusPresenter(self)
        if self.gameCode == "FCM":
            return FcmPresenter(self)
        if self.gameCode == "RNB":
            return RnbPresenter(self)
        if self.gameCode == "HC":
            return HcPresenter(self)
        # Return a CannesPresenter to stop constant linting errors
        print("Unknown game code: " + self.gameCode)
        return CannesPresenter(self)

    # This was causing a break not having this?
    def getGameCode(self):
        return self.gameCode

    ############### THESE NEED TO BE HERE FORE NOW TO STOP THINGS BREAKING
    #def currentTurnString(self):
    #    return SR_currentTurnString(self.gameCode, self.turn, self.phase)

class GamePlayer(models.Model):
    game = models.ForeignKey(
        Game, related_name="players", on_delete=models.deletion.CASCADE
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.deletion.SET_NULL,
        null=True,
        related_name="games",
    )

    notes = models.TextField(blank=True)
    winner = models.BooleanField(default=False)

    is_missing = models.BooleanField(default=False)
    is_kicked = models.BooleanField(default=False)

    is_current = models.BooleanField(default=False)
    has_chat_notification = models.BooleanField(default=False)

    seat_order = models.PositiveSmallIntegerField(null=True, blank=True)

    # TODO, these two fields are currently used only in AQY. Remove from the Game model at some point.
    currentMoveTime = models.CharField(max_length=15, blank=True)
    currentMoveData = models.TextField(blank=True)

    class Meta:
        ordering = ["seat_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["game", "player"], name="unique_game_player"
            )
        ]


