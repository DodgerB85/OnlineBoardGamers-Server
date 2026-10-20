"""URR rewind stores the same compressed model the client saves."""
import base64
import gzip
import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import RequestFactory, SimpleTestCase

from URR.views import _processURRturn, decompressRewindPoint, doSaveRewind, openingPosition


def encode_model(players, replay_start=None):
    data = [[[name, 0] for name in players], [], [], [], [], [], 1, [], [], 0, [], replay_start or []]
    return base64.b64encode(gzip.compress(json.dumps(data).encode("utf-8"), mtime=0)).decode("ascii")


class UrrRewindTests(SimpleTestCase):
    def test_rewind_points_are_stored_as_compressed_models(self):
        first = encode_model(["A", "B"])
        second = encode_model(["C", "D"])
        game = SimpleNamespace(rewindData=json.dumps([first]), rewindTempData=second)
        doSaveRewind(game, {}, second)
        self.assertEqual(json.loads(game.rewindData), [first, second])
        self.assertEqual(game.rewindTempData, "")

        doSaveRewind(game, {}, second)
        self.assertEqual(json.loads(game.rewindData), [first, second], "The same position must not be appended twice")

    def test_rewind_retains_twenty_latest_positions(self):
        game = SimpleNamespace(rewindData=json.dumps([str(index) for index in range(22)]), rewindTempData="")
        doSaveRewind(game, {}, "22")
        self.assertEqual(json.loads(game.rewindData), [str(index) for index in range(3, 23)])

    def test_opening_position_returns_a_client_rebuild_marker(self):
        replay_start = [[["players", "0", "displayName"], "Ann"]]
        saved = encode_model(["A", "B"], replay_start)
        self.assertEqual(json.loads(openingPosition(saved)), {"opening": True, "players": ["A", "B"], "replayStart": replay_start})

    def test_opening_position_rejects_non_model_data(self):
        self.assertEqual(openingPosition("{}"), "")
        self.assertEqual(openingPosition("not a model"), "")

    def test_loaded_position_keeps_redo_anchor_in_client_representation(self):
        presenter = Mock()
        presenter.getSecondsToNextKickout.return_value = 99999
        game = SimpleNamespace(gameData="compressed", rewindTempData="compressed", latestUpdate="12345", turn=1, phase=3, presenter=Mock(return_value=presenter), save=Mock())
        request = RequestFactory().post(
            "/URR/processURRturn/",
            data=json.dumps({"action": "updateDataFromLoadRewind", "gameID": 1, "gameData": "rewound model", "turn": 1, "phase": 3, "allIsCurrentPlayers": ["A"], "allRemainingPlayersInTurnOrder": ["A"]}),
            content_type="application/json",
        )
        request.user = SimpleNamespace(is_authenticated=True)
        with patch("URR.views.Game.objects.get", return_value=game):
            response = _processURRturn(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(game.gameData, "rewound model")
        self.assertEqual(game.rewindTempData, game.gameData)
        game.save.assert_called_once()


    def test_legacy_gzip_points_are_decoded_and_not_duplicated(self):
        position = json.dumps({"version": 2, "players": [{"name": "A"}]})
        compressed = "gzip:" + base64.b64encode(gzip.compress(position.encode("utf-8"))).decode("ascii")
        self.assertEqual(decompressRewindPoint(compressed), position)
        game = SimpleNamespace(rewindData=json.dumps([compressed]), rewindTempData=position)
        doSaveRewind(game, {}, position)
        self.assertEqual(json.loads(game.rewindData), [compressed])

    def test_previous_object_save_keeps_its_opening_changes(self):
        changes = [[["players", "0", "displayName"], "Ann"]]
        saved = json.dumps({"version": 2, "players": [{"name": "A"}], "replay": [], "replayStart": changes})
        self.assertEqual(json.loads(openingPosition(saved)), {"opening": True, "players": ["A"], "replayStart": changes})


    def test_load_rewind_accepts_a_previous_gzip_point(self):
        position = json.dumps({"version": 2, "players": [{"name": "A"}]})
        compressed = "gzip:" + base64.b64encode(gzip.compress(position.encode("utf-8"))).decode("ascii")
        presenter = Mock()
        presenter.getMissingPlayersNamesArray.return_value = []
        game = SimpleNamespace(gameData="current model", rewindData=json.dumps([compressed]), rewindTempData="", latestUpdate="12345", presenter=Mock(return_value=presenter), save=Mock())
        request = RequestFactory().post(
            "/URR/processURRturn/",
            data=json.dumps({"action": "loadRewind", "gameID": 1, "latestUpdate": "12345"}),
            content_type="application/json",
        )
        request.user = SimpleNamespace(is_authenticated=True)
        with patch("URR.views.Game.objects.get", return_value=game):
            response = _processURRturn(request)
        self.assertEqual(json.loads(response.content)["gameData"], position)
        self.assertEqual(game.gameData, position)
        self.assertEqual(game.rewindTempData, position)
        self.assertEqual(json.loads(game.rewindData), [])
