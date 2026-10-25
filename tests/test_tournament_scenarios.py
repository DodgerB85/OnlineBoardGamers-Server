import json
import time
from unittest.mock import patch

from django.test import RequestFactory, TestCase
from django.urls import reverse

from Lobby.models import Game, Tournament, User
from Lobby.sharedFunctions.sharedFunctions import SF_startAnyTournament
from Lobby.sharedFunctions.sharedRefs import SR_getPointsForPosition


class TournamentLifecycleTests(TestCase):
    search_seconds = 0.05

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(username="admin")
        cls.users = [User.objects.create_user(username=f"scenario-{index:02}") for index in range(16)]
        for index, user in enumerate(cls.users):
            profile = user.profile
            profile.availabilityTurnCounts = [100] * 24
            profile.availabilityMoveCounts = [60 if (hour - index) % 24 < 8 else 5 for hour in range(24)]
            profile.save()

    def setUp(self):
        notifications = patch("django_q.tasks.async_task")
        self.addCleanup(notifications.stop)
        notifications.start()
        search = patch("Lobby.sharedFunctions.availabilityMatchmaking.ANNEALING_TIME_LIMIT_SECONDS", self.search_seconds)
        self.addCleanup(search.stop)
        search.start()

    def start_tournament(self, tournament_type="RR", category="Main"):
        tournament = Tournament.objects.create(
            tournamentName="Scenario tournament", tournamentType=tournament_type,
            tournamentCategory=category, tournamentStatus="OP", gameCode="IND",
            creator=self.admin, maxTournamentPlayers=len(self.users), maxGamePlayers=4,
            roundsBeforeKnockout=4,
        )
        tournament.startingPlayers.add(*self.users)
        request = RequestFactory().post("/")
        request.user = self.admin
        SF_startAnyTournament(request, tournament)
        return tournament

    def current_round(self, tournament):
        tournament.refresh_from_db()
        return json.loads(tournament.tournamentProgressionData)[-1]

    def post_turn(self, game, user, **payload):
        game.refresh_from_db()
        self.client.force_login(user)
        response = self.client.post(
            reverse("IND:processINDturn"),
            json.dumps({"gameID": game.id, "latestUpdate": game.latestUpdate, **payload}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("syncError", response.json())
        return response.json()

    def kick_player(self, game, user):
        game.players.update(is_current=False)
        game.players.filter(player=user).update(is_current=True)
        game.latestUpdate = str(int(time.time() * 1000) - 4 * 24 * 60 * 60 * 1000)
        game.save(update_fields=["latestUpdate"])
        self.assertEqual(game.presenter().kickoutRequired(), 2)
        voters = list(game.players.filter(is_missing=False).exclude(player=user).select_related("player"))
        for voter in voters:
            result = self.post_turn(game, voter.player, action="kickout", kickedName=user.username)
            if not result.get("voteCast"):
                break
        membership = game.players.get(player=user)
        self.assertTrue(membership.is_missing)
        self.assertTrue(membership.is_kicked)

    def finish_game(self, game, winner):
        seats = list(game.players.select_related("player").order_by("seat_order"))
        ordered = sorted(seats, key=lambda seat: (seat.player != winner, seat.is_missing, seat.seat_order))
        self.post_turn(
            game, winner, action="save", data=game.gameData, turn=10, phase=10,
            status="FINISHED", nextPlayer=[], saveRewind=False,
            winner=winner.username, finalPositions=[seat.seat_order for seat in ordered],
            tournamentData=[[winner.username]] + [[seat.player.username, 100 - index] for index, seat in enumerate(ordered[1:])],
        )
        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "FINISHED")

    def play_round(self, tournament, kicks=0, resign=False, upset=False):
        round_data = self.current_round(tournament)
        points = dict(json.loads(tournament.tournamentPointsData))
        excluded = set()
        resigned = set()
        for row in round_data:
            if row[0] == "BYEPLAYERS":
                continue
            game = Game.objects.get(id=row[1])
            seats = list(game.players.select_related("player").order_by("seat_order"))
            winner = min(seats, key=lambda seat: (points[seat.player.username], seat.player.username)).player if upset else seats[0].player
            for seat in sorted(seats, key=lambda seat: points[seat.player.username], reverse=True):
                if kicks and seat.player != winner:
                    self.kick_player(game, seat.player)
                    excluded.add(seat.player.username)
                    kicks -= 1
            if resign and not resigned:
                seat = next(seat for seat in seats if seat.player != winner and seat.player.username not in excluded)
                game.players.update(is_current=False)
                game.players.filter(player=seat.player).update(is_current=True)
                self.post_turn(game, seat.player, action="resign")
                membership = game.players.get(player=seat.player)
                self.assertTrue(membership.is_missing)
                self.assertFalse(membership.is_kicked)
                resigned.add(seat.player.username)
            self.finish_game(game, winner)
        self.assertEqual(kicks, 0)
        tournament.refresh_from_db()
        return excluded, resigned

    def assert_draw(self, tournament, expected_players):
        round_data = self.current_round(tournament)
        byes = [name for row in round_data if row[0] == "BYEPLAYERS" for name in row[1:]]
        tables = [row[0] for row in round_data if row[0] != "BYEPLAYERS"]
        participants = byes + [name for table in tables for name in table]
        self.assertCountEqual(participants, expected_players)
        self.assertEqual(len(participants), len(set(participants)))
        if tournament.tournamentCategory == "Main":
            self.assertTrue(all(len(table) == 4 for table in tables))
        else:
            self.assertTrue(all(2 <= len(table) <= 4 for table in tables))
        points = dict(json.loads(tournament.tournamentPointsData))
        ordered_points = sorted((points[name] for name in expected_players if name not in byes), reverse=True)
        offset = 0
        for table in tables:
            self.assertEqual(sorted((points[name] for name in table), reverse=True), ordered_points[offset:offset + len(table)])
            offset += len(table)
        return byes, tables

    def test_kicks_change_byes_and_mini_table_sizes_without_losing_score_groups(self):
        for tournament_type in ("RR", "PT"):
            for category in ("Main", "Mini"):
                for kicks in (1, 2, 3):
                    with self.subTest(tournament_type=tournament_type, category=category, kicks=kicks):
                        tournament = self.start_tournament(tournament_type, category)
                        excluded, resigned = self.play_round(tournament, kicks=kicks)
                        eligible = {user.username for user in self.users} - excluded
                        byes, tables = self.assert_draw(tournament, eligible)
                        expected_byes = (16 - kicks) % 4 if category == "Main" else int(kicks == 3)
                        self.assertEqual(len(byes), expected_byes)
                        if category == "Mini" and kicks < 3:
                            self.assertEqual(len(tables[-1]), 4 - kicks)
                        points = dict(json.loads(tournament.tournamentPointsData))
                        bye_points = SR_getPointsForPosition(99, 4) if tournament_type == "PT" else 1
                        previous_points = SR_getPointsForPosition(3, 4) if tournament_type == "PT" else 0
                        self.assertTrue(all(points[name] == previous_points + bye_points for name in byes))
                        self.assertEqual(set(tournament.nextRoundPlayers.values_list("username", flat=True)), set(byes))

    def test_byes_rotate_after_more_kicks_and_are_counted_in_points(self):
        tournament = self.start_tournament()
        excluded, resigned = self.play_round(tournament, kicks=1, upset=True)
        eligible = {user.username for user in self.users} - excluded
        first_byes, tables = self.assert_draw(tournament, eligible)
        self.assertEqual(len(first_byes), 3)
        more_excluded, resigned = self.play_round(tournament, kicks=1, upset=True)
        eligible -= more_excluded
        next_byes, tables = self.assert_draw(tournament, eligible)
        self.assertEqual(len(next_byes), 2)
        self.assertFalse(set(first_byes) & set(next_byes))

    def test_resigning_from_indonesia_game_does_not_withdraw_from_tournament(self):
        tournament = self.start_tournament()
        excluded, resigned = self.play_round(tournament, resign=True)
        self.assertEqual(len(resigned), 1)
        self.assertFalse(excluded)
        self.assert_draw(tournament, {user.username for user in self.users})

    def test_kicked_leader_is_not_readmitted_at_knockout_transition(self):
        for kick_round in (3, 4):
            with self.subTest(kick_round=kick_round):
                tournament = self.start_tournament()
                excluded = set()
                for round_number in range(1, 5):
                    kicked, resigned = self.play_round(tournament, kicks=int(round_number == kick_round), upset=True)
                    excluded.update(kicked)
                history = json.loads(tournament.tournamentProgressionData)
                if len(history) > 4:
                    participants = [name for row in history[-1] for name in (row[1:] if row[0] == "BYEPLAYERS" else row[0])]
                    self.assertFalse(excluded & set(participants))

    def test_surviving_joint_leaders_qualify_even_if_they_lost_final_points_game(self):
        self.users.extend(User.objects.create_user(username=f"extra-{index:03}") for index in range(176))
        tournament = self.start_tournament()
        for round_number in range(4):
            self.play_round(tournament, upset=True)
        history = json.loads(tournament.tournamentProgressionData)
        self.assertEqual(len(history), 5)
        points = dict(json.loads(tournament.tournamentPointsData))
        # Knockout byes have already received an extra point.
        for row in history[-1]:
            if row[0] == "BYEPLAYERS":
                for name in row[1:]:
                    points[name] -= 1
        leaders = {name for name, score in points.items() if score == max(points.values())}
        self.assertGreaterEqual(len(leaders), 8)
        previous_winners = {name for row in history[-2] if row[0] != "BYEPLAYERS" for name in row[2]}
        self.assertTrue(leaders - previous_winners)
        self.assert_draw(tournament, leaders)

    def test_tournament_ends_when_kicks_leave_fewer_than_a_full_table(self):
        tournament = self.start_tournament()
        excluded, resigned = self.play_round(tournament, kicks=12)
        eligible = {user.username for user in self.users} - excluded
        self.assertEqual(len(eligible), 4)
        self.assert_draw(tournament, eligible)
        self.play_round(tournament, kicks=1)
        tournament.refresh_from_db()
        self.assertEqual(tournament.tournamentStatus, "FN")
        self.assertEqual(len(json.loads(tournament.tournamentProgressionData)), 2)

    def test_knockout_counts_tied_leaders_instead_of_only_latest_winners(self):
        tournament = self.start_tournament()
        excluded, resigned = self.play_round(tournament, kicks=4, upset=True)
        for round_number in range(3):
            self.play_round(tournament, upset=True)
        history = json.loads(tournament.tournamentProgressionData)
        self.assertEqual(len(history), 5)
        previous_winners = {name for row in history[-2] if row[0] != "BYEPLAYERS" for name in row[2]}
        self.assertEqual(len(previous_winners), 3)
        leaders = {name for row in history[-1] if row[0] != "BYEPLAYERS" for name in row[0]}
        self.assertEqual(len(leaders), 4)
        self.assertFalse(leaders & excluded)
        self.assert_draw(tournament, leaders)

    def test_two_lives_removes_kicked_players_even_with_a_life_remaining(self):
        tournament = self.start_tournament("TL")
        excluded, resigned = self.play_round(tournament, kicks=1)
        self.assert_draw(tournament, {user.username for user in self.users} - excluded)
        lives = dict(json.loads(tournament.tournamentSideData))
        self.assertFalse(excluded & lives.keys())
        self.assertEqual(sorted(lives.values()), [1] * 11 + [2] * 4)
