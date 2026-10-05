import json
import time
from unittest.mock import patch

from django.test import TestCase

import FCM.FCMconstants as rfFCM
from Lobby.sharedFunctions.sharedRefs import (
    SR_gamePaceString,
    SR_getFCMstartingOptionsHTML,
    SR_getPointsForPosition,
    SR_getTimeNow,
    SR_getTournamentTypeDisplay,
    SR_getTournamentWinnerHTML,
    SR_isThisMultiiWinnersGame,
    SR_latestUpdateElapsedTimeStringFromTotalSeconds,
    getCleanedAndSortedRoundData,
)


class TestSRgetTimeNow(TestCase):
    def test_returns_string(self):
        result = SR_getTimeNow()
        self.assertIsInstance(result, str)

    def test_returns_milliseconds(self):
        before = int(time.time()) * 1000
        result = int(SR_getTimeNow())
        after = int(time.time()) * 1000
        self.assertGreaterEqual(result, before)
        self.assertLessEqual(result, after)

    @patch("Lobby.sharedFunctions.sharedRefs.time.time", return_value=1700000000.0)
    def test_specific_timestamp(self, mock_time):
        result = SR_getTimeNow()
        self.assertEqual(result, "1700000000000")


class TestSRisThisMultiiWinnersGame(TestCase):
    def test_kfw_is_multi_winner(self):
        self.assertTrue(SR_isThisMultiiWinnersGame("KFW"))

    def test_aqy_is_multi_winner(self):
        self.assertTrue(SR_isThisMultiiWinnersGame("AQY"))

    def test_fcm_is_not_multi_winner(self):
        self.assertFalse(SR_isThisMultiiWinnersGame("FCM"))

    def test_tgz_is_not_multi_winner(self):
        self.assertFalse(SR_isThisMultiiWinnersGame("TGZ"))

    def test_empty_string(self):
        self.assertFalse(SR_isThisMultiiWinnersGame(""))


class TestSRgetFCMstartingOptionsHTML(TestCase):
    def test_empty_options_return_empty_html(self):
        self.assertEqual(SR_getFCMstartingOptionsHTML([]), "")

    def test_known_option_renders_icon(self):
        result = SR_getFCMstartingOptionsHTML([rfFCM.SO_NEW_MS])
        self.assertIn("so_newMS.svg", result)
        self.assertIn("New Milestones", result)


class TestSRgetTournamentTypeDisplay(TestCase):
    def test_rounds(self):
        self.assertEqual(SR_getTournamentTypeDisplay("RR"), "Rounds")

    def test_knockout(self):
        self.assertEqual(SR_getTournamentTypeDisplay("KO"), "Knockout")

    def test_two_lives(self):
        self.assertEqual(SR_getTournamentTypeDisplay("TL"), "Two Lives")

    def test_points(self):
        self.assertEqual(SR_getTournamentTypeDisplay("PT"), "Points")

    def test_multi_game(self):
        self.assertEqual(SR_getTournamentTypeDisplay("MG"), "Multi Game")

    def test_unknown_value_returns_value(self):
        self.assertEqual(SR_getTournamentTypeDisplay("XX"), "XX")


class TestSRgetTournamentWinnerHTML(TestCase):
    def test_pending_status(self):
        result = SR_getTournamentWinnerHTML("PD", None)
        self.assertIn("PENDING", result)

    def test_open_status(self):
        result = SR_getTournamentWinnerHTML("OP", None)
        self.assertIn("OPEN FOR SIGNUP", result)

    def test_private_status(self):
        result = SR_getTournamentWinnerHTML("PR", None)
        self.assertIn("PRIVATE", result)

    def test_in_progress_status(self):
        result = SR_getTournamentWinnerHTML("IP", None)
        self.assertIn("In Progress", result)

    def test_finished_with_single_winner(self):
        winners_data = json.dumps([["PlayerA"]])
        result = SR_getTournamentWinnerHTML("FN", winners_data)
        self.assertIn("PlayerA", result)
        self.assertIn("/profile/PlayerA", result)
        self.assertIn("1st:", result)

    def test_finished_with_two_places(self):
        winners_data = json.dumps([["Winner1"], ["Second1"]])
        result = SR_getTournamentWinnerHTML("FN", winners_data)
        self.assertIn("Winner1", result)
        self.assertIn("Second1", result)
        self.assertIn("2nd:", result)

    def test_finished_with_three_places(self):
        winners_data = json.dumps([["W1"], ["S1"], ["T1"]])
        result = SR_getTournamentWinnerHTML("FN", winners_data)
        self.assertIn("W1", result)
        self.assertIn("S1", result)
        self.assertIn("T1", result)
        self.assertIn("3rd:", result)

    def test_finished_with_empty_third_place(self):
        winners_data = json.dumps([["W1"], ["S1"], []])
        result = SR_getTournamentWinnerHTML("FN", winners_data)
        self.assertNotIn("3rd:", result)

    def test_finished_no_winners_data(self):
        result = SR_getTournamentWinnerHTML("FN", None)
        self.assertEqual(result, "")

    def test_multiple_winners_first_place(self):
        winners_data = json.dumps([["PlayerA", "PlayerB"]])
        result = SR_getTournamentWinnerHTML("FN", winners_data)
        self.assertIn("PlayerA", result)
        self.assertIn("PlayerB", result)
        self.assertIn(", ", result)


class TestSRlatestUpdateElapsedTimeString(TestCase):
    def test_zero_seconds(self):
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(0)
        self.assertEqual(result, " 0s")

    def test_seconds_only(self):
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(45)
        self.assertEqual(result, " 45s")

    def test_minutes_and_seconds(self):
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(125)
        self.assertEqual(result, " 2m 5s")

    def test_hours_minutes_seconds(self):
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(3661)
        self.assertEqual(result, " 1h 1m 1s")

    def test_days_hours_minutes_seconds(self):
        total = 2 * 86400 + 3 * 3600 + 15 * 60 + 30
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(total)
        self.assertEqual(result, "2d 3h 15m 30s")

    def test_exactly_one_day(self):
        result = SR_latestUpdateElapsedTimeStringFromTotalSeconds(86400)
        self.assertEqual(result, "1d 0s")


class TestSRgamePaceString(TestCase):
    def test_live(self):
        result = SR_gamePaceString(10)
        self.assertEqual(result, "Live")

    def test_fast(self):
        result = SR_gamePaceString(20)
        self.assertIn("Fast", result)

    def test_standard(self):
        result = SR_gamePaceString(30)
        self.assertIn("Standard", result)

    def test_slow(self):
        result = SR_gamePaceString(40)
        self.assertIn("Slow", result)

    def test_casual(self):
        result = SR_gamePaceString(50)
        self.assertEqual(result, "Casual")

    def test_unknown_pace(self):
        result = SR_gamePaceString(999)
        self.assertEqual(result, "")


class TestSRgetPointsForPosition(TestCase):
    def test_first_place_4_players(self):
        self.assertEqual(SR_getPointsForPosition(0, 4), 15)

    def test_second_place_4_players(self):
        self.assertEqual(SR_getPointsForPosition(1, 4), 11)

    def test_third_place_4_players(self):
        self.assertEqual(SR_getPointsForPosition(2, 4), 7)

    def test_last_place_4_players(self):
        self.assertEqual(SR_getPointsForPosition(3, 4), 3)

    def test_first_place_3_players(self):
        self.assertEqual(SR_getPointsForPosition(0, 3), 10)

    def test_first_place_5_players(self):
        self.assertEqual(SR_getPointsForPosition(0, 5), 20)

    def test_first_place_6_players(self):
        self.assertEqual(SR_getPointsForPosition(0, 6), 25)

    def test_bye_points_4_players(self):
        self.assertEqual(SR_getPointsForPosition(99, 4), 9)

    def test_bye_points_3_players(self):
        self.assertEqual(SR_getPointsForPosition(99, 3), 6)

    def test_invalid_player_count(self):
        self.assertEqual(SR_getPointsForPosition(0, 7), 0)

    def test_invalid_position(self):
        self.assertEqual(SR_getPointsForPosition(5, 4), 0)

    def test_negative_position(self):
        self.assertEqual(SR_getPointsForPosition(-1, 4), 0)

    def test_2_players(self):
        self.assertEqual(SR_getPointsForPosition(0, 2), 2)
        self.assertEqual(SR_getPointsForPosition(1, 2), 0)


class TestGetCleanedAndSortedRoundData(TestCase):
    def test_basic_sorting_by_wins(self):
        round_data = [
            ["Alice", 3, 1],
            ["Bob", 3, 3],
            ["Charlie", 3, 2],
        ]
        result = getCleanedAndSortedRoundData(round_data)
        self.assertEqual(result[0][0], "Bob")
        self.assertEqual(result[1][0], "Charlie")
        self.assertEqual(result[2][0], "Alice")

    def test_tiebreaker_sorting(self):
        round_data = [
            ["Alice", 3, 2, [10, 1]],
            ["Bob", 3, 2, [15, 2]],
        ]
        result = getCleanedAndSortedRoundData(round_data)
        self.assertEqual(result[0][0], "Bob")
        self.assertEqual(result[1][0], "Alice")

    def test_removes_negative_infinity_padding(self):
        round_data = [
            ["Alice", 2, 1],
        ]
        result = getCleanedAndSortedRoundData(round_data)
        # Should not contain any lists with -inf
        for item in result[0]:
            if isinstance(item, list):
                for val in item:
                    self.assertNotEqual(val, float("-inf"))

    def test_alphabetical_tiebreak(self):
        round_data = [
            ["Zara", 3, 2],
            ["Alice", 3, 2],
        ]
        result = getCleanedAndSortedRoundData(round_data)
        self.assertEqual(result[0][0], "Alice")
        self.assertEqual(result[1][0], "Zara")
