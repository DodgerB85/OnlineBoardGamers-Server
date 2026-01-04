from django.urls import path

from . import views

app_name = "CNS"


urlpatterns = [
    path("", views.index),
    path("CNS/", views.showCNSgame, name="showCNSgame"),
    path("<int:game_id>/", views.showCNSgame, name="showCNSgame"),
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
    path(
        "processStatsExcludeConsent/",
        views.processStatsExcludeConsent,
        name="processStatsExcludeConsent",
    ),
]
