import hashlib
import json
from pathlib import Path
import struct
import unittest


ROOT = Path(__file__).resolve().parents[1]
EXTRACTION = ROOT / 'NTR/static/NTR/map-extraction'


class MapExtractionTests(unittest.TestCase):
    def test_region_evidence_and_directional_associations(self):
        data = json.loads((EXTRACTION / 'regions/kritschen-39.json').read_text())
        seed = (EXTRACTION / 'region-data.js').read_text()
        self.assertEqual(json.loads(seed.removeprefix('window.NTR_REGION = ').strip().removesuffix(';')), data)
        source = (EXTRACTION / data['source']['image']).resolve()
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), data['source']['sha256'])
        features = {feature['id']: feature for feature in data['features']}
        self.assertEqual(len(features), len(data['features']))
        penalties = [feature for feature in features.values() if feature['type'] == 'penalty']
        self.assertEqual(len(penalties), 12)
        for penalty in penalties:
            properties = penalty['properties']
            approach = features[properties['approach_id']]
            self.assertIn(properties['enters_locale_id'], approach['properties']['locales'])
        for feature in features.values():
            if 'crop' in feature:
                left, top, right, bottom = feature['source_bounds']
                self.assertTrue(0 <= left < right <= data['source']['size'][0])
                self.assertTrue(0 <= top < bottom <= data['source']['size'][1])
                png = (EXTRACTION / feature['crop']).read_bytes()
                self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II', png[16:24]), (right - left, bottom - top))
            if feature['type'] in ('locale', 'approach'):
                self.assertEqual(feature['status'], 'draft')
            self.assertNotEqual(feature['type'], 'label')
            if feature['type'] == 'approach':
                self.assertIn(feature['properties']['width_units'], (1, 2))
                self.assertGreater(feature['geometry']['stroke_width'], 0)
            if feature['type'] == 'penalty':
                self.assertLessEqual(feature['geometry']['width'], 37)
                self.assertLessEqual(feature['geometry']['height'], 15)
        self.assertEqual(features['setup-bessieres']['properties']['unit_count'], 4)
        self.assertEqual(features['reserve-39']['type'], 'reserve')


if __name__ == '__main__':
    unittest.main()
