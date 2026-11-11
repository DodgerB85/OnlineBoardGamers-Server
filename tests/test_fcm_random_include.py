import json
from unittest.mock import patch

from FCM.common import buildFCMstartingOptions
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils.translation import gettext, override
from tests import test_fcm_random_exclude as exclude_tests

_random_options = exclude_tests._random_options


class RandomIncludeTests(TestCase):
    setUp = exclude_tests.RandomExcludePoolTests.setUp
    _join_full_game = exclude_tests.RandomExcludePoolTests._join_full_game
    _randrange = staticmethod(exclude_tests.RandomExcludePoolTests._randrange)

    def test_missing_or_empty_random_bounds_use_defaults_and_empty_pool_still_clamps(self):
        core = [8,9,10,11,12,13,14,15,16,17,18,19,20,22,23]
        for bounds in [{}, {"minModules": "", "maxModules": ""},
                       {"minModules": "", "maxModules": "4"}, {"minModules": "3"}]:
            with self.subTest(bounds=bounds):
                post = {"enableAdvancedOptions": "", "randomModules": "", **bounds}
                post.update({f"exclude_{mod}": "" for mod in core})
                options = buildFCMstartingOptions(post)
                self.assertIn(21000 + int(bounds.get("minModules") or 1), options)
                self.assertIn(21100 + int(bounds.get("maxModules") or 15), options)
                with patch("Lobby.presenters.random.randrange", side_effect=self._randrange) as roll:
                    self._join_full_game(options)
                self.assertEqual(roll.call_args_list[0].args, (0, 1, 1))

    def test_form_writes_only_known_sorted_unique_include_markers(self):
        options = buildFCMstartingOptions({
            "enableAdvancedOptions": "", "randomModules": "", "random_MS": "201",
            "minModules": "5", "maxModules": "5", "include_16": "",
            "include_10": "", "include_010": "", "include_42": "",
            "include_51": "", "include_53": "", "include_99": "",
            "include_200": "", "include_invalid": "",
        })
        self.assertEqual([x for x in options if 1100 <= x < 1200], [1110, 1116, 1142, 1151, 1153])
        self.assertIn(21005, options)
        self.assertIn(21105, options)

    def test_forged_direct_flags_do_not_duplicate_mandatory_or_bypass_exclusions(self):
        options = _random_options("02", fan=False, excluded=[16]) + [1110, 1116, 10, 16]
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(options)
        final = json.loads(game.startingOptions)
        self.assertEqual(final.count(10), 1)
        self.assertNotIn(16, final)
        self.assertEqual(len([m for m in final if m in [9,10,11,12,13,14,15,16,17,18,19,20,22,23]]), 2)

    def test_mandatory_labels_are_translated_in_existing_locales(self):
        for language in ["zh-hans", "de", "es", "fr", "it"]:
            with self.subTest(language=language), override(language):
                for message in ["Specify mandatory modules", "Mandatory modules count toward Min/Max. Excluded modules take precedence."]:
                    self.assertNotEqual(gettext(message), message)

    @override_settings(COMPRESS_ENABLED=False, COMPRESS_OFFLINE=False)
    def test_creation_page_renders_both_panels_in_english_and_chinese(self):
        exclude_tests.User.objects.create_user(username="SHADOW")
        for language, label in [("en", "Specify mandatory modules"), ("zh-hans", "指定必选模块")]:
            with self.subTest(language=language):
                response = self.client.get(reverse("createFCMpage"), HTTP_ACCEPT_LANGUAGE=language)
                self.assertContains(response, label)
                for choice in ["exclude", "include"]:
                    for mod in [8,9,10,11,12,13,14,15,16,17,18,19,20,22,23,42,43,44,45,46,47,48,49,50,51,53]:
                        self.assertContains(response, f'id="{choice}_{mod}"', count=1)

    def test_only_active_pool_modules_can_be_mandatory(self):
        for fan, chinese, new_ms in [(False,False,True), (True,False,True), (False,True,True), (True,True,False)]:
            with self.subTest(fan=fan, chinese=chinese, new_ms=new_ms):
                options = _random_options("01", fan=fan) + [1108, 1142, 1151, 1153, 1198]
                if chinese:
                    options.append(203)
                if not new_ms:
                    options.remove(21)
                with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
                    game = self._join_full_game(options)
                final = json.loads(game.startingOptions)
                self.assertEqual(42 in final, chinese)
                self.assertEqual(51 in final, fan)
                self.assertEqual(53 in final, fan)
                self.assertEqual(8 in final, not new_ms)
                self.assertFalse(any(1100 <= x < 1200 for x in final))
                self.assertEqual(game.statsExcludedGame, fan or chinese)

    def test_exclusions_win_and_clamp_to_empty_pool(self):
        core = [9,10,11,12,13,14,15,16,17,18,19,20,22,23]
        options = _random_options("25", fan=False, excluded=core) + [1110, 1116]
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange) as roll:
            game = self._join_full_game(options)
        self.assertEqual(roll.call_args_list[0].args, (0,1,1))
        final = json.loads(game.startingOptions)
        self.assertFalse(set(final) & set(core))
        self.assertFalse(any(1000 <= x < 1200 for x in final))
        self.assertIn(21025, final)
        self.assertIn(21125, final)

    def test_include_markers_never_leak_without_random_mode(self):
        game = self._join_full_game([21, 1110, 1198])
        self.assertEqual(json.loads(game.startingOptions), [21])

    def test_includes_are_not_written_outside_random_mode(self):
        self.assertNotIn(1110, buildFCMstartingOptions({"include_10": ""}))
        self.assertNotIn(1110, buildFCMstartingOptions({"enableAdvancedOptions": "", "include_10": ""}))

    def test_mandatory_count_raises_server_bounds(self):
        options = _random_options("01", fan=False) + [1110, 1116, 1110]
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange) as roll:
            game = self._join_full_game(options)
        self.assertEqual(roll.call_args_list[0].args, (2, 3, 1))
        final = json.loads(game.startingOptions)
        self.assertEqual(final.count(10), 1)
        self.assertEqual(final.count(16), 1)

    def test_mandatory_modules_count_inside_total(self):
        options = _random_options("05", fan=False) + [1110, 1116]
        with patch("Lobby.presenters.random.randrange", side_effect=self._randrange):
            game = self._join_full_game(options)
        final = json.loads(game.startingOptions)
        modules = [m for m in final if m in [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23]]
        self.assertIn(10, modules)
        self.assertIn(16, modules)
        self.assertEqual(len(modules), 5)
        self.assertEqual(len(set(modules)), 5)
        self.assertNotIn(1110, final)
        self.assertNotIn(1116, final)
