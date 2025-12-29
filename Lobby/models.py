import time
import json
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils.translation import gettext_lazy


from Lobby.sharedFunctions.sharedRefs import (
    SR_TOURNAMENT_STATUS_CHOICES,
    SR_TOURNAMENT_TYPE_CHOICES,
    SR_getTimeNow,
    SR_getTournamentWinnerHTML,
    #SR_getTournamentRoundsHTML,
)

from .sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML, SR_getTGZstartingOptionsHTML


class User(AbstractUser):
    # Fields that you are not obliged to implement
    # username = models.CharField(max_length=100)
    # first_name = models.CharField(max_length=100)
    # last_name = models.CharField(max_length=100)
    def __str__(self):
        # field_names = [field.name for field in self._meta.fields]
        # return f"{self.username} : {field_names}"
        # try:
        #    profile = Profile.objects.get(user=self)
        #    email_confirmed = profile.email_confirmed if profile else None
        #    activeString = "" if self.is_active else " :A NOT AN ACTIVE USER"
        #    profileString = "" if email_confirmed else " :PE UNCONFIRMED"
        #    return f"{self.username} {activeString} {profileString}"
        # except:
        #    return f"{self.username} : NO PROFILE NO PROFILE NO PROFILE"

        activeString = "" if self.is_active else " :A NOT AN ACTIVE USER"
        return f"{self.username} {activeString}"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    # bio = models.TextField(max_length=500, blank=True)
    # location = models.CharField(max_length=30, blank=True)
    # birth_date = models.DateField(null=True, blank=True)
    sendEmailNotificationOnTurn = models.BooleanField(default=True)
    emailNotifications = models.CharField(
        blank=False, default=json.dumps([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], separators=(",", ":")), max_length=40
    )
    stopEmailsUntil = models.PositiveIntegerField(null=True, blank=True)

    webhooks = models.TextField(blank=True, null=True)

    # sendDiscordWebhookNotificationOnTurn = models.BooleanField(default=False)
    # discordWebhookURL = models.CharField(max_length=200, blank=True)
    # discordWebhookUserID = models.CharField(max_length=50, blank=True)

    # sendSlackWebhookNotificationOnTurn = models.BooleanField(default=False)
    # slackWebhookURL = models.CharField(max_length=200, blank=True)

    preferredRestaurantColour = models.SmallIntegerField(null=False, blank=False, default=-1)
    highContrastBoardItems = models.BooleanField(default=False)

    preferredHCcolour = models.SmallIntegerField(null=False, blank=False, default=-1)

    preferredBusColour = models.SmallIntegerField(null=False, blank=False, default=-1)
    preferredBusBoard = models.SmallIntegerField(null=False, blank=False, default=0)

    preferredTGZcolour = models.SmallIntegerField(null=False, blank=False, default=-1)
    TGZminimalText = models.BooleanField(blank=False, default=False)

    preferredCNScolour = models.PositiveSmallIntegerField(null=True, blank=True, default=None)

    preferredAQYoptions = models.CharField(max_length=30, blank=True)
    preferredINDoptions = models.CharField(max_length=30, blank=True)
    preferredKFWoptions = models.CharField(max_length=30, blank=True)
    preferredWEBoptions = models.CharField(max_length=30, blank=True)

    # preferredRNBcolour = models.PositiveSmallIntegerField(null=True, blank=True, default=None)

    FCMtournamentTrophies = models.CharField(
        max_length=100, blank=False, default=json.dumps([[0, 0, 0, 0, 0]], separators=(",", ":"))
    )

    liveNotification = models.SmallIntegerField(null=True, blank=False, default=1)
    email_confirmed = models.BooleanField(default=False)
    showAssistance = models.BooleanField(default=True)

    profileLanguage = models.CharField(max_length=10, choices=settings.LANGUAGES, default=settings.LANGUAGE_CODE)

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


def get_default_timestamp():
    return str(int(time.time()) * 1000)


class changelog(models.Model):
    update = models.CharField(max_length=120)
    timestamp = models.CharField(max_length=30, blank=False, default=get_default_timestamp)

    def __str__(self):
        return f"{self.timestamp}: {self.update}"

class Main_Tournament(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field

    MAIN_TOURNAMENT_GAME_CHOICES = [
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
        choices=MAIN_TOURNAMENT_GAME_CHOICES,
        default="FCM",
    )

    tournamentName = models.CharField(max_length=120)
    tournamentDescription = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

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
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_MainT", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="currentRoundPlayersRelName_MainT", blank=True
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
        return [player for round in TPDA for row in round if row[0] == "BYEPLAYERS" for player in row[1:]]

    def get_tournamentType_display(self):
        return dict(SR_TOURNAMENT_TYPE_CHOICES)[self.tournamentType]

    def serialize(self, loggedInUser=None):
        # Used for Finished Games
        winnerHTML = SR_getTournamentWinnerHTML(self.tournamentStatus, self.winnersData)

        createdTS = str(self.created)
        startingOptionsHTML = "[None]"
        if self.gameCode == "FCM":
            startingOptionsHTML = SR_getFCMstartingOptionsHTML(self.startingOptions)
        if self.gameCode == "TGZ":
            startingOptionsHTML = SR_getTGZstartingOptionsHTML(self.startingOptions)

        if startingOptionsHTML == "":
            startingOptionsHTML = "[None]"

        return {
            "Main_Tournament_id": self.id,
            "tournamentName": self.tournamentName,
            "tournamentDescription": self.tournamentDescription,
            # "tournamentStatus": self.get_tournamentStatus_display(),
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": self.gameCode,
            "tournamentID": self.id,
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
    tournamentDescription = models.CharField(max_length=120, blank=True, db_collation="utf8mb4_general_ci")

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
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="MT_creator_relName"
    )

    startingOptions = models.CharField(max_length=80, blank=True, default="")
    startingPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="startingPlayersRelName_MT", blank=True
    )
    nextRoundPlayers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="currentRoundPlayersRelName_MT", blank=True
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
        return [player for round in TPDA for row in round if row[0] == "BYEPLAYERS" for player in row[1:]]

    def get_tournamentType_display(self):
        return dict(SR_TOURNAMENT_TYPE_CHOICES)[self.tournamentType]

    def serialize(self, loggedInUser=None):
        # Used for Finished Games
        winnerHTML = SR_getTournamentWinnerHTML(self.tournamentStatus, self.winnersData)

        createdTS = str(self.created)
        startingOptionsHTML = "[None]"
        if self.gameCode == "FCM":
            startingOptionsHTML = SR_getFCMstartingOptionsHTML(self.startingOptions)
        if self.gameCode == "TGZ":
            startingOptionsHTML = SR_getTGZstartingOptionsHTML(self.startingOptions)

        return {
            "Mini_Tournament_id": self.id,
            "tournamentName": self.tournamentName,
            "tournamentDescription": self.tournamentDescription,
            # "tournamentStatus": self.get_tournamentStatus_display(),
            "tournamentType": self.get_tournamentType_display(),
            "maxTournamentPlayers": self.maxTournamentPlayers,
            "maxGamePlayers": self.maxGamePlayers,
            "startingOptionsHTML": startingOptionsHTML,
            "winnerHTML": winnerHTML,
            "createdTS": createdTS,
            "gameCode": self.gameCode,
        }


class QueryableGame(models.Model):
    gameCode = models.CharField(max_length=255, db_column="gameCode")
    id = models.PositiveIntegerField()

    pk = models.CompositePrimaryKey("gameCode", "id")

    gameName = models.CharField(max_length=255)
    gameDescription = models.CharField(max_length=255)
    gameStatus = models.CharField(max_length=255)

    latestUpdate = models.CharField(max_length=255)
    startingOptions = models.CharField(max_length=255)
    startingMap = models.CharField(max_length=255, null=True, blank=True)
    currentPlayers = models.CharField(max_length=255)
    maxPlayers = models.PositiveIntegerField()

    turn = models.PositiveIntegerField()
    phase = models.PositiveIntegerField()
    kickoutDuration = models.PositiveIntegerField()
    gamePace = models.PositiveIntegerField()

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.deletion.DO_NOTHING, null=True
    )
    created = models.DateField()

    class Meta:
        db_table = "Lobby_all_games"
        managed = False

class QueryableGameWinners(models.Model):
    pk = models.CompositePrimaryKey("gameCode", "game_id", "winner_id")

    gameCode = models.CharField(max_length=255, db_column="gameCode")
    game_id = models.PositiveIntegerField(db_column="id")

    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.deletion.DO_NOTHING, related_name="winners"
    )
    queryable_game = models.ForeignObject(
        QueryableGame,
        on_delete=models.deletion.DO_NOTHING,
        from_fields=("gameCode", "game_id"),
        to_fields=("gameCode", "id"),
        related_name="winners"
    )

    class Meta:
        db_table = "Lobby_all_games_winners"
        managed = False

class QueryableGameInvitedPlayers(models.Model):
    pk = models.CompositePrimaryKey("gameCode", "id", "invited_player")
    gameCode = models.CharField(max_length=255, db_column="gameCode")
    id = models.PositiveIntegerField()

    invited_player = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.deletion.DO_NOTHING, db_column="user_id"
    )
    queryable_game = models.ForeignObject(
        QueryableGame,
        on_delete=models.deletion.DO_NOTHING,
        from_fields=("gameCode", "id"),
        to_fields=("gameCode", "id"),
        related_name="invited_players"
    )

    class Meta:
        db_table = "Lobby_all_games_invited_players"
        managed = False

class QueryableGameAllPlayers(models.Model):
    pk = models.CompositePrimaryKey("gameCode", "id", "player_id")
    gameCode = models.CharField(max_length=255, db_column="gameCode")
    id = models.PositiveIntegerField()
    hasChatNotification = models.BooleanField()

    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.deletion.DO_NOTHING, db_column="user_id"
    )
    queryable_game = models.ForeignObject(
        QueryableGame,
        on_delete=models.deletion.DO_NOTHING,
        from_fields=("gameCode", "id"),
        to_fields=("gameCode", "id"),
        related_name="all_players"
    )

    class Meta:
        db_table = "Lobby_all_games_all_players"
        managed = False
