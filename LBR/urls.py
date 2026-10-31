from django.urls import path

from . import views

app_name = "LBR"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showLBRgame, name="showLBRgame"),
    path("help/", views.LBRhelp, name="LBRhelp"),
    path("createLBRgame/", views.createLBRgame, name="createLBRgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotesLBR/", views.saveNotesLBR, name="saveNotesLBR"),
    path("processLBRturn/", views.processLBRturn, name="processLBRturn"),
    path("data/<int:dataType>/", views.LBRdata, name="LBRdata"),
    path("saveZoomLBR/", views.saveZoomLBR, name="saveZoomLBR"),
    path("castVote/", views.castVote, name="castVoteLBR"),
]
