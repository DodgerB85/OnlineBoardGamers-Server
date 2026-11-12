"""Public pages must be crawlable with their own canonical URL and title."""

from http import HTTPStatus

from django.test import TestCase


class SeoTests(TestCase):
    def test_sitemap_lists_public_pages(self):
        response = self.client.get("/sitemap.xml")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        body = response.content.decode()
        self.assertIn("<loc>https://www.onlineboardgamers.com/help/</loc>", body)
        for path in ("/FCM/help/", "/HLC/help/", "/RNB/help/", "/URR/help/"):
            self.assertIn(path, body)

    def test_llms_txt_is_served(self):
        response = self.client.get("/llms.txt")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertTrue(response["content-type"].startswith("text/plain"))
        self.assertContains(response, "https://www.onlineboardgamers.com/FCM/help/")

    def test_help_page_canonical_is_its_own_url(self):
        response = self.client.get("/FCM/help/")

        self.assertEqual(response.status_code, HTTPStatus.OK)
        self.assertContains(
            response,
            '<link rel="canonical" href="https://www.onlineboardgamers.com/FCM/help/">',
        )
        self.assertContains(response, "Food Chain Magnate Help | Online Board Gamers")

    def test_public_pages_render_with_own_canonical(self):
        pages = [
            "/",
            "/help/",
            "/helpTournaments/",
            "/helpTournamentsMini/",
            "/FCM/help/",
            "/FCM/coffeeHelp/",
            "/FCM/chinaHelp/",
            "/FCM/fanExpansionsHelp/",
            "/HLC/help/",
            "/TGZ/help/",
            "/CNS/help/",
            "/AQY/help/",
            "/IND/help/",
            "/KFW/help/",
            "/WEB/help/",
            "/BUS/help/",
            "/RNB/help/",
            "/RNB/RNBmapHelp/",
            "/URR/help/",
            "/about/",
            "/contact/",
            "/privacy/",
            "/terms/",
            "/changelog/",
        ]
        for path in pages:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, HTTPStatus.OK)
                self.assertContains(
                    response,
                    f'<link rel="canonical" href="https://www.onlineboardgamers.com{path}">',
                )
