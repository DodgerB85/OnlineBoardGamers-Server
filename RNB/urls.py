from django.urls import path

from Lobby.models import Game

from . import views

app_name = "RNB"

urlpatterns = [
    path("", views.index, name="index"),
    #path("RNB/", views.showRNBgame, name="showRNBgame"),
    path("<int:game_id>/show/", views.showRNBgame, name="showRNBgame"),
    path("help/", views.RNBhelp, name="RNBhelp"),
    ## API routes
    path("createRNBgame/", views.createRNBgame, name="createRNBgame"),
    path("bugEntry/", views.bugEntry, name="bugEntryRNB"),
    #path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    #path("saveNotes/", views.saveNotes, name="saveNotes"),
    #path("processRNBturn/", views.processRNBturn, name="processRNBturn"),
    #path("data/<int:dataType>/", views.RNBdata, name="RNBdata"),
    #path("saveZoom/", views.saveZoom, name="saveZoom"),
    #path("castVote/", views.castVote, name="castVoteCNS"),
]
