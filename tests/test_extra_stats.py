import base64
import gzip
import json

import msgpack
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from unittest.mock import patch
from lzstring import LZString

from Lobby.extraStats import collect_extra_stats, decode_game_data, read_history
from Lobby.models import Game, User


CREATED = 1_790_985_600


class HistoryTimingTests(SimpleTestCase):
    def game(self, code):
        return Game(gameCode=code, created=str(CREATED * 1000))

    def test_absolute_relative_and_delta_history_timestamps(self):
        examples = [("TGZ", 7, [100, 300], [CREATED + 100, CREATED + 300]), ("IND", 3, [100, 200], [CREATED + 100, CREATED + 300]), ("WEB", 11, [100, 200], [CREATED + 100, CREATED + 300]), ("RNB", 9, [100, 200], [CREATED + 100, CREATED + 300]), ("KFW", 1, [100, 200], [CREATED + 100, CREATED + 300])]
        for code, index, offsets, expected in examples:
            with self.subTest(code=code):
                data = [None] * (index + 1)
                data[index] = [[1, player, offset, []] for player, offset in enumerate(offsets)]
                self.assertEqual(read_history(self.game(code), data), list(enumerate(expected)))

    def test_fcm_compact_history_reconstructs_deltas_with_optional_sections(self):
        for prefix in [[], [[], [], [], []]]:
            data = prefix + [[CREATED + 100, [0, 1, []], [1, 2, []]], [0, 200], []]
            self.assertEqual(read_history(self.game("FCM"), data), [(0, CREATED + 100), (1, CREATED + 300)])

    def test_hlc_offsets_are_from_the_reference_not_previous_entry(self):
        data = [None] * 17
        data[15] = [CREATED + 100, [0, 1, []], [1, 2, []], [0, 2, []]]
        data[16] = [0, 200, 300]
        game = self.game("HLC")
        game.gameData = LZString().compressToEncodedURIComponent(json.dumps(data))
        self.assertEqual(read_history(game, decode_game_data(game)), [(0, CREATED + 100), (1, CREATED + 300), (0, CREATED + 400)])

    def test_bus_messagepack_and_legacy_json_history(self):
        history = [[1, 0, 100, []], [2, 1, 300, []]]
        for data in [[[[["player"]]], [], [], [], history], [[["player"]], [], [], [], [], [], [], [], history]]:
            with self.subTest(slots=len(data)):
                game = self.game("BUS")
                packed = msgpack.packb(data) if len(data) == 5 else json.dumps(data).encode()
                game.gameData = base64.b64encode(gzip.compress(packed)).decode()
                self.assertEqual(read_history(game, decode_game_data(game)), [(0, CREATED + 100), (1, CREATED + 300)])

    def test_ddl_missing_timestamps_are_not_inferred(self):
        self.assertEqual(read_history(self.game("DDL"), {"history": [[1, 0, "{}"], [2, 1, "{}"]]}), [(0, None), (1, None)])

    def test_urr_uses_explicit_timestamp_in_snapshot_history(self):
        self.assertEqual(read_history(self.game("URR"), {"history": [[1, 0, "{}", None, CREATED + 100]]}), [(0, CREATED + 100)])


@override_settings(STORAGES={"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}, "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}})
class ExtraStatsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="stats-player", password="testpass123")

    def create_game(self, history, **kwargs):
        data = [[], [], [], [], [], [], [], history]
        return Game.objects.create(gameCode="CNS", creator=self.user, host=self.user, gameStatus="FINISHED", maxPlayers=2, created=str(CREATED * 1000), latestUpdate=str((CREATED + 86400 * 4) * 1000), gameData=base64.b64encode(gzip.compress(json.dumps(data).encode())).decode(), **kwargs)

    def test_splits_lobby_play_and_tail_and_counts_player_samples(self):
        self.create_game([[0, -1, 0, []], [1, 0, 86400, []], [2, 1, 86400 * 3, []], [3, 1, 86400 * 3, []]])
        stats = next(game for game in collect_extra_stats() if game["gameCode"] == "CNS")
        metrics = stats["cohorts"]["0"]["metrics"]
        self.assertEqual(metrics["duration"]["average"], 2)
        self.assertEqual(metrics["lifetime"]["average"], 4)
        self.assertEqual(metrics["lobby"]["median"], 1)
        self.assertEqual(metrics["tail"]["average"], 1)
        self.assertEqual(metrics["outside"]["average"], 2)
        self.assertEqual(metrics["actions"]["median"], 1.5)
        self.assertEqual(metrics["actions"]["count"], 2)
        self.assertEqual(metrics["gap"]["count"], 1)
        self.assertEqual(metrics["gap"]["median"], 48)

    def test_excluded_games_and_invalid_timing_do_not_skew_durations(self):
        self.create_game([[1, 0, 86400, []], [2, 1, 86400 * 2, []]], statsExcludedGame=True)
        self.create_game([[1, 0, 86400 * 2, []], [2, 1, 86400, []]])
        stats = next(game for game in collect_extra_stats() if game["gameCode"] == "CNS")
        self.assertEqual(stats["finished"], 1)
        self.assertEqual(stats["missingTiming"], 1)
        self.assertIsNone(stats["cohorts"]["0"]["metrics"]["duration"]["median"])
        self.assertEqual(stats["cohorts"]["0"]["metrics"]["actions"]["average"], 1)
        self.assertEqual(stats["cohorts"]["0"]["metrics"]["lifetime"]["average"], 4)

    def test_hidden_page_renders_at_both_urls_and_is_not_indexed(self):
        for url in [reverse("extraStats"), "/extraStats/"]:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
            self.assertContains(response, "extraStatsData")

    def test_synthetic_preview_has_icon_tabs_and_does_not_change_games_or_cache(self):
        real_stats = collect_extra_stats()
        cache.set("extra_game_stats_v1", real_stats)
        count = Game.objects.count()
        response = self.client.get("/extraStats?demo=FCM")
        self.assertContains(response, 'id="extraStatsGameTabs"')
        self.assertContains(response, 'class="statsIMG"', count=12)
        self.assertContains(response, '"isSynthetic": true')
        self.assertContains(response, 'Synthetic FCM preview')
        self.assertEqual(Game.objects.count(), count)
        self.assertEqual(cache.get("extra_game_stats_v1"), real_stats)
        self.assertNotContains(self.client.get("/extraStats?demo=off"), '"isSynthetic": true')

    @override_settings(DEBUG=True, LOCAL_USER_SQLITE3=True, DEBUG_TOOLBAR_CONFIG={"SHOW_TOOLBAR_CALLBACK": lambda request: False})
    def test_empty_local_fcm_stats_automatically_show_preview(self):
        with patch("Lobby.extraStats.collect_extra_stats", return_value=collect_extra_stats()):
            response = self.client.get("/extraStats")
        self.assertContains(response, '"isSynthetic": true')
