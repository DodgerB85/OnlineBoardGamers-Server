from django import forms
from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.admin import display
from django.utils.html import format_html

from dal import autocomplete


from .models import TGZ_Game#, HC_Tournament

class TGZ_GameForm(forms.ModelForm):
    class Meta:
        model = TGZ_Game
        fields = '__all__'
        widgets = {
            'chatData': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'gameData': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'rewindData': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'rewindTempData': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'kickoutFlexiData': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'player0notes': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'player1notes': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'player2notes': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'player3notes': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'player4notes': forms.Textarea(attrs={'rows': 4, 'cols': 50}),
            'allPlayers': autocomplete.ModelSelect2Multiple(url='user-autocomplete'),
            'missingPlayers': autocomplete.ModelSelect2Multiple(url='user-autocomplete'),
            'kickedPlayers': autocomplete.ModelSelect2Multiple(url='user-autocomplete'),
            'invitedPlayers': autocomplete.ModelSelect2Multiple(url='user-autocomplete'),
            'playersWithChatNotification': autocomplete.ModelSelect2Multiple(url='user-autocomplete'),
        }

class TGZ_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    
    form = TGZ_GameForm
    
    list_display = (
        'id',
        'game_link',           # we'll rename the method
        'status',
        'max_players',
        'creator_name',
        'tournament',
    )

    # Nice column headers
    @admin.display(description='Game (Click to view)', ordering='gameName')  # "Game" will be the column header
    def game_link(self, obj):
        # Use the actual gameName field (or fallback to ID)
        full_name = obj.getGameName()
        
        # Truncate to 10 chars + ellipsis if needed
        short_name = full_name if len(full_name) <= 20 else full_name[:20] + "…"

        # Build the correct URL
        if settings.DEBUG:
            url = f"http://localhost:8000/TGZ/{obj.id}"
        else:
            url = f"https://www.onlineboardgamers.com/TGZ/{obj.id}"

        # Make the shortened name the clickable text
        return format_html(
            '<a href="{}" target="_blank" title="{}">{} </a>',
            url,
            full_name,           # hover shows the full name
            short_name
        )
        
    @admin.display(description='Game ID')
    def id_display(self, obj):
        return obj.id

    @admin.display(description='Name')
    def game_name(self, obj):
        # assuming you have a field or property called gameName
        # if you have a method getGameName already, just rename it:
        return obj.gameName or obj.getGameName()

    @display(description="Creator")
    def creator_username(self, obj):
        return obj.creator.username if obj.creator else "None"

    @admin.display(description='Status')
    def status(self, obj):
        return obj.get_gameStatus_display() if hasattr(obj.gameStatus, 'choices') else obj.gameStatus

    @admin.display(description='Players')
    def max_players(self, obj):
        return obj.maxPlayers

    @admin.display(description='Creator')
    def creator_name(self, obj):
        return obj.creator.username if obj.creator else "-"

    @admin.display(description='Tournament')
    def tournament(self, obj):
        if obj.relatedMainTournament:
            return obj.relatedMainTournament.tournamentName
        if obj.relatedMiniTournament:
            return f"Mini: {obj.relatedMiniTournament.tournamentName}"
        return "-"
    
    list_filter = ('gameStatus', 'maxPlayers', 'relatedMainTournament', 'relatedMiniTournament')
    search_fields = ('gameName', 'gameDescription', 'creator__username')
    readonly_fields = (
        'created', 'currentTurnString', 
        'player0notes', 'player1notes', 'player2notes', 'player3notes', 'player4notes'
    )
    list_per_page = 20
    list_select_related = ('creator', 'host', 'winner', 'relatedMainTournament', 'relatedMiniTournament')
    list_prefetch_related = (
        'allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification'
    )

    fieldsets = (
        (None, {
            'fields': ('gameName', 'gameDescription', 'gameStatus', 'maxPlayers', 'creator', 'host', 'winner')
        }),
        ('Game Details', {
            'fields': ('startingOptions', 'startingMap', 'turn', 'phase', 'currentTurnString', 'currentPlayers', 'latestUpdate')
        }),
        ('Player Management', {
            'classes': ('collapse',),
            'fields': ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification')
        }),
        ('Other Game Settings', {
            'classes': ('collapse',),
            'fields': ('created', 'gamePace', 'kickoutDuration', 'zoomLevels', 'statsExcludeConsent', 'statsExcludedGame')
        }),
        ('Data Fields', {
            #'classes': ('collapse',),  # Collapse to reduce rendering
            'fields': ('chatData', 'gameData', 'rewindData', 'rewindTempData', 'kickoutFlexiData')
        }),
        ('Player Notes', {
            'classes': ('collapse',),  # Collapse to reduce rendering
            'fields': ('player0notes', 'player1notes', 'player2notes', 'player3notes', 'player4notes')
        }),
        ('Linked Tournament', {
            'classes': ('collapse',),
            'fields': ('relatedMainTournament', 'relatedMiniTournament')
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        qs = qs.select_related('creator', 'host', 'winner', 'relatedMainTournament', 'relatedMiniTournament').prefetch_related(
            'allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification'
        )
        # Defer large TextFields in change view
        if request.resolver_match and request.resolver_match.view_name.endswith('change'):
            qs = qs.defer('chatData', 'gameData', 'rewindData', 'rewindTempData', 'kickoutFlexiData')
        return qs

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name in ['allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification']:
            User = get_user_model()
            # Allow all users to be selectable
            kwargs["queryset"] = User.objects.all()
            # Optional: Add filtering if needed, e.g., only active users
            # kwargs["queryset"] = User.objects.filter(is_active=True)
        result = super().formfield_for_manytomany(db_field, request, **kwargs)
        return result
    

#class FCM_TournamentAdmin(admin.ModelAdmin):
#    save_on_top = True
#    save_as = True
#    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')

admin.site.register(TGZ_Game, TGZ_GameAdmin)
#admin.site.register(HC_Tournament, FCM_TournamentAdmin)

