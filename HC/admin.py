from decouple import config

from django.contrib import admin
from django.conf import settings
from django import forms


from django.utils.html import format_html

from .models import HC_Game, HC_Tournament


@admin.register(HC_Game)
class HC_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    list_per_page = 100

    # 1. Performance: Use native autocomplete for all User relations
    autocomplete_fields = [
        "creator",
        "host",
        "winner",
        "allPlayers",
        "missingPlayers",
        "kickedPlayers",
        "invitedPlayers",
        "playersWithChatNotification",
        "relatedTournament",
        # "relatedMiniTournament",
    ]

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
            "player0notes",
            "player1notes",
            "player2notes",
            "player3notes",
            "player4notes",
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
                "winner",
                "relatedTournament",
                # "relatedMiniTournament",
            )
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
                "player0notes",
                "player1notes",
                "player2notes",
                "player3notes",
                "player4notes",
            )

        # In the "Change" view (editing one record), we do NOT defer.
        # This prevents the "5 similar queries" because the form finds the data already loaded.
        return qs

    # Nice column headers
    @admin.display(
        description="Game (Click to view)", ordering="gameName"
    )  # "Game" will be the column header
    def game_link(self, obj):
        # Use the actual gameName field (or fallback to ID)
        full_name = obj.getGameName()

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
            '<a href="{}/HC/{}" target="_blank" title="{}">{}</a>',
            site_url,
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
        if obj.relatedTournament:
            # return obj.relatedTournament.tournamentName
            return getattr(
                obj.relatedTournament, "tournamentName", str(obj.relatedTournament)
            )
        # if obj.relatedMiniTournament:
        #    return f"Mini: {getattr(obj.relatedMiniTournament, 'tournamentName', 'Unknown')}"
        return "-"

    list_display = (
        "id",
        "game_link",
        "gameStatus",
        "maxPlayers",
        "creator",
        "tournament_display",
    )
    list_filter = (
        "gameStatus",
        "maxPlayers",
        "relatedTournament",
        # "relatedMiniTournament",
    )
    search_fields = ("gameName", "creator__username")

    # 4. Fieldsets for a cleaner UI
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "gameName",
                    "gameDescription",
                    "gameStatus",
                    "currentPlayers",
                    "maxPlayers",
                )
            },
        ),
        (
            "Main Game Details",
            {
                "fields": (
                    "latestUpdate",
                    "startingOptions",
                    "playerOrderSeed"
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
                    "winner",
                    "allPlayers",
                    "missingPlayers",
                    "kickedPlayers",
                    "invitedPlayers",
                    "playersWithChatNotification",
                    "deleteGameVotes",
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
            "Move Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "player0currentMoveTime",
                    "player0currentMoveData",
                    "player1currentMoveTime",
                    "player1currentMoveData",
                    "player2currentMoveTime",
                    "player2currentMoveData",
                    "player3currentMoveTime",
                    "player3currentMoveData",
                    "player4currentMoveTime",
                    "player4currentMoveData",
                ),
            },
        ),
        (
            "Player Notes",
            {
                "classes": ("collapse",),
                "fields": (
                    "player0notes",
                    "player1notes",
                    "player2notes",
                    "player3notes",
                    "player4notes",
                ),
            },
        ),
        (
            "Linked Tournament",
            {
                "classes": ("collapse",),
                "fields": ("relatedTournament",),  # "relatedMiniTournament"),
            },
        ),
    )


class HC_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ("startingPlayers", "nextRoundPlayers")
    search_fields = ["tournamentName"]


admin.site.register(HC_Tournament, HC_TournamentAdmin)
