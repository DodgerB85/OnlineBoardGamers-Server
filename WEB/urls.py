from django.urls import path
from django.shortcuts import get_object_or_404, redirect

from . import views
from Lobby.models import Game

app_name = 'WEB'

def redirect_old_url(request, original_id):
    """Redirect from old /WEB/123/ URL to new /WEB/456/show/ URL"""
    game = get_object_or_404(Game, gameCode='WEB', original_id=original_id)
    return redirect('WEB:showWEBgame', game_id=game.id)

urlpatterns = [
    path("", views.index, name="index"),
    path('<int:game_id>/show/', views.showWEBgame, name='showWEBgame'),
    path('<int:original_id>/', redirect_old_url, name='redirect_old_url'),
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
