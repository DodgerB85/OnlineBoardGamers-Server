"""Rewind stack behaviour for FCM saveNormal.

saveRewind=False must mean "this save creates no rewind point at all". That used
to be untrue: processTurn appended the pre-save gameData unconditionally and the
flag only ever added a second entry, so an FcmAI turn still pushed a rewind point
every time - a state a human can never act on, burning one of the 20 slots.
"""
import json

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, User


def rewind_list(game):
    """The rewind stack as the view would read it back."""
    if not game.rewindData:
        return []
    return json.loads(game.rewindData)


class FcmRewindTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("rewindtester", "r@example.com", "pw")
        self.game = Game.objects.create(gameCode="FCM", creator=self.user, host=self.user, gameStatus="ACTIVE", gameData="STATE-0", startingMap="")
        self.url = reverse("FCM:processTurn")

    def _save(self, save_rewind, new_state):
        self.client.force_login(self.user)
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "action": "saveNormal",
                    "gameID": self.game.id,
                    "latestUpdate": self.game.latestUpdate,
                    "turn": 1,
                    "phase": 4,
                    "status": "ACTIVE",
                    "gameID": self.game.id,
                    "gameData": new_state,
                    "saveRewind": save_rewind,
                    "BKSN": self.user.username,
                    "nextPlayer": [self.user.username],
                    "checksum": False,
                    "IPM": False,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        body = json.loads(response.content)
        self.assertNotIn("syncError", body, body)
        self.game.refresh_from_db()
        return body

    def test_save_rewind_true_appends_a_point(self):
        # seed one point so we can see the append rather than the empty-case seed
        self.game.rewindData = json.dumps(["STATE-SEED"])
        self.game.save()

        self._save(True, "STATE-1")

        stack = rewind_list(self.game)
        self.assertIn("STATE-SEED", stack)
        self.assertIn("STATE-0", stack, "a rewind save must record the pre-save state")
        self.assertEqual(self.game.gameData, "STATE-1")

    def test_save_rewind_false_appends_nothing(self):
        self.game.rewindData = json.dumps(["STATE-SEED"])
        self.game.save()

        self._save(False, "STATE-1")

        stack = rewind_list(self.game)
        self.assertEqual(stack, ["STATE-SEED"], "saveRewind=False must leave the rewind stack untouched")
        self.assertEqual(self.game.gameData, "STATE-1", "the game state itself must still be saved")

    def test_repeated_ai_style_saves_do_not_grow_the_stack(self):
        # what an FcmAI turn does: many saves in a row, all with saveRewind=False
        self.game.rewindData = json.dumps(["STATE-SEED"])
        self.game.save()

        for i in range(1, 6):
            self._save(False, "STATE-%d" % i)

        self.assertEqual(rewind_list(self.game), ["STATE-SEED"])

    def test_one_save_makes_exactly_one_rewind_point(self):
        # A single save must not push two points. It used to: the pre-save state
        # and then the post-save state, which is the start of the NEXT player's
        # turn - so rewinding after your own move landed on FcmAI's turn.
        self.game.rewindData = json.dumps([])
        self.game.save()

        self._save(True, "AFTER-MY-MOVE")

        self.assertEqual(rewind_list(self.game), ["STATE-0"], "one save, one rewind point")

    def test_rewind_after_my_move_returns_my_turn_not_the_ai(self):
        # Walk the real sequence: my turn ends, FcmAI plays through several
        # phases (all saveRewind=False), then I rewind. I must get my own turn
        # back, not the start of the AI's.
        self.game.rewindData = json.dumps([])
        self.game.save()

        self._save(True, "AFTER-MY-RESTAURANT")
        self._save(False, "AI-AFTER-RESTRUCTURE")
        self._save(False, "AI-AFTER-WORKING-DAY")

        # sanity: no AI state leaked into the stack
        stack = rewind_list(self.game)
        self.assertNotIn("AI-AFTER-RESTRUCTURE", stack)
        self.assertNotIn("AI-AFTER-WORKING-DAY", stack)

        self.client.force_login(self.user)
        response = self.client.post(
            self.url,
            data=json.dumps(
                {
                    "action": "loadRewind",
                    "gameID": self.game.id,
                    "latestUpdate": self.game.latestUpdate,
                    "turn": 1,
                    "phase": 5,
                    "latency": 20,
                    "RSRP": False,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        body = json.loads(response.content)
        self.assertNotIn("message", body, body)
        self.assertEqual(body.get("loadData"), "STATE-0", "rewind must restore the state my turn started from")

    def test_mixed_saves_only_grow_on_true(self):
        self.game.rewindData = json.dumps(["STATE-SEED"])
        self.game.save()

        self._save(False, "STATE-1")
        self._save(True, "STATE-2")
        after_true = len(rewind_list(self.game))
        self._save(False, "STATE-3")

        stack = rewind_list(self.game)
        # the True save recorded the state as it stood just before it (STATE-1)
        self.assertIn("STATE-1", stack)
        # the trailing False save recorded nothing at all
        self.assertNotIn("STATE-3", stack)
        self.assertEqual(len(stack), after_true, "saveRewind=False must not grow the stack")
        self.assertEqual(self.game.gameData, "STATE-3", "game state still advances")
