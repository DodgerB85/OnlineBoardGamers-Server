from django.urls import path

from . import views

app_name = "PAP"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showPAPgame, name="showPAPgame"),
    path("help/", views.PAPhelp, name="PAPhelp"),
    ## API routes
    path("createPAPgame/", views.createPAPgame, name="createPAPgame"),
    path("bugEntry/", views.bugEntryPAP, name="bugEntryPAP"),
    path("sendChatMessagePAP/", views.sendChatMessagePAP, name="sendChatMessagePAP"),
    path("saveNotesPAP/", views.saveNotesPAP, name="saveNotesPAP"),
    path("processPAPturn/", views.processPAPturn, name="processPAPturn"),
    path("data/<int:dataType>/", views.PAPdata, name="PAPdata"),
    path("saveZoomPAP/", views.saveZoomPAP, name="saveZoomPAP"),
    path("castVote/", views.castVote, name="castVotePAP"),
]
