"""Generate ONLY Senior Business Developer help; append-safe PO/MO updates.
Run with Django/polib Python: python FCM/tools/update_senior_help.py
Existing translations, catalog metadata and every other help section are preserved.
"""
import gettext, io, json
from pathlib import Path
import polib
ROOT=Path(__file__).resolve().parents[1]
translations=json.loads((ROOT/'tools/senior_help_translations.json').read_text(encoding='utf-8'))
ids=translations['en']
assert len(ids)==len(set(ids))==7
assert set(translations)=={'en','zh_Hans','de','es','fr','it'}
assert all(len(x)==7 and all(x) for x in translations.values())
template=ROOT/'templates/FCM/fanExpansionsHelp.html'
text=template.read_text(encoding='utf-8')
anchor=text.index('{% translate "Senior Business Developer" %}')
start=text.index('            <br />\n',anchor)+len('            <br />\n')
end=text.index('          </div>',start)
def block(s):return '{% blocktranslate trimmed %}'+s+'{% endblocktranslate %}'
body='            <p>'+block(ids[0])+'</p>\n            <ul>\n'
body+=''.join('              <li>'+block(s)+'</li>\n' for s in ids[1:])+'            </ul>\n'
updated=text[:start]+body+text[end:]
if text!=updated:template.write_text(updated,encoding='utf-8',newline='')
for lang,items in translations.items():
    if lang=='en':continue
    path=ROOT/f'locale/{lang}/LC_MESSAGES/django.po'
    source=path.read_text(encoding='utf-8');po=polib.pofile(str(path))
    before=[(e.msgid,e.msgstr,e.msgctxt,e.obsolete,e.flags) for e in po];added=[]
    for msgid,msgstr in zip(ids,items,strict=True):
        entry=po.find(msgid)
        if entry:
            if entry.msgstr!=msgstr or 'fuzzy' in entry.flags:raise ValueError(f'{lang}: conflict: {msgid}')
        else:added.append('\n#. Senior Business Developer concise player help.\nmsgid '+json.dumps(msgid,ensure_ascii=False)+'\nmsgstr '+json.dumps(msgstr,ensure_ascii=False)+'\n')
    if added:path.write_text(source+''.join(added),encoding='utf-8',newline='')
    result=polib.pofile(str(path))
    assert [(e.msgid,e.msgstr,e.msgctxt,e.obsolete,e.flags) for e in result[:len(before)]]==before
    compiled=path.with_suffix('.mo');old=gettext.GNUTranslations(io.BytesIO(compiled.read_bytes()))._catalog
    result.metadata=polib.mofile(str(compiled)).metadata
    result.save_as_mofile(str(compiled));catalog=gettext.GNUTranslations(io.BytesIO(compiled.read_bytes()))._catalog
    assert all(catalog.get(k)==v for k,v in old.items())
    print(json.dumps({'language':lang,'newMessages':len(added),'preserved':len(before)}))
