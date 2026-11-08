// Code Dojo: grade cards → a grade page with its units → robot / block / turtle levels, code challenges, quizzes.
// Hash routes: #/  #/g/5  #/L/<level id>  #/c/<challenge id>  #/q/<quiz unit id>
import { UNITS } from './units.js';
import LEVELS from './levels/index.js';
import CHALLENGES from './bank/index.js';
import { QUIZ } from './quiz.js';
import { rng } from './util.js';
import { $, $$, S, L, X, store, starsOf, starHTML, qstat, qrecord, quizStars, logA, gradeName, beep, esc } from './ui.js';
import { playLevel } from './play.js';
import { codePage } from './code.js';

const app = $('#app');
const itemsOf = (u) => (u.kind === 'code' ? CHALLENGES : u.kind === 'quiz' ? [] : LEVELS).filter((x) => x.unit === u.id);
const unitsOf = (g) => UNITS.filter((u) => u.grade === g);
const BAND = (g) => (g <= 3 ? 'b1' : g <= 6 ? 'b2' : g <= 9 ? 'b3' : 'b4');
const KIND = { robot: ['🤖', '機器人闖關', 'Robot puzzles'], blocks: ['🧩', '積木程式', 'Block coding'], turtle: ['🐢', '海龜畫圖', 'Turtle drawing'], code: ['⌨️', '程式挑戰', 'Code challenges'], quiz: ['🎯', '觀念練習', 'Concept practice'] };
const href = (u, x) => (u.kind === 'code' ? `#/c/${x.id}` : `#/L/${x.id}`);

function gradeProgress(g) {
  let got = 0, max = 0;
  for (const u of unitsOf(g)) {
    if (u.kind === 'quiz') { got += quizStars(u.id); max += 3; continue; }
    for (const x of itemsOf(u)) { got += starsOf(x.id); max += 3; }
  }
  return [got, max];
}

// ---------- header ----------
function header() {
  $('.bt').innerHTML = `<b>${L('程式小學堂', 'Code Dojo')}</b><small>${L('1–12 年級 · 從機器人到 JavaScript', 'Grades 1–12 · from robots to real code')}</small>`;
  $('#lang').textContent = S.lang === 'zh' ? 'EN' : '中文';
  $('#snd').textContent = S.sound ? '🔊' : '🔈';
  $('#snd').setAttribute('aria-label', L('音效', 'sound'));
  document.documentElement.lang = S.lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = L('程式小學堂 Code Dojo', 'Code Dojo 程式小學堂');
  const nL = LEVELS.length, nC = CHALLENGES.length;
  $('#foot').innerHTML = L(`共 ${nL} 個機器人與海龜關卡、${nC} 個程式挑戰，以及隨機產生的觀念題。進度只存在這台裝置的瀏覽器裡。`,
    `${nL} robot and turtle levels, ${nC} code challenges and endless generated concept questions. Progress is saved only in this browser.`);
}
$('#lang').onclick = () => { S.lang = S.lang === 'zh' ? 'en' : 'zh'; store.set('lang', S.lang); header(); S.relang ? S.relang() : route(); };
$('#snd').onclick = () => { S.sound = !S.sound; store.set('sound', S.sound); header(); };

// ---------- home ----------
function home() {
  const bands = [
    [1, 3, '🤖', L('國小低年級：機器人闖關', 'Grades 1–3: Robot puzzles'), L('點指令方塊排出程式，看機器人一步一步走：順序、除錯、重複迴圈。', 'Tap command blocks into a program and watch the robot run it: sequences, debugging and loops.')],
    [4, 6, '🧩', L('國小高年級：積木程式與海龜畫圖', 'Grades 4–6: Block coding & turtle art'), L('巢狀迴圈、如果…否則、當…時、函式和變數，還有用程式畫出星星和螺旋。', 'Nested loops, if/else, while, functions and variables — plus drawing stars and spirals with code.')],
    [7, 9, '⌨️', L('國中：寫真正的程式', 'Grades 7–9: Write real code'), L('用 JavaScript（或 Python）解題：變數、條件、迴圈、函式、陣列、物件。', 'Solve problems in JavaScript (or Python): variables, ifs, loops, functions, arrays and objects.')],
    [10, 12, '🚀', L('高中：演算法與物件導向', 'Grades 10–12: Algorithms & OOP'), L('排序、搜尋、遞迴、廣度優先搜尋、Big-O、類別，以及 AP CSP 觀念題。', 'Sorting, searching, recursion, BFS, Big-O, classes and AP CSP-style concept questions.')],
  ];
  let h = `<section class="hero"><div class="mascot" aria-hidden="true">${mascot()}</div><div><h1>${L('今天想寫什麼程式？', 'What will you code today?')}</h1>
    <p>${L('從一年級的機器人闖關，到十二年級的演算法。依照台灣 108 課綱資訊科技、美國 CSTA K-12 電腦科學標準與 AP 課程安排。', 'From first-grade robot puzzles to twelfth-grade algorithms, following Taiwan’s 108 IT curriculum, the US CSTA K-12 CS Standards and AP courses.')}</p></div></section>`;
  for (const [a, b, ic, title, note] of bands) {
    h += `<section class="band"><h2>${ic} ${title}</h2><p class="bnote">${note}</p><div class="grades">`;
    for (let g = a; g <= b; g++) {
      const [got, max] = gradeProgress(g), us = unitsOf(g);
      const n = us.reduce((s, u) => s + itemsOf(u).length, 0);
      h += `<a class="gcard ${BAND(g)}" href="#/g/${g}"><span class="gn">${g}</span><span class="gl">${gradeName(g)}</span>
        <span class="gc">${L(`${us.length} 個單元`, `${us.length} units`)}${n ? ' · ' + L(`${n} 關`, `${n} levels`) : ''}</span>
        <span class="bar"><i style="width:${max ? (100 * got) / max : 0}%"></i></span><span class="gs">★ ${got} / ${max}</span></a>`;
    }
    h += '</div></section>';
  }
  app.innerHTML = h;
}
function mascot() {
  return `<svg viewBox="-50 -60 100 110" width="96" height="106"><rect x="-34" y="-30" width="68" height="62" rx="18" fill="#7048e8"/><rect x="-24" y="-18" width="48" height="26" rx="10" fill="#e9e4ff"/>
    <circle cx="-10" cy="-5" r="6" fill="#2b2d42"/><circle cx="10" cy="-5" r="6" fill="#2b2d42"/><circle cx="-8" cy="-7" r="2" fill="#fff"/><circle cx="12" cy="-7" r="2" fill="#fff"/>
    <path d="M-8 16 q8 7 16 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><line x1="0" y1="-30" x2="0" y2="-46" stroke="#7048e8" stroke-width="4"/><circle cx="0" cy="-50" r="7" fill="#f59f00"/>
    <rect x="-44" y="-6" width="10" height="24" rx="5" fill="#5f3dc4"/><rect x="34" y="-6" width="10" height="24" rx="5" fill="#5f3dc4"/><text x="0" y="46" text-anchor="middle" font-size="14" font-family="monospace" fill="#1c7ed6" font-weight="700">&lt;/&gt;</text></svg>`;
}

// ---------- grade page ----------
function grade(g) {
  const us = unitsOf(g);
  let h = `<nav class="crumb"><a href="#/">← ${L('所有年級', 'All grades')}</a></nav>
    <section class="ghead"><h1>${gradeName(g)}</h1><p class="bnote">${L(`共 ${us.length} 個單元。一個單元一個單元往下玩，每關最多 3 顆星！`, `${us.length} units. Work through them in order — each level gives up to 3 stars!`)}</p></section>`;
  if (g > 1) h += '';
  for (const u of us) {
    const items = itemsOf(u), [ic, kz, ke] = KIND[u.kind];
    const tags = u.std.map((s) => `<span class="tag">${esc(X(s))}</span>`).join('');
    h += `<section class="unit ${BAND(g)}"><div class="uhead"><h2>${ic} ${X(u.name)}</h2><span class="ukind">${L(kz, ke)}</span></div><div class="tags">${tags}</div>`;
    if (u.lesson) h += `<p class="ulesson">${X(u.lesson)}</p>`;
    if (u.kind === 'quiz') {
      const [n, ok] = qstat(u.id);
      h += `<div class="qrow"><a class="btn" href="#/q/${u.id}">🎯 ${L('開始練習（題目隨機產生）', 'Practice (endless new questions)')}</a>${starHTML(quizStars(u.id))}<span class="ts">${n ? L(`答對 ${ok} / ${n} 題`, `${ok} / ${n} correct`) : L('還沒練習', 'Not started')}</span></div>`;
    } else {
      const firstOpen = items.findIndex((x) => !starsOf(x.id));
      h += `<div class="tiles">${items.map((x, i) => `<a class="tile ${starsOf(x.id) ? 'done' : ''} ${i === firstOpen ? 'next' : ''}" href="${href(u, x)}" title="${esc(X(x.name))}"><b>${i + 1}</b><span class="tname">${esc(X(x.name))}</span>${starHTML(starsOf(x.id))}</a>`).join('')}</div>`;
    }
    h += '</section>';
  }
  h += `<nav class="gnav">${g > 1 ? `<a class="btn ghost" href="#/g/${g - 1}">← ${gradeName(g - 1)}</a>` : '<span></span>'}${g < 12 ? `<a class="btn ghost" href="#/g/${g + 1}">${gradeName(g + 1)} →</a>` : ''}</nav>`;
  app.innerHTML = h;
}

// context for a level / challenge: its unit, position, and the next item's link
function ctxFor(item) {
  const u = UNITS.find((x) => x.id === item.unit);
  const items = itemsOf(u), i = items.indexOf(item);
  let next = items[i + 1] ? href(u, items[i + 1]) : null;
  if (!next) {
    const later = UNITS.slice(UNITS.indexOf(u) + 1).find((x) => x.grade === u.grade && x.kind !== 'quiz' && itemsOf(x).length);
    if (later) next = href(later, itemsOf(later)[0]);
  }
  return { unit: u, index: i, total: items.length, next };
}

// ---------- quiz practice ----------
function quiz(id) {
  const u = UNITS.find((x) => x.id === id && x.kind === 'quiz');
  if (!u) return (location.hash = '#/');
  const gens = QUIZ[id];
  let right = 0, done = 0, streak = 0, q, seed;
  app.innerHTML = `<nav class="crumb"><a href="#/g/${u.grade}">← ${gradeName(u.grade)}</a></nav>
    <section class="lhead"><h1>🎯 ${X(u.name)}</h1><div class="tags">${u.std.map((s) => `<span class="tag">${esc(X(s))}</span>`).join('')}</div></section>
    <div class="score"><span id="sc"></span><span id="st"></span></div>
    <article class="card" id="card"></article><div class="next"><button class="btn big" id="next" hidden>${L('下一題', 'Next question')} →</button></div>`;
  const sc = () => { $('#sc').innerHTML = L(`本次答對 <b>${right}</b> / ${done}`, `This session: <b>${right}</b> / ${done}`); $('#st').innerHTML = streak >= 2 ? `🔥 ${L(`連續答對 ${streak} 題`, `${streak} in a row`)}` : ''; };
  const one = (s) => {
    seed = s; const r = rng(s);
    q = r.pick(gens)(r);
    const order = rng(s ^ 0x5bd1e995).shuffle(q.options.map((o, i) => ({ o, i })));
    const el = $('#card');
    let left = 2, finished = false;
    el.innerHTML = `<div class="q">${X(q.q)}</div>${q.code ? `<pre class="code">${esc(q.code)}</pre>` : ''}
      <div class="choices">${order.map((x, k) => `<button class="ch" data-i="${x.i}"><b>${'ABCD'[k]}</b><span>${esc(X(x.o))}</span></button>`).join('')}</div>
      <div class="fb" aria-live="polite"></div><div class="sol" hidden></div>`;
    $('#next').hidden = true;
    const fb = $('.fb', el);
    const end = (ok) => {
      finished = true; done++; if (ok) { right++; streak++; } else streak = 0;
      qrecord(id, ok); logA(id, ok); sc();
      $$('.ch', el).forEach((b) => { b.disabled = true; if (+b.dataset.i === 0) b.classList.add('right'); });
      const s = $('.sol', el); s.hidden = false;
      s.innerHTML = `<h3>📖 ${L('解說', 'Explanation')}</h3><ol>${q.sol.map((x) => `<li>${X(x)}</li>`).join('')}</ol><p class="ansline">${L('答案', 'Answer')}：<b>${esc(X(q.options[0]))}</b></p>`;
      $('#next').hidden = false; $('#next').focus({ preventScroll: true });
    };
    $$('.ch', el).forEach((b) => (b.onclick = () => {
      if (finished) return;
      if (+b.dataset.i === 0) { b.classList.add('right'); fb.className = 'fb ok'; fb.innerHTML = `✅ ${L('答對了！', 'Correct!')}`; beep('gem'); return end(true); }
      b.classList.add('wrong'); b.disabled = true; left--;
      if (left > 0 && q.options.length > 2) { fb.className = 'fb no'; fb.innerHTML = `🤔 ${L('不太對，再想一次！', 'Not quite — try once more!')}`; beep('fail'); return; }
      fb.className = 'fb no'; fb.innerHTML = `❌ ${L('沒關係，看看下面的解說。', 'That’s OK — read the explanation below.')}`; beep('fail'); end(false);
    }));
    sc();
  };
  $('#next').onclick = () => { one((Math.random() * 2 ** 31) >>> 0); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const key = (e) => { if (e.key === 'Enter' && !$('#next').hidden && !e.target.closest('button')) { e.preventDefault(); $('#next').click(); } };
  document.addEventListener('keydown', key);
  S.cleanup = () => document.removeEventListener('keydown', key);
  S.relang = () => { const s = seed, d = [right, done, streak]; S.cleanup(); quiz(id); [right, done, streak] = d; one(s); };
  one((Math.random() * 2 ** 31) >>> 0);
}

// ---------- router ----------
function route() {
  S.cleanup?.(); S.cleanup = null; S.relang = null;
  const h = location.hash;
  let m;
  if ((m = h.match(/^#\/g\/(\d+)/)) && +m[1] >= 1 && +m[1] <= 12) grade(+m[1]);
  else if ((m = h.match(/^#\/L\/(.+)/))) { const lv = LEVELS.find((x) => x.id === decodeURIComponent(m[1])); if (!lv) return (location.hash = '#/'); playLevel(app, lv, ctxFor(lv)); }
  else if ((m = h.match(/^#\/c\/(.+)/))) { const ch = CHALLENGES.find((x) => x.id === decodeURIComponent(m[1])); if (!ch) return (location.hash = '#/'); codePage(app, ch, ctxFor(ch)); }
  else if ((m = h.match(/^#\/q\/(.+)/))) quiz(decodeURIComponent(m[1]));
  else home();
  document.body.dataset.page = (h.match(/^#\/(\w+)/) || [, 'home'])[1];
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
header();
route();
