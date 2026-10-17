import json
from datetime import datetime, timedelta, timezone as datetime_timezone
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.hotStreaks import get_hot_streak, record_hot_streak
from Lobby.sharedFunctions.sharedNotifications import SN_sendHotStreakReminder, SN_sendMomentumNotification, SN_sendTurnNudge


NOW = datetime(2026, 10, 5, 22, tzinfo=datetime_timezone.utc)


class MomentumTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user(username="momentum-player", password="testpass123")
        self.other = User.objects.create_user(username="momentum-other", password="testpass123")
        self.game = Game.objects.create(gameCode="CNS", gameStatus="ACTIVE", maxPlayers=2, creator=self.player, host=self.player, created="1790985600000", latestUpdate="1790985600000", startingOptions="[]")
        self.seat = GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.other_seat = GamePlayer.objects.create(game=self.game, player=self.other, seat_order=1, is_current=True)
        self.client.force_login(self.player)

    def nudge(self, update=None, player_id=None):
        with patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=1), patch("Lobby.momentumViews.timezone.now", return_value=NOW):
            return self.client.post(reverse("nudgePlayer", args=[self.game.id]), json.dumps({"playerID": player_id or self.other.id, "latestUpdate": update or self.game.latestUpdate}), content_type="application/json")

    @patch("Lobby.sharedFunctions.hotStreaks.schedule")
    def test_shared_daily_streak_credits_once_and_queues_one_reminder(self, schedule):
        with self.captureOnCommitCallbacks(execute=True):
            record_hot_streak(self.game, self.other.username, NOW)
            record_hot_streak(self.game, self.other.username, NOW + timedelta(minutes=1))
        self.game.refresh_from_db()
        self.assertEqual(self.game.streakDays, 1)
        self.assertEqual(self.game.streakBestDays, 1)
        self.assertEqual(self.game.streakLastMoveDate, NOW.date())
        schedule.assert_called_once()
        self.assertEqual(schedule.call_args.kwargs["next_run"], NOW + timedelta(days=1))

    @patch("Lobby.sharedFunctions.hotStreaks.schedule")
    def test_next_day_can_be_saved_by_another_player_and_missed_day_resets(self, schedule):
        record_hot_streak(self.game, self.other.username, NOW)
        self.seat.is_current = True
        self.seat.save()
        record_hot_streak(self.game, self.player.username, NOW + timedelta(days=1))
        self.assertEqual(self.game.streakDays, 2)
        record_hot_streak(self.game, self.other.username, NOW + timedelta(days=3))
        self.assertEqual(self.game.streakDays, 1)
        self.assertEqual(self.game.streakBestDays, 2)

    def test_inactive_player_and_practice_games_do_not_start_streak(self):
        record_hot_streak(self.game, self.player.username, NOW)
        self.assertIsNone(self.game.streakLastMoveDate)
        self.game.startingOptions = "[102]"
        record_hot_streak(self.game, self.other.username, NOW)
        self.assertIsNone(self.game.streakLastMoveDate)

    def test_streak_display_expires_after_missed_day_and_uses_utc(self):
        self.game.streakDays = 5
        self.game.streakBestDays = 8
        self.game.streakLastMoveDate = NOW.date()
        self.assertEqual(get_hot_streak(self.game, NOW + timedelta(days=1))["days"], 5)
        self.assertEqual(get_hot_streak(self.game, NOW + timedelta(days=2))["days"], 0)
        self.assertEqual(get_hot_streak(self.game, NOW + timedelta(days=2))["best"], 8)
        local = datetime(2026, 10, 6, 0, 30, tzinfo=datetime_timezone(timedelta(hours=3)))
        self.assertTrue(get_hot_streak(self.game, local)["hasMovedToday"])

    @patch("Lobby.momentumViews.async_task")
    def test_nudge_preserves_game_version_and_has_shared_cooldown(self, async_task):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.nudge()
        self.assertEqual(response.status_code, 200)
        async_task.assert_called_once()
        self.game.refresh_from_db()
        self.assertEqual(self.game.latestUpdate, "1790985600000")
        self.other_seat.refresh_from_db()
        self.assertEqual(self.other_seat.lastNudgedBy, self.player.username)
        self.assertEqual(self.nudge().status_code, 429)
        self.client.force_login(self.other)
        with patch("Lobby.momentumViews.timezone.now", return_value=NOW):
            data = self.client.get(reverse("gameMomentum", args=[self.game.id])).json()
        self.assertIn(self.player.username, data["nudge"])

    def test_nudge_rejects_stale_game_and_nonparticipant(self):
        self.assertEqual(self.nudge(update="1").status_code, 409)
        outsider = User.objects.create_user(username="outsider", password="testpass123")
        self.client.force_login(outsider)
        self.assertEqual(self.nudge().status_code, 403)

    def test_nudge_respects_recipient_opt_out(self):
        self.other.profile.receiveTurnNudges = False
        self.other.profile.save()
        self.assertEqual(self.nudge().status_code, 400)

    def test_nudge_only_available_after_deadline_and_only_for_pending_players(self):
        with patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=0):
            response = self.client.post(reverse("nudgePlayer", args=[self.game.id]), json.dumps({"playerID": self.other.id, "latestUpdate": self.game.latestUpdate}), content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.other_seat.is_current = False
        self.other_seat.save()
        self.assertEqual(self.nudge().status_code, 409)

    def test_streak_opt_out_hides_game_momentum(self):
        self.player.profile.hotStreakEnabled = False
        self.player.profile.save()
        response = self.client.get(reverse("gameMomentum", args=[self.game.id]))
        self.assertIsNone(response.json()["streak"])

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendMomentumNotification")
    def test_streak_reminder_skips_saved_and_finished_games(self, send):
        self.game.streakLastMoveDate = NOW.date() - timedelta(days=1)
        self.game.streakDays = 3
        self.game.save()
        with patch("Lobby.sharedFunctions.sharedNotifications.timezone.now", return_value=NOW):
            SN_sendHotStreakReminder(self.game.id, self.game.streakLastMoveDate.isoformat())
        send.assert_called_once()
        self.assertEqual(send.call_args.args[1], self.other)
        send.reset_mock()
        self.game.streakLastMoveDate = NOW.date()
        self.game.save()
        SN_sendHotStreakReminder(self.game.id, (NOW.date() - timedelta(days=1)).isoformat())
        send.assert_not_called()
        self.game.gameStatus = "FINISHED"
        self.game.save()
        SN_sendHotStreakReminder(self.game.id, NOW.date().isoformat())
        send.assert_not_called()

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendMomentumNotification")
    def test_queued_nudge_is_dropped_if_a_turn_was_taken(self, send):
        self.other_seat.lastNudgedAt = NOW
        self.other_seat.save()
        self.game.latestUpdate = str(int(NOW.timestamp() * 1000))
        self.game.save()
        SN_sendTurnNudge(self.game.id, self.other.id, self.player.username, "1790985600000", NOW.isoformat())
        send.assert_not_called()

    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendEmail")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendWebhooks")
    @patch("Lobby.sharedFunctions.sharedNotifications.SN_sendDiscordDM")
    def test_external_streak_reminders_default_off_and_respect_opt_out(self, discord, webhooks, email):
        profile = self.other.profile
        profile.email_confirmed = True
        profile.discord_id = "test-discord-id"
        profile.webhooks = '[["DC", "https://example.com/test", ""]]'
        profile.save()
        SN_sendMomentumNotification(self.game, self.other, "Test reminder", "Test subject", is_streak=True)
        email.assert_not_called()
        webhooks.assert_not_called()
        discord.assert_not_called()
        profile.hotStreakReminders = True
        profile.save()
        SN_sendMomentumNotification(self.game, self.other, "Test reminder", "Test subject", is_streak=True)
        email.assert_called_once()
        webhooks.assert_called_once()
        discord.assert_called_once()
        email.reset_mock()
        webhooks.reset_mock()
        discord.reset_mock()
        profile.hotStreakEnabled = False
        profile.save()
        SN_sendMomentumNotification(self.game, self.other, "Test reminder", "Test subject", is_streak=True)
        email.assert_not_called()
        webhooks.assert_not_called()
        discord.assert_not_called()
