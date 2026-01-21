from django.contrib import admin

# Register your models here.
from .models import User, Profile, changelog, Mini_Tournaments, Main_Tournament, Game, GamePlayer
from .modelProxies import FCMMiniTournament, TGZMiniTournament


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
        app_label = 'FCM' 

# The TGZ specific link
@admin.register(TGZMiniTournament)
class TGZMiniTournamentAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="TGZ")
    
    class Meta:
        app_label = 'TGZ'

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('id', 'gameCode', 'gameName', 'gameStatus', 'creator', 'host', 'maxPlayers', 'created')
    list_filter = ('gameCode', 'gameStatus')
    search_fields = ('gameName', 'gameDescription', 'gameCode')
    autocomplete_fields = ('creator', 'host')
    filter_horizontal = ('invitedPlayers',)
    readonly_fields = ('created', 'latestUpdate')

@admin.register(GamePlayer)
class GamePlayerAdmin(admin.ModelAdmin):
    list_display = ('id', 'game', 'player', 'seat_order', 'winner', 'is_current', 'is_missing', 'is_kicked')
    list_filter = ('winner', 'is_current', 'is_missing', 'is_kicked')
    search_fields = ('player__username', 'game__gameName')
    autocomplete_fields = ('player',)

admin.site.register(changelog)
