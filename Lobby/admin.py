from django.contrib import admin

# Register your models here.
from .models import (
    User,
    Profile,
    changelog,
    Mini_Tournaments,
    Main_Tournament,
    Game,
    GamePlayer,
)
from .modelProxies import FCMMiniTournament, TGZMiniTournament, CNSgame, WEBgame, AQYgame, TGZgame

from django.conf import settings
from django import forms
from django.utils.html import format_html
from django.urls import reverse


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    search_fields = ("email", "username")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    search_fields = ["user__username", "email_confirmed"]


@admin.register(Main_Tournament)
class Main_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ("startingPlayers", "nextRoundPlayers")
    search_fields = ["tournamentName"]


@admin.register(Mini_Tournaments)
class Mini_TournamentsAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ("startingPlayers", "nextRoundPlayers")
    autocomplete_fields = ("creator",)
    search_fields = ["tournamentName"]


# The FCM specific link
@admin.register(FCMMiniTournament)
class FCMMiniTournamentAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        # Only show FCM games in this view
        return super().get_queryset(request).filter(gameCode="FCM")

    # This moves it to the FCM section in the sidebar
    class Meta:
        app_label = "FCM"


# The TGZ specific link
@admin.register(TGZMiniTournament)
class TGZMiniTournamentAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="TGZ")

    class Meta:
        app_label = "TGZ"


class GamePlayerInline(admin.TabularInline):
    model = GamePlayer
    extra = 0
    # fields = ("player", "player_number", "status", "edit_link")
    # readonly_fields = ("edit_link",)
    show_change_link = True
    fields = ("player", "seat_order", "winner", "is_current", "is_missing", "is_kicked")
    autocomplete_fields = ["player"]

    # @admin.display(description="Edit")
    # def edit_link(self, obj):
    #    if obj.id:
    #        url = reverse("admin:Lobby_gameplayer_change", args=[obj.id])
    #        return format_html('<a href="{}">📝 Edit Player</a>', url)
    #    return "-"


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    list_per_page = 100

    # 1. Performance: Use native autocomplete for all User relations
    autocomplete_fields = [
        "creator",
        "host",
        # "winner",
        # "allPlayers",
        # "missingPlayers",
        # "kickedPlayers",
        "invitedPlayers",
        # "playersWithChatNotification",
        "relatedMainTournament",
        "relatedMiniTournament",
    ]

    inlines = [GamePlayerInline]  # Add this line

    # Map your Textareas here without needing a separate Form class
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)

        # Check if formfield is not None and if it's one of your target fields
        if formfield and db_field.name in [
            "chatData",
            "gameData",
            "rewindData",
            "rewindTempData",
            "kickoutFlexiData",
            # "player0notes",
            # "player1notes",
            # "player2notes",
            # "player3notes",
        ]:
            formfield.widget = forms.Textarea(attrs={"rows": 4, "cols": 50})

        return formfield

    # FIX 2: Speed up pagination by disabling the "total count" if the table is huge
    show_full_result_count = False

    def get_queryset(self, request):
        # 1. Essential joins for EVERY view
        qs = (
            super()
            .get_queryset(request)
            .select_related(
                "creator",
                "host",
                # "winner",
                "relatedMainTournament",
                "relatedMiniTournament",
            )
            .prefetch_related("players__player")
        )

        # 2. Conditional Deferral
        # If we are in the "Changelist" (the table view), defer heavy blobs.
        # This prevents the 16ms disk-read penalty when you just want to see the list.
        if request.resolver_match and request.resolver_match.view_name.endswith(
            "changelist"
        ):
            return qs.defer(
                "chatData",
                "gameData",
                "rewindData",
                "rewindTempData",
                "kickoutFlexiData",
                # "player0notes",
                # "player1notes",
                # "player2notes",
                # "player3notes",
            )

        # In the "Change" view (editing one record), we do NOT defer.
        # This prevents the "5 similar queries" because the form finds the data already loaded.
        return qs

    # Nice column headers
    @admin.display(description="Players")
    def player_list(self, obj):
        #       1. Fetch related objects
        players = obj.players.all().select_related("player")

        links = []
        for p in players:
            if p.player:
                # 2. Generate the URL for the GamePlayer change page
                # Pattern: admin:<app>_<model>_change
                url = reverse("admin:Lobby_gameplayer_change", args=[p.id])

                # 3. Create the HTML anchor tag
                links.append(format_html('<a href="{}">{}</a>', url, p.player.username))

        # 4. Join with commas and return as safe HTML
        return format_html(", ".join(["{}"] * len(links)), *links) or "No players"

    @admin.display(
        description="Game (Click to view)", ordering="gameName"
    )  # "Game" will be the column header
    def game_link(self, obj):
        gameCode = obj.gameCode
        # Use the actual gameName field (or fallback to ID)
        full_name = obj.presenter().getGameName()

        # Truncate to 10 chars + ellipsis if needed
        short_name = full_name if len(full_name) <= 20 else full_name[:20] + "…"

        # Build the correct URL
        site_url = (
            "http://localhost:8000"
            if settings.DEBUG
            else "https://www.onlineboardgamers.com"
        )

        # Make the shortened name the clickable text
        return format_html(
            '<a href="{}/{}/{}/show/" target="_blank" title="{}">{}</a>',
            site_url,
            gameCode,
            obj.id,
            full_name,
            short_name,
        )

    @admin.display(description="Name")
    def game_name(self, obj):
        # assuming you have a field or property called gameName
        # if you have a method getGameName already, just rename it:
        return obj.gameName or obj.getGameName()

    # @admin.display(description='Status')
    # def status(self, obj):
    #    return obj.get_gameStatus_display() if hasattr(obj.gameStatus, 'choices') else obj.gameStatus

    # @admin.display(description='Players')
    # def max_players(self, obj):
    #    return obj.maxPlayers

    # @admin.display(description='Creator')
    # def creator_name(self, obj):
    #    return obj.creator.username if obj.creator else "-"

    @admin.display(description="Tournament")
    def tournament_display(self, obj):
        if obj.relatedMainTournament:
            return getattr(
                obj.relatedMainTournament,
                "tournamentName",
                str(obj.relatedMainTournament),
            )
        if obj.relatedMiniTournament:
            return f"Mini: {getattr(obj.relatedMiniTournament, 'tournamentName', 'Unknown')}"
        return "-"

    list_display = (
        "id",
        "gameCode",
        "game_link",
        "gameStatus",
        "player_list",
        "creator",
        "host",
        "maxPlayers",
        "created",
        "tournament_display",
    )

    list_filter = (
        "gameStatus",
        "maxPlayers",
        "relatedMainTournament",
        "relatedMiniTournament",
    )

    # search_fields = ("gameName", "creator__username")
    search_fields = ("gameName", "gameDescription", "gameCode")

    # 4. Fieldsets for a cleaner UI
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "gameCode",
                    "gameName",
                    "gameDescription",
                    "gameStatus",
                    # "currentPlayers",
                    "maxPlayers",
                    "original_id",
                )
            },
        ),
        (
            "Main Game Details",
            {
                "fields": (
                    "latestUpdate",
                    "startingOptions",
                    "playerOrderSeed",
                )
            },
        ),
        (
            "Other Game Details",
            {
                "classes": ("collapse",),
                "fields": (
                    "turn",
                    "phase",
                    "created",
                    "kickoutDuration",
                    "gamePace",
                    "zoomLevels",
                    "statsExcludeConsent",
                    "statsExcludedGame",
                ),
            },
        ),
        (
            "Player Management",
            {
                "classes": ("collapse",),
                "fields": (
                    "creator",
                    "host",
                    # "winner",
                    # "allPlayers",
                    # "missingPlayers",
                    # "kickedPlayers",
                    "invitedPlayers",
                    # "playersWithChatNotification",
                    # "deleteGameVotes",
                    "activeVotes",
                ),
            },
        ),
        (
            "Game Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "gameData",
                    "rewindData",
                    "rewindTempData",
                    "chatData",
                    "kickoutFlexiData",
                ),
            },
        ),
        (
            "Player Notes",
            {
                "classes": ("collapse",),
                "fields": (
                    # "player0notes",
                    # "player1notes",
                    # "player2notes",
                    # "player3notes",
                ),
            },
        ),
        (
            "Linked Tournament",
            {
                "classes": ("collapse",),
                "fields": ("relatedMainTournament", "relatedMiniTournament"),
            },
        ),
    )


@admin.register(GamePlayer)
class GamePlayerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "game",
        "player",
        "seat_order",
        "winner",
        "is_current",
        "is_missing",
        "is_kicked",
    )
    list_filter = ("winner", "is_current", "is_missing", "is_kicked")
    search_fields = ("player__username", "game__gameName")
    autocomplete_fields = ("player",)


admin.site.register(changelog)

################### Register game objects to specific app


# CNS
@admin.register(CNSgame)
class CNSgameAdmin(GameAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="CNS")

    class Meta:
        app_label = "CNS"

@admin.register(WEBgame)
class WEBgameAdmin(GameAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="WEB")

    class Meta:
        app_label = "WEB"

@admin.register(TGZgame)
class TGZgameAdmin(GameAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="TGZ")

    class Meta:
        app_label = "TGZ"

################### END Register game objects to specific app
@admin.register(AQYgame)
class AQYgameAdmin(GameAdmin):
    # Copy parent fieldsets and convert to list to allow modification
    #new_fieldsets = list(GameAdmin.fieldsets)
#
    ## Define your specific section
    #player_moves_section = (
    #    "Player Moves",
    #    {
    #        "classes": ("collapse",),
    #        "fields": (
    #            ("player0currentMoveTime", "player0currentMoveData"),
    #            ("player1currentMoveTime", "player1currentMoveData"),
    #            ("player2currentMoveTime", "player2currentMoveData"),
    #            ("player3currentMoveTime", "player3currentMoveData"),
    #        ),
    #    },
    #)
#
    ## Insert it at index 2 (after 'Main Game Details')
    #new_fieldsets.insert(2, player_moves_section) # type: ignore
    #fieldsets = tuple(new_fieldsets)
    
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="AQY")

    class Meta:
        app_label = "AQY"

################### END Register game objects to specific app
