from Lobby.models import Game, Tournament

################### Register Tournament objects when MAIN to specific app


class FCMMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "FCM"
        verbose_name = "FCM Main Tournament"
        verbose_name_plural = "FCM Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="FCM", tournamentCategory="Main")


class TGZMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "TGZ"
        verbose_name = "TGZ Main Tournament"
        verbose_name_plural = "TGZ Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="TGZ", tournamentCategory="Main")


class HLCMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "HLC"
        verbose_name = "HLC Mini Tournament"
        verbose_name_plural = "HLC Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="HLC", tournamentCategory="Mini")


class HLCMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "HLC"
        verbose_name = "HLC Main Tournament"
        verbose_name_plural = "HLC Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="HLC", tournamentCategory="Main")


class BUSMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "BUS"
        verbose_name = "BUS Mini Tournament"
        verbose_name_plural = "BUS Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="BUS", tournamentCategory="Mini")


class BUSMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "BUS"
        verbose_name = "BUS Main Tournament"
        verbose_name_plural = "BUS Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="BUS", tournamentCategory="Main")


class AQYMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "AQY"
        verbose_name = "AQY Mini Tournament"
        verbose_name_plural = "AQY Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="AQY", tournamentCategory="Mini")


class AQYMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "AQY"
        verbose_name = "AQY Main Tournament"
        verbose_name_plural = "AQY Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="AQY", tournamentCategory="Main")


class INDMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "IND"
        verbose_name = "IND Mini Tournament"
        verbose_name_plural = "IND Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="IND", tournamentCategory="Mini")


class INDMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "IND"
        verbose_name = "IND Main Tournament"
        verbose_name_plural = "IND Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="IND", tournamentCategory="Main")


class RNBMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "RNB"
        verbose_name = "RNB Mini Tournament"
        verbose_name_plural = "RNB Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="RNB", tournamentCategory="Mini")


class RNBMainTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "RNB"
        verbose_name = "RNB Main Tournament"
        verbose_name_plural = "RNB Main Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="RNB", tournamentCategory="Main")


################### Register Tournament objects when MINI to specific app


class FCMMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "FCM"
        verbose_name = "FCM Mini Tournament"
        verbose_name_plural = "FCM Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="FCM", tournamentCategory="Mini")


class TGZMiniTournament(Tournament):
    class Meta:
        proxy = True
        app_label = "TGZ"
        verbose_name = "TGZ Mini Tournament"
        verbose_name_plural = "TGZ Mini Tournaments"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(gameCode="TGZ", tournamentCategory="Mini")


################### Register game objects to specific app


# FCM
class FCMgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "FCM"
        verbose_name = "FCM_Game"
        verbose_name_plural = "FCM_Games"


# HLC
class HLCgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "HLC"
        verbose_name = "HLC_Game"
        verbose_name_plural = "HLC_Games"


# Bus
class BUSgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "BUS"
        verbose_name = "BUS_Game"
        verbose_name_plural = "BUS_Games"


# TGZ
class TGZgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "TGZ"
        verbose_name = "TGZ_Game"
        verbose_name_plural = "TGZ_Games"


# CNS
class CNSgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "CNS"
        verbose_name = "CNS_Game"
        verbose_name_plural = "CNS_Games"


# AQY
class AQYgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "AQY"
        verbose_name = "AQY_Game"
        verbose_name_plural = "AQY_Games"


# IND
class INDgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "IND"
        verbose_name = "IND_Game"
        verbose_name_plural = "IND_Games"


# KFW
class KFWgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "KFW"
        verbose_name = "KFW_Game"
        verbose_name_plural = "KFW_Games"


# WEB
class WEBgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "WEB"
        verbose_name = "WEB_Game"
        verbose_name_plural = "WEB_Games"


# RNB
class RNBgame(Game):
    class Meta(Game.Meta):
        proxy = True
        app_label = "RNB"
        verbose_name = "RNB_Game"
        verbose_name_plural = "RNB_Games"
