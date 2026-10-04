"""
Test: game-end cleanup of per-player scratch state.

clearGeneralDataOnGameEndWithoutSave() is the single choke point every presenter's
endGame() calls first. It clears the Game-level scratch fields (rewindData,
transactionID, ...) but used to leave the GamePlayer rows untouched, so
moveDataJSON / currentMoveTime / currentMoveData survived into finished games.

siteUtils/AutoSiteSweeper.py used to paper over this by blanking them in a daily
batch job and reporting FIELD CHECK FAILED.

Leaving moveDataJSON behind is not merely untidy: RNBmodel.js has a
"kickstart" recovery block that runs processStacks(allStackData) on page load
without a finishedGame guard, so stale moves could be replayed onto a game that
had already finished.

Run with:
    .venv/Scripts/python manage.py test tests.test_game_end --keepdb
"""

import json
import time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, GamePlayer

User = get_user_model()


# Every game with a presenter that calls the shared end-game cleanup.
GAME_CODES = ["FCM", "HLC", "BUS", "TGZ", "CNS", "AQY", "IND", "KFW", "WEB", "RNB", "URR", "DDL", "PAP"]

# A moveDataJSON payload shaped like the ones RNB actually stores.
STALE_MOVE = {
    "turn": 34,
    "phase": 8,
    "status": "pending",
    "username": "playerA",
    "conflictPreset": [1, 0, 0],
}


def _dirty_game_and_players(game_code, with_moves=True):
    """Build an ACTIVE game whose every seat carries leftover per-player state."""
    playerA = User.objects.create_user(username=f"{game_code}_A", password="pw")
    playerB = User.objects.create_user(username=f"{game_code}_B", password="pw")

    game = Game.objects.create(
        gameCode=game_code,
        gameStatus="ACTIVE",
        turn=34,
        phase=8,
        latestUpdate=str(int(time.time() * 1000)),
        gameData="Z29tZXRoaW5n",
        maxPlayers=2,
        currentPlayersInTurnOrder=f"{game_code}_A",
        serverCurrentPlayerNamesInTurnOrder=[f"{game_code}_A", f"{game_code}_B"],
        transactionID="",
        # Game-level scratch fields, all of which must end up blank.
        rewindData='["abc"]',
        rewindTempData="abc",
        kickoutFlexiData="{}",
        activeVotes={"someone": "y"},
        autoMoves="34:8",
        playerTradeData="dirty",
        playersPreMoveData="dirty",
        FCMplayersMoveData="dirty",
        creator=playerA,
        host=playerA,
    )

    for idx, player in enumerate([playerA, playerB]):
        GamePlayer.objects.create(
            game=game,
            player=player,
            is_current=idx == 0,
            seat_order=idx,
            moveDataJSON=[dict(STALE_MOVE)] if with_moves else [],
            currentMoveTime="1700000000000" if with_moves else "",
            currentMoveData="dirty" if with_moves else "",
        )

    return game, playerA, playerB


class GameEndCleanupTests(TestCase):
    """The shared cleanup must blank per-player scratch state, not just Game fields."""

    def test_clears_gameplayer_state_for_every_game(self):
        """
        The bug was per-player state surviving game end. Assert the shared cleanup
        wipes it for every game with a presenter, not just RNB.
        """
        for game_code in GAME_CODES:
            with self.subTest(game=game_code):
                game, _playerA, _playerB = _dirty_game_and_players(game_code)

                # Guard: the fixture must actually be dirty, otherwise this test
                # would pass trivially if the fields were never populated.
                for gp in game.players.all():
                    self.assertTrue(gp.moveDataJSON, f"{game_code}: moveDataJSON fixture is not dirty")
                    self.assertNotEqual(gp.currentMoveData, "", f"{game_code}: currentMoveData fixture is not dirty")

                game.presenter().clearGeneralDataOnGameEndWithoutSave()
                game.save()

                for gp in game.players.all():
                    self.assertIsNone(gp.moveDataJSON, f"{game_code}: moveDataJSON survived game end")
                    self.assertEqual(gp.currentMoveTime, "", f"{game_code}: currentMoveTime survived game end")
                    self.assertEqual(gp.currentMoveData, "", f"{game_code}: currentMoveData survived game end")

    def test_writes_are_persisted_not_just_in_memory(self):
        """
        The cleanup method is named "WithoutSave" and the caller saves the Game.
        Nothing else saves GamePlayer, so the per-player wipe must reach the DB.
        """
        game, _playerA, _playerB = _dirty_game_and_players("RNB")

        game.presenter().clearGeneralDataOnGameEndWithoutSave()
        game.save()

        # Re-read from the database rather than trusting the in-memory objects.
        for gp in GamePlayer.objects.filter(game=game):
            self.assertIsNone(gp.moveDataJSON)
            self.assertEqual(gp.currentMoveTime, "")
            self.assertEqual(gp.currentMoveData, "")

    def test_still_clears_game_level_fields_and_marks_finished(self):
        """Guard against regressing the part the method already did correctly."""
        game, _playerA, _playerB = _dirty_game_and_players("RNB")

        game.presenter().clearGeneralDataOnGameEndWithoutSave()
        game.save()
        game.refresh_from_db()

        self.assertEqual(game.gameStatus, "FINISHED")
        self.assertEqual(game.rewindData, "")
        self.assertEqual(game.rewindTempData, "")
        self.assertEqual(game.kickoutFlexiData, "")
        self.assertIsNone(game.activeVotes)
        self.assertIsNone(game.autoMoves)
        self.assertEqual(game.playerTradeData, "")
        self.assertEqual(game.playersPreMoveData, "")
        self.assertEqual(game.FCMplayersMoveData, "")
        self.assertIsNone(game.currentPlayersInTurnOrder)
        self.assertIsNone(game.serverCurrentPlayerNamesInTurnOrder)
        self.assertEqual(game.transactionID, "")

    def test_endgame_still_marks_the_single_winner(self):
        """
        Full RNB endGame() run: the winner must still be flagged. This guards the
        change against breaking the win path, and proves the wiring end-to-end.
        """
        game, playerA, _playerB = _dirty_game_and_players("RNB")
        request = type("R", (), {"user": playerA})()

        with patch("django_q.tasks.async_task"):
            game.presenter().endGame(request, playerA.username, [0, 1], [], game.id, 10)

        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "FINISHED")

        winners = list(game.players.filter(winner=True).select_related("player"))
        self.assertEqual([w.player.username for w in winners], [playerA.username])

        # And the leftover per-player state is gone via the real endGame path.
        for gp in GamePlayer.objects.filter(game=game):
            self.assertIsNone(gp.moveDataJSON)
            self.assertEqual(gp.currentMoveTime, "")
            self.assertEqual(gp.currentMoveData, "")


class VotesClearedOnGameEndTests(TestCase):
    """
    activeVotes must be empty on a finished game.

    Two things used to resurrect it after endGame cleared it:
      1. FCM's saveNormal called removeSingleRewindPermission() unconditionally,
         including on the same save that called endGame() - so the votes were
         written straight back.
      2. castVote() had no gameStatus guard, so a late vote (stale tab, or the
         FcmAI bot still looping) re-created activeVotes on a FINISHED game.
    """

    def setUp(self):
        import Lobby.sharedFunctions.constants as rf

        self.rf = rf
        self.user = User.objects.create_user(username="pA", password="pw")
        self.rival = User.objects.create_user(username="pB", password="pw")

    def _finished_game(self, game_code="FCM"):
        game, playerA, playerB = _dirty_game_and_players(game_code)
        game.gameStatus = "FINISHED"
        game.activeVotes = None
        game.save()
        return game, playerA, playerB

    def test_rewind_and_kickout_votes_rejected_once_finished(self):
        game, _a, _b = self._finished_game()

        for topic in (self.rf.REWIND_CONSENT_VOTE_TOPIC, self.rf.KICKOUT_VOTE_TOPIC):
            with self.subTest(topic=topic):
                self.assertFalse(game.presenter().castVote(topic, self.user.username, 0))

        game.refresh_from_db()
        self.assertIsNone(game.activeVotes, "A late vote re-created activeVotes on a FINISHED game")

    def test_delete_and_stats_exclude_votes_still_allowed_once_finished(self):
        """Players must still be able to vote to delete / exclude stats after the game ends."""
        game, _a, _b = self._finished_game()

        for topic in (self.rf.DELETE_VOTE_TOPIC, self.rf.STATS_EXCLUDE_VOTE_TOPIC):
            with self.subTest(topic=topic):
                self.assertTrue(game.presenter().castVote(topic, self.user.username, 1))

        # castVote only mutates in memory; processVoteLogic is what persists.
        game.save()
        game.refresh_from_db()
        self.assertIsNotNone(game.activeVotes)

    def test_rewind_vote_still_allowed_while_active(self):
        game, _a, _b = _dirty_game_and_players("FCM")

        self.assertTrue(game.presenter().castVote(self.rf.REWIND_CONSENT_VOTE_TOPIC, self.user.username, 2))
        game.save()
        game.refresh_from_db()
        self.assertEqual(game.activeVotes[self.rf.REWIND_CONSENT_VOTE_TOPIC][self.user.username], 2)

    def test_fcm_save_that_finishes_game_does_not_rewrite_active_votes(self):
        """
        End-to-end reproduction of the reported FIELD CHECK FAILED:
        an FCM saveNormal with status=FINISHED left
        activeVotes={'rewind_consent_votes': {...all zeros...}} on a finished game.
        """
        OLD_TILES = [3, 3, 0, 2, 8, 1, 9, 0, 7, 1, 1, 0, 10, 1, 19, 1, 2, 0]
        game = Game.objects.create(
            gameCode="FCM",
            creator=self.user,
            host=self.user,
            gameStatus="ACTIVE",
            gameData="STATE",
            startingMap=json.dumps(OLD_TILES, separators=(",", ":")),
            activeVotes={"rewind_consent_votes": {self.user.username: 1, self.rival.username: 0}},
            rewindData=json.dumps(["AAAA", "BBBB"], separators=(",", ":")),
        )
        for idx, player in enumerate([self.user, self.rival]):
            GamePlayer.objects.create(game=game, player=player, seat_order=idx, is_current=idx == 0)

        self.client.force_login(self.user)
        payload = {
            "action": "saveNormal",
            "gameID": game.id,
            "latestUpdate": game.latestUpdate,
            "turn": 1,
            "phase": 1,
            "status": "FINISHED",
            "gameData": "FINAL-STATE",
            "saveRewind": False,
            "BKSN": self.user.username,
            "nextPlayer": [],
            "checksum": False,
            "IPM": False,
            "mapTiles": OLD_TILES,
            "winner": self.user.username,
            "finalScores": [[self.user.username, 10], [self.rival.username, 5]],
            "tournamentData": [],
        }
        response = self.client.post(reverse("FCM:processTurn"), data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)

        game.refresh_from_db()
        self.assertEqual(game.gameStatus, "FINISHED")
        self.assertIsNone(
            game.activeVotes,
            f"FCM rewrote vote data onto a finished game: {game.activeVotes}",
        )
        self.assertEqual(game.rewindData, "")