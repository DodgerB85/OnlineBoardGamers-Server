"""Preferred colours from the profile reach the BUS and TGZ Vue pages."""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User


class BusShowOptionsTest(TestCase):
    def test_preferred_colour_reaches_the_page(self):
        player = User.objects.create_user("player", "p@example.com", "pw")
        player.profile.preferredBUSoptions = json.dumps([3, 0, 0])
        player.profile.save(update_fields=["preferredBUSoptions"])
        game = Game.objects.create(
            gameCode="BUS",
            creator=player,
            host=player,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
        )
        GamePlayer.objects.create(game=game, player=player, seat_order=0)
        self.client.force_login(player)
        response = self.client.get(reverse("BUS:showBUSgame", args=[game.id]))
        self.assertContains(response, "initData.preferredBUSoptions = [3, 0, 0];")


class TgzShowOptionsTest(TestCase):
    def test_preferred_colour_reaches_the_page(self):
        player = User.objects.create_user("player", "p@example.com", "pw")
        player.profile.preferredTGZoptions = json.dumps([4, 0, 0])
        player.profile.save(update_fields=["preferredTGZoptions"])
        game = Game.objects.create(
            gameCode="TGZ",
            creator=player,
            host=player,
            gameStatus="ACTIVE",
            gameData="STATE-0",
            startingMap="",
        )
        GamePlayer.objects.create(game=game, player=player, seat_order=0)
        self.client.force_login(player)
        response = self.client.get(reverse("TGZ:showTGZgame", args=[game.id]))
        self.assertContains(response, "initData.preferredTGZoptions = [4, 0, 0];")
