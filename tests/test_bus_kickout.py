import json
import time

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import SF_buildGamePlayerContext, SF_serializeGame


class BusKickoutTests(TestCase):
    """saveGameDataAfterKickout may only kick the player who is really on turn, and must
    never leave serverCurrentPlayerNamesInTurnOrder naming a player no is_current flag backs -
    that divergence is what paints the whole lobby green."""

    def setUp(self):
        self.players = [User.objects.create_user(username=f"bus-kickout-{index}", password="pw") for index in range(2)]
        self.game = Game.objects.create(
            gameCode="BUS",
            creator=self.players[0],
            host=self.players[0],
            gameStatus="ACTIVE",
            gameName="",
            startingMap="",
            maxPlayers=2,
            kickoutDuration=1,  # blitz: one minute to kickout
            latestUpdate=str(int(time.time() * 1000) - 60 * 60 * 1000),  # idle an hour
            startingOptions="[]",
        )
        GamePlayer.objects.create(game=self.game, player=self.players[0], seat_order=0)
        GamePlayer.objects.create(game=self.game, player=self.players[1], seat_order=1, is_current=True)
        self.game.serverCurrentPlayerNamesInTurnOrder = [self.players[1].username]
        self.game.save()
        self.client.force_login(self.players[0])

    def kickout(self, target, latest_update=None):
        return self.client.post(
            reverse("BUS:processBUSturn"),
            json.dumps(
                {
                    "action": "saveGameDataAfterKickout",
                    "gameID": self.game.id,
                    "kickedName": target.username,
                    "latestUpdate": latest_update or self.game.latestUpdate,
                }
            ),
            content_type="application/json",
        )

    def game_player(self, player):
        return self.game.players.get(player=player)

    def test_kickout_is_refused_while_the_timer_has_not_expired(self):
        self.game.latestUpdate = str(int(time.time() * 1000))
        self.game.save()

        self.assertEqual(self.kickout(self.players[1]).status_code, 400)
        self.assertFalse(self.game_player(self.players[1]).is_kicked)

    def test_kickout_is_refused_for_a_player_not_on_turn(self):
        self.assertEqual(self.kickout(self.players[0]).status_code, 400)
        self.assertFalse(self.game_player(self.players[0]).is_kicked)
        self.assertTrue(self.game_player(self.players[1]).is_current)

    def test_kickout_is_allowed_when_nobody_is_on_turn(self):
        # A game left stuck by an older client has no is_current player at all, so
        # there is nobody to protect - the kickout is the only lever a regular
        # player has to get the game moving again.
        self.game.players.all().update(is_current=False)
        self.game.serverCurrentPlayerNamesInTurnOrder = [self.players[1].username]
        self.game.save()

        self.assertEqual(self.kickout(self.players[1]).status_code, 200)

        self.game.refresh_from_db()
        self.assertTrue(self.game_player(self.players[1]).is_kicked)
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [])

    def test_kickout_can_repair_a_current_player_already_missing_and_kicked(self):
        # Legacy rows could keep is_current on a player who was already kicked;
        # the old code then refused every kickout, leaving the game stuck.
        self.game.players.filter(player=self.players[1]).update(is_missing=True, is_kicked=True)

        self.assertEqual(self.kickout(self.players[1]).status_code, 200)

        self.game.refresh_from_db()
        self.assertFalse(self.game_player(self.players[1]).is_current)
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [])

    def test_successful_kickout_clears_the_turn_order_entry(self):
        self.assertEqual(self.kickout(self.players[1]).status_code, 200)

        self.game.refresh_from_db()
        self.assertTrue(self.game_player(self.players[1]).is_kicked)
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [])

        presenter = self.game.presenter()
        self.assertEqual(presenter.getArrayOfIsCurrentPlayers(), [])
        # Nobody is on turn, so nobody is on move - not everybody
        self.assertFalse(presenter.isMyMove(self.players[0].username))
        self.assertFalse(SF_serializeGame(self.game, self.players[0], SF_buildGamePlayerContext(self.game))["myMove"])

    def test_post_kickout_save_cannot_put_the_kicked_player_back_on_turn(self):
        self.assertEqual(self.kickout(self.players[1]).status_code, 200)

        # The client saves before it drops the kicked player from its own turn order
        self.game.presenter().setCurrentPlayersFromArrInTurnOrder([self.players[1].username])

        self.game.refresh_from_db()
        self.assertEqual(self.game.serverCurrentPlayerNamesInTurnOrder, [])
        self.assertFalse(self.game_player(self.players[1]).is_current)
