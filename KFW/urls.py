from django.shortcuts import get_object_or_404, redirect
from django.urls import path

from Lobby.models import Game

from . import views

app_name = "KFW"


def redirect_old_url(request, original_id):
    game = Game.objects.filter(gameCode="KFW", original_id=original_id).first()
    if game is None:
        # If not found by original_id, try by direct id (might already be a new game)
        game = get_object_or_404(Game, id=original_id, gameCode="KFW")
    return redirect("KFW:showKFWgame", game_id=game.id)


urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showKFWgame, name="showKFWgame"),
    path("<int:original_id>/", redirect_old_url, name="redirect_old_url"),
    path("help/", views.KFWhelp, name="KFWhelp"),
    ## API routes
    path("createKFWgame/", views.createKFWgame, name="createKFWgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("processKFWturn/", views.processKFWturn, name="processKFWturn"),
    path("data/<int:dataType>/", views.KFWdata, name="KFWdata"),
    path("saveZoom/", views.saveZoom, name="saveZoom"),
]
