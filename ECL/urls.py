from django.urls import path

from . import views

app_name = "ECL"

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:game_id>/show/", views.showECLgame, name="showECLgame"),
    path("<int:game_id>/proxy/<path:path>", views.proxy, name="proxy"),
    path("help/", views.ECLhelp, name="ECLhelp"),
    path("createECLgame/", views.createECLgame, name="createECLgame"),
]
