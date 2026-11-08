// Shared tools: a seeded random source (mulberry32) and bilingual text.
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.shuffle = (arr) => { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  f.sample = (arr, k) => f.shuffle(arr).slice(0, k);
  f.chance = (p) => f() < p;
  return f;
}

// ---- bilingual text ----
export const T = (zh, en) => ({ zh, en });
export const tx = (x, lang) => (x == null ? '' : typeof x === 'object' && !Array.isArray(x) ? x[lang] ?? x.en : String(x));
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// keep the first k options that are different from each other (by their text)
export function uniq(opts, k) { const seen = new Set(), o = []; for (const x of opts) { const key = JSON.stringify(x); if (!seen.has(key)) { seen.add(key); o.push(x); } } return k ? o.slice(0, k) : o; }
