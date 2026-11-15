"""Build the New Map help collage from the current map tiles.

5 columns x 3 rows, 240px tiles, 8px white gaps. The collage is opaque, so it
is stored as JPEG. Run from any directory: python FCM/tools/make_tiles_overview.py
Requires Pillow.
"""
from pathlib import Path

from PIL import Image

IMAGES = Path(__file__).resolve().parents[1] / "static/FCM/images"
CELL, GAP, COLS, ROWS = 240, 8, 5, 3


def build_overview(images=IMAGES, output=None):
    images = Path(images)
    output = Path(output) if output is not None else images / "new_map_tiles_overview.jpg"
    size = (COLS * CELL + (COLS + 1) * GAP, ROWS * CELL + (ROWS + 1) * GAP)
    canvas = Image.new("RGB", size, "white")
    for index in range(COLS * ROWS):
        x = GAP + index % COLS * (CELL + GAP)
        y = GAP + index // COLS * (CELL + GAP)
        with Image.open(images / f"map{30 + index}.jpg") as tile:
            canvas.paste(tile.convert("RGB").resize((CELL, CELL)), (x, y))
    canvas.save(output, quality=90, optimize=True)
    return output


if __name__ == "__main__":
    print(f"saved: {build_overview()}")
