from django.urls import path
from django.shortcuts import get_object_or_404, redirect

from . import views
from Lobby.models import Game

app_name = "AQY"


def redirect_old_url(request, original_id):
    """Redirect from old /AQY/123/ URL to new /AQY/456/show/ URL"""
    game = get_object_or_404(Game, gameCode="AQY", original_id=original_id)
    return redirect("AQY:showAQYgame", game_id=game.id)


urlpatterns = [
    path("", views.index, name="index"),
    # New path format /AQY/:id/show
    path("<int:game_id>/show/", views.showAQYgame, name="showAQYgame"),
    # Legacy redirect from /AQY/:original_id to /AQY/:id/show
    path("<int:original_id>/", redirect_old_url, name="redirect_old_url"),
    path(
        "<int:game_id>/replay/<int:replayStep>/",
        views.showAQYgame,
        {"spoilerFree": True},
        name="showAQYreplayStep",
    ),
    path("help/", views.AQYhelp, name="AQYhelp"),
    path("AQYstats/", views.AQYstats, name="AQYstats"),
    path("AQYstatGames/", views.AQYstatGames, name="AQYstatGames"),
    ## API routes
    path("createAQYgame/", views.createAQYgame, name="createAQYgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("processAQYturn/", views.processAQYturn, name="processAQYturn"),
    path("data/<int:dataType>/", views.AQYdata, name="AQYdata"),
    path("saveZoom/", views.saveZoom, name="saveZoom"),
    path("castVote/", views.castVote, name="castVoteCNS"),
]
