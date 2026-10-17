import json
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from FCM.common import buildFCMstartingOptions
from FCM import FCMconstants as rfFCM
from Lobby.models import Game, GamePlayer, User

FAN_FLAGS = [
    rfFCM.SO_FRIED_CHICKEN,
    rfFCM.SO_STADIUM,
    rfFCM.SO_LABOR_MARKET,
    rfFCM.SO_SECOND_BAILOUT,
]


def _random_options(count, fan):
    options = [
        rfFCM.SO_RANDOM_MODULES,
        int(f"{rfFCM.SO_MIN_RANDOM_MODULES}{count}"),
        int(f"{rfFCM.SO_MAX_RANDOM_MODULES}{count}"),
        rfFCM.SO_NEW_MS,
    ]
    if fan:
        options.insert(3, rfFCM.SO_RANDOM_MODULES_FAN)
    return options


class RandomFanPoolTests(TestCase):
    """Marker 204 adds the fan mods to the random pool in startGame."""

    def setUp(self):
        self.patcher = patch("django_q.tasks.async_task")
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

        self.creator = User.objects.create_user(username="creator", password="pw")
        self.joiner = User.objects.create_user(username="joiner", password="pw")
        self.client.force_login(self.joiner)

    def _join_full_game(self, starting_options):
        game = Game.objects.create(
            gameCode="FCM",
            creator=self.creator,
            host=self.creator,
            gameStatus="AVAILABLE",
            maxPlayers=2,
            startingOptions=json.dumps(starting_options),
        )
        GamePlayer.objects.create(game=game, player=self.creator, seat_order=0)
        response = self.client.post(
            reverse("joinGame", kwargs={"gameType": "FCM"}),
            data=json.dumps({"gameID": game.id, "source": "ajax", "action": ""}),
            content_type="application/json",
        )
        self.assertEqual(response.json()["listToShow"], "ACTIVE")
        game.refresh_from_db()
        return game

    @staticmethod
    def _randrange(min_val, max_val, step=1):
        """Pick the requested count, always the last available module."""
        return max_val - 1 if min_val == 0 else min_val

    @staticmethod
    def _randrange_first(min_val, max_val, step=1):
        return min_val

    def test_form_checkbox_writes_marker(self):
        post_data = {
            "enableAdvancedOptions": "",
            "randomModules": "",
            "random_MS": "201",
            "minModules": "4",
            "maxModules": "4",
            "includeFanExpansion": "",
        }
        options = buildFCMstartingOptions(post_data)
        self.assertIn(rfFCM.SO_RANDOM_MODULES_FAN, options)
        self.assertNotIn(rfFCM.SO_RANDOM_MODULES_CHINESE, options)

    def test_fan_marker_adds_fan_mods_to_roll(self):
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(_random_options("04", fan=True))

        final = json.loads(game.startingOptions)
        self.assertNotIn(rfFCM.SO_RANDOM_MODULES_FAN, final)
        for flag in FAN_FLAGS:
            self.assertIn(flag, final)
        self.assertTrue(game.statsExcludedGame)

    def test_no_marker_keeps_fan_mods_out_of_roll(self):
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(_random_options("04", fan=False))

        final = json.loads(game.startingOptions)
        for flag in FAN_FLAGS:
            self.assertNotIn(flag, final)
        self.assertFalse(game.statsExcludedGame)

    def test_marker_without_fan_pick_stays_in_stats(self):
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange_first):
            game = self._join_full_game(_random_options("01", fan=True))

        final = json.loads(game.startingOptions)
        self.assertNotIn(rfFCM.SO_RANDOM_MODULES_FAN, final)
        for flag in FAN_FLAGS:
            self.assertNotIn(flag, final)
        self.assertFalse(game.statsExcludedGame)
