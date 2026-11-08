// Shared page state: language, storage (prefix cd2-), stars, sounds, the learning-hub log.
import { tx, esc } from './util.js';
import { logAnswer, logActivity } from './learnlog.js';
import { UNITS } from './units.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const store = {
  get(k, d) { try { const v = localStorage.getItem('cd2-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('cd2-' + k, JSON.stringify(v)); } catch {} },
};
export const S = {
  lang: store.get('lang', (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  sound: store.get('sound', true),
  plang: store.get('plang', 'js'),            // code challenges: js | py
  relang: null,                               // set by a page that can redraw itself in the other language
  cleanup: null,
};
export const L = (zh, en) => (S.lang === 'zh' ? zh : en);
export const X = (x) => tx(x, S.lang);
export { esc };

// ---- progress ----
const stars = store.get('stars', {});
export const starsOf = (id) => stars[id] || 0;
export function setStars(id, n) { if (n > (stars[id] || 0)) { stars[id] = n; store.set('stars', stars); } }
export const starHTML = (k, max = 3) => `<span class="stars" aria-label="${k} / ${max}">${'★'.repeat(k)}<i>${'★'.repeat(max - k)}</i></span>`;
const qstats = store.get('qstats', {});
export const qstat = (id) => qstats[id] || [0, 0];
export function qrecord(id, ok) { const s = (qstats[id] ||= [0, 0]); s[0]++; if (ok) s[1]++; store.set('qstats', qstats); }
export function quizStars(id) { const [n, ok] = qstat(id); return ok >= 25 && ok / n >= 0.8 ? 3 : ok >= 10 ? 2 : ok >= 3 ? 1 : 0; }

// ---- Learning Hub log ----
export const APP = 'codedojo';
export const META = { name: { zh: '程式小學堂', en: 'Code Dojo' }, url: '/code-dojo/' };
export const unitById = (id) => UNITS.find((u) => u.id === id);
const unitRef = (u) => ({ id: u.id, name: u.name, grade: u.grade });
export const logA = (unitId, ok) => { const u = unitById(unitId); if (u) logAnswer(APP, META, unitRef(u), ok); };
export const logAct = (unitId, score) => { const u = unitById(unitId); if (u) logActivity(APP, META, unitRef(u), score); };

// ---- grade names ----
const ZH_N = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
export function gradeName(g) {
  if (S.lang === 'en') return `Grade ${g}`;
  return g <= 6 ? `國小${ZH_N[g]}年級` : g <= 9 ? `國${ZH_N[g - 6]}（${ZH_N[g]}年級）` : `高${ZH_N[g - 9]}（${ZH_N[g]}年級）`;
}

// ---- little sounds (Web Audio, no files) ----
let ac = null;
export function beep(kind) {
  if (!S.sound) return;
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = { step: [[520, 0.04]], turn: [[440, 0.04]], gem: [[880, 0.08], [1320, 0.12]], win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], fail: [[220, 0.15], [165, 0.25]], click: [[700, 0.02]] }[kind] || [];
    let t = ac.currentTime;
    for (const [f, d] of notes) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = kind === 'fail' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.9;
    }
  } catch {}
}

// ---- confetti ----
export function confetti() {
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#7048e8', '#1c7ed6', '#f59f00', '#12b886', '#fa5252', '#e64980'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length];
    p.style.animationDelay = Math.random() * 0.4 + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}
