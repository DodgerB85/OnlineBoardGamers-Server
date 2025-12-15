from django.urls import path

from . import views

app_name = 'WEB'

urlpatterns = [
    path("", views.index, name="index"),
    path('<int:game_id>/', views.showWEBgame, name='showWEBgame'),
    #path('<int:game_id>/replay/<int:replayStep>', views.showINDgame, {'spoilerFree': True}, name='showINDreplayStep'),

    path('help/', views.WEBhelp, name='WEBhelp'),

    ## API routes
    path("createWEBgame/", views.createWEBgame, name="createWEBgame"), 
    
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),

    path("processWEBturn/", views.processWEBturn, name="processWEBturn"),
    path('data/<int:dataType>/', views.WEBdata, name='WEBdata'),

    path("saveZoom/", views.saveZoom, name="saveZoom"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteWEB"),
]
