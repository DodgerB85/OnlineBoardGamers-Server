# sitemaps.py
from django.conf import settings
from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class StaticSitemap(Sitemap):
    changefreq = "monthly"
    protocol = "https"

    def items(self):
        return [
            "index",
            "lobbyHelp",
            "FCM:FCMhelp",
            "FCM:coffeeHelp",
            "FCM:FCMchinaHelp",
            "HLC:HLChelp",
            "TGZ:TGZhelp",
            "CNS:CNShelp",
            "AQY:AQYhelp",
            "IND:INDhelp",
            "KFW:KFWhelp",
            "WEB:WEBhelp",
            "BUS:BUShelp",
            "RNB:RNBhelp",
            "about",
            "contact",
            "donate",
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
            "FCM:FCMhelp": 0.8,
            "FCM:coffeeHelp": 0.8,
            "FCM:FCMchinaHelp": 0.8,
            "HLC:HLChelp": 0.8,
            "TGZ:TGZhelp": 0.8,
            "CNS:CNShelp": 0.8,
            "AQY:AQYhelp": 0.8,
            "IND:INDhelp": 0.8,
            "KFW:KFWhelp": 0.8,
            "WEB:WEBhelp": 0.8,
            "BUS:BUShelp": 0.8,
            "RNB:RNBhelp": 0.8,
            "about": 0.7,
            "contact": 0.3,
            "donate": 0.2,
        }
        return priorities.get(obj, 0.5)  # fallback
