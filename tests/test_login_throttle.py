from django.core.cache import cache
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.urls import reverse

from Lobby.middleware import AdminLoginThrottleMiddleware
from Lobby.models import User
from Lobby.sharedFunctions.loginThrottle import LOGIN_FAILURE_KEY, LOGIN_MAX_FAILURES


@override_settings(
    STORAGES={
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    },
    COMPRESS_OFFLINE=False,
)
class LoginThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="throttled", password="correct-horse")

    def tearDown(self):
        cache.clear()

    def _fail(self, times):
        for _ in range(times):
            self.client.post(reverse("myLogin"), {"username": "throttled", "password": "wrong"})

    def test_locked_out_after_max_failures(self):
        self._fail(LOGIN_MAX_FAILURES)
        response = self.client.post(reverse("myLogin"), {"username": "throttled", "password": "correct-horse"})
        self.assertContains(response, "Too many failed sign-in attempts")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_successful_login_clears_failures(self):
        self._fail(LOGIN_MAX_FAILURES - 1)
        self.client.post(reverse("myLogin"), {"username": "throttled", "password": "correct-horse"})
        self.assertIn("_auth_user_id", self.client.session)
        key = LOGIN_FAILURE_KEY.format(ip="127.0.0.1", username="throttled")
        self.assertIsNone(cache.get(key))


class AdminLoginThrottleMiddlewareTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = RequestFactory()

    def tearDown(self):
        cache.clear()

    def test_admin_login_locks_after_max_failures(self):
        middleware = AdminLoginThrottleMiddleware(lambda request: HttpResponse(status=200))

        for _ in range(LOGIN_MAX_FAILURES):
            request = self.factory.post("/admin/login/", {"username": "admin"})
            self.assertEqual(middleware(request).status_code, 200)

        request = self.factory.post("/admin/login/", {"username": "admin"})
        self.assertEqual(middleware(request).status_code, 429)

    def test_admin_login_success_clears_failures(self):
        fail = AdminLoginThrottleMiddleware(lambda request: HttpResponse(status=200))
        for _ in range(LOGIN_MAX_FAILURES - 1):
            fail(self.factory.post("/admin/login/", {"username": "admin"}))

        success = AdminLoginThrottleMiddleware(lambda request: HttpResponse(status=302))
        success(self.factory.post("/admin/login/", {"username": "admin"}))

        request = self.factory.post("/admin/login/", {"username": "admin"})
        self.assertEqual(fail(request).status_code, 200)
