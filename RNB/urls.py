from django.urls import path

from . import views

app_name = 'RNB'

urlpatterns = [
    path("", views.index, name="index"),
    path('RNB/', views.showRNBgame, name='showRNBgame'),
    
    path('help/', views.RNBhelp, name='KFWhelp'),
]