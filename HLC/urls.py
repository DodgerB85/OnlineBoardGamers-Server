from django.urls import path
from django.shortcuts import redirect, get_object_or_404

# now import the views.py file into this code
from . import views

app_name = "HLC"


def redirect_old_url(request, original_id):
    from Lobby.models import Game

    try:
        game = Game.objects.get(gameCode="HLC", original_id=original_id)
        return redirect("HLC:showHLCgame", game_id=game.id)
    except Game.DoesNotExist:
        game = get_object_or_404(Game, id=original_id, gameCode="HLC")
        return redirect("HLC:showHLCgame", game_id=game.id)


urlpatterns = [
    path("", views.index),
    path("help/", views.HLChelp, name="HLChelp"),
    path("<int:game_id>/show/", views.showHLCgame, name="showHLCgame"),
    path("<int:original_id>/", redirect_old_url, name="redirect_old_url"),
    path("HLCgameSummary/<int:game_id>/", views.HLCgameSummary, name="HLCgameSummary"),
    # API Routes
    path("createHLCgame/", views.createHLCgame, name="createHLCgame"),
    path("processHLCturn/", views.processHLCturn, name="processHLCturn"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("chat/", views.chat, name="chat"),
    path("notes/", views.notes, name="notes"),
    path("castVote/", views.castVote, name="castVoteCNS"),
    path("data/<int:dataType>/", views.HLCdata, name="HLCdata"),
]
