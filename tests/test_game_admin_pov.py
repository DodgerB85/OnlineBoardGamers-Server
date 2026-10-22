from django.test import RequestFactory, TestCase

from Lobby.gameViewHelpers import build_show_game_data
from Lobby.models import Game, GamePlayer, User


class GameAdminPovTests(TestCase):
    """Regression: a game admin who is also seated must keep their own seat.

    ``is_game_admin`` replaced the old ``super_users`` ("BotKickStarter") check
    and forced ``pov = -1`` for every admin, including seated ones. Their own
    practice games then opened as observer-only: "please login/register" banner
    and no legal moves. Only an admin without a live seat may view as -1.
    """

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pw")
        self.admin.profile.is_game_admin = True
        self.admin.profile.save()
        self.game = Game.objects.create(
            gameCode="RNB",
            creator=self.admin,
            host=self.admin,
            gameStatus="ACTIVE",
            maxPlayers=2,
        )
        GamePlayer.objects.create(game=self.game, player=self.admin, seat_order=0)

    def _pov(self, user):
        request = RequestFactory().get("/")
        request.user = user
        return build_show_game_data(request, self.game.id, "RNB")["pov"]

    def test_seated_game_admin_keeps_their_seat(self):
        self.assertEqual(self._pov(self.admin), 0)

    def test_admin_without_a_seat_still_views_as_minus_one(self):
        observer = User.objects.create_user(username="observer", password="pw")
        observer.profile.is_game_admin = True
        observer.profile.save()

        self.assertEqual(self._pov(observer), -1)
