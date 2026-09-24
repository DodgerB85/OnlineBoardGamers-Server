import re, sys, pathlib, json
sys.stdout.reconfigure(encoding='utf-8')

def parse(text):
    """Return dict of dotted-key -> en value string (or None if object)."""
    text = re.sub(r'^\s*//.*$', '', text, flags=re.M)
    # token approach with stack of dicts
    root = {}
    stack = []  # list of (container_dict, pending_key_for_container)
    i = 0
    n = len(text)
    token_re = re.compile(r'"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'|([{}\[\]:,])|([A-Za-z_][A-Za-z0-9_]*)|(-?\d+(?:\.\d+)?)|(\s+)')
    pending_key = None
    last_str = None
    while i < n:
        m = token_re.match(text, i)
        if not m:
            i += 1
            continue
        i = m.end()
        if m.group(1) is not None or m.group(2) is not None:
            s = m.group(1) if m.group(1) is not None else m.group(2)
            s = s.encode().decode('unicode_escape') if '\\' in s else s
            # peek for colon
            j = i
            while j < n and text[j] in ' \t\r\n':
                j += 1
            if j < n and text[j] == ':':
                pending_key = s
                last_str = None
            else:
                # it's a string value
                last_str = s
                # assign if we have pending_key path
                target, key = _target(stack, root, pending_key)
                if target is not None and key is not None:
                    target[key] = s
                    pending_key = None
        elif m.group(3):
            c = m.group(3)
            if c == '{':
                target, key = _target(stack, root, pending_key)
                d = {}
                if target is not None and key is not None:
                    target[key] = d
                elif not stack and not root:
                    # first root object - use root itself if empty and pending none
                    pass
                stack.append(d)
                pending_key = None
            elif c == '}':
                if stack:
                    stack.pop()
                pending_key = None
            elif c == ',':
                pending_key = None
            elif c == ':':
                pass
        elif m.group(4) is not None or m.group(5) is not None:
            # identifier or number as value
            if pending_key is not None:
                val = m.group(4) or m.group(5)
                target, key = _target(stack, root, pending_key)
                if target is not None and key is not None:
                    target[key] = val
                pending_key = None
    return root

def _target(stack, root, pending_key):
    if not stack:
        if pending_key is None:
            return None, None
        return root, pending_key
    return stack[-1], pending_key

def flatten(d, prefix=''):
    out = {}
    for k, v in d.items():
        p = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, p))
        else:
            out[p] = v
    return out

en = {}
for p in sorted(pathlib.Path(r'FCM\vueFCM\src\locales\en').glob('*.js')):
    if p.name == 'index.js':
        continue
    en.update(flatten(parse(p.read_text(encoding='utf-8'))))
zh = flatten(parse(pathlib.Path(r'FCM\vueFCM\src\locales\zh-hans.js').read_text(encoding='utf-8')))

missing = {k: en[k] for k in en if k not in zh}
print(json.dumps(missing, ensure_ascii=False, indent=1))
print('---', len(missing), 'missing of', len(en), file=sys.stderr)
