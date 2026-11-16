from django.contrib import admin
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from Lobby.admin import GameAdmin
from Lobby.models import Game, GamePlayer, User
from Lobby.modelProxies import URRgame


class GameAdminPlayerListTests(TestCase):
    def test_player_list_uses_prefetched_players(self):
        """The changelist prefetch must not be defeated by an extra select_related()."""
        user = User.objects.create_user(username="player1", password="testpass123")
        game = Game.objects.create(gameCode="URR", creator=user, host=user, maxPlayers=2)
        GamePlayer.objects.create(game=game, player=user, seat_order=0)

        prefetched = URRgame.objects.prefetch_related("players__player").get(id=game.id)
        with CaptureQueriesContext(connection) as queries:
            html = GameAdmin(URRgame, admin.site).player_list(prefetched)

        self.assertEqual(len(queries.captured_queries), 0)
        self.assertIn("player1", html)
