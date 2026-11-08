// Runs a code challenge's tests against JavaScript source (in the Web Worker on the page, directly in node tests),
// and compares results. Python results come back from js/harness.py as JSON and use the same `same()`.
//
// Challenge kinds:
//   fn     tests: [{ args: [..], out }]                       call the function `fn` with args, compare the return value
//   out    tests: [{ out: 'text' }]                           run the whole program, compare what it prints
//   class  tests: [{ ops: [['new', [..]], ['method', [..]], ..], out: [..] }]
//          create the class `cls`, call the methods in order, compare the list of return values (one per method call)

export const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// deep equality; numbers within 1e-6; undefined counts as null; arrays/objects by content
export function same(a, b) {
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) || (Number.isNaN(a) && Number.isNaN(b));
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined), kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => same(a[k], b[k]));
}
// printed text compare: ignore trailing spaces on lines and trailing blank lines
export const normOut = (s) => String(s ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

// how a value is shown to the student (JS-style); Python results are shown the same way
export function show(v) {
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
// console.log formatting for the fake console
function fmt(v) {
  if (typeof v === 'string') return v;
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return '[Function]';
  if (typeof v === 'object' && v !== null) { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const errText = (e) => (e && e.name ? `${e.name}: ${e.message}` : String(e));

// Run every test. onOne(i, result) is called after each test (the worker posts progress so a hang can be located).
// result = { ok, got, err, log }
export function runJS(ch, code, onOne) {
  const results = [];
  const push = (i, r) => { results.push(r); onOne?.(i, r); };
  const makeConsole = (log) => ({ log: (...a) => log.push(a.map(fmt).join(' ')), error: (...a) => log.push(a.map(fmt).join(' ')), warn: (...a) => log.push(a.map(fmt).join(' ')), info: (...a) => log.push(a.map(fmt).join(' ')) });
  const compile = (name, log) => {
    const tail = name ? `\n;return (typeof ${name} !== 'undefined') ? ${name} : undefined;` : '';
    return new Function('console', code + tail)(makeConsole(log));
  };
  ch.tests.forEach((t, i) => {
    const log = [];
    try {
      if (ch.kind === 'out') {
        compile(null, log);
        const got = log.join('\n');
        return push(i, { ok: normOut(got) === normOut(t.out), got, log });
      }
      const name = ch.kind === 'class' ? ch.cls : ch.fn;
      const f = compile(name, log);
      if (typeof f !== 'function') return push(i, { ok: false, err: `ReferenceError: ${name} is not defined`, log });
      if (ch.kind === 'fn') {
        const got = clone(f(...clone(t.args)));
        return push(i, { ok: same(got, t.out), got, log });
      }
      let obj = null; const got = [];
      for (const [m, args = []] of t.ops) {
        if (m === 'new') obj = new f(...clone(args));
        else { if (typeof obj?.[m] !== 'function') throw new TypeError(`${m} is not a method of ${name}`); got.push(clone(obj[m](...clone(args))) ?? null); }
      }
      push(i, { ok: same(got, t.out), got, log });
    } catch (e) {
      push(i, { ok: false, err: errText(e), log });
    }
  });
  return results;
}
// a short text for a test's input, as the student sees it
export function testInput(ch, t, py = false) {
  const nm = py ? snake : (x) => x;
  if (ch.kind === 'out') return '';
  if (ch.kind === 'fn') return `${nm(ch.fn)}(${t.args.map((a) => pyShow(a, py)).join(', ')})`;
  return t.ops.map(([m, a = []]) => (m === 'new' ? `${py ? '' : 'new '}${ch.cls}(${a.map((x) => pyShow(x, py)).join(', ')})` : `.${nm(m)}(${a.map((x) => pyShow(x, py)).join(', ')})`)).join(' ');
}
export function pyShow(v, py) {
  if (!py) return show(v);
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((x) => pyShow(x, true)).join(', ') + ']';
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${pyShow(x, true)}`).join(', ') + '}';
  return String(v);
}
