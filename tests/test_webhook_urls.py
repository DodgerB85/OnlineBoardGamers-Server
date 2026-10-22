from django.test import SimpleTestCase

from Lobby.sharedFunctions.sharedRefs import SR_valid_webhook_url


class WebhookUrlTests(SimpleTestCase):
    def test_discord_urls(self):
        self.assertTrue(SR_valid_webhook_url("DC", "https://discord.com/api/webhooks/1/abc"))
        self.assertTrue(SR_valid_webhook_url("DC", "https://discordapp.com/api/webhooks/1/abc"))
        self.assertFalse(SR_valid_webhook_url("DC", "http://discord.com/api/webhooks/1/abc"))
        self.assertFalse(SR_valid_webhook_url("DC", "https://discord.com@evil.example/api/webhooks/1/abc"))
        self.assertFalse(SR_valid_webhook_url("DC", "https://evil.example/api/webhooks/1/abc"))
        self.assertFalse(SR_valid_webhook_url("DC", "https://discord.com/not-a-webhook"))

    def test_slack_urls(self):
        self.assertTrue(SR_valid_webhook_url("SL", "https://hooks.slack.com/services/T/B/X"))
        self.assertFalse(SR_valid_webhook_url("SL", "https://hooks.slack.com@evil.example/services/T/B/X"))
        self.assertFalse(SR_valid_webhook_url("SL", "https://evil.example/services/T/B/X"))

    def test_other_type_is_rejected(self):
        self.assertFalse(SR_valid_webhook_url("OT", "https://example.com/hook"))
