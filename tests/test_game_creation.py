import json

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, User


class RNBGameCreationTests(TestCase):
    """Game creation rules exercised end-to-end through the create endpoint.

    RNB is used as the representative game: it supports solo, practice and
    invited-player creation and routes player validation through the shared
    SF_validatePlayers helper.
    """

    def setUp(self):
        self.creator = User.objects.create_user(username="creator", password="pw")
        self.invited = User.objects.create_user(username="invited", password="pw")
        User.objects.create_user(username="SHADOW", password="pw")
        self.client.force_login(self.creator)
        self.url = reverse("RNB:createRNBgame")

    def _messages(self, response):
        return [str(m) for m in get_messages(response.wsgi_request)]

    def test_cannot_add_yourself_as_another_player(self):
        response = self.client.post(self.url, {"playerNumber": 2, "player2": "creator", "gameName": "Self invite"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createRNBpage"))
        self.assertIn("You cannot add yourself", " ".join(self._messages(response)))
        self.assertEqual(Game.objects.count(), 0)

    def test_cannot_add_nonexistent_player(self):
        response = self.client.post(self.url, {"playerNumber": 2, "player2": "ghost", "gameName": "Bad invite"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createRNBpage"))
        self.assertIn("does not exist", " ".join(self._messages(response)))
        self.assertEqual(Game.objects.count(), 0)

    def test_solo_game_starts_automatically(self):
        response = self.client.post(self.url, {"playerNumber": 1, "gameName": "Solo run"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}))

        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(game.gameStatus, "ACTIVE")
        self.assertEqual(game.maxPlayers, 1)
        self.assertTrue(game.statsExcludedGame)
        self.assertIn(rf.SO_TRAINING_GAME, json.loads(game.startingOptions))

        players = list(game.players.select_related("player"))
        self.assertEqual([gp.player.username for gp in players], ["creator"])
        self.assertTrue(players[0].is_current)

    def test_practice_game_starts_automatically(self):
        response = self.client.post(self.url, {"playerNumber": 2, "trainingGame": "1", "gameName": "Practice run"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}))

        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(game.gameStatus, "ACTIVE")
        self.assertEqual(game.maxPlayers, 2)
        self.assertTrue(game.statsExcludedGame)

        usernames = {gp.player.username for gp in game.players.select_related("player")}
        self.assertEqual(usernames, {"creator", "SHADOW"})

    def test_invited_player_creates_waiting_game(self):
        response = self.client.post(self.url, {"playerNumber": 2, "player2": "invited", "gameName": "Invite run"})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "waiting"}))

        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(game.gameStatus, "WAITING")
        self.assertEqual(list(game.invitedPlayers.values_list("username", flat=True)), ["invited"])

        players = list(game.players.select_related("player"))
        self.assertEqual([gp.player.username for gp in players], ["creator"])
