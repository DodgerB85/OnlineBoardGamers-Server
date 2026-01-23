from django.urls import path

from . import views

app_name = "AQY"


urlpatterns = [
    path("", views.index, name="index"),
    # path('AQY/', views.showAQYgame, name='showAQYgame'),
    path("<int:game_id>/", views.showAQYgame, name="showAQYgame"),
    path(
        "<int:game_id>/replay/<int:replayStep>/",
        views.showAQYgame,
        {"spoilerFree": True},
        name="showAQYreplayStep",
    ),
    path("help/", views.AQYhelp, name="AQYhelp"),
    path("AQYstats/", views.AQYstats, name="AQYstats"),
    path("AQYstatGames/", views.AQYstatGames, name="AQYstatGames"),
    ## API routes
    path("createAQYgame/", views.createAQYgame, name="createAQYgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("processAQYturn/", views.processAQYturn, name="processAQYturn"),
    path("data/<int:dataType>/", views.AQYdata, name="AQYdata"),
    path("saveZoom/", views.saveZoom, name="saveZoom"),
    path("castVote/", views.castVote, name="castVoteCNS"),
]
