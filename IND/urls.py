from django.urls import path
from django.shortcuts import get_object_or_404, redirect

from . import views

app_name = 'IND'


def redirect_old_url(request, original_id):
    """Redirect old IND game URLs to new unified format"""
    from Lobby.models import Game
    game = get_object_or_404(Game, gameCode='IND', original_id=original_id)
    return redirect('IND:showINDgame', game_id=game.id)


urlpatterns = [
    path("", views.index, name="index"),
    path('IND/', views.showINDgameOLD, name='showINDgameOLD'),

    # New unified URL format (game_id is the unified Game.id)
    path('<int:game_id>/show/', views.showINDgame, name='showINDgame'),
    path('<int:game_id>/show/replay/<int:replayStep>/', views.showINDgame, {'spoilerFree': True}, name='showINDreplayStep'),

    # Old URL format redirect (original_id is the old IND model _Game.id)
    path('<int:original_id>/', redirect_old_url, name='redirect_old_url'),

    path('help/', views.INDhelp, name='INDhelp'),

    ## API routes
    path("createINDgame/", views.createINDgame, name="createINDgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),

    path("processINDturn/", views.processINDturn, name="processINDturn"),
    path("forkINDgame/", views.forkINDgame, name="forkINDgame"),
    path('data/<int:dataType>/', views.INDdata, name='INDdata'),
    path("saveZoom/", views.saveZoom, name="saveZoom"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteIND"),

]