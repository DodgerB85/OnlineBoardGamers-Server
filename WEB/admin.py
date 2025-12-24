from django.contrib import admin

from .models import WEB_Game#, IND_Tournament

#class WEB_GameAdmin(admin.ModelAdmin):
#    save_on_top = True
#    save_as = True
#    filter_horizontal = ('allPlayers', 'missingPlayers', 'kickedPlayers', 'invitedPlayers')
    
@admin.register(WEB_Game)
class WEB_GameAdmin(admin.ModelAdmin):
    list_display = ('gameName', 'gameStatus', 'creator', 'latestUpdate')
    list_filter = ('gameStatus',)
    search_fields = ('gameName', 'creator__username')
    
    # Use autocomplete instead of loading thousands of users into filter_horizontal 
    autocomplete_fields = [
        'allPlayers', 'missingPlayers', 'kickedPlayers', 
        'invitedPlayers', 'winner', 'creator', 'host',
        'playersWithChatNotification'
    ]
    
    # Prevent loading massive text blobs in the list view
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('creator', 'host').defer('gameData', 'rewindData', 'chatData')

    

    #def formfield_for_manytomany(self, db_field, request, **kwargs):
    #    if db_field.name == "allPlayers":
    #        kwargs["queryset"] = FCM_Game.objects.filter(creator=request.user)
    #    return super(FCM_GameAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

#class IND_TournamentAdmin(admin.ModelAdmin):
#    save_on_top = True
#    save_as = True
#    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')

#admin.site.register(WEB_Game, WEB_GameAdmin)
#admin.site.register(IND_Tournament, IND_TournamentAdmin)
