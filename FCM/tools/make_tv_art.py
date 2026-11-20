"""Derive the 5.5 TV token; preserve all pixels outside its first digit."""
from pathlib import Path
from PIL import Image, ImageChops
import json

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'static/FCM/images/antenna35.png').convert('RGBA')
box = (76, 51, 89, 70)
image = source.copy()
# Reuse the original final 5, including the original antialiasing.
image.paste(source.crop((94, 51, 107, 70)), box)
target = ROOT / 'static/FCM/images/antenna55.png'
image.save(target)
changed = ImageChops.difference(source, image).convert('RGB').getbbox()
assert changed and changed[0] >= box[0] and changed[1] >= box[1] and changed[2] <= box[2] and changed[3] <= box[3]
print(json.dumps([{'target': str(target), 'changedBox': changed, 'preservedOutside': True}]))
