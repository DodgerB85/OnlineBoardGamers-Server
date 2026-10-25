from django.core.cache import cache
from django.test import SimpleTestCase

from Lobby.sharedFunctions.rateLimit import is_rate_limited


class RateLimitTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_limit_is_reached(self):
        key = "rate-limit-test"
        self.assertFalse(is_rate_limited(key, 2, 60))
        self.assertFalse(is_rate_limited(key, 2, 60))
        self.assertTrue(is_rate_limited(key, 2, 60))
