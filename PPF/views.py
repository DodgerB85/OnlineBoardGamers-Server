from django.http import HttpResponse
from django.shortcuts import render, redirect


def index(request):
    return HttpResponse("Hello, world. You're at PPF")


def showPPFgame(request, game_id=1, spoilerFree=False, replayStep=1):
    ALLOWED_USERS = [
        "admin",
        "ha.steven",
        "massibull",
        "durendal",
        "DodgerB",
        "BotKickStarter",
        "Rastko",
        "Benkyo",
        "vraid",
        "F1087",
        "krieg90",
        "gdc",
        "enavico",
        "PhasingPlayer",
    ]
    # ["admin", "ha.steven", "Kawlos", "Jasonbartfast", "Batch", "Juni", "TDUBZ", "BigBad", "massibull", "durendal", 'DodgerB', 'BotKickStarter', '33', 'Rastko', 'Burmer', 'phil', 'Benkyo', 'Steveth', "F1087", "krieg90", "gdc"]
    #                 #'looogic', 'Burmer',
    #                 #'pgh_gamer', , 'huddyrx', 'user1', 'craggybackhand', 'Strange8ractor', ]
    ##print("******************************************************************************************************** IND ACCESS: =================================================:  " + request.user.username)
    if request.user.username not in ALLOWED_USERS:
        return redirect("index")

    return render(request, "PPF/showPPFgame.html")
