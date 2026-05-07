from django.urls import path

from . import views

app_name = "RNB"

urlpatterns = [
    path("", views.index, name="index"),
    # path("RNB/", views.showRNBgame, name="showRNBgame"),
    path("<int:game_id>/show/", views.showRNBgame, name="showRNBgame"),
    path("<int:game_id>/maponly/", views.showRNBmap, name="showRNBmap"),
    path("RNBmapEditor/", views.RNBmapEditor, name="RNBmapEditor"),
    path("help/", views.RNBhelp, name="RNBhelp"),
    ## API routes
    path("createRNBgame/", views.createRNBgame, name="createRNBgame"),
    path("bugEntry/", views.bugEntryRNB, name="bugEntryRNB"),
    path("sendChatMessageRNB/", views.sendChatMessageRNB, name="sendChatMessagRNB"),
    path("saveNotesRNB/", views.saveNotesRNB, name="saveNotesRNB"),
    path("processRNBturn/", views.processRNBturn, name="processRNBturn"),
    path("data/<int:dataType>/", views.RNBdata, name="RNBdata"),
    path("saveZoomRNB/", views.saveZoomRNB, name="saveZoomRNB"),
    path("saveRNBmap/", views.saveRNBmap, name="saveRNBmap"),
    path("getRNBmaps/", views.getRNBmaps, name="getRNBmaps"),
    path("highscores/<str:map_unique_id>/", views.RNBhighScores, name="RNBhighScoresWithMap"),
    path("highscores/", views.RNBhighScores, name="RNBhighScores"),
    path("getSoloMaps/", views.getSoloMaps, name="getSoloMaps"),
    path("getMapHighscores/", views.getMapHighscores, name="getMapHighscores"),
    # path("castVote/", views.castVote, name="castVoteRNB"),
]
