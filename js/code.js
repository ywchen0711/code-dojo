// Code challenge page: a small code editor (line numbers, Tab indent, auto-indent), tests run in a Web Worker with a
// timeout (JavaScript) or in Pyodide (Python, loaded only when chosen), hints, and the sample solution explained line by line.
import { same, normOut, show, testInput, pyShow, snake } from './judge.js';
import { $, $$, S, L, X, store, setStars, starsOf, starHTML, logA, logAct, beep, confetti, esc } from './ui.js';

const TIMEOUT = 3000;

// ---------- runners ----------
function runJSWorker(ch, code) {
  return new Promise((resolve) => {
    const res = [];
    let w;
    try { w = new Worker(new URL('./worker.js?v=1', import.meta.url), { type: 'module' }); } catch (e) { resolve({ fatal: String(e) }); return; }
    const timer = setTimeout(() => { w.terminate(); for (let i = res.length; i < ch.tests.length; i++) res.push({ ok: false, timeout: true }); resolve({ res, timeout: true }); }, TIMEOUT);
    w.onmessage = (e) => {
      const d = e.data;
      if (d.r) res[d.i] = d.r;
      if (d.fatal) { clearTimeout(timer); w.terminate(); resolve({ fatal: d.fatal }); }
      if (d.done) { clearTimeout(timer); w.terminate(); resolve({ res }); }
    };
    w.onerror = (e) => { clearTimeout(timer); w.terminate(); resolve({ fatal: e.message || 'error' }); e.preventDefault?.(); };
    w.postMessage({ ch: { kind: ch.kind, fn: ch.fn, cls: ch.cls, tests: ch.tests }, code });
  });
}
let pyw = null, pyReady = false, pyLoading = null;
function pyWorker() {
  if (!pyw) { pyw = new Worker(new URL('./pyworker.js?v=1', import.meta.url)); pyReady = false; pyLoading = null; }
  return pyw;
}
function loadPython() {
  if (pyReady) return Promise.resolve(true);
  const w = pyWorker();
  pyLoading ||= new Promise((resolve) => {
    w.onmessage = (e) => { if (e.data.ready) { pyReady = true; resolve(true); } else if (e.data.error) { pyw = null; resolve(e.data.error); } };
    w.onerror = (e) => { pyw = null; resolve(e.message || 'Python failed to load'); };
    w.postMessage({ ping: true });
  });
  return pyLoading;
}
async function runPy(ch, code) {
  const ok = await loadPython();
  if (ok !== true) return { fatal: L('Python 載入失敗（需要網路）：', 'Python could not load (it needs the Internet): ') + ok };
  return new Promise((resolve) => {
    const w = pyWorker();
    let timer = null;
    w.onmessage = (e) => {
      const d = e.data;
      if (d.started) { timer = setTimeout(() => { w.terminate(); pyw = null; pyReady = false; resolve({ res: ch.tests.map(() => ({ ok: false, timeout: true })), timeout: true }); }, TIMEOUT + 2000); return; }
      if (!d.out && !d.error) return;
      clearTimeout(timer);
      if (d.error) return resolve({ fatal: d.error });
      const out = JSON.parse(d.out);
      resolve({ res: out.map((r, i) => ({ ...r, log: r.log, ok: !r.err && (ch.kind === 'out' ? normOut(r.log) === normOut(ch.tests[i].out) : same(r.got, ch.tests[i].out)), got: ch.kind === 'out' ? r.log : r.got })) });
    };
    w.postMessage({ ch: JSON.stringify({ kind: ch.kind, fn: ch.fn, pyFn: ch.pyFn, cls: ch.cls, tests: ch.tests }), code });
  });
}

// ---------- editor ----------
function editor(el, value, indent, onChange) {
  el.innerHTML = `<div class="ed"><pre class="gut" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="${L('程式碼', 'code')}"></textarea></div>`;
  const ta = $('textarea', el), gut = $('.gut', el);
  const nums = () => { const n = ta.value.split('\n').length; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); };
  ta.value = value; nums();
  ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
  ta.addEventListener('input', () => { nums(); onChange(ta.value); });
  const ind = ' '.repeat(indent);
  ta.addEventListener('keydown', (e) => {
    const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (e.key === 'Escape') { ta.blur(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey || s !== en) {
        const le = v.indexOf('\n', en - (en > s && v[en - 1] === '\n' ? 1 : 0)); const end = le < 0 ? v.length : le;
        const block = v.slice(ls, end).split('\n');
        const out = block.map((l) => (e.shiftKey ? l.replace(new RegExp('^ {1,' + indent + '}'), '') : ind + l));
        ta.value = v.slice(0, ls) + out.join('\n') + v.slice(end);
        const d1 = out[0].length - block[0].length;
        ta.selectionStart = Math.max(ls, s + d1); ta.selectionEnd = en + (out.join('\n').length - block.join('\n').length);
      } else {
        ta.setRangeText(ind, s, en, 'end');
      }
      nums(); onChange(ta.value); return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
      let lead = line.match(/^\s*/)[0];
      if (/[{[(:]\s*$/.test(line)) lead += ind;
      ta.setRangeText('\n' + lead, s, en, 'end');
      nums(); onChange(ta.value); return;
    }
    if (e.key === '}' && s === en) {
      const ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
      if (/^\s+$/.test(line) && line.length >= indent) { e.preventDefault(); ta.setRangeText(line.slice(indent) + '}', ls, s, 'end'); nums(); onChange(ta.value); }
    }
  });
  return { get: () => ta.value, set: (x) => { ta.value = x; nums(); onChange(x); }, focus: () => ta.focus() };
}

// ---------- page ----------
export function codePage(app, ch, ctx) {
  const codes = store.get('code', {});
  const used = store.get('used', {});              // { id: { h: hints used, s: solution seen } }
  const u0 = (used[ch.id] ||= { h: 0, s: false });
  const py = () => S.plang === 'py';
  const key = () => ch.id + (py() ? ':py' : ':js');
  const starter = () => (py() ? ch.pyStarter : ch.starter);
  const pos = ctx.index + 1;
  const sig = () => ch.kind === 'fn' ? (py() ? `${ch.pyFn || snake(ch.fn)}(${ch.params.join(', ')})` : `${ch.fn}(${ch.params.join(', ')})`) : ch.kind === 'class' ? `class ${ch.cls}: ${ch.methods.map((m) => (py() ? snake(m) : m)).join(', ')}` : L('印出結果', 'print the output');

  app.innerHTML = `<nav class="crumb"><a href="#/g/${ctx.unit.grade}">← ${X(ctx.unit.name)}</a><span class="lvlno">${L(`第 ${pos} / ${ctx.total} 題`, `Challenge ${pos} / ${ctx.total}`)}</span></nav>
    <section class="lhead"><h1>${X(ch.name)} ${starHTML(starsOf(ch.id))}</h1></section>
    <div class="cplay">
      <div class="cleft">
        <div class="card prompt"><div id="prm"></div><p class="sig"><code id="sig"></code></p></div>
        <div class="hints" id="hints"></div>
        <div class="acts"><button class="btn ghost" id="hint">💡 ${L('提示', 'Hint')}</button><button class="btn ghost" id="showsol">📖 ${L('看解答', 'Solution')}</button></div>
        <div class="sol" id="sol" hidden></div>
      </div>
      <div class="cright">
        <div class="edbar"><div class="seg" role="group" aria-label="language"><button data-pl="js">JavaScript</button><button data-pl="py">Python 🐍</button></div>
          <button class="link" id="restart">↺ ${L('重設程式碼', 'Reset code')}</button></div>
        <div id="ed"></div>
        <div class="runbar"><button class="btn big" id="runc">▶ ${L('執行測試', 'Run tests')}</button><span class="kbd">Ctrl+Enter</span><span id="pyst" class="pyst"></span></div>
        <div id="res" aria-live="polite"></div>
      </div>
    </div>
    <div class="win" id="win" hidden></div>`;

  let ed;
  const mountEditor = () => {
    $('#sig').textContent = sig();
    let pr = X(ch.prompt);
    if (py()) for (const nm of [ch.fn, ...(ch.methods || [])].filter(Boolean)) pr = pr.split(nm + '(').join((nm === ch.fn ? ch.pyFn || snake(nm) : snake(nm)) + '(');
    $('#prm').innerHTML = pr;
    $$('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.pl === S.plang));
    ed = editor($('#ed'), codes[key()] ?? starter(), py() ? 4 : 2, (v) => { codes[key()] = v; store.set('code', codes); });
    $('#pyst').textContent = py() && !pyReady ? L('第一次使用 Python 要下載約 10 MB，請稍候。', 'The first Python run downloads about 10 MB — please wait.') : '';
    if (!$('#sol').hidden) showSol();
  };
  $$('.seg button').forEach((b) => (b.onclick = () => { S.plang = b.dataset.pl; store.set('plang', S.plang); mountEditor(); $('#res').innerHTML = ''; if (py()) { $('#pyst').textContent = L('正在載入 Python…', 'Loading Python…'); loadPython().then((ok) => { $('#pyst').textContent = ok === true ? L('Python 準備好了！', 'Python is ready!') : L('Python 載入失敗（需要網路）。', 'Python could not load (it needs the Internet).'); }); } }));
  $('#restart').onclick = () => { if (confirm(L('把程式碼換回一開始的樣子？', 'Put the starting code back?'))) ed.set(starter()); };

  // hints
  const showHints = () => { $('#hints').innerHTML = ch.hints.slice(0, u0.h).map((h, i) => `<p class="hint">💡 ${i + 1}. ${X(h)}</p>`).join(''); $('#hint').disabled = u0.h >= ch.hints.length; $('#hint').innerHTML = `💡 ${L('提示', 'Hint')} (${ch.hints.length - u0.h})`; };
  $('#hint').onclick = () => { u0.h = Math.min(ch.hints.length, u0.h + 1); store.set('used', used); showHints(); };
  showHints();

  // solution
  function showSol() {
    const s = $('#sol'); s.hidden = false;
    const jsTable = `<table class="soltab">${ch.sol.map(([c, zh, en]) => `<tr><td><code>${esc(c) || '&nbsp;'}</code></td><td>${S.lang === 'zh' ? zh : en}</td></tr>`).join('')}</table>`;
    s.innerHTML = `<h3>📖 ${L('參考解答', 'Sample solution')}</h3>` + (py()
      ? `<pre class="code">${esc(ch.py)}</pre><p class="note">${L('下面用 JavaScript 版本逐行說明，想法和 Python 一樣：', 'Line by line, explained with the JavaScript version — the idea is the same in Python:')}</p>${jsTable}`
      : jsTable) + `<button class="link" id="usesol">${L('把解答貼進編輯器', 'Put this solution in the editor')}</button>`;
    $('#usesol').onclick = () => ed.set(py() ? ch.py : ch.sol.map((l) => l[0]).join('\n') + '\n');
  }
  $('#showsol').onclick = () => {
    if (!u0.s && !starsOf(ch.id) && !confirm(L('先自己想想看？看了解答，這題最多只能拿 1 顆星。', 'Try a bit more first? After looking at the solution this challenge gives at most 1 star.'))) return;
    u0.s = true; store.set('used', used); showSol();
  };

  // run
  let busy = false;
  async function run() {
    if (busy) return;
    busy = true; $('#runc').disabled = true;
    const code = ed.get();
    $('#res').innerHTML = `<p class="running-note">⏳ ${py() && !pyReady ? L('正在載入 Python（第一次約 10 秒）…', 'Loading Python (about 10 s the first time)…') : L('執行中…', 'Running…')}</p>`;
    const out = py() ? await runPy(ch, code) : await runJSWorker(ch, code);
    if (py()) $('#pyst').textContent = '';
    busy = false; $('#runc').disabled = false;
    if (out.fatal) { $('#res').innerHTML = `<div class="fb no">⚠️ ${esc(out.fatal)}</div>`; logA(ch.unit, false); beep('fail'); return; }
    const res = out.res;
    const pass = res.filter((r) => r?.ok).length, all = pass === ch.tests.length;
    const P = py();
    const val = (v) => esc(P ? pyShow(v, true) : show(v));
    const rows = ch.tests.map((t, i) => {
      const r = res[i] || { ok: false, timeout: true };
      const got = r.timeout ? `⏱ ${L('超過時間（無限迴圈？）', 'timed out (endless loop?)')}` : r.err ? `<span class="err">${esc(r.err)}</span>` : ch.kind === 'out' ? `<pre>${esc(r.got ?? '')}</pre>` : val(r.got);
      const exp = ch.kind === 'out' ? `<pre>${esc(t.out)}</pre>` : val(t.out);
      const inp = ch.kind === 'out' ? L('執行程式', 'run the program') : `<code>${esc(testInput(ch, t, P))}</code>`;
      const log = r.log && (Array.isArray(r.log) ? r.log.join('\n') : r.log);
      return `<tr class="${r.ok ? 'ok' : 'no'}"><td>${r.ok ? '✅' : '❌'}</td><td>${inp}</td><td>${exp}</td><td>${got}${log && ch.kind !== 'out' ? `<details><summary>${L('印出的內容', 'printed')}</summary><pre>${esc(log)}</pre></details>` : ''}</td></tr>`;
    }).join('');
    $('#res').innerHTML = `<div class="fb ${all ? 'ok' : 'no'}">${all ? `🎉 ${L('全部測試通過！', 'All tests pass!')}` : `${L(`通過 ${pass} / ${ch.tests.length} 個測試`, `${pass} / ${ch.tests.length} tests pass`)}${out.timeout ? ' · ⏱ ' + L('程式跑太久被停止了，檢查迴圈會不會結束。', 'The program ran too long and was stopped — check that your loops end.') : ''}`}</div>
      <div class="tscroll"><table class="tests"><tr><th></th><th>${L('測試', 'Test')}</th><th>${L('應該得到', 'Expected')}</th><th>${L('你的結果', 'Yours')}</th></tr>${rows}</table></div>`;
    logA(ch.unit, all);
    if (!all) { beep('fail'); return; }
    const st = u0.s ? 1 : Math.max(1, 3 - u0.h);
    setStars(ch.id, st);
    beep('win'); confetti();
    if (ctx.index === ctx.total - 1) logAct(ch.unit, 1);
    const w = $('#win'); w.hidden = false;
    w.innerHTML = `<div class="wcard" role="dialog" aria-modal="true"><div class="wst">${[1, 2, 3].map((k) => `<span class="${k <= st ? 'on' : ''}" style="animation-delay:${k * 0.15}s">★</span>`).join('')}</div>
      <h2>${L('挑戰成功！', 'Challenge complete!')}</h2>
      <p>${st === 3 ? L('沒有用提示就完成了，太厲害了！', 'Solved without hints — amazing!') : u0.s ? L('看過解答也沒關係，試著不看再寫一次吧！', 'You looked at the solution — try writing it again without looking!') : L(`用了 ${u0.h} 個提示。下次挑戰不用提示拿三顆星！`, `You used ${u0.h} hint(s). Next time try for 3 stars with no hints!`)}</p>
      ${!$('#sol').hidden ? '' : `<button class="link" id="seesol">📖 ${L('看看參考解答的寫法', 'Compare with the sample solution')}</button>`}
      <div class="acts"><button class="btn ghost" id="stay">${L('留在這題', 'Stay here')}</button>${ctx.next ? `<a class="btn big" href="${ctx.next}" id="nextlv">${L('下一題', 'Next challenge')} ▶</a>` : `<a class="btn big" href="#/g/${ctx.unit.grade}">${L('完成這個單元！', 'Unit done!')} 🏁</a>`}</div></div>`;
    $('#stay').onclick = () => (w.hidden = true);
    const ss = $('#seesol'); if (ss) ss.onclick = () => { w.hidden = true; showSol(); $('#sol').scrollIntoView({ behavior: 'smooth' }); };
    setTimeout(() => ($('#nextlv') || $('#stay'))?.focus(), 50);
  }
  $('#runc').onclick = run;
  const onKey = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } };
  document.addEventListener('keydown', onKey);
  S.cleanup = () => document.removeEventListener('keydown', onKey);
  S.relang = () => { S.cleanup(); codePage(app, ch, ctx); };
  mountEditor();
  if (u0.s) showSol();
}
