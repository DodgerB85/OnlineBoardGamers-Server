from django.contrib import admin

# Register your models here.
from .models import User, Profile, changelog, Mini_Tournaments, Main_Tournament


#class WebUser(User):

#    class Meta:
#        proxy = True
#        verbose_name = "User"
#        verbose_name_plural = "Users"


class UserAdmin(admin.ModelAdmin):
    search_fields = ('email', 'username')

class ProfileAdmin(admin.ModelAdmin):
    search_fields = ['user__username', 'email_confirmed']
    #pass
    
class Main_TournamentAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')
    
class Mini_TournamentsAdmin(admin.ModelAdmin):
    save_on_top = True
    save_as = True
    filter_horizontal = ('startingPlayers', 'nextRoundPlayers')
    autocomplete_fields = ('creator',) 

admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(changelog)
admin.site.register(Main_Tournament, Main_TournamentAdmin)
admin.site.register(Mini_Tournaments, Mini_TournamentsAdmin)



#admin.site.register(WebUser, UserAdmin)