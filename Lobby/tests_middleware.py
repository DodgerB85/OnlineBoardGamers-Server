from django.test import RequestFactory, TestCase

from Lobby.middleware import ForceTrailingSlashMiddleware


class TestForceTrailingSlashMiddleware(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = ForceTrailingSlashMiddleware(get_response=lambda r: None)

    def test_redirects_fcm_without_trailing_slash(self):
        request = self.factory.get("/FCM/game/123")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/FCM/game/123/")

    def test_no_redirect_with_trailing_slash(self):
        request = self.factory.get("/FCM/game/123/")
        response = self.middleware(request)
        self.assertIsNone(response)

    def test_redirects_login_without_slash(self):
        request = self.factory.get("/login")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/login/")

    def test_redirects_profile_without_slash(self):
        request = self.factory.get("/profile/user1")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/profile/user1/")

    def test_no_redirect_for_non_app_paths(self):
        request = self.factory.get("/api/data")
        response = self.middleware(request)
        self.assertIsNone(response)

    def test_no_redirect_for_root(self):
        request = self.factory.get("/")
        response = self.middleware(request)
        self.assertIsNone(response)

    def test_redirects_all_game_codes(self):
        game_codes = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "PPF", "WEB", "RNB"]
        for code in game_codes:
            request = self.factory.get(f"/{code}/game")
            response = self.middleware(request)
            self.assertEqual(response.status_code, 301, f"Failed for {code}")
            self.assertEqual(response["Location"], f"/{code}/game/")

    def test_redirects_index_without_slash(self):
        request = self.factory.get("/index")
        response = self.middleware(request)
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response["Location"], "/index/")
