import json
import time
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.constants import KICKOUT_VOTE_TOPIC


class UrrKickoutTests(TestCase):
    def setUp(self):
        self.players = [User.objects.create_user(username=f"urr-kickout-{index}", password="pw") for index in range(3)]
        self.game = Game.objects.create(gameCode="URR", creator=self.players[0], host=self.players[0], gameStatus="ACTIVE", maxPlayers=3, latestUpdate=str(int(time.time() * 1000)), startingOptions="[]")
        for index, player in enumerate(self.players):
            GamePlayer.objects.create(game=self.game, player=player, seat_order=index, is_current=index == 2)
        self.client.force_login(self.players[0])

    def kickout(self, player=None, latest_update=None):
        return self.client.post(reverse("URR:processURRturn"), json.dumps({"action": "kickout", "gameID": self.game.id, "kickedName": (player or self.players[2]).username, "latestUpdate": latest_update or self.game.latestUpdate}), content_type="application/json")

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_votes_are_visible_without_game_version_change(self, kickout_required):
        response = self.kickout()
        self.assertTrue(response.json()["voteCast"])
        data = self.client.post(reverse("URR:URRdata", args=[3]), json.dumps({"gameID": self.game.id, "latestUpdate": self.game.latestUpdate}), content_type="application/json").json()
        self.assertTrue(data["latest"])
        self.assertEqual(data["kickoutRequired"], 2)
        self.assertEqual(data["kickoutVoteThreshold"], 2)
        self.assertEqual(data["kickoutVotesData"][self.players[0].username][0], self.players[2].username)
        self.assertIn("secondsToNextKickout", data)
        self.game.refresh_from_db()
        self.assertFalse(self.game.players.get(player=self.players[2]).is_kicked)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=1)
    def test_cannot_kick_during_flex_time(self, kickout_required):
        self.assertEqual(self.kickout().status_code, 400)
        self.game.refresh_from_db()
        self.assertFalse(self.game.players.get(player=self.players[2]).is_kicked)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_cannot_kick_another_noncurrent_player(self, kickout_required):
        self.assertEqual(self.kickout(self.players[1]).status_code, 400)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_self_kick_and_nonparticipant_are_rejected(self, kickout_required):
        self.assertEqual(self.kickout(self.players[0]).status_code, 403)
        outsider = User.objects.create_user(username="urr-kickout-outsider", password="pw")
        self.client.force_login(outsider)
        self.assertEqual(self.kickout().status_code, 403)

    @patch("URR.views.SN_sendAdminErrorMessage")
    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_stale_kickout_is_rejected_without_voting(self, kickout_required, admin_message):
        self.assertTrue(self.kickout(latest_update="1").json()["syncError"])
        self.game.refresh_from_db()
        self.assertEqual(self.game.presenter().getKickoutVotesData(), {})

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_majority_kickout_reports_missing_seat_and_clears_rewind(self, kickout_required):
        self.game.rewindData = '["old position"]'
        self.game.save(update_fields=["rewindData"])
        previous_update = self.game.latestUpdate
        self.assertTrue(self.kickout().json()["voteCast"])
        self.client.force_login(self.players[1])
        data = self.kickout().json()
        self.assertEqual(data["missingPlayers"], [self.players[2].username])
        self.game.refresh_from_db()
        seat = self.game.players.get(player=self.players[2])
        self.assertTrue(seat.is_missing)
        self.assertTrue(seat.is_kicked)
        self.assertEqual(seat.seat_order, 2)
        self.assertEqual(self.game.rewindData, "")
        self.assertEqual(self.game.presenter().getKickoutVotesData(), {})
        self.assertNotEqual(data["latestUpdate"], previous_update)

    @patch("Lobby.presenters.GamePresenter.kickoutRequired", return_value=2)
    def test_own_two_day_vote_allows_solo_kickout(self, kickout_required):
        self.game.activeVotes = {KICKOUT_VOTE_TOPIC: {self.players[0].username: [self.players[2].username, int((time.time() - 2 * 86400 - 1) * 1000)]}}
        self.game.save(update_fields=["activeVotes"])
        self.assertIn("missingPlayers", self.kickout().json())
        self.assertTrue(self.game.players.get(player=self.players[2]).is_kicked)
