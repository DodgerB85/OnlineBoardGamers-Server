from django.urls import path

from . import views

app_name = 'IND'

urlpatterns = [
    path("", views.index, name="index"),
    path('IND/', views.showINDgameOLD, name='showINDgame'),
    
    path('<int:game_id>/', views.showINDgame, name='showINDgame'),
    path('<int:game_id>/replay/<int:replayStep>/', views.showINDgame, {'spoilerFree': True}, name='showINDreplayStep'),

    path('help/', views.INDhelp, name='INDhelp'),

    ## API routes
    path("createINDgame/", views.createINDgame, name="createINDgame"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),

    path("processINDturn/", views.processINDturn, name="processINDturn"),
    path("forkINDgame/", views.forkINDgame, name="forkINDgame"),
    path('data/<int:dataType>/', views.INDdata, name='INDdata'),
    path("saveZoom/", views.saveZoom, name="saveZoom"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteIND"),

]