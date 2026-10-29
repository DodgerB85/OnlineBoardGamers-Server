import json
import math
from pathlib import Path
import struct
import unittest


ROOT = Path(__file__).resolve().parents[1]


class BoardExtractionTests(unittest.TestCase):
    def setUp(self):
        self.board = json.loads((ROOT / 'regions/full-board.json').read_text())
        self.features = {feature['id']: feature for feature in self.board['features']}

    def test_browser_copy_and_original_pilot(self):
        browser = (ROOT / 'board-data.js').read_text()
        self.assertEqual(json.loads(browser.removeprefix('window.NTR_BOARD = ').strip().removesuffix(';')), self.board)
        self.assertEqual(len(self.features), len(self.board['features']))
        pilot = json.loads((ROOT / 'regions/kritschen-39.json').read_text())
        for original in pilot['features']:
            feature = self.features[original['id']]
            self.assertEqual(feature['geometry'], original['geometry'], original['id'])
            self.assertEqual(feature['status'], original['status'], original['id'])

    def test_full_board_inventory_and_semantics(self):
        locales = {feature['properties']['locale_id'] for feature in self.features.values() if feature['type'] == 'locale'}
        registry = self.board['locale_registry']['locales']
        self.assertEqual({entry['id'] for entry in registry}, set(range(1, 171)))
        self.assertEqual(locales, {str(entry['id']) for entry in registry if entry['point']})
        self.assertEqual({entry['id'] for entry in registry if entry['point'] is None}, {145, 146})
        for feature in self.features.values():
            properties = feature['properties']
            geometry = feature['geometry']
            points = geometry.get('points', [[geometry.get('x'), geometry.get('y')]])
            for x, y in points:
                self.assertTrue(math.isfinite(x) and math.isfinite(y), feature['id'])
                self.assertTrue(0 <= x <= 5100 and 0 <= y <= 6600, feature['id'])
            self.assertNotEqual(feature['type'], 'label')
            if feature['type'] == 'penalty':
                self.assertIn(properties['penalty'], ('artillery', 'cavalry', 'infantry', 'obstructed', 'impassable'))
                if properties.get('approach_id'):
                    approach = self.features[properties['approach_id']]
                    self.assertIn(properties['enters_locale_id'], approach['properties']['locales'])
                else:
                    self.assertEqual(properties['association_review'], 'unresolved')
            if feature['type'] == 'approach':
                self.assertIn(properties['width_units'], (None, 1, 2))
                if not properties['locales']:
                    self.assertEqual(properties['association_review'], 'unresolved')
                else:
                    self.assertEqual(len(properties['locales']), 2)
                self.assertTrue(set(properties['locales']) <= locales)
            if feature['type'] == 'setup':
                self.assertTrue(properties['commander'])
                self.assertIn(properties['unit_count'], range(1, 9))
            if feature['type'] == 'capacity':
                self.assertIsInstance(properties['value'], int)
            if 'crop' in feature:
                left, top, right, bottom = feature['source_bounds']
                self.assertTrue(0 <= left < right <= 5100 and 0 <= top < bottom <= 6600)
                png = (ROOT / feature['crop']).read_bytes()
                self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II', png[16:24]), (right - left, bottom - top))

    def test_junctions_are_shared_vertices(self):
        for junction in self.board['road_junctions']:
            for road_id in junction['road_ids']:
                self.assertEqual(self.features[road_id]['type'], 'road')
                self.assertIn(junction['point'], self.features[road_id]['geometry']['points'])


if __name__ == '__main__':
    unittest.main()
