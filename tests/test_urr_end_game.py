"""URR end-game cleanup and winner handling."""

import json
import time
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from Lobby.models import Game, GamePlayer
from Lobby.presenters import URRpresenter
from URR import URRconstants as rfURR
from URR.views import performSaveURRGame

User = get_user_model()


class UrrEndGameTests(TestCase):
    def setUp(self):
        self.users = [User.objects.create_user(username=f"urrEnd{i}", password="pw") for i in range(3)]
        self.game = Game.objects.create(
            gameCode="URR",
            gameStatus="ACTIVE",
            turn=5,
            phase=rfURR.PHASE_GAME_OVER,
            maxPlayers=3,
            latestUpdate=str(int(time.time() * 1000)),
            startingOptions="[]",
            playerOrderSeed=1,
            creator=self.users[0],
            host=self.users[0],
            rewindData='["old"]',
            rewindTempData='["temp"]',
            kickoutFlexiData='["flex"]',
            activeVotes={"kickout": {"a": ["b", 1]}},
            autoMoves="x",
            playerTradeData="x",
            playersPreMoveData="x",
            FCMplayersMoveData="x",
            currentPlayersInTurnOrder=["a"],
            serverCurrentPlayerNamesInTurnOrder=[user.username for user in self.users],
            transactionID="tx",
        )
        for index, user in enumerate(self.users):
            GamePlayer.objects.create(
                game=self.game,
                player=user,
                seat_order=index,
                is_current=index == 0,
                moveDataJSON={"x": 1},
                currentMoveTime="x",
                currentMoveData="y",
                flexiSecondsUsed=300,
                remainingTurnOrder=2,
            )
        self.game.save()

    def test_end_game_clears_scratch_data_and_marks_tied_winners_from_positions(self):
        request = SimpleNamespace(user=self.users[0])
        with patch("django_q.tasks.async_task") as async_task:
            URRpresenter(self.game).endGame(request, "missing-username", [[1, 2], [0]], [], self.game.id)

        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        self.assertEqual(self.game.rewindData, "")
        self.assertEqual(self.game.rewindTempData, "")
        self.assertEqual(self.game.kickoutFlexiData, "")
        self.assertIsNone(self.game.activeVotes)
        self.assertIsNone(self.game.autoMoves)
        self.assertEqual(self.game.playerTradeData, "")
        self.assertEqual(self.game.playersPreMoveData, "")
        self.assertEqual(self.game.FCMplayersMoveData, "")
        self.assertIsNone(self.game.currentPlayersInTurnOrder)
        self.assertIsNone(self.game.serverCurrentPlayerNamesInTurnOrder)
        self.assertEqual(self.game.transactionID, "")

        winners = list(self.game.players.filter(winner=True).select_related("player"))
        self.assertEqual([winner.player.username for winner in winners], [self.users[1].username, self.users[2].username])
        self.assertFalse(GamePlayer.objects.get(game=self.game, player=self.users[0]).winner)

        for game_player in GamePlayer.objects.filter(game=self.game):
            self.assertIsNone(game_player.moveDataJSON)
            self.assertEqual(game_player.currentMoveTime, "")
            self.assertEqual(game_player.currentMoveData, "")
            self.assertEqual(game_player.flexiSecondsUsed, 0)
            self.assertIsNone(game_player.remainingTurnOrder)

        notification = async_task.call_args.args
        self.assertEqual(notification[0], "Lobby.sharedFunctions.sharedNotifications.SN_M_sendEndGameNotificationAnyGame")
        self.assertEqual(notification[1], "URR")
        self.assertEqual(
            notification[2],
            [
                [self.users[1].username, "Joint 1st - Congratulations!", 0],
                [self.users[2].username, "Joint 1st - Congratulations!", 0],
                [self.users[0].username, "3rd", 1],
            ],
        )

    def test_end_game_accepts_a_single_winner_and_flat_positions(self):
        request = SimpleNamespace(user=self.users[0])
        with patch("django_q.tasks.async_task"):
            URRpresenter(self.game).endGame(request, self.users[1].username, [1, 0, 2], [], self.game.id)

        self.game.refresh_from_db()
        winners = list(self.game.players.filter(winner=True).select_related("player"))
        self.assertEqual([winner.player.username for winner in winners], [self.users[1].username])

    def test_final_save_clears_rewind_and_a_finished_game_ignores_late_saves(self):
        self.game.gameData = "old"
        self.game.save()
        payload = {
            "latestUpdate": self.game.latestUpdate,
            "gameData": "new",
            "turn": 5,
            "phase": rfURR.PHASE_GAME_OVER,
            "status": "FINISHED",
            "gameID": self.game.id,
            "saveRewind": True,
            "winnerUsername": [self.users[1].username, self.users[2].username],
            "finalPositions": [[1, 2], [0]],
            "tournamentData": [],
            "allIsCurrentPlayers": [self.users[0].username],
            "allRemainingPlayersInTurnOrder": [user.username for user in self.users],
        }
        with patch("django_q.tasks.async_task"), patch("URR.views.doSaveRewind") as save_rewind:
            performSaveURRGame(SimpleNamespace(user=self.users[0]), self.game, payload)

        save_rewind.assert_not_called()
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameStatus, "FINISHED")
        self.assertEqual(self.game.gameData, "new")
        self.assertEqual(self.game.rewindData, "")
        self.assertEqual(self.game.rewindTempData, "")

        late = dict(payload, latestUpdate=self.game.latestUpdate, gameData="late", turn=99, phase=0, status="ACTIVE")
        response = performSaveURRGame(SimpleNamespace(user=self.users[0]), self.game, late)
        self.assertTrue(json.loads(response.content)["finishedGame"])
        self.game.refresh_from_db()
        self.assertEqual(self.game.gameData, "new")
        self.assertEqual(self.game.turn, 5)
        self.assertEqual(self.game.phase, rfURR.PHASE_GAME_OVER)
