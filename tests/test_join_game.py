import json
from unittest.mock import patch

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


def playing(game, *users, **kwargs):
    for idx, user in enumerate(users):
        GamePlayer.objects.create(game=game, player=user, seat_order=idx, **kwargs)


class JoinGameTests(TestCase):
    """The join/leave/decline half of the game lifecycle (Lobby.views.joinGame).

    RNB is used as the representative game; completing a game calls the
    presenter's startGame, which queues notifications, so async_task is patched.
    """

    def setUp(self):
        self.patcher = patch("django_q.tasks.async_task")
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.joiner = User.objects.create_user(username="joiner", password="pw")
        self.other = User.objects.create_user(username="other", password="pw")
        self.client.force_login(self.joiner)
        self.url = reverse("joinGame", kwargs={"gameType": "RNB"})

    def _post(self, payload):
        return self.client.post(
            self.url, data=json.dumps(payload), content_type="application/json"
        )

    def _messages(self, response):
        return [str(m) for m in get_messages(response.wsgi_request)]

    def _game(self, **kwargs):
        fields = {
            "gameCode": "RNB",
            "creator": self.creator,
            "host": self.creator,
            "gameStatus": "AVAILABLE",
            "maxPlayers": 2,
        }
        fields.update(kwargs)
        return Game.objects.create(**fields)

    def test_get_request_rejected(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 400)

    def test_joining_nonexistent_game_reports_missing(self):
        response = self._post({"gameID": 999999, "source": "ajax", "action": ""})

        self.assertEqual(response.json()["listToShow"], "AVAILABLE")
        self.assertIn("no longer exists", " ".join(self._messages(response)))

    def test_joining_game_already_in_reports_it(self):
        game = self._game()
        playing(game, self.creator, self.joiner)

        response = self._post({"gameID": game.id, "source": "ajax", "action": ""})

        self.assertEqual(response.json()["listToShow"], "AVAILABLE")
        self.assertIn("already joined", " ".join(self._messages(response)))
        self.assertEqual(game.players.count(), 2)

    def test_blacklisted_player_cannot_join(self):
        game = self._game()
        self.creator.profile.blacklistedPlayers.add(self.joiner)

        response = self._post({"gameID": game.id, "source": "ajax", "action": ""})

        self.assertEqual(response.json()["listToShow"], "AVAILABLE")
        self.assertIn("blocked you", " ".join(self._messages(response)))
        self.assertEqual(game.players.count(), 0)

    def test_full_invite_only_waiting_game_rejects_stranger(self):
        game = self._game(gameStatus="WAITING")
        playing(game, self.creator)
        game.invitedPlayers.add(self.other)

        response = self._post({"gameID": game.id, "source": "ajax", "action": ""})

        self.assertEqual(response.json()["listToShow"], "AVAILABLE")
        self.assertIn("not allowed to join", " ".join(self._messages(response)))
        self.assertEqual(game.players.count(), 1)

    def test_join_that_fills_the_game_starts_it(self):
        game = self._game()
        playing(game, self.creator)

        response = self._post({"gameID": game.id, "source": "ajax", "action": ""})

        self.assertEqual(response.json()["listToShow"], "ACTIVE")
        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "ACTIVE")
        self.assertEqual(set(game.players.values_list("player__username", flat=True)), {"creator", "joiner"})

    def test_vacate_last_player_deletes_game(self):
        game = self._game()
        playing(game, self.joiner)

        response = self._post({"gameID": game.id, "action": "vacate"})

        self.assertEqual(response.json(), ["AVAILABLE"])
        self.assertFalse(Game.objects.filter(id=game.id).exists())

    def test_vacate_active_game_is_rejected(self):
        game = self._game(gameStatus="ACTIVE")
        playing(game, self.creator, self.joiner)

        self._post({"gameID": game.id, "action": "vacate"})

        self.assertTrue(Game.objects.filter(id=game.id).exists())
        self.assertEqual(game.players.count(), 2)

    def test_decline_last_invite_returns_game_to_available(self):
        game = self._game(gameStatus="WAITING")
        playing(game, self.creator)
        game.invitedPlayers.add(self.joiner)

        response = self._post({"gameID": game.id, "action": "decline", "reason": "nope"})

        self.assertEqual(response.json(), ["AVAILABLE"])
        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "AVAILABLE")
        self.assertEqual(game.invitedPlayers.count(), 0)

    def test_only_creator_can_delete_training_game(self):
        game = self._game()

        self._post({"gameID": game.id, "action": "deleteTrgGame"})
        self.assertTrue(Game.objects.filter(id=game.id).exists())

        self.client.force_login(self.creator)
        self._post({"gameID": game.id, "action": "deleteTrgGame"})
        self.assertFalse(Game.objects.filter(id=game.id).exists())
