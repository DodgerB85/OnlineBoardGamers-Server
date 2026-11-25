"""Real complete Django help rendering; isolated settings, no database."""
import ast
import gettext
import hashlib
import html as html_module
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import unittest
import test_phone_help as h

ANCHOR = '<section class="FCMhelpSection" id="milestone-night-balance">'


def section(html):
    start = html.find(ANCHOR)
    if start < 0:
        raise AssertionError('missing milestone-night-balance section in real complete template')
    return html[start:html.index('</section>', start) + len('</section>')]


class MilestoneNightBalanceHelpTests(unittest.TestCase):
    def test_real_complete_template_has_stable_section(self):
        for lang in h.LANGS:
            with self.subTest(language=lang):
                html = h.render_page(lang)
                self.assertIn('<html', html)
                self.assertEqual(html.count('id="milestone-night-balance"'), 1)
                section(html)


    def test_all_six_languages_exact_full_template(self):
        data = json.loads((h.ROOT/'FCM/tools/milestone_night_balance_help_translations.json').read_text(encoding='utf-8'))
        source = section((h.ROOT/'FCM/templates/FCM/fanExpansionsHelp.html').read_text(encoding='utf-8'))
        ids = re.findall(r'{% (?:translate|trans) "([^"]+)" %}', source)
        ids += re.findall(r'{% blocktranslate trimmed %}(.*?){% endblocktranslate %}', source, re.S)
        self.assertEqual(data['zh_Hans'][2:6], [
            '玩家平衡模组，仅在使用新里程碑时可启用。',
            '首个使用营销实习生：从见习厨师和跑腿伙计中二选一，仅获得一名，不再同时获得两名;',
            '首个卖出柠檬水：每回合最多培训一名在岗员工，保持职业颜色并消耗原培训点；',
            '已启用夜班时，夜班经理不可直接招聘，须由总经理助理培训晋升；',
        ])
        self.assertEqual(sorted(ids), sorted(data['en'][:6]))
        for lang in h.LANGS:
            key = 'zh_Hans' if lang == 'zh-hans' else lang
            expected = data[key]
            rendered = section(h.render_page(lang))
            messages = [html_module.unescape(re.sub(r'<img[^>]*>', '', x)) for x in re.findall(r'<(?:p|li)>(.*?)</(?:p|li)>', rendered, re.S)]
            self.assertEqual(messages, expected[2:6], lang)
            self.assertIn('>'+expected[0]+'</h2>', html_module.unescape(rendered))
            self.assertIn('alt="'+expected[1]+'"', html_module.unescape(rendered))
            self.assertNotIn('<a', re.search(r'<h2\b[^>]*>(.*?)</h2>', rendered, re.S).group(1))
            self.assertEqual(rendered.count('<li>'), 3)
            self.assertEqual(re.findall(r'<img[^>]+src="([^"]+)"', rendered), ['/static/FCM/images/so_milestoneNightBalance.svg'])
            self.assertNotIn('e_night_shift_manager', rendered)
            if lang != 'en':
                for english in data['en'][:6]:
                    self.assertNotIn(html_module.escape(english), rendered)
            if lang == 'zh-hans':
                self.assertNotRegex(html_module.unescape(rendered).split('</h2>')[1].replace('FCM',''), r'>[^<]*[A-Za-z]{2,}[^<]*<')

    def test_only_module_icon_below_plain_heading(self):
        rendered = section(h.render_page('en'))
        heading = re.search(r'<h2\b[^>]*>(.*?)</h2>', rendered, re.S).group(1)
        self.assertEqual(heading, 'Player Balance Module')
        self.assertLess(rendered.index('</h2>'), rendered.index('<img'))
        self.assertLess(rendered.index('<img'), rendered.index('<p>'))
        self.assertEqual(rendered.count('<img'), 1)
        self.assertNotIn('<img', ''.join(re.findall(r'<li>(.*?)</li>', rendered, re.S)))
        self.assertNotIn('padding-right:60px', rendered)

    def test_target_po_and_mo_translations(self):
        data = json.loads((h.ROOT/'FCM/tools/milestone_night_balance_help_translations.json').read_text(encoding='utf-8'))
        for lang in data:
            if lang == 'en':
                continue
            for app, indices in [('FCM', range(6)), ('lobby', [0, 6, 7])]:
                p = h.ROOT/app/'locale'/lang/'LC_MESSAGES/django.po'
                po = p.read_text(encoding='utf-8')
                mo = gettext.GNUTranslations(io.BytesIO(p.with_suffix('.mo').read_bytes()))
                for i in indices:
                    with self.subTest(lang=lang, app=app, message=i):
                        block = next((b for b in po.split('\n\n') if '\nmsgid '+json.dumps(data['en'][i],ensure_ascii=False)+'\n' in '\n'+b+'\n'), '')
                        self.assertTrue(block, data['en'][i])
                        self.assertNotIn('fuzzy', block)
                        self.assertIn('msgstr '+json.dumps(data[lang][i],ensure_ascii=False), block)
                        self.assertEqual(mo.gettext(data['en'][i]), data[lang][i])

    def test_original_sections_rules_and_catalogs_preserved(self):
        reference = Path(os.environ.get('TASK11_REFERENCE', str(h.ROOT.parent/'baseline')))
        if not reference.is_dir():
            self.skipTest('immutable reference required for preservation checks')
        rel = Path('FCM/templates/FCM/fanExpansionsHelp.html')
        current = (h.ROOT/rel).read_bytes()
        text = current.decode('utf-8')
        added = '          '+section(text)+'\n'
        self.assertEqual(current.replace(added.encode(), b'', 1), (reference/rel).read_bytes())
        rel = Path('FCM/rules/Fan_Expansions_rules.md')
        before = (reference/rel).read_bytes()
        after = (h.ROOT/rel).read_bytes()
        self.assertTrue(after.startswith(before))
        self.assertIn(b'## Player Balance Module', after[len(before):])
        data = json.loads((h.ROOT/'FCM/tools/milestone_night_balance_help_translations.json').read_text(encoding='utf-8'))
        for message in data['en'][2:6]:
            self.assertIn(message.encode('utf-8'), after[len(before):])
        for app in ['FCM', 'lobby']:
            for old in (reference/app/'locale').glob('*/LC_MESSAGES/django.mo'):
                rel = old.relative_to(reference)
                previous = gettext.GNUTranslations(io.BytesIO(old.read_bytes()))._catalog
                current = gettext.GNUTranslations(io.BytesIO((h.ROOT/rel).read_bytes()))._catalog
                self.assertEqual({k: current.get(k) for k in previous}, previous, str(rel))
                self.assertTrue((h.ROOT/rel.with_suffix('.po')).read_bytes().startswith(old.with_suffix('.po').read_bytes()))

    def test_mo_serializer_preserves_existing_generator_layout(self):
        import update_milestone_night_balance_help as generator
        # Existing help generators use this canonical GNU MO layout.
        path = h.ROOT/'FCM/locale/de/LC_MESSAGES/django.mo'
        content = path.read_bytes()
        self.assertEqual(generator.compile_mo(generator.mo_messages(content)), content)

    def test_generator_byte_idempotence(self):
        files = [h.ROOT/'FCM/templates/FCM/fanExpansionsHelp.html', h.ROOT/'FCM/rules/Fan_Expansions_rules.md']
        files += [p for app in ['FCM','lobby'] for p in (h.ROOT/app/'locale').glob('*/LC_MESSAGES/django.*') if p.suffix in ['.mo','.po']]
        before = {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        result = subprocess.run([sys.executable,str(h.ROOT/'FCM/tools/update_milestone_night_balance_help.py')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(before,{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files})


if __name__ == '__main__':
    unittest.main()
