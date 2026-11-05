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
import subprocess
from pathlib import Path

import numpy as np
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

BORDER = (88, 45, 28)
WATER = (61, 91, 181)
WATER_EDGE = (50, 76, 155)
WATER_LIGHT = (96, 127, 210)
GRID = (150, 82, 56)
# The rulebook river is a wavy band about half a cell wide, not a filled cell.
WATER_WIDTH = 48
POND_RADIUS = 78
RIVER_BLUR = 24


def map_defs():
    """MAP_DEFS from the client registry, so the boards cannot drift apart."""
    script = (
        f"import {{ MAP_DEFS }} from '{REFERENCE.as_uri()}';"
        "process.stdout.write(JSON.stringify(MAP_DEFS));"
    )
    out = subprocess.check_output(["node", "--input-type=module", "-e", script], text=True)
    return json.loads(out)


def noise(size, scale, seed):
    """Smooth value noise in 0..1: a coarse random grid upscaled bicubically."""
    rng = np.random.default_rng(seed)
    w, h = size
    coarse = rng.random((h // scale + 3, w // scale + 3)).astype(np.float32)
    img = Image.fromarray((coarse * 255).astype(np.uint8)).resize(
        ((w // scale + 3) * scale, (h // scale + 3) * scale), Image.BICUBIC
    )
    return np.asarray(img.crop((scale, scale, scale + w, scale + h)), dtype=np.float32) / 255


def parchment(base, size, seed):
    """One continuous parchment: mottled tan with a few soft darker stains."""
    land = np.asarray(base.crop((GRID_X + LAND_COL * CELL, GRID_Y + LAND_ROW * CELL,
                                 GRID_X + (LAND_COL + 2) * CELL, GRID_Y + (LAND_ROW + 1) * CELL)), dtype=np.float32)
    tone = np.median(land.reshape(-1, 3), axis=0)
    mottle = noise(size, 40, seed) * 0.6 + noise(size, 12, seed + 1) * 0.4
    shade = 1 + (mottle - 0.5) * 0.12
    stain = noise(size, 260, seed + 2) * 0.7 + noise(size, 70, seed + 3) * 0.3
    stain = np.clip((stain - 0.6) * 12, 0, 1)
    stain = np.asarray(Image.fromarray((stain * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)),
                       dtype=np.float32) / 255
    shade = shade * (1 - stain * 0.16)
    grain = np.random.default_rng(seed + 4).normal(0, 2.5, (size[1], size[0], 1))
    rgb = tone[None, None, :] * shade[..., None] + grain
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))


def river_mask(defn, seed):
    """The river as one soft band with ragged banks, clipped at the board edge."""
    rows = defn["rows"]
    board_w, board_h = defn["width"], defn["height"]
    mask = Image.new("L", (1920, 1280), 0)
    draw = ImageDraw.Draw(mask)

    def is_water(row, col):
        return 0 <= row < board_h and 0 <= col < board_w and rows[row][col] == "x"

    def centre(row, col):
        # Edge cells reach past the border so the river leaves the board.
        x = GRID_X + col * CELL + CELL / 2
        y = GRID_Y + row * CELL + CELL / 2
        if col == 0: x -= CELL
        if col == board_w - 1: x += CELL
        if row == 0: y -= CELL
        if row == board_h - 1: y += CELL
        return x, y

    for row in range(board_h):
        for col in range(board_w):
            if not is_water(row, col):
                continue
            cx, cy = centre(row, col)
            r = WATER_WIDTH / 2
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
            for dr, dc in ((1, 0), (0, 1)):
                if is_water(row + dr, col + dc):
                    draw.line([cx, cy, *centre(row + dr, col + dc)], fill=255, width=WATER_WIDTH)

    # A 2x2 water block is a pond: a round lake, not a square.
    for row in range(board_h - 1):
        for col in range(board_w - 1):
            if all(is_water(row + dr, col + dc) for dr in (0, 1) for dc in (0, 1)):
                x = GRID_X + col * CELL + CELL
                y = GRID_Y + row * CELL + CELL
                draw.ellipse([x - POND_RADIUS, y - POND_RADIUS * 0.8, x + POND_RADIUS, y + POND_RADIUS * 0.8], fill=255)
                draw.polygon([centre(row, col), centre(row, col + 1), centre(row + 1, col + 1), centre(row + 1, col)], fill=255)

    # Blur rounds the bends; thresholding against noise makes the banks ragged.
    soft = np.asarray(mask.filter(ImageFilter.GaussianBlur(RIVER_BLUR)), dtype=np.float32) / 255
    level = 0.5 + (noise(mask.size, 36, seed + 5) - 0.5) * 0.14
    water = (soft > level).astype(np.uint8) * 255
    x0, y0 = GRID_X, GRID_Y
    clip = np.zeros_like(water)
    clip[y0:y0 + board_h * CELL, x0:x0 + board_w * CELL] = 1
    return Image.fromarray(water * clip)


def paint_river(out, water, seed):
    """Deep blue at the banks, lighter mid-stream, with ripple highlights."""
    w = np.asarray(water, dtype=np.float32) / 255
    depth = np.asarray(water.filter(ImageFilter.GaussianBlur(6)), dtype=np.float32) / 255
    depth = np.clip((depth - 0.5) * 2, 0, 1)
    ripple = noise(water.size, 14, seed + 6) * 0.6 + noise(water.size, 5, seed + 7) * 0.4
    edge, mid, light = (np.array(c, dtype=np.float32) for c in (WATER_EDGE, WATER, WATER_LIGHT))
    color = edge + (mid - edge) * depth[..., None]
    sparkle = np.clip((ripple - 0.66) * 5, 0, 1) * depth
    color = color + (light - color) * sparkle[..., None] * 0.8
    land = np.asarray(out, dtype=np.float32)
    # A damp darker rim on the land just outside the water.
    halo = np.asarray(water.filter(ImageFilter.GaussianBlur(5)), dtype=np.float32) / 255
    land = land * (1 - halo[..., None] * (1 - w[..., None]) * 0.35)
    rgb = land * (1 - w[..., None]) + color * w[..., None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))


def make_background(base, defn, seed):
    width, height = defn["width"], defn["height"]
    out = parchment(base, base.size, seed)

    # Keep the rulebook's label ink for the columns and rows this board uses.
    ink = base.convert("L").point(lambda v: 255 if v < 110 else 0).filter(ImageFilter.GaussianBlur(0.8))
    keep = Image.new("L", base.size, 0)
    kd = ImageDraw.Draw(keep)
    kd.rectangle([GRID_X, 0, GRID_X + width * CELL, GRID_Y - 8], fill=255)
    kd.rectangle([0, GRID_Y, GRID_X - 8, GRID_Y + height * CELL], fill=255)
    out.paste(base, (0, 0), ImageChops.multiply(ink, keep))

    draw = ImageDraw.Draw(out)
    for col in range(1, width):
        x = GRID_X + col * CELL
        draw.line([x, GRID_Y, x, GRID_Y + height * CELL], fill=GRID, width=3)
    for row in range(1, height):
        y = GRID_Y + row * CELL
        draw.line([GRID_X, y, GRID_X + width * CELL, y], fill=GRID, width=3)
    out = paint_river(out, river_mask(defn, seed), seed)
    draw = ImageDraw.Draw(out)

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
        out = make_background(base, defn, sum(map(ord, name)))
        path = IMAGES / f"map-{name}.jpg"
        out.save(path, quality=92)
        print(path)


if __name__ == "__main__":
    main()
