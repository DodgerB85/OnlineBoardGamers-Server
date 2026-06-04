import json
from unittest.mock import patch

from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory
from django.test import TestCase

from Lobby.models import Game, GamePlayer, Tournament, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_M_ProcessAnyTournamentEndGame,
    SF_createNextRoundGamesSetup,
    SF_getRequiredExp,
    SF_getSecondsToNextKickout,
    SF_getTimeNow,
    SF_kickoutRequired,
    SF_serializeGame,
    SF_setupTrainingGameShadows,
    SF_updateFlexiTime,
    SF_validatePlayers,
    setNextRoundMultiGamePlayers,
)


class PrintSuccessTestCase(TestCase):
    def tearDown(self):
        super().tearDown()
        outcome = getattr(self, '_outcome', None)
        if outcome is None:
            return
        errors = [test for test, _ in getattr(outcome, 'errors', [])]
        failures = [test for test, _ in getattr(outcome, 'failures', [])]
        if self not in errors and self not in failures:
            print(f"  PASS: {self.__class__.__name__}.{self._testMethodName}")


class TestSFgetTimeNow(PrintSuccessTestCase):
    def test_returns_string(self):
        result = SF_getTimeNow()
        self.assertIsInstance(result, str)

    @patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000000.0)
    def test_specific_timestamp(self, mock_time):
        result = SF_getTimeNow()
        self.assertEqual(result, "1700000000000")


class TestSFgetRequiredExp(PrintSuccessTestCase):
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


class TestSFupdateFlexiTime(PrintSuccessTestCase):
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


class TestSFkickoutRequired(PrintSuccessTestCase):
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


class TestSFgetSecondsToNextKickout(PrintSuccessTestCase):
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


class TestSFserializeGame(PrintSuccessTestCase):
    def test_serializes_game_player_flags_and_legacy_options(self):
        creator = User.objects.create_user(username="creator", password="testpass123")
        current_user = User.objects.create_user(username="current", password="testpass123")
        other_user = User.objects.create_user(username="other", password="testpass123")
        invited_user = User.objects.create_user(username="invited", password="testpass123")
        game = Game.objects.create(
            gameCode="BUS",
            creator=creator,
            host=creator,
            gameStatus="ACTIVE",
            gameName="",
            latestUpdate="1700000000000",
            created="1699990000000",
            startingOptions="110,120",
            maxPlayers=3,
        )
        game.invitedPlayers.add(invited_user)
        GamePlayer.objects.create(game=game, player=current_user, seat_order=0, is_current=True, has_chat_notification=True)
        GamePlayer.objects.create(game=game, player=other_user, seat_order=1, is_pending_finish=True)

        with patch("Lobby.sharedFunctions.sharedFunctions.time.time", return_value=1700000060):
            result = SF_serializeGame(
                game,
                current_user,
                {
                    "all_game_players": list(game.players.all().select_related("player")),
                    "invited_users": list(game.invitedPlayers.all()),
                },
            )

        self.assertEqual(result["gameName"], "[creator's Game]")
        self.assertEqual(result["allPlayers"], ["current", "other"])
        self.assertEqual(result["invitedPlayers"], ["invited"])
        self.assertEqual(result["currentPlayers"], "current")
        self.assertTrue(result["myMove"])
        self.assertTrue(result["involvedPlayer"])
        self.assertTrue(result["chatNotification"])
        self.assertFalse(result["pendingFinish"])
        self.assertTrue(result["learningGame"])
        self.assertTrue(result["experiencedGame"])
        self.assertEqual(result["latestUpdateElapsedTimeString"], "1m 0s")

    def test_missing_player_is_not_involved(self):
        creator = User.objects.create_user(username="creator", password="testpass123")
        user = User.objects.create_user(username="missing", password="testpass123")
        game = Game.objects.create(gameCode="CNS", creator=creator, host=creator, gameStatus="ACTIVE")
        player = GamePlayer.objects.create(game=game, player=user, seat_order=0, is_missing=True)

        result = SF_serializeGame(game, user, {"all_game_players": [player], "invited_users": []})

        self.assertFalse(result["involvedPlayer"])


class TestTournamentSharedFunctions(PrintSuccessTestCase):
    def _create_users(self, count):
        return [User.objects.create_user(username=f"P{i}", password="testpass123") for i in range(count)]

    def _create_tournament(self, users, tournament_type="PT", game_code="FCM", category="Mini", max_game_players=4):
        creator = users[0]
        tournament = Tournament.objects.create(
            tournamentName="Test Tournament",
            tournamentCategory=category,
            tournamentType=tournament_type,
            gameCode=game_code,
            creator=creator,
            maxTournamentPlayers=len(users),
            maxGamePlayers=max_game_players,
            tournamentProgressionData=json.dumps([]),
            tournamentPointsData=json.dumps([[user.username, index] for index, user in enumerate(users)]),
            tournamentSideData=json.dumps([]),
        )
        tournament.nextRoundPlayers.add(*users)
        return tournament

    def test_create_next_round_hlc_mini_uses_byes_for_two_leftover_players(self):
        users = self._create_users(6)
        tournament = self._create_tournament(users, game_code="HLC")

        result = SF_createNextRoundGamesSetup(tournament)

        self.assertEqual(len(result["byePlayers"]), 2)
        self.assertEqual(len(result["gamesPlayers"]), 1)
        self.assertEqual(len(result["gamesPlayers"][0]), 4)
        self.assertFalse(set(result["byePlayers"]).intersection(result["gamesPlayers"][0]))

    def test_create_next_round_non_hlc_mini_allows_two_player_leftover_game(self):
        users = self._create_users(6)
        tournament = self._create_tournament(users, game_code="FCM")

        result = SF_createNextRoundGamesSetup(tournament)

        self.assertEqual(result["byePlayers"], [])
        self.assertEqual(sorted(len(game) for game in result["gamesPlayers"]), [2, 4])

    def test_create_next_round_main_tournament_uses_byes_for_leftovers(self):
        """Verify non-MG Main tournament round creation end-to-end (logic is unchanged, only extracted)."""
        users = self._create_users(6)
        tournament = self._create_tournament(users, game_code="FCM", category="Main")

        result = SF_createNextRoundGamesSetup(tournament)

        # MainT: 6 players with maxGamePlayers=4 → 2 byes, 1 full game of 4
        self.assertEqual(len(result["byePlayers"]), 2)
        self.assertEqual(len(result["gamesPlayers"]), 1)
        self.assertEqual(len(result["gamesPlayers"][0]), 4)
        self.assertFalse(set(result["byePlayers"]).intersection(result["gamesPlayers"][0]))

    def test_set_next_round_multi_game_players_selects_top_14_and_groups_by_seed(self):
        users = self._create_users(16)
        tournament = self._create_tournament(users, tournament_type="MG", category="Main")
        tournament.nextRoundPlayers.clear()
        tournament.tournamentProgressionData = json.dumps([[["finished round"]]])
        round_1_points = [[user.username, 4, 10 - index] for index, user in enumerate(users)]
        tournament.tournamentPointsData = json.dumps([round_1_points])
        tournament.save()

        setNextRoundMultiGamePlayers(tournament)

        selected_usernames = set(tournament.nextRoundPlayers.values_list("username", flat=True))
        self.assertEqual(len(selected_usernames), 14)
        self.assertNotIn("P14", selected_usernames)
        self.assertNotIn("P15", selected_usernames)
        round_2_points = json.loads(tournament.tournamentPointsData)[-1]
        self.assertEqual([row[0] for row in round_2_points], ["P0", "P2", "P4", "P6", "P8", "P10", "P12", "P1", "P3", "P5", "P7", "P9", "P11", "P13"])
        self.assertTrue(all(row[1:] == [0, 0] for row in round_2_points))

    def test_process_tl_end_game_removes_losers_without_lives_and_kicked_players(self):
        users = self._create_users(3)
        tournament = self._create_tournament(users, tournament_type="TL")
        tournament.nextRoundPlayers.clear()
        tournament.tournamentSideData = json.dumps([["P0", 2], ["P1", 1], ["P2", 2]])
        tournament.tournamentPointsData = json.dumps([["P0", 0], ["P1", 0], ["P2", 0]])
        game = Game.objects.create(gameCode="FCM", creator=users[0], host=users[0])
        GamePlayer.objects.create(game=game, player=users[0], seat_order=0)
        GamePlayer.objects.create(game=game, player=users[1], seat_order=1)
        GamePlayer.objects.create(game=game, player=users[2], seat_order=2, is_kicked=True)
        tournament.tournamentProgressionData = json.dumps([[[[user.username for user in users], game.id, [], "Round 1"], [["P9"], 999, [], "Unfinished"]]])
        tournament.save()

        SF_M_ProcessAnyTournamentEndGame(None, tournament, game, ["P0"], [["P0"], ["P1", 5], ["P2", 2]])

        tournament.refresh_from_db()
        self.assertEqual(json.loads(tournament.tournamentSideData), [["P0", 2]])
        self.assertEqual(json.loads(tournament.tournamentPointsData)[0], ["P0", 1])
        self.assertEqual(set(tournament.nextRoundPlayers.values_list("username", flat=True)), {"P0"})


class TestSharedGameCreationHelpers(PrintSuccessTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.request = self.factory.post("/", data={})
        self.request.session = {}
        self.request._messages = FallbackStorage(self.request)
        self.request.user = User.objects.create_user(username="creator", password="testpass123")

    def test_validate_players_rejects_missing_username(self):
        result = SF_validatePlayers(self.request, ["missing"], 4)

        self.assertIsNone(result)

    def test_validate_players_rejects_creator_when_not_allowed(self):
        result = SF_validatePlayers(self.request, ["creator"], 4, allow_creator=False)

        self.assertIsNone(result)

    def test_setup_training_game_shadows_uses_posted_display_names(self):
        User.objects.create_user(username="SHADOW", password="testpass123")
        User.objects.create_user(username="SHADOW_2", password="testpass123")
        request = self.factory.post("/", data={"player2": "Bot A", "player3": "Bot B"})

        shadow_users, shadow_name_notes = SF_setupTrainingGameShadows(request, 3, ["SHADOW", "SHADOW_2"])

        self.assertEqual([user.username for user in shadow_users], ["SHADOW", "SHADOW_2"])
        self.assertEqual(shadow_name_notes, '["Bot A","Bot B"]')
