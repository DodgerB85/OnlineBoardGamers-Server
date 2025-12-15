from django.urls import path
# now import the views.py file into this code
from . import views

app_name = 'HC'

urlpatterns = [
    path('', views.index),
    path('help/', views.HChelp, name='HChelp'),

    path('<int:game_id>/', views.showHCgame, name='showHCgame'),
    path('HCgameSummary/<int:game_id>/', views.HCgameSummary, name='HCgameSummary'),


    # API Routes
    path("createHCgame/", views.createHCgame, name="createHCgame"),
    path("processHCturn/", views.processHCturn, name="processHCturn"),
    path("bugEntry/", views.bugEntry, name="bugEntry"),
    path("chat/", views.chat, name="chat"),
    path("notes/", views.notes, name="notes"),
    path("processHCrewindConsent/", views.processHCrewindConsent, name="processHCrewindConsent"),
    path("processHCstatsExcludeConsent/", views.processHCstatsExcludeConsent, name="processHCstatsExcludeConsent"),
    path("voteToDelete/", views.voteToDelete, name="addDeleteVoteHC"),

]
