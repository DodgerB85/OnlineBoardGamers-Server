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
    rfFCM.SO_MEDIA_LINE,
    rfFCM.SO_NEW_MAP,
]


def _random_options(count, fan, excluded=()):
    options = [
        rfFCM.SO_RANDOM_MODULES,
        int(f"{rfFCM.SO_MIN_RANDOM_MODULES}{count}"),
        int(f"{rfFCM.SO_MAX_RANDOM_MODULES}{count}"),
        rfFCM.SO_NEW_MS,
    ]
    if fan:
        options.insert(3, rfFCM.SO_RANDOM_MODULES_FAN)
    options.extend(rfFCM.SO_EXCLUDED_MODULE_BASE + m for m in excluded)
    return options


class RandomExcludePoolTests(TestCase):
    """Per-module exclusions (SO_EXCLUDED_MODULE_BASE + mod id) shape the roll."""

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

    def test_form_checkboxes_write_exclusion_codes(self):
        post_data = {
            "enableAdvancedOptions": "",
            "randomModules": "",
            "random_MS": "201",
            "minModules": "4",
            "maxModules": "4",
            "exclude_16": "",
            "exclude_42": "",
            "exclude_51": "",
        }
        options = buildFCMstartingOptions(post_data)
        self.assertIn(rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_NIGHT_SHIFT, options)
        self.assertIn(rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_JAZZ_MUSICIANS, options)
        self.assertIn(rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_NEW_MAP, options)
        # Exclusion codes are sorted so the saved option string is deterministic
        base = rfFCM.SO_EXCLUDED_MODULE_BASE
        codes = [x for x in options if base <= x < base + 100]
        self.assertEqual(codes, sorted(codes))

    def test_excluded_module_not_rolled(self):
        # Exclude nightShift (16): pool is 14 core, pick all of them
        opts = _random_options("14", fan=False, excluded=[rfFCM.SO_NIGHT_SHIFT])
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(opts)

        final = json.loads(game.startingOptions)
        self.assertNotIn(rfFCM.SO_NIGHT_SHIFT, final)
        self.assertNotIn(rfFCM.SO_EXCLUDED_MODULE_BASE + rfFCM.SO_NIGHT_SHIFT, final)

    def test_exclusion_codes_stripped_from_final(self):
        opts = _random_options("05", fan=True, excluded=[rfFCM.SO_NIGHT_SHIFT, rfFCM.SO_NEW_MAP])
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(opts)

        final = json.loads(game.startingOptions)
        base = rfFCM.SO_EXCLUDED_MODULE_BASE
        for x in final:
            self.assertFalse(base <= x < base + 100)

    def test_pool_clamped_when_exclusions_shrink_it(self):
        # Exclude 11 core mods: pool drops to 3, min/max of 10/15 must clamp to 3
        excluded = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
        opts = _random_options("10", fan=False, excluded=excluded)
        # bump max to 15
        opts = [x if x != int(f"{rfFCM.SO_MAX_RANDOM_MODULES}10") else int(f"{rfFCM.SO_MAX_RANDOM_MODULES}15") for x in opts]
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(opts)

        final = json.loads(game.startingOptions)
        rolled = [
            x for x in final
            if x in [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23]
        ]
        # 14 core - 11 excluded = 3 left, all three must be picked despite min=10
        self.assertEqual(len(rolled), 3)
        for m in rolled:
            self.assertNotIn(m, excluded)

    def test_fan_pool_now_includes_media_line_and_new_map(self):
        opts = _random_options("20", fan=True)
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(opts)

        final = json.loads(game.startingOptions)
        for flag in FAN_FLAGS:
            self.assertIn(flag, final)
        self.assertTrue(game.statsExcludedGame)

    def test_new_map_can_be_excluded_from_fan_pool(self):
        # Pool 14 core + 6 fan - 1 excluded (newMap) = 19; pick all of them
        opts = _random_options("19", fan=True, excluded=[rfFCM.SO_NEW_MAP])
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(opts)

        final = json.loads(game.startingOptions)
        self.assertNotIn(rfFCM.SO_NEW_MAP, final)
        for flag in FAN_FLAGS:
            if flag != rfFCM.SO_NEW_MAP:
                self.assertIn(flag, final)
