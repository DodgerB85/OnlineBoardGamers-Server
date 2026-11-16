"""Real complete Django template / gettext regression; no database writes."""
import io, gettext, json, re, unittest
from pathlib import Path
import test_phone_help as h
ROOT=h.ROOT

def section(source):
    anchor=source.index('e_senior_business_developer_x1')
    return source[source.rfind('<div class="FCMhelpSection">',0,anchor):source.index('</div>',anchor)+6]

def rendered(lang):
    html=section(h.render_page(lang)); parser=h.VisibleText();parser.feed(html)
    return html,' '.join(' '.join(parser.parts).split())

class SeniorHelpTests(unittest.TestCase):
    def test_chinese_fully_localized(self):
        html,text=rendered('zh-hans')
        self.assertNotRegex(text.replace('OUT',''),r'[A-Za-z]{2,}')
        self.assertIn('资深业务拓展经理',text)
        self.assertIn('建筑保留原位',text)
        self.assertIn('没有需求',text)
        self.assertNotRegex(text,'搬离|搬迁|驱逐')
    def test_english_marker_not_eviction(self):
        _,text=rendered('en')
        self.assertNotRegex(text,r'(?i)evict|move out')
        self.assertIn('stays in place',text)
        self.assertIn('no active demand',text)
    def test_all_visible_ids_translated(self):
        import polib
        source=section((ROOT/'FCM/templates/FCM/fanExpansionsHelp.html').read_text(encoding='utf-8'))
        ids=re.findall(r'{%\s*(?:translate|trans)\s+[\'"]([^\'"]+)[\'"]\s*%}',source)
        ids+=re.findall(r'{% blocktranslate trimmed %}(.*?){% endblocktranslate %}',source,re.S)
        for lang in h.LANGS[1:]:
            path=ROOT/f'FCM/locale/{"zh_Hans" if lang=="zh-hans" else lang}/LC_MESSAGES/django.po'
            po=polib.pofile(str(path));mo=gettext.GNUTranslations(io.BytesIO(path.with_suffix('.mo').read_bytes()))
            for msgid in ids:
                with self.subTest(lang=lang,msgid=msgid):
                    entry=po.find(msgid); self.assertIsNotNone(entry)
                    self.assertTrue(entry.msgstr);self.assertNotIn('fuzzy',entry.flags)
                    self.assertEqual(mo.gettext(msgid),entry.msgstr)
    def test_six_languages_exact(self):
        path=ROOT/'FCM/tools/senior_help_translations.json'
        self.assertTrue(path.is_file(),'maintainable translation source')
        source=json.loads(path.read_text(encoding='utf-8'))
        for lang in h.LANGS:
            html,text=rendered(lang)
            self.assertEqual(re.findall(r'<(?:p|li)>(.*?)</(?:p|li)>',html,re.S),source['zh_Hans' if lang=='zh-hans' else lang])
            self.assertEqual(html.count('<li>'),6)
            if lang=='en':self.assertNotRegex(text,r'[\u3400-\u9fff]')
    def test_media_line_unchanged(self):
        import hashlib
        current=(ROOT/'FCM/templates/FCM/fanExpansionsHelp.html').read_text(encoding='utf-8')
        self.assertEqual(hashlib.sha256(current.replace(section(current),'').encode()).hexdigest(),
            'b342b90734f1f44b1be1b9edfda8727ab69a65f1b74b46fd1fec3c8f2a264ebf')
    def test_generator_and_lossless_art_are_idempotent(self):
        import subprocess,sys,hashlib
        from PIL import Image, ImageChops
        files=[ROOT/'FCM/templates/FCM/fanExpansionsHelp.html']
        files+=list((ROOT/'FCM/locale').glob('*/LC_MESSAGES/django.*'))
        files+=list((ROOT/'FCM/static/FCM/images').glob('e_senior_business_developer_x1_out_*.png'))
        before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        for script in ['update_senior_help.py','make_senior_art.py']:
            result= subprocess.run([sys.executable,str(ROOT/'FCM/tools'/script)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(before,{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files})
        original=Image.open(ROOT/'FCM/static/FCM/images/e_senior_business_developer_x1.jpg').convert('RGB')
        for lang in ['zh','en']:
            updated=Image.open(ROOT/f'FCM/static/FCM/images/e_senior_business_developer_x1_out_{lang}.png').convert('RGB')
            self.assertEqual(updated.size,(289,450))
            diff=ImageChops.difference(original,updated);self.assertIsNotNone(diff.getbbox())
            diff.paste((0,0,0),(27,326,264,378));self.assertIsNone(diff.getbbox())

if __name__=='__main__':unittest.main()
