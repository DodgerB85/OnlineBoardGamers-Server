import importlib
import time

from django.apps import apps as django_apps
from django.test import TestCase

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, GamePlayer, User

VOTES_MIGRATION = importlib.import_module("Lobby.migrations.0140_gameplayer_votesjson")
KICKOUT_MIGRATION = importlib.import_module("Lobby.migrations.0142_kickout_vote_targets_to_gameplayer")


class GamePlayerVotesTests(TestCase):
    def setUp(self):
        self.players = [User.objects.create_user(username=f"vote-{index}", password="pw") for index in range(3)]
        self.game = Game.objects.create(
            gameCode="HLC",
            creator=self.players[0],
            host=self.players[0],
            gameStatus="ACTIVE",
            maxPlayers=3,
            startingOptions="[]",
        )
        self.game_players = [
            GamePlayer.objects.create(game=self.game, player=player, seat_order=index)
            for index, player in enumerate(self.players)
        ]

    def test_cast_vote_writes_to_the_game_player(self):
        presenter = self.game.presenter()

        self.assertTrue(presenter.castVote(rf.REWIND_CONSENT_VOTE_TOPIC, self.players[0], 2))

        gp = self.game.players.get(player=self.players[0])
        self.assertEqual(gp.votesJSON[rf.REWIND_CONSENT_VOTE_TOPIC], 2)
        self.assertEqual(
            presenter.getFullSetOfVoteResults(rf.REWIND_CONSENT_VOTE_TOPIC, [player.username for player in self.players], 0)[self.players[0].username],
            2,
        )

    def test_cast_vote_without_a_game_player_is_rejected(self):
        outsider = User.objects.create_user(username="vote-outsider", password="pw")
        self.assertFalse(self.game.presenter().castVote(rf.REWIND_CONSENT_VOTE_TOPIC, outsider, 2))

    def test_kickout_vote_is_stored_and_cleared(self):
        presenter = self.game.presenter()
        voter = self.game.players.get(player=self.players[0])
        target = self.game.players.get(player=self.players[2])

        presenter.castKickoutVote(voter, target)

        voter.refresh_from_db()
        self.assertEqual(voter.votesJSON[rf.KICKOUT_VOTE_TOPIC][0], target.pk)
        self.assertEqual(presenter.getKickoutVotesData()[self.players[0].username][0], self.players[2].username)

        presenter.clearKickoutVotes()

        voter.refresh_from_db()
        self.assertNotIn(rf.KICKOUT_VOTE_TOPIC, voter.votesJSON)

    def test_legacy_username_kickout_vote_is_read(self):
        presenter = self.game.presenter()
        voter = self.game.players.get(player=self.players[0])
        voter.votesJSON = {
            rf.KICKOUT_VOTE_TOPIC: [self.players[2].username, int(time.time() * 1000)],
        }
        voter.save(update_fields=["votesJSON"])

        self.assertEqual(presenter.getKickoutVotesData()[self.players[0].username][0], self.players[2].username)

    def test_kickout_vote_keeps_original_time(self):
        presenter = self.game.presenter()
        voter = self.game.players.get(player=self.players[0])
        target = self.game.players.get(player=self.players[2])

        presenter.castKickoutVote(voter, target)
        voter.refresh_from_db()
        first_time = voter.votesJSON[rf.KICKOUT_VOTE_TOPIC][1]
        presenter.castKickoutVote(voter, target)

        voter.refresh_from_db()
        self.assertEqual(voter.votesJSON[rf.KICKOUT_VOTE_TOPIC][1], first_time)

    def test_setup_rewind_consent_sets_host_and_other_players(self):
        presenter = self.game.presenter()

        presenter.setupRewindConsent()

        self.assertEqual(self.game.players.get(player=self.players[0]).votesJSON[rf.REWIND_CONSENT_VOTE_TOPIC], 2)
        self.assertEqual(self.game.players.get(player=self.players[1]).votesJSON[rf.REWIND_CONSENT_VOTE_TOPIC], 0)
        self.assertEqual(self.game.players.get(player=self.players[2]).votesJSON[rf.REWIND_CONSENT_VOTE_TOPIC], 0)

    def test_remove_single_rewind_permission_resets_one_to_zero(self):
        self.game.gameCode = "FCM"
        presenter = self.game.presenter()
        presenter.setVoteResults(
            rf.REWIND_CONSENT_VOTE_TOPIC,
            {self.players[0].username: 2, self.players[1].username: 1, self.players[2].username: 0},
        )

        presenter.removeSingleRewindPermission()

        gp = self.game.players.get(player=self.players[1])
        self.assertEqual(gp.votesJSON[rf.REWIND_CONSENT_VOTE_TOPIC], 0)

    def test_end_game_clears_all_game_player_votes(self):
        presenter = self.game.presenter()
        presenter.castVote(rf.REWIND_CONSENT_VOTE_TOPIC, self.players[0], 2)
        presenter.castVote(rf.DELETE_VOTE_TOPIC, self.players[1], True)

        presenter.clearGeneralDataOnGameEndWithoutSave()

        for gp in self.game.players.all():
            self.assertEqual(gp.votesJSON, {})

    def test_migration_clears_legacy_active_votes(self):
        self.game.activeVotes = {"rewind_consent_votes": {self.players[0].username: 2}}
        self.game.save(update_fields=["activeVotes"])

        VOTES_MIGRATION.clear_active_votes(django_apps, None)

        self.game.refresh_from_db()
        self.assertIsNone(self.game.activeVotes)

    def test_migration_converts_legacy_kickout_target_to_game_player_id(self):
        voter = self.game_players[0]
        target = self.game_players[2]
        voter.votesJSON = {rf.KICKOUT_VOTE_TOPIC: [target.player.username, 123456]}
        voter.save(update_fields=["votesJSON"])

        KICKOUT_MIGRATION.convert_kickout_vote_targets(django_apps, None)

        voter.refresh_from_db()
        self.assertEqual(voter.votesJSON[rf.KICKOUT_VOTE_TOPIC], [target.pk, 123456])
