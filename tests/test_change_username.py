from datetime import timedelta

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from Lobby.models import Game, GamePlayer, Tournament, User


class ChangeUsernameTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="oldname", password="pw")
        self.client.force_login(self.user)
        self.url = reverse("profile")

    def _change(self, username):
        return self.client.post(self.url, {"action": "changeUsername", "username": username})

    def _messages(self, response):
        return [str(message) for message in get_messages(response.wsgi_request)]

    def test_change_when_idle(self):
        response = self._change("newname")

        self.assertEqual(response["Location"], reverse("profile"))
        self.user.refresh_from_db()
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.username, "newname")
        self.assertIsNotNone(self.user.profile.usernameLastChanged)

    def test_second_change_blocked_during_cooldown(self):
        self._change("newname")

        response = self._change("thirdname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newname")
        self.assertTrue(any("You can change your username again on" in message for message in self._messages(response)))

    def test_change_allowed_after_cooldown(self):
        self.user.profile.usernameLastChanged = timezone.now() - timedelta(days=91)
        self.user.profile.save(update_fields=["usernameLastChanged"])

        self._change("newname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newname")

    def test_unfinished_game_blocks_change(self):
        game = Game.objects.create(
            creator=self.user,
            host=self.user,
            gameCode="FCM",
            gameStatus="ACTIVE",
        )
        GamePlayer.objects.create(game=game, player=self.user)

        response = self._change("newname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "oldname")
        self.assertIn("unfinished game", self._messages(response)[0])

    def test_finished_game_does_not_block_change(self):
        game = Game.objects.create(
            creator=self.user,
            host=self.user,
            gameCode="FCM",
            gameStatus="FINISHED",
        )
        GamePlayer.objects.create(game=game, player=self.user)

        self._change("newname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newname")

    def test_unfinished_tournament_blocks_change(self):
        tournament = Tournament.objects.create(
            tournamentName="Test Tournament",
            maxTournamentPlayers=4,
            maxGamePlayers=2,
            tournamentStatus="IP",
        )
        tournament.startingPlayers.add(self.user)

        response = self._change("newname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "oldname")
        self.assertIn("unfinished tournament", self._messages(response)[0])

    def test_finished_tournament_does_not_block_change(self):
        tournament = Tournament.objects.create(
            tournamentName="Test Tournament",
            maxTournamentPlayers=4,
            maxGamePlayers=2,
            tournamentStatus="FN",
        )
        tournament.startingPlayers.add(self.user)

        self._change("newname")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newname")

    def test_duplicate_username_is_rejected(self):
        User.objects.create_user(username="taken", password="pw")

        response = self._change("TAKEN")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "oldname")
        self.assertIn("Username already taken", self._messages(response)[0])

    def test_reserved_username_is_rejected(self):
        response = self._change("BotKickStarter")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "oldname")
        self.assertIn("reserved", self._messages(response)[0])

    def test_profile_shows_rule_and_form_when_idle(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "once every 90 days")
        self.assertContains(response, 'value="changeUsername"')

    def test_profile_hides_form_when_blocked(self):
        game = Game.objects.create(
            creator=self.user,
            host=self.user,
            gameCode="FCM",
            gameStatus="ACTIVE",
        )
        GamePlayer.objects.create(game=game, player=self.user)

        response = self.client.get(self.url)

        self.assertContains(response, "unfinished game")
        self.assertNotContains(response, 'value="changeUsername"')

    def test_profile_shows_next_change_date_during_cooldown(self):
        self.user.profile.usernameLastChanged = timezone.now()
        self.user.profile.save(update_fields=["usernameLastChanged"])

        response = self.client.get(self.url)

        self.assertContains(response, "Next change available on")
        self.assertNotContains(response, 'value="changeUsername"')
