# sitemaps.py
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from django.conf import settings


class StaticSitemap(Sitemap):
    changefreq = "monthly"
    protocol = "https"

    def items(self):
        return [
            "index",
            "lobbyHelp",
            "FCM:FCMhelp",
            "FCM:coffeeHelp",
            "HC:HChelp",
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
            "HC:HChelp": 0.8,
            "about": 0.7,
            "contact": 0.3,
            "donate": 0.2,
        }
        return priorities.get(obj, 0.5)  # fallback
