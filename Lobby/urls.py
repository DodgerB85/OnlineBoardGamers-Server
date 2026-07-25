"""mysite URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from decouple import config
from django.urls import path
from django.views.generic import RedirectView

from . import views
from .views import ActivateAccount, registerView

# app_name = 'Lobby' # Requires Lobby:index etc after everything

app_name = ""

urlpatterns = [
    path("", views.index, name="index"),
    path("index/<str:listType>/", views.indexListType, name="indexListType"),
    path(
        "indexSpecialRedirect/", views.indexSpecialRedirect, name="indexSpecialRedirect"
    ),
    path("login/", views.login_view, name="myLogin"),
    path("logout/", views.logout_view, name="myLogout"),
    path("profile/", views.profile, name="profile"),
    path("profileAQY/", views.profileAQY, name="profileAQY"),
    path("profileIND/", views.profileIND, name="profileIND"),
    path("profileRNB/", views.profileRNB, name="profileRNB"),
    path("register/", registerView.as_view(), name="register"),
    path("help/", views.lobbyHelp, name="lobbyHelp"),
    path("helpTournaments/", views.helpTournaments, name="helpTournaments"),
    path("helpTournamentsMini/", views.helpTournamentsMini, name="helpTournamentsMini"),
    path("newGames/", views.newGamesPage, name="newGamesPage"),
    path("newMiniTournaments/", views.newMiniTournaments, name="newMiniTournaments"),
    path("fcmNewCode/", views.fcmNewCode, name="fcmNewCode"),
    path("createFCMpage/", views.createFCMpage, name="createFCMpage"),
    path("createFCMpage/<int:gameID>/", views.createFCMpage, name="createFCMpage"),
    path(
        "createFCMminiTournament/",
        views.createFCMminiTournament,
        name="createFCMminiTournament",
    ),
    path("createHLCpage/", views.createHLCpage, name="createHLCpage"),
    path("createHLCpage/<int:gameID>/", views.createHLCpage, name="createHLCpage"),
    path("createBUSpage/", views.createBUSpage, name="createBUSpage"),
    path("createBUSpage/<int:gameID>/", views.createBUSpage, name="createBUS[age"),
    path("createTGZpage/", views.createTGZpage, name="createTGZpage"),
    path(
        "createTGZminiTournament/",
        views.createTGZminiTournament,
        name="createTGZminiTournament",
    ),
    path("createTGZpage/<int:gameID>/", views.createTGZpage, name="createTGZpage"),
    path("showTGZoptions/<int:gameID>/", views.showTGZoptions, name="showTGZoptions"),
    path("createCNSpage/", views.createCNSpage, name="createCNSpage"),
    path("createCNSpage/<int:gameID>/", views.createCNSpage, name="createCNSpage"),
    path("createAQYpage/", views.createAQYpage, name="createAQYpage"),
    path("createAQYpage/<int:gameID>/", views.createAQYpage, name="createAQYpage"),
    path("createINDpage/", views.createINDpage, name="createINDpage"),
    path("createINDpage2/", views.createINDpage2, name="createINDpage2"),
    path("createINDpage/<int:gameID>/", views.createINDpage, name="createINDpage"),
    path("createKFWpage/", views.createKFWpage, name="createKFWpage"),
    path("createKFWpage/<int:gameID>/", views.createKFWpage, name="createKFWpage"),
    path("createWEBpage/", views.createWEBpage, name="createWEBpage"),
    path("createWEBpage/<int:gameID>/", views.createWEBpage, name="createWEBpage"),
    path("createRNBpage/", views.createRNBpage, name="createRNBpage"),
    path("createRNBpage/<int:gameID>/", views.createRNBpage, name="createRNBpage"),
    path("FCMmapEditor/", views.FCMmapEditor, name="FCMmapEditor"),
    path("TGZmapEditor/", views.TGZmapEditor, name="TGZmapEditor"),
    path("AQYmapEditor/", views.AQYmapEditor, name="AQYmapEditor"),
    path("donate/", views.donate, name="donate"),
    path("donate/success/", views.donate_success, name="donate_success"),
    path("donate/cancel/", views.donate_cancel, name="donate_cancel"),
    path("about/", views.about, name="about"),
    path("changelog/", views.changelog_view, name="changelog"),
    path("contact/", views.contact, name="contact"),
    path("stats/", views.stats, name="stats"),
    path("AllTournaments/", views.AllTournaments, name="AllTournaments"),
    path("TGZtournaments/", views.TGZtournaments, name="TGZtournaments"),
    path(
        "TGZtournaments/<str:tournamentName>/",
        views.TGZtournamentMain,
        name="TGZtournamentMain",
    ),
    path(
        "TGZtournaments/fixed/spring24/",
        views.TGZtournamentFixedSpring24,
        name="TGZtournamentFixedSpring24",
    ),
    path(
        "TGZtournaments/fixed/autumn24/",
        views.TGZtournamentFixedAutumn24,
        name="TGZtournamentFixedAutumn24",
    ),
    path(
        "TGZtournaments/fixed/summer25/",
        views.TGZtournamentFixedSummer25,
        name="TGZtournamentFixedSummer25",
    ),
    path("MiniTournaments/", views.MiniTournaments, name="MiniTournaments"),
    path(
        "MiniTournament/<int:Mini_Tournament_id>/",
        views.MiniTournament,
        name="MiniTournament",
    ),
    path("MainTournaments/", views.MainTournaments, name="MainTournaments"),
    path(
        "MainTournament/<int:Main_Tournament_id>/",
        views.MainTournament,
        name="MainTournament",
    ),
    path("testLobby/", views.testLobby, name="testLobby"),
    path("profile/<str:usernameToProfile>/", views.playerInfo, name="playerInfo"),
    path("activate/<uidb64>/<token>/", ActivateAccount.as_view(), name="activate"),
    path("schism/", views.schism, name="schism"),
    path("phpgames/", views.phpgames, name="phpgames"),
    # ADMIN ONLY PATHS
    path("DBO/", views.DBO, name="DBO"),
    path("DBO_deleteGame/<str:gameType>/", views.DBO_deleteGame, name="DBO_deleteGame"),
    path("userStats/", views.userStats, name="userStats"),
    path("sendAdminMessage/", views.sendAdminMessage, name="sendAdminMessage"),
    # API Routes
    path('discord/callback/', views.discord_callback, name='discord_callback'),
    path('stop_discord_dms/', views.stop_discord_dms, name='stop_discord_dms'),
    path(
        "join_discord/",
        RedirectView.as_view(url="https://discord.gg/hCU7Fr77yV", permanent=False),
        name="discordInviteLink",
    ),
    path(f"{config('TELEGRAM_WEBHOOK_PATH')}", views.telegram_bot_response),
    path("addTGid/<int:TGid>", views.addTGid, name="addTGid"),
    path("nextGame", views.next_game_redirect, name="next_game"),
    path("join/<str:joinGameLink>/", views.joinGameLink, name="joinGameLink"),
    path(
        "autoCompleteUsername/", views.autoCompleteUsername, name="autoCompleteUsername"
    ),
    path("joinGame/<str:gameType>/", views.joinGame, name="joinGame"),
    path("deleteGame/<str:gameCode>/", views.deleteGame, name="deleteGame"),
    path(
        "addPlayerToMTinvites/", views.addPlayerToMTinvites, name="addPlayerToMTinvites"
    ),
    path("password_reset/", views.password_reset_request, name="password_reset"),
    path("testWebhook/", views.testWebhook, name="testWebhook"),
    path("blacklistPlayer/", views.blacklistPlayer, name="blacklistPlayer"),
    path("set_language_custom/", views.set_language_custom, name="set_language_custom"),
    path("addWebhook/", views.addWebhook, name="addWebhook"),
    path("deleteWebhook/", views.deleteWebhook, name="deleteWebhook"),
    path("BGH_API/<str:options>/", views.BGH_API),
    path("dataCheck/", views.dataCheck),
    path("setStopEmails/", views.setStopEmails),
    path("sendMTchatMessage/", views.sendMTchatMessage, name="sendMTchatMessage"),
    path("reloadMTchatData/", views.reloadMTchatData, name="reloadMTchatData"),
    path(
        "sendMainTchatMessage/", views.sendMainTchatMessage, name="sendMainTchatMessage"
    ),
    path("reloadMainTchatData/", views.reloadMainTchatData, name="reloadMainTchatData"),
    path("newDesign/<int:design_num>/", views.newDesign, name="newDesign"),
    path('test-500-error/', views.trigger_500_error, name='test_500_error'),
]
