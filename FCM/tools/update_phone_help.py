"""Generate only the Media Line help body and append its translated messages.
Run: uv run --no-project --with polib python FCM/tools/update_phone_help.py
English and five translations live in phone_help_translations.json. Existing PO
entries (including retired help messages), metadata and artwork are preserved.
Re-running with identical source is byte-for-byte idempotent.
"""
import gettext
import io
import json
from pathlib import Path
import polib

ROOT = Path(__file__).resolve().parents[1]
translations = json.loads((ROOT/'tools/phone_help_translations.json').read_text(encoding='utf-8'))
ids = translations['en']
assert len(ids) == len(set(ids)) == 8
assert set(translations) == {'en', 'zh_Hans', 'de', 'es', 'fr', 'it'}
assert all(len(items) == 8 and all(items) for items in translations.values())

template = ROOT/'templates/FCM/fanExpansionsHelp.html'
text = template.read_text(encoding='utf-8')
anchor = text.index('{% translate "Media Line" %}')
start = text.index('            <br />\n', anchor) + len('            <br />\n')
end = text.index('          </div>', start)
def block(message):
    return '{% blocktranslate trimmed %}' + message + '{% endblocktranslate %}'
body = '            <p>' + block(ids[0]) + '</p>\n            <ul>\n'
body += ''.join('              <li>' + block(message) + '</li>\n' for message in ids[1:])
body += '            </ul>\n'
updated = text[:start] + body + text[end:]
if updated != text:
    template.write_text(updated, encoding='utf-8', newline='')

for lang, items in translations.items():
    if lang == 'en':
        continue
    path = ROOT/f'locale/{lang}/LC_MESSAGES/django.po'
    source = path.read_text(encoding='utf-8')
    po = polib.pofile(str(path))
    before = [(e.msgid,e.msgstr,e.msgctxt,e.obsolete,e.flags) for e in po]
    added = []
    for msgid, msgstr in zip(ids, items, strict=True):
        entry = po.find(msgid)
        if entry:
            if entry.msgstr != msgstr or 'fuzzy' in entry.flags:
                raise ValueError(f'{lang}: conflicting existing help translation: {msgid}')
        else:
            added.append('\n#. Concise Media Line player help.\nmsgid ' + json.dumps(msgid,ensure_ascii=False)
                + '\nmsgstr ' + json.dumps(msgstr,ensure_ascii=False) + '\n')
    if added:
        path.write_text(source + ''.join(added), encoding='utf-8', newline='')
    result = polib.pofile(str(path))
    assert [(e.msgid,e.msgstr,e.msgctxt,e.obsolete,e.flags) for e in result[:len(before)]] == before
    compiled = path.with_suffix('.mo')
    old_catalog = None
    if compiled.exists():
        old_catalog = gettext.GNUTranslations(io.BytesIO(compiled.read_bytes()))._catalog
        result.metadata = polib.mofile(str(compiled)).metadata
    result.save_as_mofile(str(compiled))
    catalog = gettext.GNUTranslations(io.BytesIO(compiled.read_bytes()))._catalog
    assert old_catalog is None or all(catalog.get(k) == v for k,v in old_catalog.items())
    print(json.dumps({'language':lang,'newMessages':len(added),'existingEntriesPreserved':len(before)},ensure_ascii=False))
