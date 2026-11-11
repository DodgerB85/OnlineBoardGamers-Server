# sitemaps.py
from django.conf import settings
from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class StaticSitemap(Sitemap):
    changefreq = "monthly"
    protocol = "https"

    def get_domain(self, site=None):
        # Canonical host is fixed in robots.txt and the layout, so keep the
        # sitemap on the same host even if the Site row is stale.
        return "www.onlineboardgamers.com"

    def items(self):
        return [
            "index",
            "lobbyHelp",
            "helpTournaments",
            "helpTournamentsMini",
            "FCM:FCMhelp",
            "FCM:coffeeHelp",
            "FCM:FCMchinaHelp",
            "FCM:fanExpansionsHelp",
            "HLC:HLChelp",
            "TGZ:TGZhelp",
            "CNS:CNShelp",
            "AQY:AQYhelp",
            "IND:INDhelp",
            "KFW:KFWhelp",
            "WEB:WEBhelp",
            "BUS:BUShelp",
            "RNB:RNBhelp",
            "RNB:RNBmapHelp",
            "URR:URRhelp",
            "about",
            "contact",
            "donate",
            "privacy",
            "terms",
            "changelog",
        ]

    def location(self, obj):
        url = reverse(obj)
        # Add trailing slash if APPEND_SLASH is True and URL doesn't end with /
        if settings.APPEND_SLASH and not url.endswith("/"):
            url += "/"
        return url

    def priority(self, obj):
        priorities = {
            "index": 1.0,
            "lobbyHelp": 0.8,
            "helpTournaments": 0.7,
            "helpTournamentsMini": 0.7,
            "FCM:FCMhelp": 0.8,
            "FCM:coffeeHelp": 0.8,
            "FCM:FCMchinaHelp": 0.8,
            "FCM:fanExpansionsHelp": 0.8,
            "HLC:HLChelp": 0.8,
            "TGZ:TGZhelp": 0.8,
            "CNS:CNShelp": 0.8,
            "AQY:AQYhelp": 0.8,
            "IND:INDhelp": 0.8,
            "KFW:KFWhelp": 0.8,
            "WEB:WEBhelp": 0.8,
            "BUS:BUShelp": 0.8,
            "RNB:RNBhelp": 0.8,
            "RNB:RNBmapHelp": 0.6,
            "URR:URRhelp": 0.8,
            "about": 0.7,
            "contact": 0.3,
            "donate": 0.2,
            "privacy": 0.3,
            "terms": 0.3,
            "changelog": 0.5,
        }
        return priorities.get(obj, 0.5)  # fallback
