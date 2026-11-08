// The robot grid world and the turtle: a tiny program language, an interpreter that records every step (the app
// animates the recorded frames), program size for star ratings, a BFS solver for sequence-only levels, and the
// drawing comparison for turtle levels. Pure functions, no DOM, so node tests use the same code as the page.
//
// ---- program text (used for level solutions, buggy starting programs and tests) ----
//   F L R P                 forward, turn left, turn right, pick up a gem
//   rep N { … }             repeat N times
//   until COND { … }        repeat until COND is true
//   while COND { … }        while COND is true
//   if COND { … } [else { … }]
//   def { … }               the body of function f (at most one, anywhere at top level);  call  = run f
//   set N   add N   repc { … }   counter c: set it, add to it, repeat c times
//   turtle: fd N  bk N  rt N  lt N  pu  pd  col NAME  fdc (forward c steps)  rtc (turn right c degrees)
// COND: path pathL pathR blocked gem nogem goal notgoal
//
// ---- maps ----  rows of characters
//   .  ground    #  wall/rock    ~  water    G  gem    *  flag (goal)
//   > < ^ v  the robot facing east / west / north / south (stands on ground)
// A level is won when every gem is picked up and, if the map has a flag, the robot ends on the flag.

export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];          // 0 = north, 1 = east, 2 = south, 3 = west
const DIRCH = { '^': 0, '>': 1, 'v': 2, '<': 3 };
export const CONDS = ['path', 'pathL', 'pathR', 'blocked', 'gem', 'nogem', 'goal', 'notgoal'];
export const ACTIONS = ['F', 'L', 'R', 'P'];
export const TURTLE_ACTIONS = ['fd', 'bk', 'rt', 'lt', 'pu', 'pd', 'col', 'fdc', 'rtc'];
export const CONTAINERS = ['rep', 'until', 'while', 'if', 'repc'];
export const COLORS = ['black', 'red', 'orange', 'green', 'blue', 'purple'];

// ---------- parse / print ----------
let uid = 1;
export const nid = () => uid++;
export function parse(src) {
  const toks = String(src).replace(/([{}])/g, ' $1 ').trim().split(/\s+/).filter(Boolean);
  let i = 0;
  const prog = { main: [], f: null };
  const num = () => { const v = Number(toks[i++]); if (!Number.isFinite(v)) throw new Error('number expected at ' + (i - 1) + ': ' + toks[i - 1]); return v; };
  const cond = () => { const c = toks[i++]; if (!CONDS.includes(c)) throw new Error('bad condition ' + c); return c; };
  const block = () => {
    if (toks[i++] !== '{') throw new Error('{ expected at ' + (i - 1));
    const out = [];
    while (i < toks.length && toks[i] !== '}') out.push(stmt());
    if (toks[i++] !== '}') throw new Error('} expected');
    return out;
  };
  const stmt = () => {
    const t = toks[i++], id = nid();
    if (ACTIONS.includes(t) || ['pu', 'pd', 'fdc', 'rtc', 'call'].includes(t)) return { t, id };
    if (['fd', 'bk', 'rt', 'lt', 'set', 'add'].includes(t)) return { t, n: num(), id };
    if (t === 'col') { const v = toks[i++]; if (!COLORS.includes(v)) throw new Error('bad color ' + v); return { t, v, id }; }
    if (t === 'rep') { const n = num(); return { t, n, body: block(), id }; }
    if (t === 'repc') return { t, body: block(), id };
    if (t === 'until' || t === 'while') { const c = cond(); return { t, c, body: block(), id }; }
    if (t === 'if') {
      const c = cond(), body = block();
      if (toks[i] === 'else') { i++; return { t, c, body, els: block(), id }; }
      return { t, c, body, id };
    }
    throw new Error('unknown word ' + t);
  };
  while (i < toks.length) {
    if (toks[i] === 'def') { i++; if (prog.f) throw new Error('two defs'); prog.f = block(); }
    else prog.main.push(stmt());
  }
  return prog;
}
export function print(prog) {
  const one = (s) => {
    const b = (x) => '{ ' + x.map(one).join(' ') + ' }';
    switch (s.t) {
      case 'rep': return `rep ${s.n} ${b(s.body)}`;
      case 'repc': return `repc ${b(s.body)}`;
      case 'until': case 'while': return `${s.t} ${s.c} ${b(s.body)}`;
      case 'if': return `if ${s.c} ${b(s.body)}` + (s.els ? ` else ${b(s.els)}` : '');
      case 'col': return `col ${s.v}`;
      default: return s.n != null ? `${s.t} ${s.n}` : s.t;
    }
  };
  return (prog.f ? `def { ${prog.f.map(one).join(' ')} } ` : '') + prog.main.map(one).join(' ');
}
// number of blocks (every block counts 1, containers too; the def header is free, its body counts)
export const sizeOf = (list) => (list || []).reduce((s, x) => s + 1 + sizeOf(x.body) + sizeOf(x.els), 0);
export const progSize = (p) => sizeOf(p.main) + sizeOf(p.f);
// every block type used in a program
export function usedTypes(p) {
  const s = new Set();
  const walk = (l) => (l || []).forEach((x) => { s.add(x.t === 'if' && x.els ? 'ifelse' : x.t); walk(x.body); walk(x.els); });
  walk(p.main); walk(p.f); if (p.f) s.add('def');
  return s;
}

// ---------- grid world ----------
export function loadMap(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cells = [], gems = [];
  let start = null, flag = null;
  for (let y = 0; y < h; y++) {
    cells.push([]);
    for (let x = 0; x < w; x++) {
      let c = rows[y][x] || '#';
      if (c in DIRCH) { start = { x, y, d: DIRCH[c] }; c = '.'; }
      if (c === 'G') { gems.push(x + ',' + y); c = '.'; cells[y].push('.'); continue; }
      if (c === '*') { flag = { x, y }; c = '.'; }
      if (!'.#~'.includes(c)) throw new Error('bad map char ' + c);
      cells[y].push(c);
    }
  }
  if (!start) throw new Error('no robot on map');
  return { w, h, cells, gems, start, flag };
}
const cellAt = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? '#' : m.cells[y][x]);
export const free = (m, x, y) => cellAt(m, x, y) !== '#';

// Run a program on a map. Returns { ok, err, frames, steps } where frames = [{ x, y, d, got:[gem keys], node, ev }]
// ev: 'start' | 'move' | 'turn' | 'pick' | 'check' | 'bump' | 'splash' | 'nogem' | ...
export function runGrid(prog, rows, { maxActions = 400, maxSteps = 4000 } = {}) {
  const m = typeof rows[0] === 'string' ? loadMap(rows) : rows;
  let { x, y, d } = m.start;
  const got = new Set();
  const frames = [{ x, y, d, got: [], node: null, ev: 'start' }];
  let actions = 0, steps = 0, c = 0, depth = 0;
  const halt = (err) => { const e = new Error(err); e.code = err; throw e; };
  const snap = (node, ev) => frames.push({ x, y, d, got: [...got], node: node?.id ?? null, ev });
  const test = (cnd) => {
    const fx = x + DX[d], fy = y + DY[d];
    const ok = (dd) => cellAt(m, x + DX[dd], y + DY[dd]) === '.';
    switch (cnd) {
      case 'path': return ok(d);
      case 'pathL': return ok((d + 3) % 4);
      case 'pathR': return ok((d + 1) % 4);
      case 'blocked': return cellAt(m, fx, fy) !== '.';
      case 'gem': return m.gems.includes(x + ',' + y) && !got.has(x + ',' + y);
      case 'nogem': return got.size === m.gems.length;
      case 'goal': return m.flag ? x === m.flag.x && y === m.flag.y : got.size === m.gems.length;
      case 'notgoal': return !(m.flag ? x === m.flag.x && y === m.flag.y : got.size === m.gems.length);
    }
    throw new Error('bad cond ' + cnd);
  };
  const tick = () => { if (++steps > maxSteps) halt('loop'); };
  const act = () => { if (++actions > maxActions) halt('loop'); };
  const exec = (list) => {
    for (const s of list) {
      tick();
      switch (s.t) {
        case 'F': {
          act();
          const nx = x + DX[d], ny = y + DY[d], cc = cellAt(m, nx, ny);
          if (cc === '#') { snap(s, 'bump'); halt('bump'); }
          x = nx; y = ny;
          if (cc === '~') { snap(s, 'splash'); halt('splash'); }
          snap(s, 'move'); break;
        }
        case 'L': act(); d = (d + 3) % 4; snap(s, 'turn'); break;
        case 'R': act(); d = (d + 1) % 4; snap(s, 'turn'); break;
        case 'P': {
          act();
          const k = x + ',' + y;
          if (!m.gems.includes(k) || got.has(k)) { snap(s, 'nogem'); halt('nogem'); }
          got.add(k); snap(s, 'pick'); break;
        }
        case 'rep': for (let i = 0; i < s.n; i++) { snap(s, 'check'); exec(s.body); } break;
        case 'repc': { const n = c; for (let i = 0; i < n; i++) { snap(s, 'check'); exec(s.body); } break; }
        case 'until': while (true) { tick(); snap(s, 'check'); if (test(s.c)) break; exec(s.body); } break;
        case 'while': while (true) { tick(); snap(s, 'check'); if (!test(s.c)) break; exec(s.body); } break;
        case 'if': snap(s, 'check'); if (test(s.c)) exec(s.body); else if (s.els) exec(s.els); break;
        case 'set': c = s.n; snap(s, 'var'); break;
        case 'add': c += s.n; snap(s, 'var'); break;
        case 'call':
          if (!prog.f) halt('nofn');
          if (++depth > 30) halt('loop');
          snap(s, 'call'); exec(prog.f); depth--; break;
        default: halt('badblock');
      }
    }
  };
  let err = null;
  try { exec(prog.main); } catch (e) { if (!e.code) throw e; err = e.code; }
  if (!err) {
    if (got.size < m.gems.length) err = 'gemsleft';
    else if (m.flag && !(x === m.flag.x && y === m.flag.y)) err = 'noflag';
  }
  return { ok: !err, err, frames, steps, map: m, end: { x, y, d } };
}
// a level is solved when the program works on every map of the level
export function runLevel(prog, level) {
  return (level.maps || [level.map]).map((rows) => runGrid(prog, rows));
}

// shortest sequence of F/L/R/P that solves the map (BFS over position, direction and collected gems)
export function bfs(rows, cmds = ['F', 'L', 'R', 'P']) {
  const m = loadMap(rows);
  const G = m.gems.length, gi = Object.fromEntries(m.gems.map((k, i) => [k, i])), full = (1 << G) - 1;
  const key = (x, y, d, g) => ((y * m.w + x) * 4 + d) * (1 << G) + g;
  const s0 = [m.start.x, m.start.y, m.start.d, 0];
  const seen = new Map([[key(...s0), null]]);
  const q = [s0];
  const done = (x, y, g) => g === full && (!m.flag || (x === m.flag.x && y === m.flag.y));
  if (done(...[s0[0], s0[1], 0])) return '';
  for (let h = 0; h < q.length; h++) {
    const [x, y, d, g] = q[h];
    for (const c of cmds) {
      let nx = x, ny = y, nd = d, ng = g;
      if (c === 'F') { nx = x + DX[d]; ny = y + DY[d]; if (cellAt(m, nx, ny) !== '.') continue; }
      else if (c === 'L') nd = (d + 3) % 4;
      else if (c === 'R') nd = (d + 1) % 4;
      else if (c === 'P') { const i = gi[x + ',' + y]; if (i == null || g & (1 << i)) continue; ng = g | (1 << i); }
      const k = key(nx, ny, nd, ng);
      if (seen.has(k)) continue;
      seen.set(k, [key(x, y, d, g), c]);
      if (done(nx, ny, ng)) {
        const path = []; let kk = k;
        while (seen.get(kk)) { const [pk, pc] = seen.get(kk); path.unshift(pc); kk = pk; }
        return path.join(' ');
      }
      q.push([nx, ny, nd, ng]);
    }
  }
  return null;
}

// ---------- turtle ----------
// Canvas 400 × 400, y grows downward. heading 0 = up, 90 = right (degrees, clockwise).
export function runTurtle(prog, { x = 200, y = 200, h = 0, maxSteps = 4000, maxSegs = 1500 } = {}) {
  let pen = true, col = 'black', c = 0, steps = 0, depth = 0;
  const segs = [], frames = [{ x, y, h, node: null, seg: 0, pen, col }];
  const halt = (err) => { const e = new Error(err); e.code = err; throw e; };
  const snap = (node) => frames.push({ x, y, h, node: node?.id ?? null, seg: segs.length, pen, col });
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const move = (n, node) => {
    const a = (h * Math.PI) / 180, nx = r6(x + n * Math.sin(a)), ny = r6(y - n * Math.cos(a));
    if (pen && n) { segs.push({ x1: x, y1: y, x2: nx, y2: ny, col }); if (segs.length > maxSegs) halt('loop'); }
    x = nx; y = ny; snap(node);
  };
  const exec = (list) => {
    for (const s of list) {
      if (++steps > maxSteps) halt('loop');
      switch (s.t) {
        case 'fd': move(s.n, s); break;
        case 'bk': move(-s.n, s); break;
        case 'fdc': move(c, s); break;
        case 'rt': h = (h + s.n) % 360; snap(s); break;
        case 'lt': h = (h - s.n + 360) % 360; snap(s); break;
        case 'rtc': h = (((h + c) % 360) + 360) % 360; snap(s); break;
        case 'pu': pen = false; snap(s); break;
        case 'pd': pen = true; snap(s); break;
        case 'col': col = s.v; snap(s); break;
        case 'set': c = s.n; snap(s); break;
        case 'add': c += s.n; snap(s); break;
        case 'rep': for (let i = 0; i < s.n; i++) exec(s.body); break;
        case 'repc': { const n = c; for (let i = 0; i < n; i++) exec(s.body); break; }
        case 'call': if (!prog.f) halt('nofn'); if (++depth > 30) halt('loop'); exec(prog.f); depth--; break;
        default: halt('badblock');
      }
    }
  };
  let err = null;
  try { exec(prog.main); } catch (e) { if (!e.code) throw e; err = e.code; }
  return { err, segs, frames, end: { x, y, h } };
}
// distance from point to segment
function dseg(px, py, s) {
  const vx = s.x2 - s.x1, vy = s.y2 - s.y1, L = vx * vx + vy * vy;
  let t = L ? ((px - s.x1) * vx + (py - s.y1) * vy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s.x1 + t * vx), py - (s.y1 + t * vy));
}
function samples(segs, step = 3) {
  const pts = [];
  for (const s of segs) {
    const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) pts.push([s.x1 + ((s.x2 - s.x1) * i) / n, s.y1 + ((s.y2 - s.y1) * i) / n]);
  }
  return pts;
}
// how well the drawing matches the target: { ok, missing (0–1 share of target not drawn), extra (0–1 share of drawing off target) }
export function compareDrawing(drawn, target, tol = 4) {
  if (!drawn.length) return { ok: false, missing: 1, extra: 0 };
  const near = (pts, segs) => pts.filter(([px, py]) => segs.some((s) => dseg(px, py, s) <= tol)).length;
  const tp = samples(target), dp = samples(drawn);
  const missing = 1 - near(tp, drawn) / tp.length, extra = 1 - near(dp, target) / dp.length;
  return { ok: missing === 0 && extra === 0, missing, extra };
}
export function bounds(segs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) { x0 = Math.min(x0, s.x1, s.x2); x1 = Math.max(x1, s.x1, s.x2); y0 = Math.min(y0, s.y1, s.y2); y1 = Math.max(y1, s.y1, s.y2); }
  return { x0, y0, x1, y1 };
}

// dropdown values offered when a level does not list its own
export const DEF_NUMS = {
  rep: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  fd: [10, 20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200],
  ang: [30, 36, 45, 60, 72, 90, 120, 135, 144, 150],
  set: [0, 1, 2, 3, 4, 5, 10, 20],
  add: [1, 2, 3, 5, 10, -1],
};
// which nums key a block's number uses
export const NUMKEY = { rep: 'rep', fd: 'fd', bk: 'fd', rt: 'ang', lt: 'ang', set: 'set', add: 'add' };
