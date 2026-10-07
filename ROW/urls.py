from django.urls import path

from . import views

app_name = "ROW"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showROWgame, name="showROWgame"),
    path("help/", views.ROWhelp, name="ROWhelp"),
    ## API routes
    path("createROWgame/", views.createROWgame, name="createROWgame"),
    path("bugEntry/", views.bugEntryROW, name="bugEntryROW"),
    path("sendChatMessageROW/", views.sendChatMessageROW, name="sendChatMessageROW"),
    path("saveNotesROW/", views.saveNotesROW, name="saveNotesROW"),
    path("processROWturn/", views.processROWturn, name="processROWturn"),
    path("data/<int:dataType>/", views.ROWdata, name="ROWdata"),
    path("saveZoomROW/", views.saveZoomROW, name="saveZoomROW"),
    path("castVote/", views.castVote, name="castVoteROW"),
]
