from django.urls import path
from django.shortcuts import redirect, get_object_or_404

from . import views

from django.conf import settings
from django.conf.urls.static import static

from Lobby.models import Game

app_name = "FCM"


def redirect_old_url(request, original_id):
    """Redirect old FCM_Game URLs to new Game Game URLs"""
    try:
        game = Game.objects.get(gameCode='FCM', original_id=original_id)
        return redirect('FCM:showFCMgame', game_id=game.id)
    except Game.DoesNotExist:
        # If not found by original_id, try by direct id (might already be a new game)
        game = get_object_or_404(Game, id=original_id, gameCode='FCM')
        return redirect('FCM:showFCMgame', game_id=game.id)


urlpatterns = [
    path("", views.index, name="index"),
    path("help/", views.FCMhelp, name="FCMhelp"),
    path("chinaHelp/", views.FCMchinaHelp, name="FCMchinaHelp"),
    path("coffeeHelp/", views.coffeeHelp, name="coffeeHelp"),
    path("test/", views.test, name="test"),
    path("gameAdmin/", views.gameAdmin, name="gameAdmin"),
    path("<int:game_id>/show/", views.showGame, name="showFCMgame"),
    path("<int:original_id>/", redirect_old_url, name="redirect_old_url"),
    path("FCMstats/", views.FCMstats, name="FCMstats"),
    path("FCMstatGames/", views.FCMstatGames, name="FCMstatGames"),
    # API Routes
    path("createFCMgame/", views.createFCMgame, name="createFCMgame"),
    path("processTurn/", views.processTurn, name="processTurn"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("notes/", views.notes, name="notes"),
    path("<int:game_id>/checkNewData/", views.checkNewData, name="checkNewData"),
    path("changeAssistance/", views.changeAssistance, name="changeAssistance"),
    path(
        "gameAdminGetMoveData/", views.gameAdminGetMoveData, name="gameAdminGetMoveData"
    ),
    path("data/<int:dataType>/", views.FCMdata, name="FCMdata"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("castVote/", views.castVote, name="castVoteCNS"),
]
