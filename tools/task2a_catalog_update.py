"""Append Task2A random choices translations without modifying old catalogs.
Run: python tools/task2a_catalog_update.py
Uses the read-only Task11 stdlib writer; does not regenerate any help section.
"""
from pathlib import Path
import importlib.util
import json
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('task2a_catalog_writer', ROOT/'FCM/tools/update_milestone_night_balance_help.py')
writer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(writer)

def main():
    data = json.loads((ROOT/'tools/task2a_catalog_translations.json').read_text(encoding='utf-8'))
    assert set(data) == {'en','zh-hans','de','es','fr','it'}
    for app in ['FCM', 'Lobby']:
        for lang, values in data.items():
            if lang == 'en':
                continue
            locale = 'zh_Hans' if lang == 'zh-hans' else lang
            path = ROOT/app/'locale'/locale/'LC_MESSAGES/django.po'
            added = writer.append_catalog(path, list(zip(data['en'], values, strict=True)))
            print(path.relative_to(ROOT), added)

if __name__ == '__main__':
    main()
