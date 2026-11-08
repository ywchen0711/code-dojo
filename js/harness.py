# Runs one code challenge's tests against Python source. Used by js/pyworker.js (in Pyodide) and test/pycheck.py.
# run_challenge(ch_json, code) -> JSON list of {"got": value} or {"err": "..."} plus "log" (printed text), one per test.
# The page compares "got" with the expected value using the same rules as JavaScript (js/judge.js same()).
import json, io, re, contextlib, traceback

def _snake(s):
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s).lower()

def _plain(v):
    # make the value JSON-friendly the way students expect: tuples -> lists, sets -> sorted lists
    if isinstance(v, (list, tuple)):
        return [_plain(x) for x in v]
    if isinstance(v, (set, frozenset)):
        return sorted(_plain(x) for x in v)
    if isinstance(v, dict):
        return {str(k): _plain(x) for k, x in v.items()}
    if isinstance(v, float) and v.is_integer():
        return v
    return v

def _err(e):
    tb = traceback.extract_tb(e.__traceback__)
    line = ''
    for fr in tb:
        if fr.filename == '<student>':
            line = ' (line %d)' % fr.lineno
    return '%s: %s%s' % (type(e).__name__, e, line)

def run_challenge(ch_json, code):
    ch = json.loads(ch_json)
    out = []
    try:
        compiled = compile(code, '<student>', 'exec')
    except SyntaxError as e:
        msg = 'SyntaxError: %s (line %s)' % (e.msg, e.lineno)
        return json.dumps([{'err': msg, 'log': ''} for _ in ch['tests']])
    for t in ch['tests']:
        buf = io.StringIO()
        ns = {'__name__': '__main__'}
        try:
            with contextlib.redirect_stdout(buf):
                exec(compiled, ns)
                kind = ch['kind']
                if kind == 'out':
                    got = None
                elif kind == 'fn':
                    name = ch.get('pyFn') or _snake(ch['fn'])
                    f = ns.get(name)
                    if not callable(f):
                        raise NameError("name '%s' is not defined" % name)
                    got = _plain(f(*json.loads(json.dumps(t['args']))))
                else:
                    cls = ns.get(ch['cls'])
                    if cls is None:
                        raise NameError("name '%s' is not defined" % ch['cls'])
                    obj = None
                    got = []
                    for op in t['ops']:
                        m = op[0]
                        args = json.loads(json.dumps(op[1] if len(op) > 1 else []))
                        if m == 'new':
                            obj = cls(*args)
                        else:
                            got.append(_plain(getattr(obj, _snake(m))(*args)))
            r = {'log': buf.getvalue()}
            if ch['kind'] != 'out':
                r['got'] = got
            out.append(r)
        except Exception as e:
            out.append({'err': _err(e), 'log': buf.getvalue()})
    return json.dumps(out)
