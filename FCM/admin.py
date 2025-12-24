from django.contrib import admin
from django.conf import settings
from .models import FCM_Game, FCM_Tournament
from django.contrib.admin import display
from django.contrib.auth import get_user_model
from django import forms
from dal import autocomplete
import logging
import time

from django.utils.html import format_html
from django.urls import reverse

# Register your models here.
# admin.site.register(FCM_Game)

# class FCM_GameAdmin(admin.ModelAdmin):
#    save_on_top = True
#    save_as = True
#    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers')

# def formfield_for_manytomany(self, db_field, request, **kwargs):
#    if db_field.name == "allPlayers":
#        kwargs["queryset"] = FCM_Game.objects.filter(creator=request.user)
#    return super(FCM_GameAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)


class FCM_GameForm(forms.ModelForm):
    class Meta:
        model = FCM_Game
        fields = "__all__"
        widgets = {
            "chatData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "playersMoveData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "gameData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "rewindData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "rewindTempData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "kickoutFlexiData": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player0notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player1notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player2notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player3notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player4notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "player5notes": forms.Textarea(attrs={"rows": 4, "cols": 50}),
            "allPlayers": autocomplete.ModelSelect2Multiple(url="user-autocomplete"),
            "missingPlayers": autocomplete.ModelSelect2Multiple(
                url="user-autocomplete"
            ),
            "kickedPlayers": autocomplete.ModelSelect2Multiple(url="user-autocomplete"),
            "invitedPlayers": autocomplete.ModelSelect2Multiple(
                url="user-autocomplete"
            ),
            "playersWithChatNotification": autocomplete.ModelSelect2Multiple(
                url="user-autocomplete"
            ),
        }


@admin.register(FCM_Game)
class FCM_GameAdmin(admin.ModelAdmin):
    form = FCM_GameForm
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
        "relatedMiniTournament",
    ]

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
                "relatedMiniTournament",
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
                "playersMoveData",
                "gameData",
                "rewindData",
                "rewindTempData",
                "kickoutFlexiData",
                "player0notes",
                "player1notes",
                "player2notes",
                "player3notes",
                "player4notes",
                "player5notes",
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
            '<a href="{}/FCM/{}" target="_blank" title="{}">{}</a>',
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
        if obj.relatedMiniTournament:
            # return f"Mini: {obj.relatedMiniTournament.tournamentName}"
            return f"Mini: {getattr(obj.relatedMiniTournament, 'tournamentName', 'Unknown')}"
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
        "relatedMiniTournament",
    )
    search_fields = ("gameName", "creator__username")

    # list_select_related = ('creator', 'host', 'winner', 'relatedTournament', 'relatedMiniTournament')
    # list_prefetch_related = (
    #    'allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification'
    # )

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
                    "startingMap",
                    "seatOffset",
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
                    "notificationSuppression",
                    "rewindConsent",
                    "statsExcludeConsent",
                    "statsExcludedGame",
                )
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
                    "playersMoveData",
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
                    "player0notes",
                    "player1notes",
                    "player2notes",
                    "player3notes",
                    "player4notes",
                    "player5notes",
                ),
            },
        ),
        (
            "Linked Tournament",
            {
                "classes": ("collapse",),
                "fields": ("relatedTournament", "relatedMiniTournament"),
            },
        ),
    )

    # def formfield_for_manytomany(self, db_field, request, **kwargs):
    #    if db_field.name in ['allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification']:
    #        User = get_user_model()
    #        # Allow all users to be selectable
    #        kwargs["queryset"] = User.objects.all()
    #        # Optional: Add filtering if needed, e.g., only active users
    #        # kwargs["queryset"] = User.objects.filter(is_active=True)
    #    result = super().formfield_for_manytomany(db_field, request, **kwargs)
    #    return result


@admin.register(FCM_Tournament)
class FCM_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ("startingPlayers", "nextRoundPlayers")
    search_fields = ["tournamentName"]


# ModelAdmin.save_on_top
