from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from Lobby.models import Game, GamePlayer, Lock, Profile, User


class TestUserModel(TestCase):
    def test_str_active_user(self):
        user = User.objects.create_user(username="testplayer", password="testpass123")
        user.is_active = True
        user.save()
        self.assertEqual(str(user), "testplayer ")

    def test_str_inactive_user(self):
        user = User.objects.create_user(username="inactiveuser", password="testpass123")
        user.is_active = False
        user.save()
        self.assertIn("NOT AN ACTIVE USER", str(user))


class TestProfileCreation(TestCase):
    def test_profile_created_on_user_creation(self):
        user = User.objects.create_user(username="newuser", password="testpass123")
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_profile_defaults(self):
        user = User.objects.create_user(username="defaultuser", password="testpass123")
        profile = user.profile
        self.assertTrue(profile.sendEmailNotificationOnTurn)
        self.assertFalse(profile.email_confirmed)
        self.assertTrue(profile.showAssistance)
        self.assertEqual(profile.preferredRestaurantColour, -1)
        self.assertFalse(profile.highContrastBoardItems)
        self.assertEqual(profile.liveNotification, 1)

    def test_profile_str(self):
        user = User.objects.create_user(username="struser", password="testpass123", email="test@example.com")
        profile = user.profile
        result = str(profile)
        self.assertIn("struser", result)
        self.assertIn("test@example.com", result)


class TestLockModel(TestCase):
    def test_is_expired_true(self):
        lock = Lock.objects.create(name="test_lock")
        # Manually set created_at in the past
        Lock.objects.filter(name="test_lock").update(created_at=timezone.now() - timedelta(seconds=120))
        lock.refresh_from_db()
        self.assertTrue(lock.is_expired(60))

    def test_is_expired_false(self):
        lock = Lock.objects.create(name="test_lock_fresh")
        self.assertFalse(lock.is_expired(60))

    def test_str(self):
        lock = Lock.objects.create(name="my_lock")
        self.assertEqual(lock.name, "my_lock")


class TestGameModel(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="creator", password="testpass123")

    def test_game_creation_defaults(self):
        game = Game.objects.create(gameCode="CNS", creator=self.user, host=self.user)
        self.assertEqual(game.gameStatus, "AVAILABLE")
        self.assertEqual(game.turn, 0)
        self.assertEqual(game.phase, 0)
        self.assertEqual(game.kickoutDuration, 200)
        self.assertEqual(game.gamePace, 30)
        self.assertEqual(game.maxPlayers, 2)

    def test_game_str(self):
        game = Game.objects.create(gameCode="FCM", gameName="Test Game", creator=self.user, host=self.user)
        result = str(game)
        self.assertIn("FCM", result)
        self.assertIn("Test Game", result)

    def test_game_str_no_name(self):
        game = Game.objects.create(gameCode="TGZ", creator=self.user, host=self.user)
        result = str(game)
        self.assertIn("TGZ", result)

    def test_presenter_returns_correct_type(self):
        game = Game.objects.create(gameCode="CNS", creator=self.user, host=self.user)
        presenter = game.presenter()
        self.assertIsNotNone(presenter)

    def test_getGameCode(self):
        game = Game.objects.create(gameCode="AQY", creator=self.user, host=self.user)
        self.assertEqual(game.getGameCode(), "AQY")


class TestGamePlayerModel(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="player1", password="testpass123")
        self.creator = User.objects.create_user(username="creator", password="testpass123")
        self.game = Game.objects.create(gameCode="CNS", creator=self.creator, host=self.creator)

    def test_gameplayer_creation(self):
        gp = GamePlayer.objects.create(game=self.game, player=self.user, seat_order=0)
        self.assertEqual(gp.game, self.game)
        self.assertEqual(gp.player, self.user)
        self.assertFalse(gp.winner)
        self.assertFalse(gp.is_missing)
        self.assertFalse(gp.is_kicked)
        self.assertFalse(gp.is_current)
        self.assertFalse(gp.has_chat_notification)
        self.assertFalse(gp.is_pending_finish)

    def test_unique_constraint(self):
        from django.db import IntegrityError

        GamePlayer.objects.create(game=self.game, player=self.user, seat_order=0)
        with self.assertRaises(IntegrityError):
            GamePlayer.objects.create(game=self.game, player=self.user, seat_order=1)

    def test_ordering_by_seat_order(self):
        user2 = User.objects.create_user(username="player2", password="testpass123")
        gp1 = GamePlayer.objects.create(game=self.game, player=self.user, seat_order=1)
        gp2 = GamePlayer.objects.create(game=self.game, player=user2, seat_order=0)
        players = list(self.game.players.all())
        self.assertEqual(players[0], gp2)
        self.assertEqual(players[1], gp1)
