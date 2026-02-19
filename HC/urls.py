from django.urls import path
from django.shortcuts import redirect, get_object_or_404
# now import the views.py file into this code
from . import views

app_name = 'HC'

def redirect_old_url(request, original_id):
    from Lobby.models import Game
    try:
        game = Game.objects.get(gameCode='HC', original_id=original_id)
        return redirect('HC:showHCgame', game_id=game.id)
    except Game.DoesNotExist:
        game = get_object_or_404(Game, id=original_id, gameCode='HC')
        return redirect('HC:showHCgame', game_id=game.id)

urlpatterns = [
    path('', views.index),
    path('help/', views.HChelp, name='HChelp'),

    path('<int:game_id>/show/', views.showHCgame, name='showHCgame'),
    path('<int:original_id>/', redirect_old_url, name='redirect_old_url'),
    path('HCgameSummary/<int:game_id>/', views.HCgameSummary, name='HCgameSummary'),


    # API Routes
    path("createHCgame/", views.createHCgame, name="createHCgame"),
    path("processHCturn/", views.processHCturn, name="processHCturn"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("chat/", views.chat, name="chat"),
    path("notes/", views.notes, name="notes"),
    path("castVote/", views.castVote, name="castVoteCNS"),

]
