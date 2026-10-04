import json

from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, User

import RNB.RNBconstants as rfRNB


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

    def test_get_request_rejected(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Game.objects.count(), 0)

    def test_anonymous_user_redirected_to_login(self):
        self.client.logout()

        response = self.client.post(self.url, {"playerNumber": 1, "gameName": "Anon"})

        self.assertEqual(response.status_code, 302)
        self.assertIn("login", response.url)
        self.assertEqual(Game.objects.count(), 0)

    def test_private_game_is_private(self):
        response = self.client.post(
            self.url,
            {"playerNumber": 2, "player2": "invited", "privateGame": "1", "gameName": "Private run"},
        )

        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(game.gameStatus, "PRIVATE")
        self.assertEqual(list(game.invitedPlayers.values_list("username", flat=True)), ["invited"])

    def test_too_many_invited_players_rejected(self):
        User.objects.create_user(username="extra", password="pw")

        response = self.client.post(
            self.url,
            {"playerNumber": 2, "player2": "invited", "player3": "extra", "gameName": "Overflow"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("createRNBpage"))
        self.assertIn("Too many players", " ".join(self._messages(response)))
        self.assertEqual(Game.objects.count(), 0)

    def test_module_options_recorded(self):
        response = self.client.post(
            self.url,
            {
                "playerNumber": 2,
                "player2": "invited",
                "gameName": "Modules",
                "useElectricity": "1",
                "useManagement": "1",
                "useFundamentalResearch": "1",
            },
        )

        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="RNB")
        options = json.loads(game.startingOptions)
        self.assertIn(rfRNB.SO_ELECTRICITY, options)
        self.assertIn(rfRNB.SO_MANAGEMENT, options)
        self.assertIn(rfRNB.SO_FUNDAMENTAL_RESEARCH, options)

    def test_learning_game_option_excludes_stats(self):
        response = self.client.post(
            self.url,
            {"playerNumber": 2, "player2": "invited", "gameName": "Learning", "learningGame": "5"},
        )

        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="RNB")
        self.assertIn(5, json.loads(game.startingOptions))
        self.assertTrue(game.statsExcludedGame)

    def test_practice_game_with_four_players_seats_three_shadows(self):
        User.objects.create_user(username="SHADOW_2", password="pw")
        User.objects.create_user(username="SHADOW_3", password="pw")

        response = self.client.post(
            self.url,
            {
                "playerNumber": 4,
                "trainingGame": "1",
                "gameName": "Big practice",
                "player2": "Bot A",
                "player3": "Bot B",
                "player4": "Bot C",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse("indexListType", kwargs={"listType": "current"}))

        game = Game.objects.get(gameCode="RNB")
        usernames = {gp.player.username for gp in game.players.select_related("player")}
        self.assertEqual(usernames, {"creator", "SHADOW", "SHADOW_2", "SHADOW_3"})

        creator_gp = game.players.select_related("player").get(player=self.creator)
        self.assertEqual(creator_gp.notes, '["Bot A","Bot B","Bot C"]')
        self.assertEqual(len(json.loads(game.zoomLevels)), 4)

    def test_zoom_levels_match_actual_players(self):
        User.objects.create_user(username="SHADOW_2", password="pw")
        response = self.client.post(
            self.url, {"playerNumber": 3, "trainingGame": "1", "gameName": "Zoom run"}
        )

        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(len(json.loads(game.zoomLevels)), 3)

    def test_solo_game_ignores_supplied_invite(self):
        response = self.client.post(
            self.url, {"playerNumber": 1, "player2": "invited", "gameName": "Solo with invite"}
        )

        self.assertEqual(response.status_code, 302)
        game = Game.objects.get(gameCode="RNB")
        self.assertEqual(game.maxPlayers, 1)
        self.assertEqual(game.invitedPlayers.count(), 0)
        self.assertEqual(set(game.players.values_list("player__username", flat=True)), {"creator"})
