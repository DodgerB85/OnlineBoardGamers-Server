from django.contrib import admin

from .models import KFW_Game

class KFW_GameAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers')


admin.site.register(KFW_Game, KFW_GameAdmin)
