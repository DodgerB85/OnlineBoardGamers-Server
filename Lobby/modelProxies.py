from Lobby.models import Mini_Tournaments, Game


class FCMMiniTournament(Mini_Tournaments):
    class Meta:
        proxy = True
        app_label = "FCM"
        verbose_name = "FCM Mini Tournament"
        verbose_name_plural = "FCM Mini Tournaments"


class TGZMiniTournament(Mini_Tournaments):
    class Meta:
        proxy = True
        app_label = "TGZ"
        verbose_name = "TGZ Mini Tournament"
        verbose_name_plural = "TGZ Mini Tournaments"


################### Register game objects to specific app

# CNS
class CNSgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "CNS"
        verbose_name = "CNS_Game"
        verbose_name_plural = "CNS_Games"

# CNS
class WEBgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "WEB"
        verbose_name = "WEB_Game"
        verbose_name_plural = "WEB_Games"