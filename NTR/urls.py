from django.urls import path

from . import views

app_name = "NTR"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showNTRgame, name="showNTRgame"),
    path("help/", views.NTRhelp, name="NTRhelp"),
    # API routes
    path("createNTRgame/", views.createNTRgame, name="createNTRgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotesNTR/", views.saveNotesNTR, name="saveNotesNTR"),
    path("processNTRturn/", views.processNTRturn, name="processNTRturn"),
    path("data/<int:dataType>/", views.NTRdata, name="NTRdata"),
    path("saveZoomNTR/", views.saveZoomNTR, name="saveZoomNTR"),
    path("castVote/", views.castVote, name="castVoteNTR"),
]