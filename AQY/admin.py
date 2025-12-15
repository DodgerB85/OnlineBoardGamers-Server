from django.contrib import admin

from .models import AQY_Game, AQY_Tournament



class AQY_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers')

    #def formfield_for_manytomany(self, db_field, request, **kwargs):
    #    if db_field.name == "allPlayers":
    #        kwargs["queryset"] = FCM_Game.objects.filter(creator=request.user)
    #    return super(FCM_GameAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

class AQY_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')

admin.site.register(AQY_Game, AQY_GameAdmin)
admin.site.register(AQY_Tournament, AQY_TournamentAdmin)

