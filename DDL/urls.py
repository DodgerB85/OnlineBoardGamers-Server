from django.urls import path

from . import views

app_name = "DDL"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showDDLgame, name="showDDLgame"),
    path("<int:game_id>/replay/<int:replayStep>/", views.showDDLgame, {"spoilerFree": True}, name="showDDLreplayStep"),
    path("help/", views.DDLhelp, name="DDLhelp"),
    ## API routes
    path("createDDLgame/", views.createDDLgame, name="createDDLgame"),
    path("bugEntry/", views.bugEntryDDL, name="bugEntryDDL"),
    path("sendChatMessageDDL/", views.sendChatMessageDDL, name="sendChatMessageDDL"),
    path("saveNotesDDL/", views.saveNotesDDL, name="saveNotesDDL"),
    path("processDDLturn/", views.processDDLturn, name="processDDLturn"),
    path("data/<int:dataType>/", views.DDLdata, name="DDLdata"),
    path("saveZoomDDL/", views.saveZoomDDL, name="saveZoomDDL"),
    path("castVote/", views.castVote, name="castVoteDDL"),
]
