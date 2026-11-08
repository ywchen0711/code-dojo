// node test/run.mjs — checks every level, challenge and quiz generator. Prints "0 problems" when clean.
//   levels:     solution solves every map, size == best (== BFS shortest for sequence-only levels), buggy starts fail,
//               palette / numbers / conditions allowed, maps well-formed, turtle drawings inside the canvas
//   challenges: JS sample solution passes every test, starter does not; Python sample solution (via js/harness.py)
//               passes every test, Python starter does not   (skipped with a note if python is not installed)
//   quizzes:    draws many questions per generator; trace questions are re-run and must print the stated answer
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UNITS } from '../js/units.js';
import LEVELS from '../js/levels/index.js';
import CHALLENGES from '../js/bank/index.js';
import { QUIZ } from '../js/quiz.js';
import { parse, progSize, usedTypes, runLevel, runTurtle, bfs, loadMap, compareDrawing, bounds, DEF_NUMS, NUMKEY, CONDS, ACTIONS } from '../js/engine.js';
import { runJS, same, normOut } from '../js/judge.js';
import { rng } from '../js/util.js';

const only = process.argv[2] || 'all';   // all | levels | challenges | quiz
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let errs = 0;
const fail = (id, msg) => { if (errs++ < 80) console.log(`✗ ${id}: ${msg}`); };
const bad = (s) => typeof s !== 'string' || !s.trim() || /undefined|NaN|\[object|Infinity/.test(s.replace(/<[^>]*>/g, ''));
const bil = (x) => !x || typeof x !== 'object' || bad(x.zh) || bad(x.en) || /[一-鿿]/.test(x.en);
const unitOf = Object.fromEntries(UNITS.map((u) => [u.id, u]));
const ids = new Set();
for (const u of UNITS) { if (ids.has(u.id)) fail(u.id, 'duplicate unit id'); ids.add(u.id); if (bil(u.name)) fail(u.id, 'bad unit name'); if (u.lesson && bil(u.lesson)) fail(u.id, 'bad lesson'); }

// ---------- levels ----------
const count = {};
const walkNums = (list, f) => (list || []).forEach((x) => { f(x); walkNums(x.body, f); walkNums(x.els, f); });
for (const lv of only === 'all' || only === 'levels' ? LEVELS : []) {
  const id = lv.id;
  if (!id || ids.has(id)) fail(id, 'missing or duplicate id'); ids.add(id);
  const u = unitOf[lv.unit];
  if (!u || !['robot', 'blocks', 'turtle'].includes(u.kind)) { fail(id, 'bad unit ' + lv.unit); continue; }
  const turtle = lv.kind === 'turtle';
  if (turtle !== (u.kind === 'turtle') && !(turtle && u.id === 'g6-var')) fail(id, 'level kind does not match unit kind');
  count[u.grade] = (count[u.grade] || 0) + 1;
  if (bil(lv.name)) fail(id, 'bad name'); if (bil(lv.tip)) fail(id, 'bad tip');
  if (!Array.isArray(lv.blocks) || !lv.blocks.length) fail(id, 'no blocks');
  let sol;
  try { sol = parse(lv.sol); } catch (e) { fail(id, 'sol does not parse: ' + e.message); continue; }
  const pal = new Set(lv.blocks);
  const allowed = (p, what) => {
    for (const t of usedTypes(p)) {
      if (t === 'def') { if (!pal.has('call')) fail(id, what + ' uses def but palette has no call'); continue; }
      if (!pal.has(t)) fail(id, `${what} uses block ${t} not in palette`);
    }
    const nums = { ...DEF_NUMS, ...(lv.nums || {}) }, conds = lv.conds || CONDS;
    const chk = (x) => {
      if (x.n != null && NUMKEY[x.t] && !nums[NUMKEY[x.t]].includes(x.n)) fail(id, `${what}: value ${x.n} for ${x.t} not in nums.${NUMKEY[x.t]}`);
      if (x.c && !conds.includes(x.c)) fail(id, `${what}: condition ${x.c} not offered`);
    };
    walkNums(p.main, chk); walkNums(p.f, chk);
  };
  allowed(sol, 'sol');
  const size = progSize(sol);
  if (size !== lv.best) fail(id, `sol size ${size} ≠ best ${lv.best}`);
  if (lv.max != null && lv.max < lv.best) fail(id, 'max < best');
  if (turtle) {
    const r = runTurtle(sol, lv.at ? { x: lv.at[0], y: lv.at[1], h: lv.at[2] ?? 0 } : {});
    if (r.err) fail(id, 'turtle sol error ' + r.err);
    if (!r.segs.length) fail(id, 'turtle draws nothing');
    const b = bounds(r.segs);
    if (b.x0 < 4 || b.y0 < 4 || b.x1 > 396 || b.y1 > 396) fail(id, `drawing leaves canvas ${JSON.stringify(b)}`);
    if (!compareDrawing(r.segs, r.segs).ok) fail(id, 'drawing does not match itself');
    if (lv.start) { try { const st = parse(lv.start); allowed(st, 'start'); const r2 = runTurtle(st, lv.at ? { x: lv.at[0], y: lv.at[1], h: lv.at[2] ?? 0 } : {}); if (compareDrawing(r2.segs, r.segs).ok) fail(id, 'start already draws the target'); } catch (e) { fail(id, 'start: ' + e.message); } }
    continue;
  }
  const maps = lv.maps || [lv.map];
  for (const m of maps) {
    if (!Array.isArray(m) || m.some((r) => r.length !== m[0].length)) fail(id, 'map rows differ in length');
    if (m[0].length > 9 || m.length > 8) fail(id, 'map too big');
    try { loadMap(m); } catch (e) { fail(id, 'map: ' + e.message); }
  }
  runLevel(sol, lv).forEach((r, i) => { if (!r.ok) fail(id, `sol fails on map ${i + 1}: ${r.err}`); });
  if (lv.start) {
    try {
      const st = parse(lv.start); allowed(st, 'start');
      if (runLevel(st, lv).every((r) => r.ok)) fail(id, 'buggy start already solves the level');
    } catch (e) { fail(id, 'start: ' + e.message); }
  }
  const seqOnly = lv.blocks.every((b) => ACTIONS.includes(b));
  if (seqOnly) {
    if (maps.length !== 1) fail(id, 'sequence-only level with several maps');
    const s = bfs(maps[0], lv.blocks);
    if (s == null) fail(id, 'BFS: unsolvable');
    else if (s.split(' ').filter(Boolean).length !== lv.best) fail(id, `BFS shortest is ${s.split(' ').length} (${s}) but best = ${lv.best}`);
  } else {
    for (const m of maps) if (bfs(m) == null) fail(id, 'BFS: map unsolvable');
  }
}

// ---------- challenges ----------
const pyJobs = [];
const ccount = {};
for (const ch of only === 'all' || only === 'challenges' ? CHALLENGES : []) {
  const id = ch.id;
  if (!id || ids.has(id)) fail(id, 'missing or duplicate id'); ids.add(id);
  const u = unitOf[ch.unit];
  if (!u || u.kind !== 'code') { fail(id, 'bad unit ' + ch.unit); continue; }
  ccount[u.grade] = (ccount[u.grade] || 0) + 1;
  if (bil(ch.name)) fail(id, 'bad name'); if (bil(ch.prompt)) fail(id, 'bad prompt');
  if (!['fn', 'out', 'class'].includes(ch.kind)) fail(id, 'bad kind');
  if (ch.kind === 'fn' && (!ch.fn || !Array.isArray(ch.params))) fail(id, 'fn/params missing');
  if (ch.kind === 'class' && (!ch.cls || !Array.isArray(ch.methods))) fail(id, 'cls/methods missing');
  if (typeof ch.starter !== 'string' || typeof ch.pyStarter !== 'string' || typeof ch.py !== 'string') fail(id, 'starter/pyStarter/py missing');
  if (!Array.isArray(ch.hints) || ch.hints.length < 2 || ch.hints.some(bil)) fail(id, 'need ≥ 2 bilingual hints');
  if (!Array.isArray(ch.sol) || ch.sol.some((l) => !Array.isArray(l) || l.length !== 3 || typeof l[0] !== 'string')) { fail(id, 'bad sol lines'); continue; }
  if (ch.sol.some((l) => /[一-鿿]/.test(l[2]) || (!!l[1] !== !!l[2]))) fail(id, 'sol explanation: zh/en mismatch');
  if (!ch.sol.some((l) => l[1])) fail(id, 'sol has no explanations');
  if (!Array.isArray(ch.tests) || !ch.tests.length) { fail(id, 'no tests'); continue; }
  if (ch.kind === 'fn' && ch.tests.length < 4) fail(id, 'fn challenge needs ≥ 4 tests');
  if (ch.kind === 'fn' && ch.tests.some((t) => !Array.isArray(t.args) || t.args.length !== ch.params.length)) fail(id, 'test args do not match params');
  const code = ch.sol.map((l) => l[0]).join('\n');
  const res = runJS(ch, code);
  res.forEach((r, i) => { if (!r.ok) fail(id, `JS solution fails test ${i + 1}: ${r.err || 'got ' + JSON.stringify(r.got) + ' expected ' + JSON.stringify(ch.tests[i].out)}`); });
  if (runJS(ch, ch.starter).every((r) => r.ok)) fail(id, 'starter already passes');
  pyJobs.push({ id, ch: { kind: ch.kind, fn: ch.fn, pyFn: ch.pyFn, cls: ch.cls, tests: ch.tests }, code: ch.py, starter: ch.pyStarter });
}

// ---------- python ----------
let py = null;
for (const cmd of ['python', 'python3']) { try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); py = cmd; break; } catch {} }
if (!pyJobs.length) {}
else if (!py) console.log('(python not found — Python solutions not checked)');
else {
  const dir = mkdtempSync(path.join(tmpdir(), 'cd2-'));
  const file = path.join(dir, 'jobs.json');
  writeFileSync(file, JSON.stringify(pyJobs));
  const out = JSON.parse(execFileSync(py, [path.join(root, 'test/pycheck.py'), file], { maxBuffer: 1 << 26, timeout: 300000 }).toString());
  for (const job of pyJobs) {
    const r = out[job.id], tests = job.ch.tests;
    const ok = (rs) => rs.map((x, i) => !x.err && (job.ch.kind === 'out' ? normOut(x.log) === normOut(tests[i].out) : same(x.got, tests[i].out)));
    ok(r.sol).forEach((g, i) => { if (!g) fail(job.id, `Python solution fails test ${i + 1}: ${r.sol[i].err || 'got ' + JSON.stringify(job.ch.kind === 'out' ? r.sol[i].log : r.sol[i].got) + ' expected ' + JSON.stringify(tests[i].out)}`); });
    if (ok(r.starter).every(Boolean)) fail(job.id, 'Python starter already passes');
    if (r.starter.some((x) => /SyntaxError/.test(x.err || ''))) fail(job.id, 'Python starter has a syntax error');
  }
}

// ---------- quizzes ----------
let qn = 0;
for (const u of UNITS.filter((u) => u.kind === 'quiz' && (only === 'all' || only === 'quiz'))) {
  const gens = QUIZ[u.id];
  if (!gens?.length) { fail(u.id, 'no quiz generators'); continue; }
  for (const [gi, g] of gens.entries()) {
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      let q;
      try { q = g(rng(seed * 7919 + gi)); } catch (e) { fail(`${u.id}#${gi} seed ${seed}`, 'throws ' + e.message); break; }
      qn++;
      const tag = `${u.id}#${gi} seed ${seed}`;
      if (bil(q.q)) fail(tag, 'bad question text');
      if (!Array.isArray(q.options) || q.options.length < 2) { fail(tag, 'needs ≥ 2 options'); continue; }
      const keys = q.options.map((o) => JSON.stringify(o));
      if (new Set(keys).size !== keys.length) fail(tag, 'options not distinct: ' + keys.join(' | '));
      if (!Array.isArray(q.sol) || !q.sol.length || q.sol.some(bil)) fail(tag, 'bad solution steps');
      if (q.code != null) {
        // re-run the code: what it prints must be options[0]
        const log = [];
        try { new Function('console', q.code)({ log: (...a) => log.push(a.map(String).join(' ')) }); } catch (e) { fail(tag, 'code throws ' + e.message); }
        const want = typeof q.options[0] === 'object' ? q.options[0].en : String(q.options[0]);
        if (log.join('\n') !== want) fail(tag, `code prints ${JSON.stringify(log.join('\n'))} but answer is ${JSON.stringify(want)}\n${q.code}`);
      }
      if (q.check && !q.check()) fail(tag, 'self-check failed');
      seen.add(JSON.stringify(q.q) + (q.code || ''));
    }
    if (seen.size < 8) fail(`${u.id}#${gi}`, `only ${seen.size} different questions in 300 draws`);
  }
}

const robot = LEVELS.filter((l) => unitOf[l.unit]?.grade <= 3).length, blocks = LEVELS.length - robot;
console.log(`levels: ${robot} robot (G1–3), ${blocks} block/turtle (G4–6) · by grade ${JSON.stringify(count)}`);
console.log(`challenges: ${CHALLENGES.length} · by grade ${JSON.stringify(ccount)}`);
console.log(`quiz: ${Object.values(QUIZ).flat().length} generators, ${qn} questions drawn`);
console.log(`${errs} problems`);
process.exit(errs ? 1 : 0);
