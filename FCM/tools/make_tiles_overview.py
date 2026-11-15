"""Build the current New Map help collage without rewriting legacy art.

Original layout: make_tiles_overview.py (5 columns x 3 rows, 240px tiles,
8px white gaps). Start with the checked-in legacy overview: its other twelve
slots include previously approved artwork and must remain pixel-identical.
Only replace map32/map37/map44 with the same numbered, real-game JPGs used
by new games. Run from any directory: python FCM/tools/make_tiles_overview.py
Requires Pillow. Never overwrites the legacy overview or individual map JPGs.
"""
from pathlib import Path

from PIL import Image

IMAGES = Path(__file__).resolve().parents[1] / "static/FCM/images"
REPLACEMENTS = (32, 37, 44)
CELL, GAP, COLS, ROWS = 240, 8, 5, 3


def build_overview(images=IMAGES, output=None):
    images = Path(images)
    output = Path(output) if output is not None else images / "new_map_tiles_overview_v3.png"
    legacy = images / "new_map_tiles_overview.png"
    if output.resolve() == legacy.resolve():
        raise ValueError("The legacy overview is immutable")
    with Image.open(legacy) as source:
        canvas = source.convert("RGB")
    expected_size = (COLS * CELL + (COLS + 1) * GAP, ROWS * CELL + (ROWS + 1) * GAP)
    if canvas.size != expected_size:
        raise ValueError(f"Unexpected legacy overview size: {canvas.size}")
    for number in REPLACEMENTS:
        index = number - 30
        x = GAP + index % COLS * (CELL + GAP)
        y = GAP + index // COLS * (CELL + GAP)
        with Image.open(images / f"map{number}_v3.jpg") as tile:
            canvas.paste(tile.convert("RGB").resize((CELL, CELL)), (x, y))
    canvas.save(output, optimize=True)
    return output


if __name__ == "__main__":
    print(f"saved: {build_overview()}")
