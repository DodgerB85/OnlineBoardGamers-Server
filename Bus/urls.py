from django.urls import path

# now import the views.py file into this code
from . import views

app_name = "Bus"


urlpatterns = [
    path("", views.index),
    path("<int:game_id>/show/", views.showBusGame, name="showBusGame"),
    path("<int:original_id>/", views.redirect_old_url, name="showBusGameOld"),
    path("help/", views.BusHelp, name="BusHelp"),
    path("data/<int:dataType>/", views.busData, name="busData"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    # API routes
    path("createBusGame/", views.createBusGame, name="createBusGame"),
    path("processBusTurn/", views.processBusTurn, name="processBusTurn"),
    path("<int:game_id>/processBusTurn/", views.processBusTurn, name="processBusTurnWithId"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("<int:game_id>/sendChatMessage/", views.sendChatMessage, name="sendChatMessageWithId"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("<int:game_id>/saveNotes/", views.saveNotes, name="saveNotesWithId"),
    path("changeBusViewport/", views.changeBusViewport, name="changeBusViewport"),
    path("<int:game_id>/changeBusViewport/", views.changeBusViewport, name="changeBusViewportWithId"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteBus"),
    path("<int:game_id>/voteToDelete/", views.voteToDelete, name="addDeleteVoteBusWithId"),
]
