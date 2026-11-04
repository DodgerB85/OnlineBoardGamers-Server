"""Build the board backgrounds for the generated LBR maps.

The rulebook board is `static/LBR/images/map.jpg`. The generated boards keep its
parchment and grid (tiled from a clean land block) and draw their own river in
the same style: a thin wavy band with a soft edge and lighter blue patches,
clipped at the board border. Labels come from the rulebook art, so a smaller
board keeps only the letters and numbers it uses.

The map list is read from `LBRreference.js`, the client's source of truth.

Usage (needs Pillow):
    python3 LBR/tools/make_map_backgrounds.py
"""
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
IMAGES = ROOT / "LBR/static/LBR/images"
REFERENCE = ROOT / "LBR/vueLBR/src/js/LBRreference.js"

# map.jpg is 8x the 240x160 board: the grid starts at (130, 58) and pitches 104.
CELL = 104
GRID_X = 130
GRID_Y = 58
# The largest land-only block of the rulebook board (rows 1-6, cols 5-11).
LAND_COL = 5
LAND_ROW = 1
LAND_COLS = 7
LAND_ROWS = 6

BACKGROUND = (184, 152, 103)
BORDER = (88, 45, 28)
WATER = (61, 91, 181)
WATER_EDGE = (50, 76, 155)
WATER_LIGHT = (96, 127, 210)
# The rulebook river is a wavy band about half a cell wide, not a filled cell.
WATER_WIDTH = 34
RIVER_EDGE = 6
POND_RADIUS = 60
RIVER_BLUR = 9
RIVER_LEVEL = 128


def map_defs():
    """MAP_DEFS from the client registry, so the boards cannot drift apart."""
    script = (
        f"import {{ MAP_DEFS }} from '{REFERENCE.as_uri()}';"
        "process.stdout.write(JSON.stringify(MAP_DEFS));"
    )
    out = subprocess.check_output(["node", "--input-type=module", "-e", script], text=True)
    return json.loads(out)


def cell_center(row, col, board_w, board_h):
    """The cell centre, nudged by a smooth field so straight runs meander.

    A cell on the board edge moves to the border, so the river leaves the board
    the way the rulebook art does instead of stopping short of it.
    """
    x = GRID_X + col * CELL + CELL // 2
    y = GRID_Y + row * CELL + CELL // 2
    x += math.sin(y * 0.017 + row * 0.9) * 8 + math.cos(x * 0.011 - col * 0.7) * 5
    y += math.cos(x * 0.015 + col * 0.8) * 8 + math.sin(y * 0.013 - row * 0.6) * 5
    if row == 0:
        y = GRID_Y + WATER_WIDTH / 2
    elif row == board_h - 1:
        y = GRID_Y + board_h * CELL - WATER_WIDTH / 2
    if col == 0:
        x = GRID_X + WATER_WIDTH / 2
    elif col == board_w - 1:
        x = GRID_X + board_w * CELL - WATER_WIDTH / 2
    return x, y


def river_mask(defn, width):
    """The river as a soft, wavy band of `width` pixels."""
    rows = defn["rows"]
    board_w, board_h = defn["width"], defn["height"]
    mask = Image.new("L", (1920, 1280), 0)
    draw = ImageDraw.Draw(mask)

    def is_water(row, col):
        return 0 <= row < board_h and 0 <= col < board_w and rows[row][col] == "x"

    for row in range(board_h):
        for col in range(board_w):
            if not is_water(row, col):
                continue
            cx, cy = cell_center(row, col, board_w, board_h)
            draw.ellipse([cx - width / 2, cy - width / 2, cx + width / 2, cy + width / 2], fill=255)
            for dr, dc in ((1, 0), (0, 1)):
                if is_water(row + dr, col + dc):
                    x2, y2 = cell_center(row + dr, col + dc, board_w, board_h)
                    draw.line([cx, cy, x2, y2], fill=255, width=width)

    # A 2x2 water block is the pond: fill its middle instead of leaving a hole.
    pond_radius = POND_RADIUS + (width - WATER_WIDTH) // 2
    for row in range(board_h - 1):
        for col in range(board_w - 1):
            if all(is_water(row + dr, col + dc) for dr in (0, 1) for dc in (0, 1)):
                x = GRID_X + col * CELL + CELL
                y = GRID_Y + row * CELL + CELL
                draw.ellipse([x - pond_radius, y - pond_radius, x + pond_radius, y + pond_radius], fill=255)

    # Round the polyline corners into the rulebook's organic bends, then clip
    # flat at the border so the river does not spill into the labels.
    mask = mask.filter(ImageFilter.GaussianBlur(RIVER_BLUR))
    mask = mask.point(lambda value: 255 if value > RIVER_LEVEL else 0)
    clip = Image.new("L", mask.size, 0)
    ImageDraw.Draw(clip).rectangle(
        [GRID_X, GRID_Y, GRID_X + board_w * CELL - 1, GRID_Y + board_h * CELL - 1], fill=255
    )
    return ImageChops.multiply(mask, clip)


def highlight_mask(defn, water):
    """The lighter blue patches inside the river."""
    rows = defn["rows"]
    board_w, board_h = defn["width"], defn["height"]
    mask = Image.new("L", (1920, 1280), 0)
    draw = ImageDraw.Draw(mask)
    for row in range(board_h):
        for col in range(board_w):
            if rows[row][col] != "x" or (row * 7 + col * 11) % 3:
                continue
            cx, cy = cell_center(row, col, board_w, board_h)
            ox = math.sin(row * 2.1 + col * 1.3) * 10
            oy = math.cos(row * 1.7 + col * 2.9) * 10
            radius = 8 + (row * 5 + col * 3) % 6
            draw.ellipse([cx + ox - radius, cy + oy - radius, cx + ox + radius, cy + oy + radius], fill=255)
    return ImageChops.multiply(mask.filter(ImageFilter.GaussianBlur(3)), water)


def make_background(base, defn):
    width, height = defn["width"], defn["height"]
    land = base.crop(
        (
            GRID_X + LAND_COL * CELL,
            GRID_Y + LAND_ROW * CELL,
            GRID_X + (LAND_COL + LAND_COLS) * CELL,
            GRID_Y + (LAND_ROW + LAND_ROWS) * CELL,
        )
    )

    out = base.copy()
    for row in range(height):
        for col in range(width):
            sx = (col % LAND_COLS) * CELL
            sy = (row % LAND_ROWS) * CELL
            out.paste(land.crop((sx, sy, sx + CELL, sy + CELL)), (GRID_X + col * CELL, GRID_Y + row * CELL))

    draw = ImageDraw.Draw(out)
    # Erase the rulebook labels and grid past the smaller board.
    draw.rectangle([GRID_X + width * CELL, 0, out.width, out.height], fill=BACKGROUND)
    draw.rectangle([0, GRID_Y + height * CELL, GRID_X + width * CELL, out.height], fill=BACKGROUND)

    water = river_mask(defn, WATER_WIDTH)
    edge = river_mask(defn, WATER_WIDTH + RIVER_EDGE)
    out.paste(Image.new("RGB", out.size, WATER_EDGE), (0, 0), edge)
    out.paste(Image.new("RGB", out.size, WATER), (0, 0), water)
    out.paste(Image.new("RGB", out.size, WATER_LIGHT), (0, 0), highlight_mask(defn, water))

    draw.rectangle(
        [GRID_X - 4, GRID_Y - 4, GRID_X + width * CELL + 3, GRID_Y + height * CELL + 3],
        outline=BORDER,
        width=4,
    )
    return out


def main():
    base = Image.open(IMAGES / "map.jpg").convert("RGB")
    for name, defn in map_defs().items():
        if name == "default":
            continue
        out = make_background(base, defn)
        path = IMAGES / f"map-{name}.jpg"
        out.save(path, quality=92)
        print(path)


if __name__ == "__main__":
    main()
