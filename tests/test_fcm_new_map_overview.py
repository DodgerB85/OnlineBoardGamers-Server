"""Help overview regression: latest three tiles, immutable legacy collage."""
from pathlib import Path
import hashlib
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "FCM/static/FCM/images"
CHANGED = (32, 37, 44)


def bounds(number):
    index = number - 30
    x = 8 + index % 5 * 248
    y = 8 + index // 5 * 248
    return x, y, x + 240, y + 240


class NewMapHelpOverviewTests(unittest.TestCase):
    def test_current_help_references_cache_distinct_v3_overview(self):
        text = (ROOT / "FCM/templates/FCM/fanExpansionsHelp.html").read_text(encoding="utf-8")
        self.assertIn("{% static 'FCM/images/new_map_tiles_overview_v3.png' %}", text)
        self.assertNotIn("{% static 'FCM/images/new_map_tiles_overview.png' %}", text)

    def test_all_fifteen_slots_and_only_three_replacements(self):
        legacy = Image.open(IMAGES / "new_map_tiles_overview.png").convert("RGB")
        current = Image.open(IMAGES / "new_map_tiles_overview_v3.png").convert("RGB")
        self.assertEqual(current.size, (1248, 752))
        self.assertEqual(current.size, legacy.size)
        changed, unchanged = [], []
        for number in range(30, 45):
            with self.subTest(map=number):
                old = legacy.crop(bounds(number))
                new = current.crop(bounds(number))
                if number in CHANGED:
                    expected = Image.open(IMAGES / f"map{number}_v3.jpg").convert("RGB").resize((240, 240))
                    self.assertEqual(new.tobytes(), expected.tobytes())
                    self.assertNotEqual(new.tobytes(), old.tobytes())
                    changed.append(number)
                else:
                    self.assertEqual(new.tobytes(), old.tobytes())
                    unchanged.append(number)
        self.assertEqual(changed, list(CHANGED))
        self.assertEqual(len(unchanged), 12)
        # Erase just the three replacement areas: margins and all 12 tiles must match.
        for number in CHANGED:
            current.paste(legacy.crop(bounds(number)), bounds(number)[:2])
        self.assertEqual(current.tobytes(), legacy.tobytes())

    def test_generator_is_reproducible_without_changing_source_assets(self):
        import importlib.util
        import tempfile
        spec = importlib.util.spec_from_file_location("overview", ROOT / "FCM/tools/make_tiles_overview.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sources = [IMAGES / "new_map_tiles_overview.png"] + [IMAGES / f"map{n}_v3.jpg" for n in CHANGED]
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "overview.png"
            module.build_overview(IMAGES, output)
            self.assertEqual(output.read_bytes(), (IMAGES / "new_map_tiles_overview_v3.png").read_bytes())
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources])


if __name__ == "__main__":
    unittest.main()
