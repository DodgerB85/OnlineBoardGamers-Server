"""Draw NTRboard.json on top of map.jpg so the data can be checked by eye.

Usage: python3 NTR/tools/board_overlay.py OUT_DIR [TILE_PX]
Writes OUT_DIR/board.jpg (whole board, full size) and OUT_DIR/tile_X_Y.jpg crops.

Legend: green outline = locale, black "id/cap" at its unit spot,
blue line = narrow approach, thick cyan = wide approach,
red box = a printed penalty symbol, letter = its type, tick = locale it applies to
(black box = impassable edge of a pond/marsh/lake, not on an approach)
(A artillery, C cavalry, I infantry, O obstructed, X impassable),
magenta = main road, orange = local road, "R" on approach = road crosses it,
yellow star = objective, purple text = setup commander, red E = entry, grey fill = void.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
board = json.load(open(ROOT / 'vueNTR/src/js/NTRboard.json'))
img = Image.open(ROOT / 'static/NTR/images/map.jpg').convert('RGB')
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
tile = int(sys.argv[2]) if len(sys.argv) > 2 else 1200
font = ImageFont.load_default(size=28)
LETTER = {'artillery': 'A', 'cavalry': 'C', 'infantry': 'I', 'obstructed': 'O', 'impassable': 'X'}

ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
for v in board['voids']:
    d.polygon([tuple(p) for p in v], fill=(80, 80, 80, 90))
for r in board['roads']:
    d.line([tuple(p) for p in r['points']], fill=(255, 0, 255, 150) if r['cls'] == 'main' else (255, 140, 0, 150), width=3)
for lid, l in board['locales'].items():
    d.polygon([tuple(p) for p in l['polygon']], outline=(0, 170, 0, 255), width=4)
for a in board['approaches'].values():
    (x0, y0), (x1, y1) = a['line'][0], a['line'][-1]
    wide = a['width'] == 'wide'
    d.line([tuple(p) for p in a['line']], fill=(0, 220, 255, 230) if wide else (0, 60, 255, 230), width=12 if wide else 6)
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    if a['road']:
        d.text((mx - 8, my - 14), 'R', fill=(255, 0, 255, 255), font=font, stroke_width=3, stroke_fill='white')
small = ImageFont.load_default(size=20)
for s in board['symbols']:
    x, y = s['x'], s['y']
    col = (220, 0, 0, 255) if s['approach'] else (0, 0, 0, 255)
    d.rectangle((x - 26, y - 26, x + 26, y + 26), outline=col, width=3)
    d.text((x + 28, y - 28), LETTER[s['kind']], fill=col, font=small, stroke_width=2, stroke_fill='white')
    if s['approach']:
        # short tick toward the locale this penalty applies to
        cx, cy = board['locales'][s['locale']]['reserve']
        n = max(1, ((cx - x) ** 2 + (cy - y) ** 2) ** 0.5)
        d.line((x, y, x + (cx - x) / n * 60, y + (cy - y) / n * 60), fill=col, width=3)
for lid, l in board['locales'].items():
    x, y = l['reserve']
    d.text((x, y), f"{lid}/{l['capacity']}", fill='black', font=font, stroke_width=3, stroke_fill='white', anchor='mm')
    if l['objectives']:
        d.text((x, y + 32), '*' * len(l['objectives']), fill=(255, 210, 0, 255), font=font, stroke_width=3, stroke_fill='black', anchor='mm')
    if l['setup']:
        d.text((x, y - 32), str(l['setup'].get('commander', 'setup')), fill=(128, 0, 200, 255), font=font, stroke_width=3, stroke_fill='white', anchor='mm')
    if l['entry']:
        d.text((x + 50, y), 'E', fill=(220, 0, 0, 255), font=font, stroke_width=3, stroke_fill='white', anchor='mm')

full = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
full.save(out / 'board.jpg', quality=92)
for y in range(0, img.height, tile):
    for x in range(0, img.width, tile):
        full.crop((x, y, min(x + tile, img.width), min(y + tile, img.height))).save(out / f'tile_{x:04d}_{y:04d}.jpg', quality=85)
print(f'wrote {out}')
