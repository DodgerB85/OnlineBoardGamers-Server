"""Server-side New Map option handling (SO 51/52)."""
from django.test import SimpleTestCase

from FCM import FCMconstants as rfFCM
from FCM.common import buildFCMstartingOptions
from Lobby.sharedFunctions.sharedRefs import SR_getFCMstartingOptionsHTML


class FcmNewMapOptionTests(SimpleTestCase):
    def test_normal_game_does_not_enable_new_map(self):
        options = buildFCMstartingOptions({})

        self.assertNotIn(rfFCM.SO_NEW_MAP, options)
        self.assertNotIn(rfFCM.SO_NEW_MAP_ALL, options)

    def test_new_map_all_implies_new_map(self):
        options = buildFCMstartingOptions({"newMapAll": "52"})

        self.assertIn(rfFCM.SO_NEW_MAP, options)
        self.assertIn(rfFCM.SO_NEW_MAP_ALL, options)

    def test_new_map_shows_a_starting_option_icon(self):
        html = SR_getFCMstartingOptionsHTML([rfFCM.SO_NEW_MAP, rfFCM.SO_NEW_MAP_ALL])

        self.assertIn("so_newMap.svg", html)
        self.assertEqual(html.count("so_newMap.svg"), 1)
