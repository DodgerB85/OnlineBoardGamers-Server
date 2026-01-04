from django.contrib import admin

# Register your models here.
from .models import User, Profile, changelog, Mini_Tournaments, Main_Tournament


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


admin.site.register(changelog)
