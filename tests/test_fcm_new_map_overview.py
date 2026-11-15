"""Help overview regression: the collage matches the current map tiles."""
from pathlib import Path
import hashlib
import unittest

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "FCM/static/FCM/images"
OVERVIEW = IMAGES / "new_map_tiles_overview.jpg"
TILES = range(30, 45)


class NewMapHelpOverviewTests(unittest.TestCase):
    def test_help_references_the_overview(self):
        text = (ROOT / "FCM/templates/FCM/fanExpansionsHelp.html").read_text(encoding="utf-8")
        self.assertIn("{% static 'FCM/images/new_map_tiles_overview.jpg' %}", text)

    def test_overview_is_an_opaque_jpeg_of_all_fifteen_tiles(self):
        with Image.open(OVERVIEW) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertEqual(image.mode, "RGB")  # no alpha: the collage is opaque
            self.assertEqual(image.size, (1248, 752))

    def test_generator_is_reproducible_without_changing_source_assets(self):
        import importlib.util
        import tempfile
        spec = importlib.util.spec_from_file_location("overview", ROOT / "FCM/tools/make_tiles_overview.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sources = [IMAGES / f"map{number}.jpg" for number in TILES]
        before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "overview.jpg"
            module.build_overview(IMAGES, output)
            with Image.open(output) as rebuilt, Image.open(OVERVIEW) as checked:
                diff = ImageChops.difference(rebuilt.convert("RGB"), checked.convert("RGB"))
                # JPEG re-encoding may differ by a few levels between Pillow builds.
                self.assertLessEqual(max(high for _, high in diff.getextrema()), 12)
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).hexdigest() for p in sources])


if __name__ == "__main__":
    unittest.main()
