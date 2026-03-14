from django.urls import path

from . import views

app_name = "CNS"


urlpatterns = [
    path("", views.index),
    # New path format /CNS/:id/show
    path("<int:game_id>/show/", views.showCNSgame, name="showCNSgame"),
    path(
        "<int:game_id>/spoilerFree/",
        views.showCNSgame,
        {"spoilerFree": True},
        name="showCNSgameSpoilerFree",
    ),
    path(
        "<int:game_id>/replay/<int:replayStep>/",
        views.showCNSgame,
        {"spoilerFree": True},
        name="showCNSreplayStep",
    ),
    # Legacy redirect from /CNS/:original_id to /CNS/:id/show
    path("<int:original_id>/", views.redirectLegacyCNS, name="redirectLegacyCNS"),
    #
    path("help/", views.CNShelp, name="CNShelp"),
    #
    ## API routes
    path("createCNSgame/", views.createCNSgame, name="createCNSgame"),
    path("processCNSturn/", views.processCNSturn, name="processCNSturn"),
    path("data/<int:dataType>/", views.CNSdata, name="CNSdata"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("changeCNSzoom/", views.changeCNSzoom, name="changeCNSzoom"),
    path("castVote/", views.castVote, name="castVoteCNS"),
]
