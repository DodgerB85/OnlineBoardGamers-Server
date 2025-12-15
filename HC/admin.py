from django.contrib import admin

from .models import HC_Game, HC_Tournament



class HC_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers', 'playersWithChatNotification')

    #def formfield_for_manytomany(self, db_field, request, **kwargs):
    #    if db_field.name == "allPlayers":
    #        kwargs["queryset"] = FCM_Game.objects.filter(creator=request.user)
    #    return super(FCM_GameAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

class FCM_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')

admin.site.register(HC_Game, HC_GameAdmin)
admin.site.register(HC_Tournament, FCM_TournamentAdmin)

