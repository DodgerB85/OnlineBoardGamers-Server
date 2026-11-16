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
    return source[source.rfind('<div class="FCMhelpSection">',0,source.index('{% translate "Media Line" %}')):source.index('</div>',source.index('{% translate "Media Line" %}'))+6]

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
    start=html.rfind('<div class="FCMhelpSection">',0,anchor)
    section=html[start:html.index('</div>',anchor)+6]
    parser=VisibleText(); parser.feed(section)
    return section, ' '.join(' '.join(parser.parts).split())

class PhoneHelpTests(unittest.TestCase):
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

    def test_short_overview_and_eight_points(self):
        html,text=rendered_section('zh-hans')
        self.assertEqual(html.count('<li>'),8)
        self.assertLessEqual(len(re.sub(r'\s','',text)),800)
        self.assertNotIn('<details>',html)
        self.assertNotIn('rulesVersion',text)

    def test_six_languages_render_all_nine_expected_messages(self):
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
            'zh-hans':['6.5／7.5／8.5／9.5','共12张','同商品、同时长（1—3回合）','餐厅入口所在板块','共5个板块','电视广播员的可以','（1—4回合）','2频道','3.5/4.5','距离2板块内的5个房子','每名在岗员工每回合选择一次','下回合晚餐','±5','可叠加抵消。','获得者首场电视广告期间，放置2需求。'],
            'en':['6.5 / 7.5 / 8.5 / 9.5','12 cards','same good and duration (1–3 rounds)','restaurant entrance','5 tiles','(1–4 rounds)','2 channels','3.5/4.5','5 houses within 2 tiles','Each working employee chooses once per round','next round’s dinner','±5','Changes can stack or cancel.','place 2 demand.']}
        for lang,terms in checks.items():
            _,text=rendered_section(lang)
            for term in terms:
                with self.subTest(language=lang,term=term): self.assertIn(term,text)
        for lang in LANGS:
            _,text=rendered_section(lang)
            self.assertIn('9.5',text)
            self.assertIn('12',text)

    def test_user_chinese_copy_exact_and_removed_rules_absent(self):
        expected = ['增加电话和电视广告。', '培训：营销实习生→电话推销员→电视广播员→品牌总监，各6张，可叠放。', '电话推销员可放电话或更低级的广告。一次选一组，同商品、同时长（1—3回合）', '电话6.5／7.5／8.5／9.5四组各3张，共12张。可放置范围为餐厅入口所在板块以及上下左右共5个板块', '电视广播员的可以放置电视、电话或更低级的广告，电视频道可以放置同商品、同时长（1—4回合）', '电视有2频道，为3.5/4.5。可选择餐厅入口所在板块距离2板块内的5个房子进行电视营销', '头条仅电视广播员可用，每名在岗员工每回合选择一次：下回合晚餐全城商品单价±5，可叠加抵消。', '“首位使用电视广播员”里程碑：获得者首场电视广告期间，放置2需求。', '兼容说明：旧局及旧回放保留原电话规则，包括邻接建筑的要求。电视仍为2个频道，其选择、范围、时长、头条、晋升和独立里程碑不变。']
        html,text=rendered_section('zh-hans')
        self.assertEqual(re.findall(r'<(?:p|li)>(.*?)</(?:p|li)>',html,re.S),expected)
        for removed in ['四向','整组','锁定','±10','每房每夜','而非1','花园','免费','涨价无上限','减价不能超过0']:
            self.assertNotIn(removed,text)

if __name__=='__main__':
    unittest.main()
