import json
from datetime import datetime, timezone as datetime_timezone

from django.test import TestCase, override_settings
from django.utils import timezone

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.availability import (
    get_availability_hour,
    get_availability_hours_between,
    normalize_availability_counts,
    record_player_availability_for_turn_change,
)


@override_settings(TIME_ZONE="UTC", USE_TZ=True)
class AvailabilityTrackingTests(TestCase):
    def setUp(self):
        timezone.activate("UTC")
        self.player_one = User.objects.create_user(username="player-one", password="testpass123")
        self.player_two = User.objects.create_user(username="player-two", password="testpass123")
        self.game = Game.objects.create(
            gameCode="CNS",
            gameStatus="ACTIVE",
            maxPlayers=2,
            latestUpdate=str(int(datetime(2026, 1, 1, 22, 30, tzinfo=datetime_timezone.utc).timestamp() * 1000)),
            startingOptions=json.dumps([]),
        )
        GamePlayer.objects.create(game=self.game, player=self.player_one, seat_order=0, is_current=True)
        GamePlayer.objects.create(game=self.game, player=self.player_two, seat_order=1, is_current=True)

    def tearDown(self):
        timezone.deactivate()

    def test_uses_server_timezone_hour(self):
        moment = datetime(2026, 1, 1, 8, 30, tzinfo=datetime_timezone.utc)
        self.assertEqual(get_availability_hour(moment), 8)

    def test_records_move_and_turn_counts_across_midnight(self):
        now = datetime(2026, 1, 2, 0, 15, tzinfo=datetime_timezone.utc)

        record_player_availability_for_turn_change(self.game, "player-one", self.game.latestUpdate, now)

        self.player_one.profile.refresh_from_db()
        self.player_two.profile.refresh_from_db()
        for hour in [22, 23, 0]:
            self.assertEqual(self.player_one.profile.availabilityTurnCounts[hour], 1)
            self.assertEqual(self.player_two.profile.availabilityTurnCounts[hour], 1)
        self.assertEqual(self.player_one.profile.availabilityMoveCounts[0], 1)
        self.assertEqual(sum(self.player_two.profile.availabilityMoveCounts), 0)

    def test_includes_partial_start_hour_for_turn_availability(self):
        examples = [
            (datetime(2026, 1, 1, 15, 50, tzinfo=datetime_timezone.utc), datetime(2026, 1, 1, 16, 4, tzinfo=datetime_timezone.utc), [15, 16]),
            (datetime(2026, 1, 1, 15, 5, tzinfo=datetime_timezone.utc), datetime(2026, 1, 1, 15, 50, tzinfo=datetime_timezone.utc), [15]),
            (datetime(2026, 1, 1, 15, 30, tzinfo=datetime_timezone.utc), datetime(2026, 1, 1, 17, 20, tzinfo=datetime_timezone.utc), [15, 16, 17]),
        ]

        for start_moment, end_moment, expected_hours in examples:
            start_timestamp_ms = str(int(start_moment.timestamp() * 1000))
            self.assertEqual(get_availability_hours_between(start_timestamp_ms, end_moment), expected_hours)

    def test_actor_only_recording_does_not_count_other_current_players(self):
        now = datetime(2026, 1, 2, 0, 15, tzinfo=datetime_timezone.utc)

        record_player_availability_for_turn_change(self.game, "player-one", self.game.latestUpdate, now, record_actor_only=True)

        self.player_one.profile.refresh_from_db()
        self.player_two.profile.refresh_from_db()
        for hour in [22, 23, 0]:
            self.assertEqual(self.player_one.profile.availabilityTurnCounts[hour], 1)
            self.assertEqual(self.player_two.profile.availabilityTurnCounts[hour], 0)
        self.assertEqual(self.player_one.profile.availabilityMoveCounts[0], 1)
        self.assertEqual(sum(self.player_two.profile.availabilityMoveCounts), 0)

    def test_does_not_record_when_actor_is_not_current(self):
        record_player_availability_for_turn_change(self.game, "not-current", self.game.latestUpdate)

        self.player_one.profile.refresh_from_db()
        self.assertEqual(sum(self.player_one.profile.availabilityTurnCounts), 0)
        self.assertEqual(sum(self.player_one.profile.availabilityMoveCounts), 0)

    def test_does_not_record_training_game(self):
        self.game.startingOptions = json.dumps([102])
        self.game.save()

        record_player_availability_for_turn_change(self.game, "player-one", self.game.latestUpdate)

        self.player_one.profile.refresh_from_db()
        self.assertEqual(sum(self.player_one.profile.availabilityTurnCounts), 0)
        self.assertEqual(sum(self.player_one.profile.availabilityMoveCounts), 0)

    def test_normalizes_bad_arrays(self):
        self.assertEqual(normalize_availability_counts(["bad", 2, -1])[:4], [0, 2, 0, 0])
        self.assertEqual(len(normalize_availability_counts([1] * 30)), 24)
