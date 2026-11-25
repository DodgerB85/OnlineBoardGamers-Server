"""Generate only milestone-night-balance help and append-safe PO/MO deltas.

Uses only stdlib. Existing PO bytes and raw MO messages (including metadata and
plural forms) are retained; no project settings, database or network is loaded.
Run: python FCM/tools/update_milestone_night_balance_help.py
"""
import ast
import gettext
import io
import json
from pathlib import Path
import re
import struct

ROOT = Path(__file__).resolve().parents[2]
ANCHOR = '<section class="FCMhelpSection" id="milestone-night-balance">'


def mo_messages(content):
    endian = '<' if content[:4] == b'\xde\x12\x04\x95' else '>'
    magic, version, count, originals, translated = struct.unpack_from(endian+'5I', content)
    if magic != 0x950412de or version != 0:
        raise ValueError('Unsupported MO format; refusing to rewrite')
    messages = {}
    for i in range(count):
        size, offset = struct.unpack_from(endian+'2I', content, originals+8*i)
        tsize, toffset = struct.unpack_from(endian+'2I', content, translated+8*i)
        messages[content[offset:offset+size]] = content[toffset:toffset+tsize]
    return messages


def compile_mo(messages):
    keys = sorted(messages)
    count = len(keys)
    base = 28+16*count
    original_blob = b''.join(k+b'\0' for k in keys)
    translated_blob = b''.join(messages[k]+b'\0' for k in keys)
    original_table, translated_table = [], []
    offset = base
    for key in keys:
        original_table.extend([len(key), offset])
        offset += len(key)+1
    offset = base+len(original_blob)
    for key in keys:
        translated_table.extend([len(messages[key]), offset])
        offset += len(messages[key])+1
    return (struct.pack('<7I', 0x950412de, 0, count, 28, 28+8*count, 0, base)
            + struct.pack('<'+'I'*(4*count), *(original_table+translated_table))
            + original_blob+translated_blob)


def po_entries(text):
    entries = []
    for block in re.split(r'\n\s*\n', text):
        entry, field = {}, None
        for line in block.splitlines():
            if line.startswith('#'):
                continue
            match = re.match(r'(msgctxt|msgid|msgstr|msgid_plural) (".*")$', line)
            if match:
                field = match[1]
                entry[field] = ast.literal_eval(match[2])
            elif line.startswith('"') and field:
                entry[field] += ast.literal_eval(line)
            else:
                field = None
        if 'msgid' in entry:
            entry['fuzzy'] = bool(re.search(r'^#,.*\bfuzzy\b', block, re.M))
            entries.append(entry)
    return entries


def append_catalog(path, pairs):
    original = path.read_bytes()
    text = original.decode('utf-8')
    entries = po_entries(text)
    raw_mo = path.with_suffix('.mo').read_bytes()
    messages = mo_messages(raw_mo)
    previous = gettext.GNUTranslations(io.BytesIO(raw_mo))._catalog
    additions = []
    changed = False
    for msgid, msgstr in pairs:
        existing = [e for e in entries if e['msgid'] == msgid and not e.get('msgctxt')]
        if existing:
            if len(existing) != 1 or existing[0].get('msgstr') != msgstr or existing[0]['fuzzy']:
                raise ValueError(f'{path}: conflicting PO entry {msgid}')
        else:
            additions.append('\n\n#. Milestone & Night Shift Balance player help.\nmsgid '
                             +json.dumps(msgid, ensure_ascii=False)+'\nmsgstr '
                             +json.dumps(msgstr, ensure_ascii=False)+'\n')
        key, value = msgid.encode('utf-8'), msgstr.encode('utf-8')
        if key in messages and messages[key] != value:
            raise ValueError(f'{path}: conflicting MO entry {msgid}')
        if key not in messages:
            messages[key] = value
            changed = True
    if additions:
        path.write_bytes(original+''.join(additions).encode('utf-8'))
    if changed:
        compiled = compile_mo(messages)
        after = gettext.GNUTranslations(io.BytesIO(compiled))._catalog
        assert all(after.get(key) == value for key, value in previous.items())
        path.with_suffix('.mo').write_bytes(compiled)
    return len(additions)


def main():
    data = json.loads((ROOT/'FCM/tools/milestone_night_balance_help_translations.json').read_text(encoding='utf-8'))
    assert set(data) == {'en','zh_Hans','de','es','fr','it'}
    # Title, image alt, overview, three concise rules, then the lobby label/help.
    # Historical catalog messages remain untouched but are no longer displayed.
    assert all(len(items) == 8 and all(items) for items in data.values())
    ids = data['en']
    assert len(set(ids)) == len(ids)
    def block(message):
        return '{% blocktranslate trimmed %}'+message+'{% endblocktranslate %}'
    template = ROOT/'FCM/templates/FCM/fanExpansionsHelp.html'
    original = template.read_bytes()
    text = original.decode('utf-8')
    nl = '\r\n' if '\r\n' in text else '\n'
    generated = ANCHOR+nl
    generated += '            <h2 class="fcm-china-help-title">{% translate "'+ids[0]+'" %}</h2>'+nl
    generated += '            <img src="{% static \'FCM/images/so_milestoneNightBalance.svg\' %}" alt="{% translate "'+ids[1]+'" %}" width="42" height="42" style="display:block;margin:8px 0 12px" />'+nl
    generated += '            <p>'+block(ids[2])+'</p>'+nl+'            <ul>'+nl
    for message in ids[3:6]:
        generated += '              <li>'+block(message)+'</li>'+nl
    generated += '            </ul>'+nl+'          </section>'
    if ANCHOR in text:
        start = text.index(ANCHOR)
        end = text.index('</section>', start)+len('</section>')
        updated = text[:start]+generated+text[end:]
    else:
        boundary = ('            <div class="card section">'+nl
                    +'              <h2 class="fcm-china-help-title">{% translate "Further Help" %}</h2>')
        assert text.count(boundary) == 1
        updated = text.replace(boundary, '          '+generated+nl+boundary, 1)
    if updated.encode('utf-8') != original:
        template.write_bytes(updated.encode('utf-8'))
    rules = ROOT/'FCM/rules/Fan_Expansions_rules.md'
    original = rules.read_bytes()
    nl_bytes = b'\r\n' if b'\r\n' in original else b'\n'
    nl_text = nl_bytes.decode('ascii')
    heading = nl_bytes*2 + b'## Player Balance Module' + nl_bytes
    legacy_heading = nl_bytes*2 + b'## Milestone & Night Shift Balance' + nl_bytes
    if heading not in original and legacy_heading in original:
        original = original.replace(legacy_heading, heading, 1)
    addition = (nl_bytes*2 + b'## Player Balance Module' + nl_bytes*2
                + b'[Player help](/FCM/fanExpansionsHelp/#milestone-night-balance)' + nl_bytes*2
                + ids[2].encode('utf-8') + nl_bytes*2
                + nl_text.join('- '+s for s in ids[3:6]).encode('utf-8') + nl_bytes)
    if heading not in original:
        rules.write_bytes(original+addition)
    else:
        start = original.index(heading)
        end = original.find(nl_bytes*2 + b'## ', start+len(heading))
        if end < 0:
            end = len(original)
        updated = original[:start]+addition+original[end:]
        if updated != rules.read_bytes():
            rules.write_bytes(updated)
    for lang, items in data.items():
        if lang == 'en':
            continue
        # Append only new concise msgids; preserve all prior catalog bytes/keys.
        for app, positions in [('FCM',range(6)),('lobby',[0,6,7])]:
            pairs = [(ids[i],items[i]) for i in positions]
            if app == 'lobby':
                requirements = {'en': 'requires New Milestones', 'zh_Hans': '需要新里程碑', 'de': 'benötigt neue Meilensteine', 'es': 'requiere nuevos hitos', 'fr': 'nécessite les nouvelles étapes', 'it': 'richiede i nuovi traguardi'}
                pairs.append(('Player Balance Module (requires New Milestones)', items[0]+' ('+requirements[lang]+')'))
            count = append_catalog(ROOT/app/'locale'/lang/'LC_MESSAGES/django.po', pairs)
            print(json.dumps({'app':app,'language':lang,'added':count}))


if __name__ == '__main__':
    main()
