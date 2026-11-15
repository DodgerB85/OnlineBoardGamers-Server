"""HLC replay links open in spectator mode at the requested step."""

import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class HLCReplayRouteTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user("hlc_replay_player", "hlc@example.com", "pw")
        self.game = Game.objects.create(
            gameCode="HLC",
            creator=self.player,
            host=self.player,
            gameStatus="ACTIVE",
            maxPlayers=2,
            gameData="",
            startingOptions=json.dumps([]),
            currentPlayersInTurnOrder=json.dumps([self.player.username]),
        )
        GamePlayer.objects.create(game=self.game, player=self.player, seat_order=0)
        self.client.force_login(self.player)

    def test_replay_url_opens_at_the_requested_step_as_a_spectator(self):
        response = self.client.get(reverse("HLC:showHLCreplayStep", args=[self.game.id, 4]))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["openReplay"])
        self.assertTrue(response.context["spoilerFree"])
        self.assertEqual(response.context["replayStep"], 4)
        self.assertFalse(response.context["involvedPlayer"])
        self.assertContains(response, "global.openReplay = true")
        self.assertContains(response, "global.replayStep = 4")
        self.assertNotContains(response, "global.liveWS = true")

    def test_normal_show_page_does_not_auto_open_replay(self):
        response = self.client.get(reverse("HLC:showHLCgame", args=[self.game.id]))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["openReplay"])
        self.assertContains(response, "global.openReplay = false")
