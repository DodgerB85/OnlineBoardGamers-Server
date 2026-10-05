from django.urls import path

from . import views

app_name = "URR"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showURRgame, name="showURRgame"),
    path("help/", views.URRhelp, name="URRhelp"),
    ## API routes
    path("createURRgame/", views.createURRgame, name="createURRgame"),
    path("bugEntry/", views.bugEntryURR, name="bugEntryURR"),
    path("sendChatMessageURR/", views.sendChatMessageURR, name="sendChatMessageURR"),
    path("saveNotesURR/", views.saveNotesURR, name="saveNotesURR"),
    path("processURRturn/", views.processURRturn, name="processURRturn"),
    path("data/<int:dataType>/", views.URRdata, name="URRdata"),
    path("saveZoomURR/", views.saveZoomURR, name="saveZoomURR"),
    path("castVote/", views.castVote, name="castVoteURR"),
]
