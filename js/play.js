// The level player for robot (G1–3), block (G4–6) and turtle levels: tap-to-build program editor with nesting,
// grid world / turtle canvas drawn in SVG, step-by-step animation of the recorded frames, star rating.
import { parse, print, progSize, runGrid, runTurtle, loadMap, compareDrawing, nid, DEF_NUMS, NUMKEY, CONDS, COLORS } from './engine.js';
import { $, $$, S, L, X, store, setStars, starsOf, starHTML, logA, logAct, beep, confetti, esc } from './ui.js';

const BL = {
  F: ['⬆', '前進', 'forward', 'mv'], L: ['↶', '左轉', 'turn left', 'tn'], R: ['↷', '右轉', 'turn right', 'tn'], P: ['💎', '撿起', 'pick up', 'pk'],
  rep: ['🔁', '重複', 'repeat', 'lp'], until: ['🔁', '重複直到', 'repeat until', 'lp'], while: ['🔁', '當', 'while', 'lp'],
  if: ['❓', '如果', 'if', 'lg'], ifelse: ['❓', '如果…否則', 'if / else', 'lg'], call: ['📞', '呼叫 f', 'call f', 'fn'],
  set: ['📦', 'c 設為', 'set c to', 'vr'], add: ['➕', 'c 加上', 'add to c', 'vr'], repc: ['🔁', '重複 c 次', 'repeat c times', 'lp'],
  fd: ['⬆', '前進', 'move', 'mv'], bk: ['⬇', '後退', 'back', 'mv'], rt: ['↷', '右轉', 'turn right', 'tn'], lt: ['↶', '左轉', 'turn left', 'tn'],
  pu: ['✋', '提起畫筆', 'pen up', 'pn'], pd: ['✏️', '放下畫筆', 'pen down', 'pn'], col: ['🎨', '顏色', 'color', 'pn'],
  fdc: ['⬆', '前進 c 步', 'move c steps', 'mv'], rtc: ['↷', '右轉 c 度', 'turn right c°', 'tn'],
};
const CL = {
  path: ['前面有路', 'path ahead'], pathL: ['左邊有路', 'path to the left'], pathR: ['右邊有路', 'path to the right'], blocked: ['前面被擋住', 'blocked ahead'],
  gem: ['這裡有寶石', 'gem here'], nogem: ['寶石都撿完了', 'all gems collected'], goal: ['到達終點', 'at the goal'], notgoal: ['還沒到終點', 'not at the goal'],
};
const COLZH = { black: '黑', red: '紅', orange: '橘', green: '綠', blue: '藍', purple: '紫' };
const COLHEX = { black: '#2b2d42', red: '#e03131', orange: '#f76707', green: '#2f9e44', blue: '#1c7ed6', purple: '#7048e8' };
const CONTAINER = (t) => ['rep', 'until', 'while', 'if', 'repc'].includes(t);
const MSG = {
  bump: ['撞到石頭了！看看機器人在哪一步撞到。', 'Bump! The robot hit a rock. Find the step where it happened.'],
  splash: ['撲通！機器人掉進水裡了。', 'Splash! The robot fell into the water.'],
  nogem: ['這裡沒有寶石可以撿喔。', 'There is no gem here to pick up.'],
  gemsleft: ['還有寶石沒撿到。', 'Some gems are still left.'],
  noflag: ['程式結束了，但機器人沒有停在旗子上。', 'The program ended, but the robot is not on the flag.'],
  loop: ['步數太多了——是不是無限迴圈？', 'Too many steps — is it an endless loop?'],
  nofn: ['函式 f 還是空的。', 'Function f is still empty.'],
  badblock: ['有看不懂的方塊。', 'There is a block the robot does not understand.'],
};

export function playLevel(app, lv, ctx) {
  const turtle = lv.kind === 'turtle';
  const hasF = lv.blocks.includes('call');
  const nums = { ...DEF_NUMS, ...(lv.nums || {}) }, conds = lv.conds || CONDS;
  const drafts = store.get('drafts', {});
  const fresh = () => { const p = lv.start ? parse(lv.start) : { main: [], f: null }; if (hasF && !p.f) p.f = []; return p; };
  let prog;
  try { prog = drafts[lv.id] ? parse(drafts[lv.id]) : fresh(); if (hasF && !prog.f) prog.f = []; } catch { prog = fresh(); }
  let cursor = { path: 'main', idx: prog.main.length };
  const maps = turtle ? [] : lv.maps || [lv.map];
  let view = 0;                      // which map is shown
  let player = null;                 // running animation state
  const at = lv.at ? { x: lv.at[0], y: lv.at[1], h: lv.at[2] ?? 0 } : {};
  const target = turtle ? runTurtle(parse(lv.sol), at).segs : null;
  const pos = ctx.index + 1;

  app.innerHTML = `<nav class="crumb"><a href="#/g/${ctx.unit.grade}">← ${X(ctx.unit.name)}</a><span class="lvlno">${L(`第 ${pos} / ${ctx.total} 關`, `Level ${pos} / ${ctx.total}`)}</span></nav>
    <section class="lhead"><h1>${X(lv.name)} ${starHTML(starsOf(lv.id))}</h1>
      <p class="tip">💡 ${X(lv.tip)}</p>
      ${ctx.index === 0 && ctx.unit.lesson ? `<details class="lesson" open><summary>📘 ${L('小課程', 'Mini lesson')}</summary><p>${X(ctx.unit.lesson)}</p></details>` : ''}
    </section>
    <div class="play ${turtle ? 'is-turtle' : ''}">
      <div class="stage">
        ${maps.length > 1 ? `<div class="maptabs" role="tablist">${maps.map((_, i) => `<button class="mt" data-m="${i}" role="tab">${L('地圖', 'Map')} ${i + 1}</button>`).join('')}<span class="mnote">${L('同一個程式要在每張地圖都成功', 'One program must work on every map')}</span></div>` : ''}
        <div class="world" id="world"></div>
        <div class="runbar">
          <button class="btn big" id="run">▶ ${L('執行', 'Run')}</button>
          <button class="btn ghost" id="step" title="${L('一次走一步', 'One step at a time')}">⏭ ${L('一步', 'Step')}</button>
          <button class="btn ghost" id="reset">↺ ${L('重來', 'Reset')}</button>
          <label class="speed">🐢<input type="range" id="spd" min="1" max="5" value="${store.get('speed', 3)}" aria-label="${L('速度', 'speed')}">🐇</label>
        </div>
        <div class="msg" id="msg" aria-live="polite"></div>
      </div>
      <div class="coding">
        <div class="goalbar"><span id="cnt"></span><span class="goal">${starHTML(3)} ${L(`用 ${lv.best} 個方塊以內`, `≤ ${lv.best} blocks`)}</span></div>
        <div class="palette" id="pal" aria-label="${L('指令方塊', 'blocks')}"></div>
        ${hasF ? `<div class="fnbox"><div class="ptitle">🧩 ${L('函式 f', 'Function f')}</div><div class="prog" id="pf"></div></div>` : ''}
        <div class="progbox"><div class="ptitle">📜 ${L('主程式', 'Main program')} <button class="link" id="clear">${L('全部清除', 'Clear all')}</button>${lv.start ? `<button class="link" id="orig">${L('還原題目程式', 'Restore the given program')}</button>` : ''}</div><div class="prog" id="pm"></div></div>
        ${turtle ? '' : `<p class="keyhelp">${L('鍵盤：方向鍵 ↑ ← →、P 撿起、Backspace 刪除、Enter 執行', 'Keyboard: arrows ↑ ← →, P pick up, Backspace delete, Enter run')}</p>`}
      </div>
    </div>
    <div class="win" id="win" hidden></div>`;

  // ---------- palette ----------
  const pal = $('#pal');
  pal.innerHTML = lv.blocks.map((b) => `<button class="pb k-${BL[b][3]}" data-b="${b}"><span class="bi">${BL[b][0]}</span>${L(BL[b][1], BL[b][2])}</button>`).join('');
  pal.onclick = (e) => { const b = e.target.closest('.pb'); if (b && !b.disabled) add(b.dataset.b); };

  // ---------- program model ----------
  const resolve = (path) => {
    const parts = path.split('.');
    let list = prog[parts[0]];
    for (let i = 1; i < parts.length; i += 2) list = list[+parts[i]][parts[i + 1]];
    return list;
  };
  const make = (b) => {
    const id = nid();
    if (b === 'ifelse') return { t: 'if', c: conds.includes('path') ? 'path' : conds[0], body: [], els: [], id };
    const n = { t: b, id };
    if (NUMKEY[b]) { const opts = nums[NUMKEY[b]]; n.n = b === 'rep' ? (opts.includes(3) ? 3 : opts[0]) : b === 'rt' || b === 'lt' ? (opts.includes(90) ? 90 : opts[0]) : b === 'fd' || b === 'bk' ? (opts.includes(100) ? 100 : opts[Math.floor(opts.length / 2)]) : opts[0]; }
    if (['until', 'while', 'if'].includes(b)) n.c = b === 'until' ? (conds.includes('goal') ? 'goal' : conds[0]) : conds.includes('path') ? 'path' : conds[0];
    if (CONTAINER(b)) n.body = [];
    if (b === 'col') n.v = 'red';
    return n;
  };
  const size = () => progSize(prog);
  function add(b) {
    if (player) stop();
    if (lv.max && size() >= lv.max) { say(L(`這一關最多只能用 ${lv.max} 個方塊。試試用迴圈！`, `This level allows at most ${lv.max} blocks. Try a loop!`), 'no'); beep('fail'); return; }
    const list = resolve(cursor.path), n = make(b);
    list.splice(cursor.idx, 0, n);
    if (CONTAINER(n.t)) cursor = { path: `${cursor.path}.${cursor.idx}.body`, idx: 0 };
    else cursor.idx++;
    beep('click'); changed();
  }
  function del(path, i) {
    if (player) stop();
    const list = resolve(path);
    list.splice(i, 1);
    const me = `${path}.${i}.`;
    if (cursor.path.startsWith(me)) cursor = { path, idx: i };
    else if (cursor.path === path && cursor.idx > i) cursor.idx--;
    else if (cursor.path.startsWith(path + '.')) {
      // cursor inside a later sibling: its index shifted down by one
      const rest = cursor.path.slice(path.length + 1).split('.');
      if (+rest[0] > i) { rest[0] = String(+rest[0] - 1); cursor.path = path + '.' + rest.join('.'); }
    }
    changed();
  }
  function changed() {
    drafts[lv.id] = print(prog); store.set('drafts', drafts);
    render();
    resetWorld();
  }

  // ---------- program view ----------
  const sel = (k, val, opts, lab = (x) => x) => `<select data-k="${k}" aria-label="${k}">${(opts.includes(val) ? opts : [...opts, val]).map((o) => `<option value="${o}" ${o === val ? 'selected' : ''}>${lab(o)}</option>`).join('')}</select>`;
  const condLab = (c) => L(...CL[c]);
  function blockHTML(n, path, i) {
    const t = n.t === 'if' && n.els ? 'ifelse' : n.t, [ic, zh, en, cat] = BL[t];
    let label;
    switch (n.t) {
      case 'rep': label = L(`重複 ${sel('n', n.n, nums.rep)} 次`, `repeat ${sel('n', n.n, nums.rep)} times`); break;
      case 'until': label = L(`重複直到 ${sel('c', n.c, conds, condLab)}`, `repeat until ${sel('c', n.c, conds, condLab)}`); break;
      case 'while': label = L(`當 ${sel('c', n.c, conds, condLab)} 時重複`, `while ${sel('c', n.c, conds, condLab)}`); break;
      case 'if': label = L(`如果 ${sel('c', n.c, conds, condLab)}`, `if ${sel('c', n.c, conds, condLab)}`); break;
      case 'set': label = L(`c 設為 ${sel('n', n.n, nums.set)}`, `set c to ${sel('n', n.n, nums.set)}`); break;
      case 'add': label = L(`c 加上 ${sel('n', n.n, nums.add)}`, `add ${sel('n', n.n, nums.add)} to c`); break;
      case 'fd': label = L(`前進 ${sel('n', n.n, nums.fd)} 步`, `move ${sel('n', n.n, nums.fd)}`); break;
      case 'bk': label = L(`後退 ${sel('n', n.n, nums.fd)} 步`, `back ${sel('n', n.n, nums.fd)}`); break;
      case 'rt': label = L(`右轉 ${sel('n', n.n, nums.ang)} 度`, `turn right ${sel('n', n.n, nums.ang)}°`); break;
      case 'lt': label = L(`左轉 ${sel('n', n.n, nums.ang)} 度`, `turn left ${sel('n', n.n, nums.ang)}°`); break;
      case 'col': label = L(`顏色 ${sel('v', n.v, COLORS, (c) => COLZH[c])}`, `color ${sel('v', n.v, COLORS)}`); break;
      default: label = L(zh, en);
    }
    let h = `<div class="blk k-${cat}" data-id="${n.id}" data-path="${path}" data-i="${i}"><div class="bh"><span class="bi">${ic}</span><span class="bl">${label}</span><button class="del" aria-label="${L('刪除', 'delete')}">×</button></div>`;
    if (n.body) h += `<div class="inner">${listHTML(n.body, `${path}.${i}.body`)}</div>`;
    if (n.els) h += `<div class="bh els">${L('否則', 'else')}</div><div class="inner">${listHTML(n.els, `${path}.${i}.els`)}</div>`;
    if (n.body) h += '<div class="cap"></div>';
    return h + '</div>';
  }
  const gap = (path, i, empty) => `<button class="gap ${cursor.path === path && cursor.idx === i ? 'cur' : ''} ${empty ? 'empty' : ''}" data-path="${path}" data-i="${i}" aria-label="${L('放在這裡', 'insert here')}">${empty ? L('點這裡，再點上面的方塊', 'tap here, then a block above') : ''}</button>`;
  function listHTML(list, path) {
    if (!list.length) return gap(path, 0, true);
    return list.map((n, i) => gap(path, i) + blockHTML(n, path, i)).join('') + gap(path, list.length);
  }
  function render() {
    $('#pm').innerHTML = listHTML(prog.main, 'main');
    if (hasF) $('#pf').innerHTML = listHTML(prog.f, 'f');
    const n = size();
    $('#cnt').innerHTML = L(`方塊：<b>${n}</b>${lv.max ? ` / 最多 ${lv.max}` : ''}`, `Blocks: <b>${n}</b>${lv.max ? ` / max ${lv.max}` : ''}`);
    $$('.pb', pal).forEach((b) => (b.disabled = !!(lv.max && n >= lv.max)));
  }
  for (const id of ['#pm', '#pf']) {
    const el = $(id); if (!el) continue;
    el.addEventListener('click', (e) => {
      const g = e.target.closest('.gap');
      if (g) { cursor = { path: g.dataset.path, idx: +g.dataset.i }; render(); return; }
      const d = e.target.closest('.del');
      if (d) { const b = d.closest('.blk'); del(b.dataset.path, +b.dataset.i); }
    });
    el.addEventListener('change', (e) => {
      const s = e.target.closest('select'), b = s?.closest('.blk'); if (!b) return;
      const node = resolve(b.dataset.path)[+b.dataset.i];
      const k = s.dataset.k; node[k] = k === 'n' ? +s.value : s.value;
      changed();
    });
  }
  $('#clear').onclick = () => { prog.main = []; if (hasF) prog.f = []; cursor = { path: 'main', idx: 0 }; changed(); };
  const orig = $('#orig'); if (orig) orig.onclick = () => { prog = fresh(); cursor = { path: 'main', idx: prog.main.length }; changed(); };

  // ---------- world ----------
  const C = 60;
  let robotAngle = 0;
  function worldSVG(rows) {
    const m = loadMap(rows);
    let s = `<svg viewBox="0 0 ${m.w * C} ${m.h * C}" class="grid" role="img" aria-label="${L('地圖', 'map')}">`;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = m.cells[y][x], X0 = x * C, Y0 = y * C;
      if (c === '~') s += `<rect x="${X0}" y="${Y0}" width="${C}" height="${C}" class="t-water"/><path d="M${X0 + 10} ${Y0 + 24} q7 -6 14 0 t14 0 t14 0 M${X0 + 6} ${Y0 + 40} q7 -6 14 0 t14 0 t14 0" class="wave"/>`;
      else {
        s += `<rect x="${X0}" y="${Y0}" width="${C}" height="${C}" class="${(x + y) % 2 ? 't-g1' : 't-g2'}"/>`;
        if (c === '#') s += `<g class="rock"><ellipse cx="${X0 + 30}" cy="${Y0 + 36}" rx="24" ry="18"/><ellipse cx="${X0 + 22}" cy="${Y0 + 30}" rx="8" ry="5" class="hi"/></g>`;
      }
    }
    if (m.flag) { const fx = m.flag.x * C, fy = m.flag.y * C; s += `<g class="flag"><circle cx="${fx + 30}" cy="${fy + 50}" r="9" class="fb"/><line x1="${fx + 24}" y1="${fy + 50}" x2="${fx + 24}" y2="${fy + 10}"/><path d="M${fx + 25} ${fy + 10} l22 8 l-22 8z"/></g>`; }
    for (const k of m.gems) { const [gx, gy] = k.split(',').map(Number); s += `<g class="gem" data-k="${k}"><path d="M${gx * C + 30} ${gy * C + 14} l14 14 l-14 20 l-14 -20z"/><path d="M${gx * C + 16} ${gy * C + 28} h28" class="gl"/></g>`; }
    robotAngle = m.start.d * 90;
    s += `<g id="rb" class="robot" style="transform: translate(${m.start.x * C + 30}px, ${m.start.y * C + 30}px) rotate(${robotAngle}deg)">
      <g class="rbin"><rect x="-19" y="-17" width="38" height="36" rx="10" class="rbody"/><rect x="-13" y="-10" width="26" height="14" rx="5" class="visor"/>
      <circle cx="-6" cy="-3" r="3.2" class="eye"/><circle cx="6" cy="-3" r="3.2" class="eye"/><path d="M0 -17 V-26" class="ant"/><circle cx="0" cy="-27" r="3.5" class="antb"/>
      <path d="M-8 -30 L0 -40 L8 -30" class="nose"/><rect x="-22" y="6" width="6" height="12" rx="3" class="wheel"/><rect x="16" y="6" width="6" height="12" rx="3" class="wheel"/></g></g></svg>`;
    return s;
  }
  function turtleSVG() {
    let s = '<svg viewBox="0 0 400 400" class="tcanvas" role="img" aria-label="canvas"><rect width="400" height="400" class="paper"/>';
    for (let i = 50; i < 400; i += 50) s += `<line x1="${i}" y1="0" x2="${i}" y2="400" class="tgrid"/><line x1="0" y1="${i}" x2="400" y2="${i}" class="tgrid"/>`;
    s += `<g class="target">${target.map((g) => `<line x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"/>`).join('')}</g><g id="dr" class="drawn"></g>`;
    const h = at.h ?? 0;
    s += `<g id="tt" class="turtle" style="transform: translate(${at.x ?? 200}px, ${at.y ?? 200}px) rotate(${h}deg)"><ellipse cx="0" cy="-15" rx="5" ry="6" class="thead"/><ellipse cx="-11" cy="-7" rx="4" ry="3" class="tleg"/><ellipse cx="11" cy="-7" rx="4" ry="3" class="tleg"/><ellipse cx="-11" cy="8" rx="4" ry="3" class="tleg"/><ellipse cx="11" cy="8" rx="4" ry="3" class="tleg"/><ellipse cx="0" cy="0" rx="10" ry="12" class="tshell"/><path d="M0 -8 L5 0 L0 8 L-5 0z" class="tpat"/></g></svg>`;
    return s;
  }
  function resetWorld() {
    if (player) stop();
    $('#world').innerHTML = turtle ? turtleSVG() : worldSVG(maps[view]);
    $$('.mt').forEach((b) => b.classList.toggle('on', +b.dataset.m === view));
    hl(null);
  }
  $$('.mt').forEach((b) => (b.onclick = () => { view = +b.dataset.m; resetWorld(); say(''); }));

  // ---------- running ----------
  const delay = () => [0, 750, 520, 340, 200, 90][+$('#spd').value] || 340;
  $('#spd').onchange = (e) => store.set('speed', +e.target.value);
  function hl(id) {
    $$('.blk.hl').forEach((b) => b.classList.remove('hl'));
    if (id != null) $(`.blk[data-id="${id}"]`)?.classList.add('hl');
  }
  function say(html, cls = '') { const m = $('#msg'); m.className = 'msg ' + cls; m.innerHTML = html; }
  function setRunning(on) { document.body.classList.toggle('running', on); $('#run').innerHTML = on ? `⏹ ${L('停止', 'Stop')}` : `▶ ${L('執行', 'Run')}`; }
  function stop() { if (player?.timer) clearTimeout(player.timer); player = null; setRunning(false); hl(null); }

  function begin(auto) {
    if (!prog.main.length) { say(L('先放一些方塊吧！', 'Add some blocks first!'), 'no'); return null; }
    if (turtle) {
      const r = runTurtle(prog, at);
      $('#world').innerHTML = turtleSVG();
      return { auto, kind: 't', r, i: 0 };
    }
    const results = maps.map((m) => runGrid(prog, m));
    view = 0; $('#world').innerHTML = worldSVG(maps[0]); $$('.mt').forEach((b) => b.classList.toggle('on', +b.dataset.m === 0));
    return { auto, kind: 'g', results, i: 0 };
  }
  function advance() {
    const p = player; if (!p) return;
    if (p.kind === 't') {
      const f = p.r.frames[p.i];
      if (f) { drawTurtle(p.r, f); hl(f.node); p.i++; }
      if (p.i >= p.r.frames.length) return finishTurtle(p.r);
      if (p.auto) p.timer = setTimeout(advance, Math.max(12, Math.min(delay(), 9000 / p.r.frames.length)));
      return;
    }
    const r = p.results[view], f = r.frames[p.i];
    if (f) { drawRobot(f, r.frames[p.i - 1]); hl(f.node); p.i++; }
    if (p.i >= r.frames.length) {
      if (!r.ok) return finishGrid(false, r.err);
      if (view + 1 < maps.length) {
        say(`✅ ${L(`地圖 ${view + 1} 成功！接著試地圖 ${view + 2}…`, `Map ${view + 1} works! Now map ${view + 2}…`)}`, 'ok');
        view++; p.i = 0;
        p.timer = setTimeout(() => { if (player !== p) return; $('#world').innerHTML = worldSVG(maps[view]); $$('.mt').forEach((b) => b.classList.toggle('on', +b.dataset.m === view)); if (p.auto) p.timer = setTimeout(advance, delay()); }, Math.max(500, delay() * 2));
        return;
      }
      return finishGrid(true);
    }
    if (p.auto) p.timer = setTimeout(advance, delay());
  }
  function drawRobot(f, prev) {
    const rb = $('#rb'); if (!rb) return;
    if (prev) { const dd = (f.d - prev.d + 4) % 4; if (dd === 1) robotAngle += 90; else if (dd === 3) robotAngle -= 90; }
    rb.style.transitionDuration = Math.min(delay(), 400) + 'ms';
    rb.style.transform = `translate(${f.x * C + 30}px, ${f.y * C + 30}px) rotate(${robotAngle}deg)`;
    rb.classList.remove('bump', 'splash');
    if (f.ev === 'bump') { void rb.getBBox(); rb.classList.add('bump'); }
    if (f.ev === 'splash') rb.classList.add('splash');
    for (const k of f.got) $(`.gem[data-k="${k}"]`)?.classList.add('got');
    if (f.ev === 'pick') beep('gem'); else if (f.ev === 'move') beep('step'); else if (f.ev === 'turn') beep('turn');
  }
  function drawTurtle(r, f) {
    const dr = $('#dr'), have = dr.childElementCount;
    for (let k = have; k < f.seg; k++) {
      const g = r.segs[k], ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', g.x1); ln.setAttribute('y1', g.y1); ln.setAttribute('x2', g.x2); ln.setAttribute('y2', g.y2); ln.setAttribute('stroke', COLHEX[g.col]);
      dr.appendChild(ln);
    }
    const tt = $('#tt'); tt.style.transitionDuration = Math.min(delay(), 250) + 'ms';
    tt.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.h}deg)`;
  }
  function finishGrid(ok, err) {
    const p = player; stop();
    if (!p) return;
    logA(lv.unit, ok);
    if (!ok) {
      beep('fail');
      say(`❌ ${maps.length > 1 ? L(`地圖 ${view + 1}：`, `Map ${view + 1}: `) : ''}${L(...(MSG[err] || MSG.badblock))} ${L('改一改程式再試一次！', 'Fix the program and try again!')}`, 'no');
      return;
    }
    win();
  }
  function finishTurtle(r) {
    stop();
    if (r.err) { logA(lv.unit, false); beep('fail'); return say(`❌ ${L(...(MSG[r.err] || MSG.badblock))}`, 'no'); }
    const c = compareDrawing(r.segs, target);
    logA(lv.unit, c.ok);
    if (c.ok) return win();
    beep('fail');
    const miss = Math.round(c.missing * 100), extra = Math.round(c.extra * 100);
    say(`❌ ${L('還不太一樣：', 'Not the same yet: ')}${miss ? L(`目標還有 ${miss}% 沒畫到。`, `${miss}% of the target is not drawn yet. `) : ''}${extra ? L(`有 ${extra}% 的線畫在目標外面。`, `${extra}% of your lines are off the target.`) : ''} ${L('比一比灰色的目標，再試一次！', 'Compare with the grey target and try again!')}`, 'no');
  }
  function win() {
    const n = size(), st = n <= lv.best ? 3 : n <= lv.best + 2 ? 2 : 1;
    setStars(lv.id, st);
    beep('win'); confetti();
    say(`🎉 ${L('過關！', 'Solved!')}`, 'ok');
    const w = $('#win');
    w.hidden = false;
    w.innerHTML = `<div class="wcard" role="dialog" aria-modal="true"><div class="wst">${[1, 2, 3].map((k) => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${k * 0.15}s">★</span>`).join('')}</div>
      <h2>${L(['', '過關了！', '很棒！', '完美！'][st], ['', 'Level complete!', 'Great job!', 'Perfect!'][st])}</h2>
      <p>${L(`你用了 ${n} 個方塊。`, `You used ${n} blocks.`)} ${st < 3 ? L(`最佳解只要 ${lv.best} 個——能找到更短的程式嗎？`, `The best solution uses ${lv.best} — can you find a shorter program?`) : L('這就是最短的程式！', 'That is the shortest program!')}</p>
      <div class="acts"><button class="btn ghost" id="again">↺ ${L('再玩一次', 'Play again')}</button>${ctx.next ? `<a class="btn big" href="${ctx.next}" id="nextlv">${L('下一關', 'Next level')} ▶</a>` : `<a class="btn big" href="#/g/${ctx.unit.grade}">${L('完成這個單元！', 'Unit done!')} 🏁</a>`}</div></div>`;
    $('#again').onclick = () => { w.hidden = true; resetWorld(); say(''); };
    setTimeout(() => ($('#nextlv') || $('#again'))?.focus(), 50);
    if (ctx.index === ctx.total - 1) logAct(lv.unit, 1);
  }

  $('#run').onclick = () => {
    if (player) { stop(); return; }
    $('#win').hidden = true; say('');
    player = begin(true); if (!player) return;
    setRunning(true);
    const wr = $('#world').getBoundingClientRect();
    if (wr.top < 60 || wr.bottom > innerHeight) $('#world').scrollIntoView({ behavior: 'smooth', block: 'center' });
    player.timer = setTimeout(advance, 250);
  };
  $('#step').onclick = () => {
    if (!player) { $('#win').hidden = true; say(''); player = begin(false); if (!player) return; setRunning(true); }
    else if (player.auto) { clearTimeout(player.timer); player.auto = false; }
    advance();
  };
  $('#reset').onclick = () => { resetWorld(); say(''); };

  // ---------- keyboard ----------
  const keyMap = turtle ? {} : { ArrowUp: 'F', ArrowLeft: 'L', ArrowRight: 'R', p: 'P', P: 'P' };
  const onKey = (e) => {
    if (e.target.closest('select, input, textarea') || !$('#win').hidden) return;
    if (e.key === 'Enter' && !e.target.closest('button, a')) { e.preventDefault(); $('#run').click(); return; }
    const b = keyMap[e.key];
    if (b && lv.blocks.includes(b)) { e.preventDefault(); add(b); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (cursor.idx > 0) del(cursor.path, cursor.idx - 1);
    }
  };
  document.addEventListener('keydown', onKey);
  S.cleanup = () => { document.removeEventListener('keydown', onKey); stop(); document.body.classList.remove('running'); };
  S.relang = () => { S.cleanup(); playLevel(app, lv, ctx); };

  render();
  resetWorld();
}
