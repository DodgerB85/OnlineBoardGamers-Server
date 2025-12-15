from django.urls import path

from . import views

app_name = 'PPF'

urlpatterns = [
    path("", views.index, name="index"),
    path('PPF/', views.showPPFgame, name='showPPFgame'),
]
