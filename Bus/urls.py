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
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("changeBusViewport/", views.changeBusViewport, name="changeBusViewport"),
    path("castVote/", views.castVote, name="castVoteWEB"),
]
