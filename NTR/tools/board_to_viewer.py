"""Load NTRboard.json into the map-extraction viewer (static/NTR/map-extraction).

Usage: python3 NTR/tools/board_to_viewer.py
Rewrites regions/full-board.json and board-data.js. Locales, approaches, penalties,
roads and unit spots come from NTRboard.json; capacity, objective, setup and hill
marks keep their printed positions from the old annotations, with locales re-read.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIEW = ROOT / 'static/NTR/map-extraction'
board = json.load(open(ROOT / 'vueNTR/src/js/NTRboard.json'))
old = json.load(open(VIEW / 'regions/full-board.json'))
crops = {p.name for p in (VIEW / 'crops').glob('*.png')}


def inside(x, y, poly):
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


def locale_at(x, y):
    return next((lid for lid, l in board['locales'].items() if inside(x, y, l['polygon'])), None)


feats = []
for lid, l in board['locales'].items():
    feats.append(dict(id=f'locale-{lid}', type='locale', label=f"Locale {lid} · capacity {l['capacity']}", status='reviewed',
                      geometry=dict(points=l['polygon']),
                      properties=dict(locale_id=lid, capacity=l['capacity'], objectives=l['objectives'], setup=l['setup'], entry=l['entry'])))
    x, y = l['reserve']
    feats.append(dict(id=f'reserve-{lid}', type='reserve', label=f'Unit spot · {lid}', status='reviewed',
                      geometry=dict(x=x, y=y, width=12, height=12, angle=0), properties=dict(locale_id=lid)))
for aid, a in board['approaches'].items():
    feats.append(dict(id=f'a-{aid}', type='approach', label=f"Approach {aid} · {a['width']}" + (f" · {a['road']} road" if a['road'] else ''),
                      status='reviewed', geometry=dict(points=a['line'], stroke_width=28 if a['width'] == 'wide' else 14),
                      properties=dict(locales=a['locales'], width_units=2 if a['width'] == 'wide' else 1, width_class=a['width'],
                                      road=a['road'], penalties=a['penalties'])))
for i, r in enumerate(board['roads']):
    feats.append(dict(id=f'road-{i:03d}', type='road', label=f"{r['cls'].title()} road · {i:03d}", status='reviewed',
                      geometry=dict(points=r['points'], stroke_width=4 if r['cls'] == 'main' else 2), properties=dict(road_class=r['cls'])))
for i, s in enumerate(board['symbols']):
    f = dict(id=f"pen-{i:03d}-{s['kind']}", type='penalty', status='reviewed',
             label=f"{s['kind'].title()} · " + (f"into {s['locale']} via {s['approach']}" if s['approach'] else 'pond/marsh edge, no approach'),
             geometry=dict(x=s['x'], y=s['y'], width=34, height=15, angle=s['angle']),
             properties=dict(penalty=s['kind'], locale_id=s['locale'], approach_id=s['approach']))
    feats.append(f)
for f in old['features']:
    # objective-blue-673-5501 is off the playing area; it is not an objective
    if f['type'] not in ('capacity', 'objective', 'setup', 'hill') or f['id'] == 'objective-blue-673-5501':
        continue
    f = dict(f, status='reviewed')
    f['properties'] = dict(f['properties'], locale_id=locale_at(f['geometry']['x'], f['geometry']['y']))
    if f.get('crop') and f['crop'].split('/')[-1] not in crops:
        f.pop('crop')
    feats.append(f)
feats.append(dict(id='objective-black-4045-3378', type='objective', label='Black objective', status='reviewed',
                  geometry=dict(x=4045, y=3378, width=36, height=35, angle=0),
                  properties=dict(colour='black', locale_id=locale_at(4045, 3378))))

out = {k: v for k, v in old.items() if k != 'features'}
out.update(description='NTRboard.json as used by the game, drawn over the map for checking. Penalty boxes sit on the printed symbols.',
           locale_ids=list(board['locales']), seed_revision=old['seed_revision'] + 1, features=feats)
out['coverage'] = dict(out.get('coverage') or {}, remaining='Generated from NTRboard.json; edit that file, then rerun NTR/tools/board_to_viewer.py.')
text = json.dumps(out, indent=2, ensure_ascii=False)
(VIEW / 'regions/full-board.json').write_text(text + '\n')
(VIEW / 'board-data.js').write_text('window.NTR_BOARD = ' + text + ';\n')
print(len(feats), 'features')
