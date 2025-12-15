from django.urls import path

from . import views

app_name = 'KFW'

urlpatterns = [
    path("", views.index, name="index"),
    path('<int:game_id>/', views.showKFWgame, name='showKFWgame'),
    #path('<int:game_id>/replay/<int:replayStep>', views.showINDgame, {'spoilerFree': True}, name='showINDreplayStep'),

    path('help/', views.KFWhelp, name='KFWhelp'),

    ## API routes
    path("createKFWgame/", views.createKFWgame, name="createKFWgame"), 
    
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("saveNotes/", views.saveNotes, name="saveNotes"),

    path("processKFWturn/", views.processKFWturn, name="processKFWturn"),
    #path('data/<int:dataType>/', views.KFWdata, name='KFWdata'),
    path('data/<int:data_type>/', views.KFWdata, name='KFWdata'),

    path("saveZoom/", views.saveZoom, name="saveZoom"),
]
