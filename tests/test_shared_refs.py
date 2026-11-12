import json
import time
from unittest.mock import patch

from django.test import TestCase

import FCM.FCMconstants as rfFCM
import RNB.RNBconstants as rfRNB
from Lobby.sharedFunctions.sharedRefs import (
    SR_gamePaceString,
    SR_getFCMstartingOptionsHTML,
    SR_getKFWstartingOptionsHTML,
    SR_getPointsForPosition,
    SR_getRNBstartingOptionsHTML,
    SR_getTimeNow,
    SR_getTournamentTypeDisplay,
    SR_getTournamentWinnerHTML,
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


class TestSRgetFCMstartingOptionsHTML(TestCase):
    def test_empty_options_return_empty_html(self):
        self.assertEqual(SR_getFCMstartingOptionsHTML([]), "")

    def test_known_option_renders_icon(self):
        result = SR_getFCMstartingOptionsHTML([rfFCM.SO_NEW_MS])
        self.assertIn("so_newMS.svg", result)
        self.assertIn("New Milestones", result)

    def test_random_module_range_shows_max_25(self):
        result = SR_getFCMstartingOptionsHTML(
            [rfFCM.SO_RANDOM_MODULES, 21001, 21125]
        )
        self.assertIn("01 - 25 Random Modules", result)

    def test_random_module_exclusions_listed_in_tooltip(self):
        result = SR_getFCMstartingOptionsHTML(
            [
                rfFCM.SO_RANDOM_MODULES,
                21001,
                21120,
                rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_KIMCHI,
                rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_NEW_MAP,
            ]
        )
        self.assertIn("Excluded: Kimchi, New Map", result)

    def test_random_module_without_exclusions_has_no_excluded_text(self):
        result = SR_getFCMstartingOptionsHTML(
            [rfFCM.SO_RANDOM_MODULES, 21001, 21120]
        )
        self.assertNotIn("Excluded", result)

    def test_unknown_exclusion_id_is_ignored(self):
        result = SR_getFCMstartingOptionsHTML(
            [rfFCM.SO_RANDOM_MODULES, 21001, 21120, rfFCM.SO_EXCLUDED_MODULE_BASE]
        )
        self.assertNotIn("Excluded", result)


class TestSRgetRNBstartingOptionsHTML(TestCase):
    def test_empty_options_return_empty_html(self):
        self.assertEqual(SR_getRNBstartingOptionsHTML([]), "")

    def test_each_module_renders_its_icon(self):
        modules = [
            (rfRNB.SO_ELECTRICITY, "RNB_electricity.svg", "Electricity"),
            (rfRNB.SO_MANAGEMENT, "RNB_management.svg", "Management"),
            (rfRNB.SO_ART, "RNB_art.svg", "Art"),
            (rfRNB.SO_TRADE, "RNB_trade.svg", "Trade"),
            (rfRNB.SO_FUNDAMENTAL_RESEARCH, "RNB_fundamentalResearch.svg", "Fundamental Research"),
            (rfRNB.SO_PLANES, "RNB_planes.svg", "Planes"),
            (rfRNB.SO_BOMBS, "RNB_bombs.svg", "Bombs"),
            (rfRNB.SO_JUMP_START, "RNB_jumpStart.svg", "Jump Start"),
        ]
        for option, filename, title in modules:
            with self.subTest(option=option):
                result = SR_getRNBstartingOptionsHTML([option])
                self.assertIn(filename, result)
                self.assertIn(title, result)

    def test_solo_mine_option_renders_icon(self):
        result = SR_getRNBstartingOptionsHTML([rfRNB.SO_USE_SOLO_MINE_RULES])
        self.assertIn("RNB_useSoloMineRules.svg", result)

    def test_unknown_option_is_ignored(self):
        self.assertEqual(SR_getRNBstartingOptionsHTML([999]), "")


class TestSRgetKFWstartingOptionsHTML(TestCase):
    def test_farmers_option_renders_icon(self):
        result = SR_getKFWstartingOptionsHTML([3])
        self.assertIn("so_farmers.svg", result)
        self.assertIn("Use Farmers Expansion", result)


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

    def test_standard_shows_time_control(self):
        result = SR_gamePaceString(30, 50)
        self.assertIn("12h kickout", result)
        self.assertIn("24h Flexi-Time", result)

    def test_day_kickout_shows_time_control(self):
        result = SR_gamePaceString(30, 200)
        self.assertIn("2 days kickout", result)
        self.assertIn("24h Flexi-Time", result)

    def test_live_never_shows_time_control(self):
        self.assertEqual(SR_gamePaceString(10, 50), "Live")

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
