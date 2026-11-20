"""Standalone regression: real Django template/gettext, no game API or database.
Run with a Django-equipped Python: python FCM/tools/test_phone_help.py
"""
from pathlib import Path
import gettext
import io
import json
import re
import sys
import unittest
from html.parser import HTMLParser
import django
from django.conf import settings
from django.urls import path, include
from django.template.loader import render_to_string
from django.test import RequestFactory
from django.utils import translation

ROOT = Path(__file__).resolve().parents[2]
LANGS = ['en', 'zh-hans', 'de', 'es', 'fr', 'it']
if not settings.configured:
    settings.configure(DEBUG=True, SECRET_KEY='isolated-help-test', ROOT_URLCONF=__name__,
        STATIC_URL='/static/', USE_I18N=True, LANGUAGE_CODE='en', LANGUAGES=[(x,x) for x in LANGS],
        LOCALE_PATHS=[str(ROOT/'FCM/locale'), str(ROOT/'Lobby/locale')],
        INSTALLED_APPS=['django.contrib.staticfiles'],
        TEMPLATES=[{'BACKEND':'django.template.backends.django.DjangoTemplates',
            'DIRS':[str(ROOT/'FCM/templates'),str(ROOT/'Lobby/templates')], 'APP_DIRS':True}])
names = set()
for directory in [ROOT/'FCM/templates', ROOT/'Lobby/templates']:
    for file in directory.rglob('*.html'):
        names.update(re.findall(r"{%\s*url\s+['\"]([^'\"]+)['\"]", file.read_text(encoding='utf-8')))
def dummy(request):
    return None
urlpatterns = [path(n+'/',dummy,name=n) for n in names if ':' not in n]
urlpatterns += [path('FCM/', include(([path(n.split(':')[1]+'/',dummy,name=n.split(':')[1])
    for n in names if n.startswith('FCM:')], 'FCM')))]
django.setup()

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]
    def handle_data(self, data):
        self.parts.append(data)

def source_section():
    source=(ROOT/'FCM/templates/FCM/fanExpansionsHelp.html').read_text(encoding='utf-8')
    return source[source.index('<div class="FCMhelpSection" id="media-line">'):source.index('</div>',source.index('{% translate "Media Line" %}'))+6]

def message_ids():
    section=source_section()
    ids=re.findall(r'{%\s*(?:translate|trans)\s+[\'"]([^\'"]+)[\'"]\s*%}',section)
    ids += [' '.join(m.split()) for m in re.findall(r'{% blocktranslate trimmed %}(.*?){% endblocktranslate %}',section,re.S)]
    return list(dict.fromkeys(ids))

def render_page(lang):
    with translation.override(lang):
        request=RequestFactory().get('/FCM/fanExpansionsHelp/')
        return render_to_string('FCM/fanExpansionsHelp.html',{'LANGUAGE_CODE':lang},request=request)

def rendered_section(lang):
    html=render_page(lang)
    anchor=html.index('e_telemarketer')
    start=html.index('<div class="FCMhelpSection" id="media-line">')
    section=html[start:html.index('</div>',anchor)+6]
    parser=VisibleText(); parser.feed(section)
    return section, ' '.join(' '.join(parser.parts).split())

class PhoneHelpTests(unittest.TestCase):
    def test_range_diagram_language_assets_and_real_template_order(self):
        from PIL import Image
        titles={'en':'Open full-size diagram','zh-hans':'点击查看原图','de':'Vollständiges Diagramm öffnen','es':'Abrir el diagrama a tamaño completo','fr':'Ouvrir le diagramme en taille réelle','it':'Apri il diagramma a dimensione intera'}
        for lang in LANGS:
            html,_=rendered_section(lang)
            filename='media_line_range_three_phones_v4_' + ('zh' if lang=='zh-hans' else 'en') + '.jpg'
            self.assertIn(filename,html)
            self.assertNotIn('media_line_range_three_phones_v4_' + ('en' if lang=='zh-hans' else 'zh') + '.jpg',html)
            self.assertIn('title="' + titles[lang] + '"',html)
            self.assertLess(html.index('<h2'),html.index('<p>'))
            self.assertLess(html.index('<p>'),html.index('e_telemarketer'))
            self.assertLess(html.index('e_tv_announcer'),html.index('<figure'))
            self.assertLess(html.index('<figure'),html.index('<ul>'))
            self.assertIn('target="_blank" rel="noopener"',html)
            with Image.open(ROOT/'FCM/static/FCM/images'/filename) as image:
                self.assertEqual(image.size,(2320,1320))
                self.assertEqual(image.format,'JPEG')

    def test_tv_art_generator_is_portable_and_only_generates_third_channel(self):
        import subprocess
        import hashlib
        from PIL import Image, ImageChops
        script=ROOT/'FCM/tools/make_tv_art.py'
        source=script.read_text(encoding='utf-8')
        self.assertNotIn('ImageFont',source)
        self.assertNotIn('Windows/Fonts',source)
        self.assertNotIn('(5,6)',source)
        target=ROOT/'FCM/static/FCM/images/antenna55.png'
        before=hashlib.sha256(target.read_bytes()).hexdigest()
        result=subprocess.run([sys.executable,str(script)],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(before,hashlib.sha256(target.read_bytes()).hexdigest())
        self.assertEqual(len(json.loads(result.stdout)),1)
        original=Image.open(target.with_name('antenna35.png')).convert('RGBA')
        generated=Image.open(target).convert('RGBA')
        self.assertEqual(generated.crop((76,51,89,70)).tobytes(),original.crop((94,51,107,70)).tobytes())
        generated.paste(original.crop((76,51,89,70)),(76,51,89,70))
        self.assertIsNone(ImageChops.difference(original,generated).getbbox())

    def test_three_tv_channels_in_all_languages(self):
        counts={'en':'3 channels','zh-hans':'3频道','de':'3 Kanäle','es':'3 canales','fr':'3 chaînes','it':'3 canali'}
        for lang,term in counts.items():
            _,text=rendered_section(lang)
            with self.subTest(language=lang):
                self.assertIn(term,text)
                self.assertIn('3.5/4.5/5.5',text)
                self.assertNotIn('3.5/4.5/5.5/6.5',text)

    def test_chinese_has_no_english_fallback(self):
        _, text=rendered_section('zh-hans')
        self.assertNotRegex(text,r'[A-Za-z]{2,}', text)

    def test_english_has_no_chinese(self):
        _,text=rendered_section('en')
        self.assertNotRegex(text,r'[\u3400-\u9fff]')

    def test_all_visible_messages_have_nonfuzzy_catalog_entries(self):
        import polib
        for lang in LANGS[1:]:
            catalog='zh_Hans' if lang=='zh-hans' else lang
            file=ROOT/f'FCM/locale/{catalog}/LC_MESSAGES/django.po'
            po=polib.pofile(str(file)); mo=gettext.GNUTranslations(io.BytesIO(file.with_suffix('.mo').read_bytes()))
            for msgid in message_ids():
                with self.subTest(language=lang,msgid=msgid):
                    entry=po.find(msgid)
                    self.assertIsNotNone(entry)
                    self.assertTrue(entry.msgstr)
                    self.assertNotIn('fuzzy',entry.flags)
                    self.assertEqual(mo.gettext(msgid),entry.msgstr)

    def test_short_overview_and_seven_points(self):
        html,text=rendered_section('zh-hans')
        self.assertEqual(html.count('<li>'),7)
        self.assertLessEqual(len(re.sub(r'\s','',text)),800)
        self.assertNotIn('<details>',html)
        self.assertNotIn('rulesVersion',text)

    def test_six_languages_render_all_eight_expected_messages(self):
        source=json.loads((ROOT/'FCM/tools/phone_help_translations.json').read_text(encoding='utf-8'))
        for lang in LANGS:
            html,_=rendered_section(lang)
            messages=re.findall(r'<(?:p|li)>(.*?)</(?:p|li)>',html,re.S)
            expected=source['zh_Hans' if lang=='zh-hans' else lang]
            self.assertEqual(messages,expected,lang)

    def test_generator_is_byte_idempotent(self):
        import hashlib
        import subprocess
        files=[ROOT/'FCM/templates/FCM/fanExpansionsHelp.html']
        files += list((ROOT/'FCM/locale').glob('*/LC_MESSAGES/django.po'))
        files += list((ROOT/'FCM/locale').glob('*/LC_MESSAGES/django.mo'))
        before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        result=subprocess.run([sys.executable,str(ROOT/'FCM/tools/update_phone_help.py')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(before,{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files})

    def test_required_rules_in_real_chinese_and_english(self):
        checks={
            'zh-hans':['6.5／7.5／8.5／9.5','共12张','同商品、同时长（1—3回合）','餐厅入口所在板块','共5个板块','电视广播员的可以','（1—4回合）','3频道','3.5/4.5/5.5','距离2板块内的5个房子','每名在岗员工每回合选择一次','下回合晚餐','±5','可叠加抵消。','获得者首场电视广告期间，放置2需求。'],
            'en':['6.5 / 7.5 / 8.5 / 9.5','12 cards','same good and duration (1–3 rounds)','restaurant entrance','5 tiles','(1–4 rounds)','3 channels','3.5/4.5/5.5','5 houses within 2 tiles','Each working employee chooses once per round','next round’s dinner','±5','Changes can stack or cancel.','place 2 demand.']}
        for lang,terms in checks.items():
            _,text=rendered_section(lang)
            for term in terms:
                with self.subTest(language=lang,term=term): self.assertIn(term,text)
        for lang in LANGS:
            _,text=rendered_section(lang)
            self.assertIn('9.5',text)
            self.assertIn('12',text)

    def test_user_chinese_copy_exact_and_removed_rules_absent(self):
        expected = ['增加电话和电视广告。', '培训：营销实习生→电话推销员→电视广播员→品牌总监，各6张，可叠放。', '电话推销员可放电话或更低级的广告。', '一次选一组，同商品、同时长（1—3回合）电话6.5／7.5／8.5／9.5四组各3张，共12张。可放置范围为餐厅入口所在板块以及上下左右共5个板块', '电视广播员的可以放置电视、电话或更低级的广告，并且发布头条。', '电视频道可以放置同商品、同时长（1—4回合），电视有3频道，为3.5/4.5/5.5。可选择餐厅入口所在板块距离2板块内的5个房子进行电视营销', '头条是电视广播员的特殊能力：每名在岗员工每回合选择一次：下回合晚餐全城商品单价±5，可叠加抵消。', '“首位使用电视广播员”里程碑：获得者首场电视广告期间，放置2需求。']
        html,text=rendered_section('zh-hans')
        self.assertEqual(re.findall(r'<(?:p|li)>(.*?)</(?:p|li)>',html,re.S),expected)
        for removed in ['四向','整组','锁定','±10','每房每夜','而非1','花园','免费','涨价无上限','减价不能超过0']:
            self.assertNotIn(removed,text)

if __name__=='__main__':
    unittest.main()
