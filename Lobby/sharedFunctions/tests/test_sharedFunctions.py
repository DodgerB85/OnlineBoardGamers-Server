import json
from unittest.mock import patch

from django.test import TestCase

from Lobby.sharedFunctions.sharedFunctions import (
    SF_getRequiredExp,
    SF_getSecondsToNextKickout,
    SF_getTimeNow,
    SF_kickoutRequired,
    SF_updateFlexiTime,
)


class TestSFgetTimeNow(TestCase):
    def test_returns_string(self):
        result = SF_getTimeNow()
        self.assertIsInstance(result, str)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000.0)
    def test_specific_timestamp(self, mock_time):
        result = SF_getTimeNow()
        self.assertEqual(result, "1700000000000")


class TestSFgetRequiredExp(TestCase):
    def test_fcm_requires_2(self):
        self.assertEqual(SF_getRequiredExp("FCM"), 2)

    def test_hlc_requires_1(self):
        self.assertEqual(SF_getRequiredExp("HLC"), 1)

    def test_bus_requires_1(self):
        self.assertEqual(SF_getRequiredExp("BUS"), 1)

    def test_tgz_requires_2(self):
        self.assertEqual(SF_getRequiredExp("TGZ"), 2)

    def test_cns_requires_2(self):
        self.assertEqual(SF_getRequiredExp("CNS"), 2)

    def test_aqy_requires_2(self):
        self.assertEqual(SF_getRequiredExp("AQY"), 2)

    def test_ind_requires_2(self):
        self.assertEqual(SF_getRequiredExp("IND"), 2)

    def test_kfw_requires_2(self):
        self.assertEqual(SF_getRequiredExp("KFW"), 2)

    def test_rnb_requires_2(self):
        self.assertEqual(SF_getRequiredExp("RNB"), 2)

    def test_unknown_defaults_to_2(self):
        self.assertEqual(SF_getRequiredExp("UNKNOWN"), 2)


class TestSFupdateFlexiTime(TestCase):
    def test_no_update_for_blitz_kickout(self):
        result = SF_updateFlexiTime(None, "1700000000000", 1700000100000, "player1", 10)
        self.assertIsNone(result)

    def test_adds_new_entry_when_flex_used(self):
        now = 1700000000000
        # latestUpdate = 12 hours + 100 seconds ago (in ms)
        latest_update = str(now - (12 * 60 * 60 * 1000) - (100 * 1000))
        result = SF_updateFlexiTime(None, latest_update, now, "player1", 50)
        result_data = json.loads(result)
        self.assertEqual(len(result_data), 1)
        self.assertEqual(result_data[0][0], "player1")
        self.assertEqual(result_data[0][1], 100)

    def test_updates_existing_entry(self):
        now = 1700000000000
        latest_update = str(now - (12 * 60 * 60 * 1000) - (200 * 1000))
        existing_data = json.dumps([["player1", 50]])
        result = SF_updateFlexiTime(existing_data, latest_update, now, "player1", 50)
        result_data = json.loads(result)
        self.assertEqual(result_data[0][0], "player1")
        self.assertEqual(result_data[0][1], 250)

    def test_no_update_when_within_time_limit(self):
        now = 1700000000000
        # Only 6 hours ago - within the 12h limit for kickout=50
        latest_update = str(now - (6 * 60 * 60 * 1000))
        result = SF_updateFlexiTime(None, latest_update, now, "player1", 50)
        self.assertIsNone(result)

    def test_days_kickout_flex_used(self):
        now = 1700000000000
        # 1 day + 300 seconds ago for kickout=100 (1 day)
        latest_update = str(now - (1 * 24 * 60 * 60 * 1000) - (300 * 1000))
        result = SF_updateFlexiTime(None, latest_update, now, "player1", 100)
        result_data = json.loads(result)
        self.assertEqual(result_data[0][0], "player1")
        self.assertEqual(result_data[0][1], 300)


class TestSFkickoutRequired(TestCase):
    def test_not_active_returns_0(self):
        result = SF_kickoutRequired("FINISHED", ["player1", "player2"], "1700000000000", 100, None, "player1")
        self.assertEqual(result, 0)

    def test_shadow_player_returns_0(self):
        result = SF_kickoutRequired("ACTIVE", ["player1", "SHADOW"], "1700000000000", 100, None, "player1")
        self.assertEqual(result, 0)

    def test_fcmai_shadow_returns_0(self):
        result = SF_kickoutRequired("ACTIVE", ["player1", "FcmAI"], "1700000000000", 100, None, "player1")
        self.assertEqual(result, 0)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_blitz_kickout_triggered(self, mock_time):
        # 5 min kickout, 6 minutes have passed
        now_seconds = 1700000360
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)  # 360 seconds ago
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 5, None, "player1")
        self.assertEqual(result, 2)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_blitz_kickout_not_triggered(self, mock_time):
        # 5 min kickout, only 2 minutes have passed
        now_seconds = 1700000120
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 5, None, "player1")
        self.assertEqual(result, 0)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_12h_kickout_no_flex_used(self, mock_time):
        # 12h kickout, 13 hours have passed but within flex day
        now_seconds = 1700000000 + 13 * 3600
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 50, None, "player1")
        self.assertEqual(result, 1)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_12h_kickout_hard_exceeded(self, mock_time):
        # 12h + 24h+ have passed -> hard kickout
        now_seconds = 1700000000 + 12 * 3600 + 86401
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 50, None, "player1")
        self.assertEqual(result, 2)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_day_kickout_not_triggered(self, mock_time):
        # 1 day kickout, only 12 hours have passed
        now_seconds = 1700000000 + 12 * 3600
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 100, None, "player1")
        self.assertEqual(result, 0)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time")
    def test_day_kickout_with_flex_accumulated(self, mock_time):
        # 1 day kickout, 26h passed, player already used 23h of flex -> total > 1day + 1day (172800s)
        now_seconds = 1700000000 + 26 * 3600
        mock_time.return_value = now_seconds
        latest_update = str(1700000000 * 1000)
        flexi_data = json.dumps([["player1", 23 * 3600]])
        result = SF_kickoutRequired("ACTIVE", ["player1", "player2"], latest_update, 100, flexi_data, "player1")
        self.assertEqual(result, 2)


class TestSFgetSecondsToNextKickout(TestCase):
    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000)
    def test_blitz_5_min(self, mock_time):
        # Latest update was 2 min ago -> 3 min left
        latest_update = str((1700000000 - 120) * 1000)
        result = SF_getSecondsToNextKickout(latest_update, 5)
        self.assertEqual(result, 180)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000)
    def test_12h_kickout(self, mock_time):
        # Latest update was 6 hours ago -> 6 hours left
        latest_update = str((1700000000 - 6 * 3600) * 1000)
        result = SF_getSecondsToNextKickout(latest_update, 50)
        self.assertEqual(result, 6 * 3600)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000)
    def test_1_day_kickout(self, mock_time):
        # Latest update was 12 hours ago -> 12 hours left
        latest_update = str((1700000000 - 12 * 3600) * 1000)
        result = SF_getSecondsToNextKickout(latest_update, 100)
        self.assertEqual(result, 12 * 3600)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000)
    def test_2_day_kickout(self, mock_time):
        latest_update = str((1700000000 - 24 * 3600) * 1000)
        result = SF_getSecondsToNextKickout(latest_update, 200)
        self.assertEqual(result, 24 * 3600)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000)
    def test_negative_means_overdue(self, mock_time):
        # Latest update was 10 min ago with 5 min kickout -> -5 min
        latest_update = str((1700000000 - 600) * 1000)
        result = SF_getSecondsToNextKickout(latest_update, 5)
        self.assertEqual(result, -300)
