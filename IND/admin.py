from django.contrib import admin

from .models import IND_Game, IND_Tournament



class IND_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers')

    #def formfield_for_manytomany(self, db_field, request, **kwargs):
    #    if db_field.name == "allPlayers":
    #        kwargs["queryset"] = FCM_Game.objects.filter(creator=request.user)
    #    return super(FCM_GameAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

class IND_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')

admin.site.register(IND_Game, IND_GameAdmin)
admin.site.register(IND_Tournament, IND_TournamentAdmin)
