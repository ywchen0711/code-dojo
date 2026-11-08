// Shared progress log. Every learning site on ywchen0711.github.io writes here (same origin, so they share
// localStorage) and 我的學習 Learning Hub (/learn-hub/) reads it. Copy this file unchanged into js/learnlog.js.
//
// localStorage['kl:<app>'] = {
//   v: 1, app, name: {zh, en}, url, last,             // last = ms of the latest activity
//   days:  { 'YYYY-MM-DD': { n, c, min } },           // answers, correct answers, minutes of activity
//   units: { <unitId>: { name: {zh, en}, grade, n, c, r: '1101…' (last 10 results), last } },
// }

const PRE = 'kl:';
export const today = (t = new Date()) =>
  t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');

function load(app) {
  try { return JSON.parse(localStorage.getItem(PRE + app)) || null; } catch { return null; }
}
function save(s) {
  try { localStorage.setItem(PRE + s.app, JSON.stringify(s)); } catch {}
}
function base(app, meta) {
  const s = load(app) || { v: 1, app, days: {}, units: {} };
  s.name = meta.name; s.url = meta.url; s.last = Date.now();
  return s;
}

// One answered question (ok = true/false) in a unit.
// app: 'mathdojo'; meta: { name: {zh, en}, url: '/math-dojo/' }; unit: { id, name: {zh, en}, grade? }
export function logAnswer(app, meta, unit, ok) {
  const s = base(app, meta);
  const d = (s.days[today()] ||= { n: 0, c: 0, min: 0 });
  d.n++; if (ok) d.c++;
  const u = (s.units[unit.id] ||= { n: 0, c: 0, r: '' });
  u.name = unit.name; if (unit.grade != null) u.grade = unit.grade;
  u.n++; if (ok) u.c++;
  u.r = (u.r + (ok ? '1' : '0')).slice(-10);
  u.last = Date.now();
  save(s);
  tick(app, meta);
}

// Activity without right/wrong (a writing draft, a typing lesson, a simulation): marks the unit as practiced.
// score (0–1, optional) is stored as the unit's latest score.
export function logActivity(app, meta, unit, score) {
  const s = base(app, meta);
  s.days[today()] ||= { n: 0, c: 0, min: 0 };
  const u = (s.units[unit.id] ||= { n: 0, c: 0, r: '' });
  u.name = unit.name; if (unit.grade != null) u.grade = unit.grade;
  if (score != null) u.score = Math.round(score * 100) / 100;
  u.done = (u.done || 0) + 1;
  u.last = Date.now();
  save(s);
  tick(app, meta);
}

// Minutes of activity: counts a minute at most once per 60 s of real activity, only while the page is visible.
let lastTick = 0;
function tick(app, meta) {
  const now = Date.now();
  if (now - lastTick < 60000 && lastTick) return;
  const add = lastTick ? 1 : 0.5;
  lastTick = now;
  const s = load(app) || base(app, meta);
  const d = (s.days[today()] ||= { n: 0, c: 0, min: 0 });
  d.min = Math.round(((d.min || 0) + add) * 10) / 10;
  save(s);
}
