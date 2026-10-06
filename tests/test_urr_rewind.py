"""URR rewind keeps legacy and compact-history positions intact."""
import base64
import gzip
import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import RequestFactory, SimpleTestCase

from URR.views import _processURRturn, compressRewindPoint, decompressRewindPoint, doSaveRewind, openingPosition


class UrrRewindTests(SimpleTestCase):
    def test_legacy_and_compressed_positions_round_trip(self):
        position = json.dumps({"players": [{"name": "玩家"}], "history": []})
        legacy_compressed = "gzip:" + base64.b64encode(gzip.compress(position.encode("utf-8"), compresslevel=9, mtime=0)).decode("ascii")
        self.assertEqual(decompressRewindPoint(position), position)
        self.assertEqual(decompressRewindPoint(legacy_compressed), position)
        self.assertEqual(compressRewindPoint(legacy_compressed), legacy_compressed)
        self.assertEqual(decompressRewindPoint(compressRewindPoint(position)), position)
        game = SimpleNamespace(rewindData=json.dumps([legacy_compressed]), rewindTempData=position)
        doSaveRewind(game, {}, position)
        self.assertEqual(json.loads(game.rewindData), [legacy_compressed], "Compression levels must not create duplicate rewind points")

    def test_rewind_preserves_mixed_positions_and_rewound_branch(self):
        game = SimpleNamespace(
            rewindData=json.dumps(["legacy", compressRewindPoint("compressed")]),
            rewindTempData="rewound",
        )
        doSaveRewind(game, {}, "before move")
        points = json.loads(game.rewindData)
        self.assertTrue(all(point.startswith("gzip:") for point in points))
        self.assertEqual([decompressRewindPoint(point) for point in points], ["legacy", "compressed", "rewound", "before move"])
        self.assertEqual(game.rewindTempData, "")
        doSaveRewind(game, {}, "before move")
        self.assertEqual(json.loads(game.rewindData), points, "The same position must not be appended twice")

    def test_rewind_retains_twenty_latest_positions(self):
        game = SimpleNamespace(rewindData=json.dumps([str(index) for index in range(22)]), rewindTempData="")
        doSaveRewind(game, {}, "22")
        self.assertEqual([decompressRewindPoint(point) for point in json.loads(game.rewindData)], [str(index) for index in range(3, 23)])

    def test_opening_position_uses_full_checkpoint_with_compact_history(self):
        opening = {"players": [{"name": "A"}], "gameflow": {"turn": 1, "phase": 0}}
        initial_entry = [0, -1, json.dumps(opening), None, 12345]
        history = [initial_entry, [1, 0, {"format": "urr-history-delta-v1", "changes": [[["players", "0", "money"], 590]]}, {"type": "buyNation"}, 12346]]
        saved = json.dumps({**opening, "history": history})
        expected = json.dumps({**opening, "history": [initial_entry]})
        self.assertEqual(json.loads(openingPosition(saved)), json.loads(expected))
        game = SimpleNamespace(rewindData="", rewindTempData="")
        doSaveRewind(game, {"gameData": saved}, "")
        self.assertEqual(json.loads(decompressRewindPoint(json.loads(game.rewindData)[0])), json.loads(expected))

    def test_loaded_position_keeps_redo_anchor_in_client_representation(self):
        presenter = Mock()
        presenter.getSecondsToNextKickout.return_value = 99999
        game = SimpleNamespace(gameData="legacy snapshot history", rewindTempData="legacy snapshot history", latestUpdate="12345", turn=1, phase=3, presenter=Mock(return_value=presenter), save=Mock())
        request = RequestFactory().post(
            "/URR/processURRturn/",
            data=json.dumps({"action": "updateDataFromLoadRewind", "gameID": 1, "gameData": "compact snapshot history", "turn": 1, "phase": 3, "allIsCurrentPlayers": ["A"], "allRemainingPlayersInTurnOrder": ["A"]}),
            content_type="application/json",
        )
        request.user = SimpleNamespace(is_authenticated=True)
        with patch("URR.views.Game.objects.get", return_value=game):
            response = _processURRturn(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(game.gameData, "compact snapshot history")
        self.assertEqual(game.rewindTempData, game.gameData)
        game.save.assert_called_once()
