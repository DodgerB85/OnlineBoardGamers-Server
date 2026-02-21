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

# WEB
class WEBgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "WEB"
        verbose_name = "WEB_Game"
        verbose_name_plural = "WEB_Games"

# AQY
class AQYgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "AQY"
        verbose_name = "AQY_Game"
        verbose_name_plural = "AQY_Games"

# TGZ
class TGZgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "TGZ"
        verbose_name = "TGZ_Game"
        verbose_name_plural = "TGZ_Games"

# IND
class INDgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "IND"
        verbose_name = "IND_Game"
        verbose_name_plural = "IND_Games"

# Bus
class Busgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "Bus"
        verbose_name = "Bus_Game"
        verbose_name_plural = "Bus_Games"

# FCM
class FCMgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "FCM"
        verbose_name = "FCM_Game"
        verbose_name_plural = "FCM_Games"
        
# RNB
class RNBgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "RNB"
        verbose_name = "RNB_Game"
        verbose_name_plural = "RNB_Games"

# HC
class HCgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "HC"
        verbose_name = "HC_Game"
        verbose_name_plural = "HC_Games"

# KFW
class KFWgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "KFW"
        verbose_name = "KFW_Game"
        verbose_name_plural = "KFW_Games"
