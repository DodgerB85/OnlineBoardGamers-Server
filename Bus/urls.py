from django.urls import path

# now import the views.py file into this code
from . import views

app_name = "BUS"


urlpatterns = [
    path("", views.index),
    path("<int:game_id>/show/", views.showBUSgame, name="showBUSgame"),
    path("<int:original_id>/", views.redirect_old_url, name="showBUSgameOld"),
    path("help/", views.BUShelp, name="BUShelp"),
    path("data/<int:dataType>/", views.busData, name="busData"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    # API routes
    path("createBUSgame/", views.createBUSgame, name="createBUSgame"),
    path("processBUSturn/", views.processBUSturn, name="processBUSturn"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("changeBUSviewport/", views.changeBUSviewport, name="changeBUSviewport"),
    path("castVote/", views.castVote, name="castVoteWEB"),
]
