from django.urls import path

from . import views

from django.conf import settings
from django.conf.urls.static import static

app_name = 'FCM'


urlpatterns = [
    path('', views.index, name='index'),
    path('help/', views.FCMhelp, name='FCMhelp'),
    path('chinaHelp/', views.FCMchinaHelp, name='FCMchinaHelp'),
    
    path('coffeeHelp/', views.coffeeHelp, name='coffeeHelp'),
    path('test/', views.test, name='test'),
    path('gameAdmin/', views.gameAdmin, name='gameAdmin'),
    path('<int:game_id>/', views.showGame, name='showFCMgame'),
    path('FCMstats/', views.FCMstats, name='FCMstats'),
    path('FCMstatGames/', views.FCMstatGames, name='FCMstatGames'),
  
    # API Routes
    path("createFCMgame/", views.createFCMgame, name="createFCMgame"),

    path("processTurn/", views.processTurn, name="processTurn"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    #path("chat/", views.chat, name="chat"),
    path("notes/", views.notes, name="notes"),
    path("<int:game_id>/checkNewData/", views.checkNewData, name="checkNewData"),
    path("changeAssistance/", views.changeAssistance, name="changeAssistance"),
    path("processRewindConsent/", views.processRewindConsent, name="processRewindConsent"),
    path("processStatsExcludeConsent/", views.processStatsExcludeConsent, name="processStatsExcludeConsent"),
    path("gameAdminGetMoveData/", views.gameAdminGetMoveData, name="gameAdminGetMoveData"),
    path('data/<int:dataType>/', views.FCMdata, name='FCMdata'),

    path("sendChatMessage/", views.sendChatMessage, name="sendChatMessage"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteFCM"),
    
 
] 

