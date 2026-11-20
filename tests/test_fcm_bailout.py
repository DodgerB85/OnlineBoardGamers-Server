"""Second Bailout wire helper: find the open claim night in saved game data."""
import base64
import gzip
import json

from django.test import SimpleTestCase

from FCM import FCMconstants as rfFCM
from FCM.views import _fcm_bailout_next_player


def compress(data):
    return base64.b64encode(gzip.compress(json.dumps(data).encode("utf-8"))).decode("utf-8")


def players(*names):
    return [[[name]] for name in names]


class FcmBailoutNextPlayerTest(SimpleTestCase):
    def test_module_off_or_unclaimed_returns_none(self):
        data = compress([players("alice", "bob"), [], [[1, 0], [], []]])
        self.assertIsNone(_fcm_bailout_next_player(data, []))

    def test_compact_slot_before_media_line_slot(self):
        data = compress(
            [
                players("alice", "bob", "carol"),
                [],
                [[2, 0, 1], [], [2, -1]],
                [-rfFCM.SO_MEDIA_LINE, 3, [], [], [], [], [], 1, {}],
            ]
        )
        self.assertEqual(_fcm_bailout_next_player(data, [rfFCM.SO_SECOND_BAILOUT]), "alice")

    def test_compact_card_claim_uses_pool_and_order(self):
        data = compress([players("alice", "bob"), [], [[0, 1], [14, 1], [0, 14]]])
        self.assertEqual(_fcm_bailout_next_player(data, [rfFCM.SO_SECOND_BAILOUT]), "bob")

    def test_three_entry_non_bailout_array_is_ignored(self):
        data = compress(
            [players("alice", "bob", "carol", "dave", "erin", "frank"), [], [[0, 1, 2, 3], [5, 6, 7, 8], [9, 10, 11, 12]]]
        )
        self.assertIsNone(_fcm_bailout_next_player(data, [rfFCM.SO_SECOND_BAILOUT]))

    def test_tile_slot_and_fully_claimed_night(self):
        data = compress(
            [
                [],
                players("alice", "bob"),
                [],
                [[1, 0], [], [1, -1, 0, -1]],
            ]
        )
        options = [rfFCM.SO_SECOND_BAILOUT, rfFCM.SO_LOBBYISTS]
        self.assertIsNone(_fcm_bailout_next_player(data, options))

    def test_legacy_object_without_open_night(self):
        closed = compress([players("alice", "bob"), {"pending": False, "order": [0], "claims": {}}])
        self.assertIsNone(_fcm_bailout_next_player(closed, [rfFCM.SO_SECOND_BAILOUT]))

    def test_legacy_object_reads_first_unclaimed_seat(self):
        data = compress(
            [
                players("alice", "bob"),
                {"pending": True, "order": [1, 0], "claims": {"0": -1}},
            ]
        )
        self.assertEqual(_fcm_bailout_next_player(data, [rfFCM.SO_SECOND_BAILOUT]), "bob")

    def test_malformed_claims_and_plain_values_are_ignored(self):
        malformed = compress([players("alice", "bob"), {"pending": True, "order": [0], "claims": []}])
        self.assertIsNone(_fcm_bailout_next_player(malformed, [rfFCM.SO_SECOND_BAILOUT]))
        self.assertIsNone(_fcm_bailout_next_player("not gzip", [rfFCM.SO_SECOND_BAILOUT]))
        self.assertIsNone(_fcm_bailout_next_player(compress({"pending": True}), [rfFCM.SO_SECOND_BAILOUT]))
