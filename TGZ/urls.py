from django.urls import path
# now import the views.py file into this code
from . import views

app_name = 'TGZ'


urlpatterns = [
    path('', views.index),
    # New path format /TGZ/:id/show
    path('<int:game_id>/show/', views.showTGZgame, name='showTGZgame'),
    path(
        '<int:game_id>/spoilerFree/',
        views.showTGZgame,
        {'spoilerFree': True},
        name='showTGZgameSpoilerFree',
    ),
    path(
        '<int:game_id>/replay/<int:replayStep>/',
        views.showTGZgame,
        {'spoilerFree': True},
        name='showTGZreplayStep',
    ),
    # Legacy redirect from /TGZ/:original_id to /TGZ/:id/show
    path('<int:original_id>/', views.redirectLegacyTGZ, name='redirectLegacyTGZ'),

    path('help/', views.TGZhelp, name='TGZhelp'),

    path('TGZstats/', views.TGZstats, name='TGZstats'),
    path('TGZstatGames/', views.TGZstatGames, name='TGZstatGames'),

    # API routes
    path("processTGZturn/", views.processTGZturn, name="processTGZturn"),
    path('data/<int:dataType>/', views.TGZdata, name='TGZdata'),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),
    path("changeTGZzoom/", views.changeTGZzoom, name="changeTGZzoom"),
    path("createTGZspinoff/", views.createTGZspinoff, name="createTGZspinoff"),

    path("createTGZgame/", views.createTGZgame, name="createTGZgame"),
    path("castVote/", views.castVote, name="castVoteCNS"),


]
