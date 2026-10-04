"""Admin "Reset AI": rebuilding an FCM game on a brand new board.

The map-sync guard in processTurn exists to catch a client whose board has drifted
from the server's, so it rejects any incoming mapTiles that differ from the stored
startingMap. A deliberate reset sends a different board, so it carries resetGame
and must be allowed to replace startingMap - but only for admin accounts.
"""
import json

from django.test import TestCase
from django.urls import reverse

from Lobby.models import Game, User

OLD_TILES = [3, 3, 0, 2, 8, 1, 9, 0, 7, 1, 1, 0, 10, 1, 19, 1, 2, 0]
NEW_TILES = [3, 0, 17, 1, 10, 1, 16, 0, 8, 0, 9, 3, 19, 3, 18, 0, 15, 2]


class FcmResetMapTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin", "a@example.com", "pw")
        self.rival = User.objects.create_user("rival", "r@example.com", "pw")
        self.url = reverse("FCM:processTurn")
        self.game = Game.objects.create(
            gameCode="FCM",
            creator=self.admin,
            host=self.admin,
            gameStatus="ACTIVE",
            gameData="OLD-STATE",
            startingMap=json.dumps(OLD_TILES, separators=(",", ":")),
        )

    def _save(self, user, tiles, **extra):
        self.client.force_login(user)
        payload = {
            "action": "saveNormal",
            "gameID": self.game.id,
            "latestUpdate": self.game.latestUpdate,
            "turn": 0,
            "phase": 0,
            "status": "ACTIVE",
            "gameData": "RESET-STATE",
            "saveRewind": False,
            "BKSN": user.username,
            "nextPlayer": [user.username],
            "checksum": False,
            "IPM": False,
            "mapTiles": tiles,
        }
        payload.update(extra)
        response = self.client.post(self.url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        body = json.loads(response.content)
        self.game.refresh_from_db()
        return body

    def test_reset_replaces_starting_map(self):
        body = self._save(self.admin, NEW_TILES, resetGame=True)
        self.assertNotIn("syncError", body, body)
        self.assertEqual(json.loads(self.game.startingMap), NEW_TILES)
        self.assertEqual(self.game.gameData, "RESET-STATE")

    def test_reset_clears_the_old_rewind_stack(self):
        self.game.rewindData = json.dumps(["OLD-1", "OLD-2"])
        self.game.save()

        self._save(self.admin, NEW_TILES, resetGame=True)

        self.assertEqual(json.loads(self.game.rewindData), [], "rewind points from the discarded game must not survive")

    def test_changed_map_without_reset_is_still_rejected(self):
        # the drift guard must keep working for ordinary saves
        body = self._save(self.admin, NEW_TILES)
        self.assertIn("syncError", body, "a normal save must not be able to change the board")
        self.assertEqual(json.loads(self.game.startingMap), OLD_TILES)

    def test_non_admin_cannot_reset(self):
        body = self._save(self.rival, NEW_TILES, resetGame=True)
        self.assertIn("syncError", body, "only admins may replace the board")
        self.assertEqual(json.loads(self.game.startingMap), OLD_TILES)

    def test_same_map_save_still_works_as_normal(self):
        body = self._save(self.admin, OLD_TILES)
        self.assertNotIn("syncError", body, body)
        self.assertEqual(json.loads(self.game.startingMap), OLD_TILES)
