from django.urls import path

from Lobby.models import Game

from . import views

app_name = "RNB"

urlpatterns = [
    path("", views.index, name="index"),
    # path("RNB/", views.showRNBgame, name="showRNBgame"),
    path("<int:game_id>/show/", views.showRNBgame, name="showRNBgame"),
    path("<int:game_id>/maponly/", views.showRNBmap, name="showRNBmap"),
    path("help/", views.RNBhelp, name="RNBhelp"),
    ## API routes
    path("createRNBgame/", views.createRNBgame, name="createRNBgame"),
    path("bugEntry/", views.bugEntryRNB, name="bugEntryRNB"),
    path("sendChatMessageRNB/", views.sendChatMessageRNB, name="sendChatMessagRNB"),
    path("saveNotesRNB/", views.saveNotesRNB, name="saveNotesRNB"),
    path("processRNBturn/", views.processRNBturn, name="processRNBturn"),
    path("data/<int:dataType>/", views.RNBdata, name="RNBdata"),
    path("saveZoomRNB/", views.saveZoomRNB, name="saveZoomRNB"),
    # path("castVote/", views.castVote, name="castVoteRNB"),
]
