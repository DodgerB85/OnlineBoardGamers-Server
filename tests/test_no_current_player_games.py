from django.test import TestCase

from Lobby.modelProxies import NoCurrentPlayerGame
from Lobby.models import Game, GamePlayer, User


class NoCurrentPlayerGameTests(TestCase):
    def setUp(self):
        self.player = User.objects.create_user(username="no_current_player", password="pw")

    def make_game(self, status, is_current=None):
        game = Game.objects.create(gameCode="KFW", creator=self.player, host=self.player, gameStatus=status)
        if is_current is not None:
            GamePlayer.objects.create(game=game, player=self.player, seat_order=0, is_current=is_current)
        return game

    def test_lists_only_active_games_without_a_current_player(self):
        stuck = self.make_game("ACTIVE", False)
        no_players = self.make_game("ACTIVE")
        self.make_game("ACTIVE", True)
        self.make_game("WAITING", False)
        self.make_game("PRIVATE", False)
        self.make_game("FINISHED", False)

        listed_ids = set(NoCurrentPlayerGame.objects.values_list("id", flat=True))

        self.assertEqual(listed_ids, {stuck.id, no_players.id})
