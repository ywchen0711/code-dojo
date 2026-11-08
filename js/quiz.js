// Generated multiple-choice quizzes. Each generator g(r) returns
//   { q: {zh,en} (HTML), code?: 'JS source that prints the answer', options: [right, wrong…], sol: [{zh,en}…] (HTML) }
// options are plain text strings or {zh,en}; options[0] is right (the app shuffles). When `code` is given, the test
// runs it and checks that it prints options[0] exactly.
import { T, uniq } from './util.js';

const pad = (s, n) => String(s).padStart(n, '0');
const toHex = (n) => n.toString(16).toUpperCase();
// distinct wrong numbers near v
function nearNums(r, v, k = 3, spread = 4, ok = (x) => x >= 0) {
  const o = new Set();
  let guard = 0;
  while (o.size < k && guard++ < 400) { const w = v + r.int(-spread, spread); if (w !== v && ok(w)) o.add(w); }
  for (let w = v + 1; o.size < k; w++) if (w !== v && ok(w)) o.add(w);
  return [...o];
}
// right answer first, then up to 3 distinct wrong ones (all as text)
const opts = (right, wrongs) => uniq([right, ...wrongs].map(String), 4);
const NAMES = ['a', 'b', 'x', 'y', 'n', 'k'];
const WHAT = () => T('這段程式會印出什麼？', 'What does this program print?');

// ---------------------------------------------------------------- trace: variables (G7)
const traceVars = [
  (r) => {
    const a = r.int(2, 9), b = r.int(2, 9), op = r.pick(['+', '-', '*']);
    const [x, y] = r.sample(NAMES, 2);
    const v = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const res = op === '+' ? v + a : op === '-' ? v * 2 : v - b;
    const line3 = op === '+' ? `${x} = ${y} + ${x};` : op === '-' ? `${x} = ${y} * 2;` : `${x} = ${y} - ${b};`;
    const code = `let ${x} = ${a};\nlet ${y} = ${x} ${op} ${b};\n${line3}\nconsole.log(${x});`;
    const step3 = op === '+' ? `${v} + ${a} = ${res}` : op === '-' ? `${v} × 2 = ${res}` : `${v} − ${b} = ${res}`;
    const opz = op === '*' ? '×' : op === '-' ? '−' : '+';
    return {
      q: WHAT(), code,
      options: opts(res, [v, a, ...nearNums(r, res, 3, 5, () => true)]),
      sol: [T(`第 1 行：${x} = ${a}。`, `Line 1: ${x} = ${a}.`),
        T(`第 2 行：${y} = ${a} ${opz} ${b} = ${v}。`, `Line 2: ${y} = ${a} ${opz} ${b} = ${v}.`),
        T(`第 3 行：${x} 被換成新的值 ${step3}（舊的值不見了）。`, `Line 3: ${x} gets a new value: ${step3} (the old value is gone).`),
        T(`所以印出 ${res}。`, `So it prints ${res}.`)],
    };
  },
  (r) => {
    // swap with a temp variable (or the classic mistake)
    const a = r.int(1, 9); let b = r.int(1, 9); if (b === a) b = a === 9 ? 1 : a + 1;
    const right = r.chance(0.5);
    const code = right
      ? `let a = ${a};\nlet b = ${b};\nlet t = a;\na = b;\nb = t;\nconsole.log(a + " " + b);`
      : `let a = ${a};\nlet b = ${b};\na = b;\nb = a;\nconsole.log(a + " " + b);`;
    const ans = right ? `${b} ${a}` : `${b} ${b}`;
    return {
      q: T('這段程式想交換 a 和 b，它會印出什麼？', 'This program tries to swap a and b. What does it print?'), code,
      options: opts(ans, [`${a} ${b}`, `${b} ${a}`, `${a} ${a}`, `${b} ${b}`]),
      sol: right
        ? [T(`t 先記住 a 的值 ${a}。`, `t remembers a’s value, ${a}.`), T(`a = b，所以 a 變成 ${b}。`, `a = b, so a becomes ${b}.`), T(`b = t，所以 b 變成 ${a}。交換成功，印出「${ans}」。`, `b = t, so b becomes ${a}. The swap works: it prints “${ans}”.`)]
        : [T(`a = b 之後，a 變成 ${b}，原本的 ${a} 已經被蓋掉了。`, `After a = b, a is ${b} — the old value ${a} is overwritten.`), T(`b = a 只是把 ${b} 再放回 b。`, `b = a just puts ${b} back into b.`), T(`所以印出「${ans}」。要交換，需要一個暫存變數。`, `So it prints “${ans}”. Swapping needs a temporary variable.`)],
    };
  },
  (r) => {
    // integer division and remainder
    const a = r.int(11, 60), b = r.int(3, 9);
    const which = r.pick(['%', 'floor']);
    const code = which === '%' ? `let a = ${a};\nlet b = ${b};\nconsole.log(a % b);` : `let a = ${a};\nlet b = ${b};\nconsole.log(Math.floor(a / b));`;
    const q = Math.floor(a / b), m = a % b;
    const ans = which === '%' ? m : q;
    return {
      q: WHAT(), code,
      options: opts(ans, [which === '%' ? q : m, ans + 1, Math.abs(ans - 1), ans + 2]),
      sol: [T(`${a} ÷ ${b} = ${q} 餘 ${m}（${b} × ${q} = ${b * q}，${a} − ${b * q} = ${m}）。`, `${a} ÷ ${b} = ${q} remainder ${m} (${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}).`),
        which === '%' ? T(`% 是「取餘數」，所以印出 ${m}。`, `% gives the remainder, so it prints ${m}.`) : T(`a / b 是 ${(a / b).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${a % b ? '…' : ''}，Math.floor 無條件捨去成整數 ${q}。`, `a / b is ${(a / b).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}${a % b ? '…' : ''}; Math.floor rounds it down to the whole number ${q}.`)],
    };
  },
  (r) => {
    // string concatenation vs number addition
    const a = r.int(1, 9), b = r.int(1, 9);
    const kind = r.pick(['strnum', 'numstr', 'nums']);
    const code = kind === 'strnum' ? `let x = "${a}";\nlet y = ${b};\nconsole.log(x + y);` : kind === 'numstr' ? `let x = ${a};\nlet y = "${b}";\nconsole.log(x + y);` : `let x = ${a};\nlet y = ${b};\nconsole.log(x + y);`;
    const ans = kind === 'nums' ? String(a + b) : `${a}${b}`;
    return {
      q: T('這段程式會印出什麼？注意引號！', 'What does this program print? Watch the quotes!'), code,
      options: opts(ans, [String(a + b), `${a}${b}`, `${a} ${b}`, `${b}${a}`]),
      sol: kind === 'nums'
        ? [T('x 和 y 都是數字，+ 就是加法。', 'x and y are both numbers, so + adds.'), T(`${a} + ${b} = ${a + b}。`, `${a} + ${b} = ${a + b}.`)]
        : [T('有引號的是字串（文字）。只要 + 的其中一邊是字串，+ 就變成「接起來」。', 'Quotes make a string (text). If either side of + is a string, + joins the text.'), T(`"${a}" 和 "${b}" 接起來是 "${a}${b}"。`, `"${a}" joined with "${b}" is "${a}${b}".`)],
    };
  },
  (r) => {
    // a chain of += -= *=
    const s = r.int(1, 10), steps = r.int(2, 4);
    let v = s; const lines = [`let n = ${s};`], expl = [T(`n 從 ${s} 開始。`, `n starts at ${s}.`)];
    for (let i = 0; i < steps; i++) {
      const op = r.pick(['+=', '-=', '*=']), k = op === '*=' ? r.int(2, 3) : r.int(1, 9);
      const nv = op === '+=' ? v + k : op === '-=' ? v - k : v * k;
      const sym = op === '*=' ? '×' : op === '-=' ? '−' : '+';
      lines.push(`n ${op} ${k};`);
      expl.push(T(`n ${op} ${k}：${v} ${sym} ${k} = ${nv}。`, `n ${op} ${k}: ${v} ${sym} ${k} = ${nv}.`));
      v = nv;
    }
    lines.push('console.log(n);');
    return { q: WHAT(), code: lines.join('\n'), options: opts(v, nearNums(r, v, 4, 6, () => true)), sol: [...expl, T(`印出 ${v}。`, `It prints ${v}.`)] };
  },
];

// ---------------------------------------------------------------- trace: loops and ifs (G8)
const traceLoops = [
  (r) => {
    const a = r.int(1, 4), b = r.int(a + 2, a + 6), inc = r.chance(0.6);
    const code = `let s = 0;\nfor (let i = ${a}; i ${inc ? '<=' : '<'} ${b}; i++) {\n  s += i;\n}\nconsole.log(s);`;
    const end = inc ? b : b - 1;
    let s = 0; const xs = []; for (let i = a; i <= end; i++) { s += i; xs.push(i); }
    const other = inc ? s - b : s + b;
    return {
      q: WHAT(), code,
      options: opts(s, [other, s + a, ...nearNums(r, s, 2, 5)]),
      sol: [T(`i 從 ${a} 開始，${inc ? `一直到 ${b}（包含 ${b}，因為是 &lt;=）` : `到 ${b - 1} 為止（不包含 ${b}，因為是 &lt;）`}。`, `i starts at ${a} and goes ${inc ? `up to ${b} (including ${b}, because of &lt;=)` : `up to ${b - 1} (not ${b}, because of &lt;)`}.`),
        T(`s = ${xs.join(' + ')} = ${s}。`, `s = ${xs.join(' + ')} = ${s}.`)],
    };
  },
  (r) => {
    // while doubling
    const start = r.int(1, 3), lim = r.int(20, 120);
    let x = start, c = 0; const seq = [x];
    while (x < lim) { x *= 2; c++; seq.push(x); }
    const ask = r.pick(['x', 'c']);
    const code = `let x = ${start};\nlet c = 0;\nwhile (x < ${lim}) {\n  x = x * 2;\n  c++;\n}\nconsole.log(${ask});`;
    const ans = ask === 'x' ? x : c;
    return {
      q: WHAT(), code,
      options: opts(ans, ask === 'x' ? [x / 2, x * 2, c] : [c - 1, c + 1, x]),
      sol: [T(`x 的值依序是：${seq.join(' → ')}。`, `x goes ${seq.join(' → ')}.`),
        T(`當 x = ${x} 時，${x} &lt; ${lim} 不成立，迴圈停止；迴圈跑了 ${c} 次，所以 c = ${c}。`, `When x = ${x}, ${x} &lt; ${lim} is false and the loop stops. It ran ${c} times, so c = ${c}.`),
        T(`印出 ${ans}。`, `It prints ${ans}.`)],
    };
  },
  (r) => {
    // count with an if inside a loop
    const n = r.int(10, 30), k = r.int(3, 7), rem = r.int(0, k - 1);
    let c = 0; const hits = [];
    for (let i = 1; i <= n; i++) if (i % k === rem) { c++; hits.push(i); }
    const code = `let c = 0;\nfor (let i = 1; i <= ${n}; i++) {\n  if (i % ${k} === ${rem}) {\n    c++;\n  }\n}\nconsole.log(c);`;
    return {
      q: WHAT(), code,
      options: opts(c, nearNums(r, c, 3, 3)),
      sol: [T(`找出 1 到 ${n} 中，除以 ${k} 餘 ${rem} 的數。`, `Find the numbers from 1 to ${n} whose remainder when divided by ${k} is ${rem}.`),
        T(`它們是：${hits.join(', ')}。`, `They are: ${hits.join(', ')}.`), T(`共 ${c} 個，印出 ${c}。`, `That is ${c} numbers, so it prints ${c}.`)],
    };
  },
  (r) => {
    // if / else if chain
    const x = r.int(0, 100);
    const t1 = r.pick([80, 85, 90]), t2 = r.pick([60, 65, 70]);
    const code = `let score = ${x};\nif (score >= ${t1}) {\n  console.log("A");\n} else if (score >= ${t2}) {\n  console.log("B");\n} else {\n  console.log("C");\n}`;
    const ans = x >= t1 ? 'A' : x >= t2 ? 'B' : 'C';
    return {
      q: WHAT(), code,
      options: [ans, ...['A', 'B', 'C'].filter((s) => s !== ans)],
      sol: [T(`先檢查 ${x} >= ${t1}：${x >= t1 ? '成立' : '不成立'}。`, `First check ${x} >= ${t1}: ${x >= t1 ? 'true' : 'false'}.`),
        ...(x >= t1 ? [] : [T(`再檢查 ${x} >= ${t2}：${x >= t2 ? '成立' : '不成立'}。`, `Then check ${x} >= ${t2}: ${x >= t2 ? 'true' : 'false'}.`)]),
        T(`只有第一個成立的分支（或最後的 else）會執行，印出 ${ans}。`, `Only the first true branch (or the final else) runs: it prints ${ans}.`)],
    };
  },
  (r) => {
    // counting down by a step
    const start = r.int(15, 40), step = r.int(2, 6);
    const vals = []; for (let i = start; i > 0; i -= step) vals.push(i);
    const code = `let count = 0;\nfor (let i = ${start}; i > 0; i -= ${step}) {\n  count++;\n}\nconsole.log(count);`;
    return {
      q: WHAT(), code,
      options: opts(vals.length, nearNums(r, vals.length, 3, 2, (w) => w > 0)),
      sol: [T(`i 的值：${vals.join(', ')}；下一個是 ${start - step * vals.length}，不大於 0，迴圈停止。`, `i takes the values ${vals.join(', ')}; the next one, ${start - step * vals.length}, is not > 0, so the loop stops.`),
        T(`迴圈跑了 ${vals.length} 次，印出 ${vals.length}。`, `The loop ran ${vals.length} times, so it prints ${vals.length}.`)],
    };
  },
  (r) => {
    // && / || in an if
    const a = r.int(1, 20), b = r.int(1, 20), op = r.pick(['&&', '||']);
    const c1 = r.int(5, 15), c2 = r.int(5, 15);
    const p = a > c1, q = b < c2, v = op === '&&' ? p && q : p || q;
    const code = `let a = ${a}, b = ${b};\nif (a > ${c1} ${op} b < ${c2}) {\n  console.log("yes");\n} else {\n  console.log("no");\n}`;
    const ans = v ? 'yes' : 'no';
    return {
      q: WHAT(), code,
      options: [ans, v ? 'no' : 'yes'],
      sol: [T(`a > ${c1}：${a} > ${c1} 是 ${p}。`, `a > ${c1}: ${a} > ${c1} is ${p}.`), T(`b &lt; ${c2}：${b} &lt; ${c2} 是 ${q}。`, `b &lt; ${c2}: ${b} &lt; ${c2} is ${q}.`),
        T(op === '&&' ? `&&（而且）要兩邊都是 true 才是 true：${p} && ${q} = ${v}。` : `||（或）只要有一邊是 true 就是 true：${p} || ${q} = ${v}。`, op === '&&' ? `&& (and) is true only when both sides are true: ${p} && ${q} = ${v}.` : `|| (or) is true when at least one side is true: ${p} || ${q} = ${v}.`),
        T(`印出 ${ans}。`, `It prints ${ans}.`)],
    };
  },
];

// ---------------------------------------------------------------- binary & hex (G9)
const binary = [
  (r) => {
    const n = r.int(3, 255), b = n.toString(2), w = b.length;
    const parts = [...b].map((d, i) => (d === '1' ? 2 ** (w - 1 - i) : 0)).filter(Boolean);
    return {
      q: T(`二進位數 <code>${b}</code> 等於十進位的多少？`, `What is the binary number <code>${b}</code> in decimal?`),
      options: opts(n, [parseInt([...b].reverse().join(''), 2), n + 1, n - 1, n * 2].filter((x) => x !== n && x > 0)),
      sol: [T('從右邊數過來，每一位代表 1、2、4、8、16…（每往左一位就乘 2）。', 'From the right, the places are worth 1, 2, 4, 8, 16, … (each place to the left doubles).'),
        T(`把是 1 的位置加起來：${parts.join(' + ')} = ${n}。`, `Add the places that hold a 1: ${parts.join(' + ')} = ${n}.`)],
    };
  },
  (r) => {
    const n = r.int(3, 100), b = n.toString(2);
    const steps = []; let x = n; while (x > 0) { steps.push(`${x} ÷ 2 = ${Math.floor(x / 2)} … ${x % 2}`); x = Math.floor(x / 2); }
    const flip = (s, i) => s.slice(0, i) + (s[i] === '1' ? '0' : '1') + s.slice(i + 1);
    return {
      q: T(`十進位數 ${n} 寫成二進位是什麼？`, `What is ${n} in binary?`),
      options: opts(b, [[...b].reverse().join(''), flip(b, b.length - 1), flip(b, 1), (n + 1).toString(2), (n - 1).toString(2)].filter((s) => s !== b)),
      sol: [T('一直除以 2，記下餘數：', 'Keep dividing by 2 and write down the remainders:'), T(steps.join('；'), steps.join('; ')),
        T(`把餘數從下往上讀：${b}。`, `Read the remainders from bottom to top: ${b}.`)],
    };
  },
  (r) => {
    const n = r.int(16, 255), h = toHex(n), hi = Math.floor(n / 16), lo = n % 16;
    const dig = (d) => (d >= 10 ? `${toHex(d)}（=${d}）` : String(d)), dige = (d) => (d >= 10 ? `${toHex(d)} (=${d})` : String(d));
    if (r.chance(0.5)) return {
      q: T(`十六進位數 <code>${h}</code> 等於十進位的多少？`, `What is the hexadecimal number <code>${h}</code> in decimal?`),
      options: opts(n, [hi * 10 + lo, lo * 16 + hi, n + 16, n - 1].filter((x) => x !== n && x >= 0)),
      sol: [T('十六進位每一位代表 1、16、256…；A=10、B=11、C=12、D=13、E=14、F=15。', 'In hex the places are worth 1, 16, 256, …; A=10, B=11, C=12, D=13, E=14, F=15.'),
        T(`${dig(hi)} × 16 + ${dig(lo)} = ${hi * 16} + ${lo} = ${n}。`, `${dige(hi)} × 16 + ${dige(lo)} = ${hi * 16} + ${lo} = ${n}.`)],
    };
    return {
      q: T(`十進位數 ${n} 寫成十六進位是什麼？`, `What is ${n} in hexadecimal?`),
      options: opts(h, [toHex(lo) + toHex(hi), toHex(n + 1), toHex(n - 16), String(hi) + String(lo)].filter((s) => s !== h)),
      sol: [T(`${n} ÷ 16 = ${hi} 餘 ${lo}。`, `${n} ÷ 16 = ${hi} remainder ${lo}.`),
        T(`十六位數字是 ${dig(hi)}，個位數字是 ${dig(lo)}（10–15 寫成 A–F），所以是 ${h}。`, `The sixteens digit is ${dige(hi)} and the ones digit is ${dige(lo)} (10–15 are written A–F), so it is ${h}.`)],
    };
  },
  (r) => {
    const a = r.int(1, 40), b = r.int(1, 40), s = a + b, sb = s.toString(2);
    return {
      q: T(`二進位加法：<code>${a.toString(2)} + ${b.toString(2)}</code> = ？`, `Binary addition: <code>${a.toString(2)} + ${b.toString(2)}</code> = ?`),
      options: opts(sb, [(a | b).toString(2), (s + 1).toString(2), (s - 1).toString(2), (a ^ b).toString(2)].filter((x) => x !== sb)),
      sol: [T(`換成十進位檢查：${a.toString(2)} = ${a}，${b.toString(2)} = ${b}，${a} + ${b} = ${s}。`, `Check in decimal: ${a.toString(2)} = ${a}, ${b.toString(2)} = ${b}, ${a} + ${b} = ${s}.`),
        T(`直式相加時 1 + 1 = 10（寫 0、進 1）。答案是 ${sb}（= ${s}）。`, `Column by column, 1 + 1 = 10 (write 0, carry 1). The answer is ${sb} (= ${s}).`)],
    };
  },
  (r) => {
    const bits = r.int(2, 10), mode = r.pick(['count', 'max', 'need']);
    if (mode === 'need') {
      const n = r.int(5, 1000), need = Math.ceil(Math.log2(n));
      return {
        q: T(`要給 ${n} 個不同的東西各一個不同的二進位編號，最少需要幾個位元（bit）？`, `To give ${n} different things each a different binary code, what is the fewest bits you need?`),
        options: opts(need, [need - 1, need + 1, need + 2].filter((x) => x > 0)),
        sol: [T('k 個位元可以排出 2<sup>k</sup> 種不同的編號。', 'k bits can make 2<sup>k</sup> different codes.'),
          T(`2<sup>${need - 1}</sup> = ${2 ** (need - 1)} 比 ${n} 少；2<sup>${need}</sup> = ${2 ** need} ≥ ${n}，所以要 ${need} 個位元。`, `2<sup>${need - 1}</sup> = ${2 ** (need - 1)} is fewer than ${n}; 2<sup>${need}</sup> = ${2 ** need} ≥ ${n}, so ${need} bits.`)],
      };
    }
    const v = mode === 'count' ? 2 ** bits : 2 ** bits - 1;
    return {
      q: mode === 'count' ? T(`${bits} 個位元（bit）可以表示多少種不同的值？`, `How many different values can ${bits} bits represent?`) : T(`用 ${bits} 個位元存「不帶正負號」的整數，最大可以是多少？`, `What is the largest unsigned whole number you can store in ${bits} bits?`),
      options: opts(v, mode === 'count' ? [2 ** bits - 1, bits * 2, 2 ** (bits + 1)] : [2 ** bits, 2 ** (bits - 1), bits * 2 - 1].filter((x) => x !== v)),
      sol: mode === 'count'
        ? [T(`每多一個位元，可能的組合就變 2 倍：${bits} 個 2 相乘 = 2<sup>${bits}</sup> = ${v}。`, `Each extra bit doubles the number of patterns: ${bits} twos multiplied = 2<sup>${bits}</sup> = ${v}.`)]
        : [T(`${bits} 位元共有 2<sup>${bits}</sup> = ${2 ** bits} 種值，從 0 開始算，所以最大是 ${2 ** bits} − 1 = ${v}（全部都是 1：${'1'.repeat(bits)}）。`, `${bits} bits give 2<sup>${bits}</sup> = ${2 ** bits} values starting from 0, so the largest is ${2 ** bits} − 1 = ${v} (all ones: ${'1'.repeat(bits)}).`)],
    };
  },
  (r) => {
    // ASCII codes for letters
    const up = r.chance(0.5), i = r.int(1, 24), base = up ? 65 : 97, first = up ? 'A' : 'a';
    const ch = String.fromCharCode(base + i), code = base + i;
    if (r.chance(0.5)) return {
      q: T(`在 ASCII 編碼中，「${first}」是 ${base}。那麼「${ch}」是多少？`, `In ASCII, “${first}” is ${base}. What is “${ch}”?`),
      options: opts(code, [code + 1, code - 1, up ? code + 32 : code - 32]),
      sol: [T(`字母是照順序編號的：「${ch}」是第 ${i + 1} 個字母，比「${first}」多 ${i}。`, `Letters are numbered in order: “${ch}” is letter ${i + 1}, ${i} after “${first}”.`), T(`${base} + ${i} = ${code}。`, `${base} + ${i} = ${code}.`)],
    };
    return {
      q: T(`在 ASCII 編碼中，「${first}」是 ${base}。編號 ${code} 是哪個字母？`, `In ASCII, “${first}” is ${base}. Which letter has code ${code}?`),
      options: uniq([ch, String.fromCharCode(code + 1), String.fromCharCode(code - 1), up ? ch.toLowerCase() : ch.toUpperCase()], 4),
      sol: [T(`${code} − ${base} = ${i}，所以是「${first}」後面第 ${i} 個字母：${ch}。`, `${code} − ${base} = ${i}, so it is ${i} letters after “${first}”: ${ch}.`)],
    };
  },
];

// ---------------------------------------------------------------- boolean logic (G10)
const B = (v) => (v ? 'true' : 'false');
const boolGens = [
  (r) => {
    const vars = { p: r.chance(0.5), q: r.chance(0.5), s: r.chance(0.5) };
    const forms = [
      ['p && q', (v) => v.p && v.q], ['p || q', (v) => v.p || v.q], ['!p && q', (v) => !v.p && v.q], ['p || !q', (v) => v.p || !v.q],
      ['!(p && q)', (v) => !(v.p && v.q)], ['!(p || q)', (v) => !(v.p || v.q)], ['(p || q) && s', (v) => (v.p || v.q) && v.s], ['p && (q || s)', (v) => v.p && (v.q || v.s)],
      ['p && q || s', (v) => (v.p && v.q) || v.s], ['!p || !q', (v) => !v.p || !v.q], ['(p && !q) || (!p && q)', (v) => (v.p && !v.q) || (!v.p && v.q)],
    ];
    const [f, fn] = r.pick(forms), val = fn(vars);
    const code = `let p = ${vars.p}, q = ${vars.q}, s = ${vars.s};\nconsole.log(${f});`;
    return {
      q: T('這段程式會印出什麼？（&& = 而且，|| = 或，! = 不是）', 'What does this print? (&& = and, || = or, ! = not)'), code,
      options: [B(val), B(!val)],
      sol: [T(`代入 p = ${vars.p}、q = ${vars.q}、s = ${vars.s}。`, `Plug in p = ${vars.p}, q = ${vars.q}, s = ${vars.s}.`),
        T('先算括號和 !，再算 &&，最後算 ||（&& 比 || 優先）。', 'Do parentheses and ! first, then &&, then || (&& binds tighter than ||).'),
        T(`<code>${f}</code> 的結果是 ${val}。`, `<code>${f}</code> is ${val}.`)],
    };
  },
  (r) => {
    // truth table: which operation gives this column
    const forms = [['A AND B', (a, b) => a && b], ['A OR B', (a, b) => a || b], ['NOT A', (a) => !a], ['A XOR B', (a, b) => a !== b], ['NOT (A AND B)', (a, b) => !(a && b)], ['NOT (A OR B)', (a, b) => !(a || b)], ['A AND NOT B', (a, b) => a && !b], ['NOT A OR B', (a, b) => !a || b]];
    const [name, fn] = r.pick(forms);
    const rows = [[false, false], [false, true], [true, false], [true, true]];
    const col = rows.map(([a, b]) => fn(a, b));
    const others = forms.filter(([n, f]) => n !== name && rows.some(([a, b]) => f(a, b) !== fn(a, b)));
    const wrong = r.sample(others, 3).map(([n]) => n);
    const tbl = `<table class="tt"><tr><th>A</th><th>B</th><th>?</th></tr>${rows.map(([a, b], i) => `<tr><td>${a ? 1 : 0}</td><td>${b ? 1 : 0}</td><td>${col[i] ? 1 : 0}</td></tr>`).join('')}</table>`;
    return {
      q: T(`哪一個邏輯運算會得到這個真值表？（1 = 真，0 = 假）${tbl}`, `Which logic operation gives this truth table? (1 = true, 0 = false)${tbl}`),
      options: [name, ...wrong],
      sol: [T('逐列檢查：AND 要兩個都是 1 才是 1；OR 有一個 1 就是 1；XOR 兩個不同才是 1；NOT 把 0、1 對調。', 'Check each row: AND is 1 only when both are 1; OR is 1 when at least one is 1; XOR is 1 when they differ; NOT swaps 0 and 1.'),
        T(`這張表的輸出依序（AB = 00、01、10、11）是 ${col.map((c) => (c ? 1 : 0)).join(', ')}，正好是 ${name}。`, `The output column (for AB = 00, 01, 10, 11) is ${col.map((c) => (c ? 1 : 0)).join(', ')} — exactly ${name}.`)],
    };
  },
  (r) => {
    // equivalent expressions (De Morgan)
    const pairs = [['!(a && b)', '!a || !b', ['!a && !b', 'a || b', '!a && b']], ['!(a || b)', '!a && !b', ['!a || !b', 'a && b', '!a || b']], ['!(x > 5)', 'x <= 5', ['x < 5', 'x >= 5', 'x > 5']], ['!(x === 3 || y === 3)', 'x !== 3 && y !== 3', ['x !== 3 || y !== 3', 'x === 3 && y === 3', 'x !== 3']], ['!(x >= 10 && x <= 20)', 'x < 10 || x > 20', ['x < 10 && x > 20', 'x <= 10 || x >= 20', 'x >= 10 || x <= 20']], ['!(a && !b)', '!a || b', ['!a && b', 'a || !b', '!a || !b']], ['!(x < 0)', 'x >= 0', ['x > 0', 'x <= 0', 'x < 0']], ['!(x === y)', 'x !== y', ['x === y', 'x > y', 'x < y']], ['!(!a || b)', 'a && !b', ['!a && b', 'a || !b', '!a && !b']]];
    const [e, right, wrongs] = r.pick(pairs);
    const esc = (s) => s.replace(/</g, '&lt;');
    return {
      q: T(`哪一個運算式永遠和 <code>${esc(e)}</code> 的結果一樣？`, `Which expression always has the same value as <code>${esc(e)}</code>?`),
      options: [right, ...wrongs],
      sol: !/&&|\|\|/.test(e) ? [T(`! 把比較反過來：<code>${esc(e)}</code> 就是 <code>${esc(right)}</code>（例如「不大於」就是「小於或等於」）。`, `! flips the comparison: <code>${esc(e)}</code> is <code>${esc(right)}</code> (for example “not greater than” means “less than or equal to”).`)]
        : [T('笛摩根定律：把 ! 分配進括號時，&& 和 || 要互換，每一項都要反過來。', 'De Morgan’s law: when you push ! into the parentheses, && and || swap and every part is flipped.'),
          T(`所以 <code>${esc(e)}</code> 等於 <code>${esc(right)}</code>。`, `So <code>${esc(e)}</code> equals <code>${esc(right)}</code>.`)],
    };
  },
  (r) => {
    // how many rows are true
    const forms = [['A AND B', 1], ['A OR B', 3], ['A XOR B', 2], ['NOT (A AND B)', 3], ['NOT (A OR B)', 1], ['A OR NOT A', 4], ['A AND NOT A', 0], ['A AND NOT B', 1], ['NOT A OR B', 3]];
    const [f, n] = r.pick(forms);
    return {
      q: T(`A、B 各可以是「真」或「假」，共 4 種組合。<b>${f}</b> 在幾種組合下是真？`, `A and B can each be true or false — 4 combinations. For how many of them is <b>${f}</b> true?`),
      options: opts(n, r.shuffle([0, 1, 2, 3, 4].filter((x) => x !== n))),
      sol: [T('列出 4 種組合：(假,假)、(假,真)、(真,假)、(真,真)，逐一計算。', 'List the 4 combinations: (F,F), (F,T), (T,F), (T,T), and work out each one.'), T(`${f} 有 ${n} 種組合是真。`, `${f} is true in ${n} of them.`)],
    };
  },
];

// ---------------------------------------------------------------- trace: arrays and strings (G10)
const traceArr = [
  (r) => {
    const a = r.sample([3, 5, 7, 2, 8, 1, 9, 4, 6], r.int(4, 6));
    const mode = r.pick(['max', 'sum', 'countEven']);
    let v, code, sol;
    if (mode === 'max') { v = Math.max(...a); code = `let a = [${a.join(', ')}];\nlet m = a[0];\nfor (let x of a) {\n  if (x > m) m = x;\n}\nconsole.log(m);`; sol = T(`m 從 a[0] = ${a[0]} 開始，遇到更大的數就換掉，最後是最大值 ${v}。`, `m starts as a[0] = ${a[0]} and is replaced by any bigger number, ending as the maximum, ${v}.`); }
    else if (mode === 'sum') { v = a.reduce((s, x) => s + x, 0); code = `let a = [${a.join(', ')}];\nlet s = 0;\nfor (let i = 0; i < a.length; i++) {\n  s += a[i];\n}\nconsole.log(s);`; sol = T(`把每個元素加起來：${a.join(' + ')} = ${v}。`, `Add every element: ${a.join(' + ')} = ${v}.`); }
    else { const ev = a.filter((x) => x % 2 === 0); v = ev.length; code = `let a = [${a.join(', ')}];\nlet c = 0;\nfor (let x of a) {\n  if (x % 2 === 0) c++;\n}\nconsole.log(c);`; sol = T(`偶數有：${ev.join(', ') || '（沒有）'}，共 ${v} 個。`, `The even numbers are ${ev.join(', ') || '(none)'}: ${v} of them.`); }
    return { q: WHAT(), code, options: opts(v, nearNums(r, v, 3, 3)), sol: [sol] };
  },
  (r) => {
    const a = r.sample([10, 20, 30, 40, 50, 60, 70], r.int(4, 6)), i = r.int(0, a.length - 1);
    const kind = r.pick(['index', 'length', 'last']);
    let v, code, sol, wr;
    if (kind === 'index') { v = a[i]; code = `let a = [${a.join(', ')}];\nconsole.log(a[${i}]);`; sol = T(`索引從 0 開始：a[0] = ${a[0]}，所以 a[${i}] 是第 ${i + 1} 個元素 ${v}。`, `Indexes start at 0: a[0] = ${a[0]}, so a[${i}] is element number ${i + 1}: ${v}.`); wr = [a[i + 1], a[i - 1], a[i + 2]]; }
    else if (kind === 'length') { v = a.length + 1; code = `let a = [${a.join(', ')}];\na.push(${r.int(1, 9)});\nconsole.log(a.length);`; sol = T(`原本有 ${a.length} 個元素，push 加入 1 個，變成 ${v} 個。`, `It had ${a.length} elements; push adds one, so ${v}.`); wr = [a.length, a.length + 2, a.length - 1]; }
    else { v = a[a.length - 1]; code = `let a = [${a.join(', ')}];\nconsole.log(a[a.length - 1]);`; sol = T(`a.length = ${a.length}，最後一個索引是 ${a.length - 1}，a[${a.length - 1}] = ${v}。`, `a.length = ${a.length}; the last index is ${a.length - 1}, and a[${a.length - 1}] = ${v}.`); wr = [a[a.length - 2], a.length, 'undefined']; }
    return { q: WHAT(), code, options: opts(v, [...wr.filter((x) => x !== undefined && x !== v), ...a.filter((x) => x !== v)]), sol: [sol] };
  },
  (r) => {
    const words = ['banana', 'robot', 'coding', 'dragon', 'pixel', 'turtle', 'planet', 'rocket', 'castle', 'puzzle', 'garden', 'monkey'];
    const w = r.pick(words), kind = r.pick(['len', 'upper', 'slice', 'index', 'rev']);
    let v, code, sol;
    if (kind === 'len') { v = String(w.length); code = `let s = "${w}";\nconsole.log(s.length);`; sol = T(`"${w}" 有 ${w.length} 個字母。`, `"${w}" has ${w.length} letters.`); }
    else if (kind === 'upper') { v = w.toUpperCase(); code = `let s = "${w}";\nconsole.log(s.toUpperCase());`; sol = T('toUpperCase() 把每個字母變成大寫。', 'toUpperCase() makes every letter a capital.'); }
    else if (kind === 'slice') { const a = r.int(0, 2), b = r.int(a + 2, w.length); v = w.slice(a, b); code = `let s = "${w}";\nconsole.log(s.slice(${a}, ${b}));`; sol = T(`slice(${a}, ${b}) 取索引 ${a} 到 ${b - 1}（不含 ${b}）：「${v}」。`, `slice(${a}, ${b}) takes indexes ${a} to ${b - 1} (not ${b}): “${v}”.`); }
    else if (kind === 'index') { const i = r.int(0, w.length - 1); v = w[i]; code = `let s = "${w}";\nconsole.log(s[${i}]);`; sol = T(`字串索引也從 0 開始：s[${i}] 是第 ${i + 1} 個字母「${v}」。`, `String indexes also start at 0: s[${i}] is letter number ${i + 1}, “${v}”.`); }
    else { v = [...w].reverse().join(''); code = `let s = "${w}";\nlet t = "";\nfor (let c of s) {\n  t = c + t;\n}\nconsole.log(t);`; sol = T('每個字母都加在 t 的「前面」，所以字串被倒過來。', 'Each letter is added to the FRONT of t, so the string comes out reversed.'); }
    const wrongs = kind === 'len' ? [w.length + 1, w.length - 1, w.length + 2] : kind === 'index' ? [...new Set(w)] : kind === 'slice' ? [w.slice(1), w.slice(0, -1), w.slice(2, 5), w.slice(1, 4), w.slice(0, 3)] : [w, w.toUpperCase(), [...w].reverse().join(''), w[0].toUpperCase() + w.slice(1), w.slice(1) + w[0]];
    return { q: WHAT(), code, options: opts(v, r.shuffle(wrongs.map(String).filter((x) => x !== v))), sol: [sol, T(`答案：${v}`, `Answer: ${v}`)] };
  },
  (r) => {
    // nested loop count
    const n = r.int(2, 5), m = r.int(n, 6), tri = r.chance(0.4);
    let c = 0; for (let i = 0; i < n; i++) for (let j = tri ? i : 0; j < m; j++) c++;
    const code = `let c = 0;\nfor (let i = 0; i < ${n}; i++) {\n  for (let j = ${tri ? 'i' : '0'}; j < ${m}; j++) {\n    c++;\n  }\n}\nconsole.log(c);`;
    return {
      q: WHAT(), code,
      options: opts(c, [n * m, n + m, ...nearNums(r, c, 3, 3)].filter((x) => x !== c)),
      sol: tri ? [T(`外層 i = 0…${n - 1}；內層 j 從 i 跑到 ${m - 1}，每次跑 ${m} − i 次。`, `Outer i = 0…${n - 1}; the inner j runs from i to ${m - 1}, that is ${m} − i times.`), T(`總共 ${Array.from({ length: n }, (_, i) => m - i).join(' + ')} = ${c}。`, `Total ${Array.from({ length: n }, (_, i) => m - i).join(' + ')} = ${c}.`)]
        : [T(`外層跑 ${n} 次，每次內層跑 ${m} 次。`, `The outer loop runs ${n} times; each time the inner loop runs ${m} times.`), T(`${n} × ${m} = ${c}。`, `${n} × ${m} = ${c}.`)],
    };
  },
];

// ---------------------------------------------------------------- Big-O (G11)
const SNIPS = [
  ['O(1)', 'function f(a) {\n  return a[0] + a[a.length - 1];\n}', T('不管陣列多長，都只做固定幾個步驟。', 'However long the array is, it does the same few steps.')],
  ['O(n)', 'function f(a) {\n  let s = 0;\n  for (let x of a) s += x;\n  return s;\n}', T('每個元素看一次：n 個元素做 n 次。', 'It looks at each element once: n steps for n elements.')],
  ['O(n²)', 'function f(a) {\n  let c = 0;\n  for (let i = 0; i < a.length; i++)\n    for (let j = 0; j < a.length; j++)\n      if (a[i] === a[j]) c++;\n  return c;\n}', T('兩層迴圈都跑 n 次：n × n = n² 次。', 'Two nested loops of n each: n × n = n² steps.')],
  ['O(log n)', 'function f(n) {\n  let c = 0;\n  while (n > 1) {\n    n = Math.floor(n / 2);\n    c++;\n  }\n  return c;\n}', T('每一圈 n 都減半，大約 log₂ n 圈就到 1。', 'n is halved each time around, so it reaches 1 after about log₂ n loops.')],
  ['O(n)', 'function f(a, x) {\n  for (let i = 0; i < a.length; i++)\n    if (a[i] === x) return i;\n  return -1;\n}', T('線性搜尋：最壞情況要看完全部 n 個元素。', 'Linear search: in the worst case it checks all n elements.')],
  ['O(log n)', 'function f(a, x) {   // a is sorted\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    let mid = Math.floor((lo + hi) / 2);\n    if (a[mid] === x) return mid;\n    if (a[mid] < x) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}', T('二分搜尋：每次把搜尋範圍砍一半。', 'Binary search: each step cuts the search range in half.')],
  ['O(n²)', 'function f(a) {   // bubble sort\n  for (let i = 0; i < a.length; i++)\n    for (let j = 0; j + 1 < a.length - i; j++)\n      if (a[j] > a[j + 1])\n        [a[j], a[j + 1]] = [a[j + 1], a[j]];\n  return a;\n}', T('泡沫排序有兩層迴圈，大約 n²/2 次比較；常數倍不算，屬於 O(n²)。', 'Bubble sort has two nested loops, about n²/2 comparisons; constant factors do not count, so O(n²).')],
  ['O(n)', 'function f(a) {\n  let s = 0;\n  for (let x of a) s += x;\n  for (let x of a) s -= 1;\n  return s;\n}', T('兩個「一前一後」的迴圈：n + n = 2n 次，常數倍不算，仍是 O(n)。', 'Two loops one after the other: n + n = 2n steps; constant factors do not count, so O(n).')],
  ['O(1)', 'function f(n) {\n  return n * (n + 1) / 2;\n}', T('用公式直接算，不管 n 多大都只算一次。', 'A formula computes it directly — one step no matter how big n is.')],
  ['O(n²)', 'function f(n) {\n  let c = 0;\n  for (let i = 0; i < n; i++)\n    for (let j = 0; j < i; j++)\n      c++;\n  return c;\n}', T('內層跑 0 + 1 + … + (n−1) = n(n−1)/2 次，屬於 O(n²)。', 'The inner loop runs 0 + 1 + … + (n−1) = n(n−1)/2 times — O(n²).')],
];
const bigO = [
  (r) => {
    const [ans, code, why] = r.pick(SNIPS);
    const pre = `<pre class="code">${code.replace(/</g, '&lt;')}</pre>`;
    return {
      q: T(`下面函式的時間複雜度是多少？（n = 陣列長度，或參數 n 的值）${pre}`, `What is the time complexity of this function? (n = the array length, or the value of n)${pre}`),
      options: [ans, ...['O(1)', 'O(log n)', 'O(n)', 'O(n²)'].filter((x) => x !== ans)],
      sol: [why, T(`所以是 ${ans}。`, `So it is ${ans}.`)],
    };
  },
  (r) => {
    // doubling n
    const kinds = [['O(n)', 2, T('線性：n 變 2 倍，時間也大約變 2 倍。', 'Linear: double n, about double the time.')], ['O(n²)', 4, T('平方：n 變 2 倍，時間變 2² = 4 倍。', 'Quadratic: double n and the time grows 2² = 4 times.')], ['O(1)', 1, T('常數時間：和 n 無關，時間不變。', 'Constant time: it does not depend on n, so it stays the same.')]];
    const [o, f, why] = r.pick(kinds), t = r.pick([2, 3, 5, 10]), n0 = r.pick([1000, 5000, 20000]);
    const v = t * f;
    return {
      q: T(`一個 ${o} 的程式處理 n = ${n0} 筆資料要 ${t} 秒。n = ${n0 * 2} 時大約要幾秒？`, `An ${o} program takes ${t} seconds for n = ${n0} items. About how many seconds for n = ${n0 * 2}?`),
      options: opts(v, [t, t * 2, t * 4, t * 8].filter((x) => x !== v)),
      sol: [why, T(`${t} × ${f} = ${v} 秒。`, `${t} × ${f} = ${v} seconds.`)],
    };
  },
  (r) => {
    // binary search worst-case comparisons
    const k = r.int(4, 20), n = 2 ** k;
    const big = r.chance(0.5) ? n : n + r.int(1, n - 1);
    const steps = Math.floor(Math.log2(big)) + 1;
    const f = (x) => x.toLocaleString('en-US');
    return {
      q: T(`用二分搜尋在 ${f(big)} 個已排序的數字中找一個數，最壞情況大約要比較幾次？`, `Binary search in ${f(big)} sorted numbers: about how many comparisons in the worst case?`),
      options: opts(steps, [Math.floor(big / 2), big, steps * 3, steps + 5].filter((x) => x !== steps)),
      sol: [T('每比較一次，就把剩下的範圍砍半。', 'Each comparison halves the range that is left.'),
        T(`2<sup>${steps - 1}</sup> = ${f(2 ** (steps - 1))} ≤ ${f(big)} &lt; 2<sup>${steps}</sup> = ${f(2 ** steps)}：最多砍半 ${steps - 1} 次就只剩 1 個，再比較最後一次，共約 ${steps} 次。`, `2<sup>${steps - 1}</sup> = ${f(2 ** (steps - 1))} ≤ ${f(big)} &lt; 2<sup>${steps}</sup> = ${f(2 ** steps)}: after at most ${steps - 1} halvings one number is left, plus a final comparison — about ${steps}.`),
        T('線性搜尋最壞要比較每一個數，差非常多！', 'Linear search might have to check every number — a huge difference!')],
    };
  },
];

// ---------------------------------------------------------------- trace: functions and recursion (G11)
const traceFn = [
  (r) => {
    const n = r.int(3, 6), kind = r.pick(['fact', 'sum', 'pow']), b = r.int(2, 3);
    const code = kind === 'fact' ? `function f(n) {\n  if (n <= 1) return 1;\n  return n * f(n - 1);\n}\nconsole.log(f(${n}));`
      : kind === 'sum' ? `function f(n) {\n  if (n === 0) return 0;\n  return n + f(n - 1);\n}\nconsole.log(f(${n}));`
        : `function f(n) {\n  if (n === 0) return 1;\n  return ${b} * f(n - 1);\n}\nconsole.log(f(${n}));`;
    let v = kind === 'sum' ? 0 : 1; const xs = [];
    for (let i = n; i >= 1; i--) { xs.push(kind === 'pow' ? b : i); v = kind === 'fact' ? v * i : kind === 'sum' ? v + i : v * b; }
    const join = kind === 'sum' ? ' + ' : ' × ';
    const tail = kind === 'sum' ? ' + 0' : kind === 'pow' ? ' × 1' : '';
    return {
      q: T('這段遞迴程式會印出什麼？', 'What does this recursive program print?'), code,
      options: opts(v, nearNums(r, v, 3, Math.max(3, Math.floor(v / 5)), (w) => w > 0)),
      sol: [T(`f(${n}) 會呼叫 f(${n - 1})，f(${n - 1}) 再呼叫 f(${n - 2})…直到停止條件（基本情況）。`, `f(${n}) calls f(${n - 1}), which calls f(${n - 2}), … until the stopping condition (the base case).`),
        T(`展開來：${xs.join(join)}${tail} = ${v}。`, `Unrolled: ${xs.join(join)}${tail} = ${v}.`)],
    };
  },
  (r) => {
    const n = r.int(3, 12);
    const fib = (k) => (k < 2 ? k : fib(k - 1) + fib(k - 2));
    const code = `function fib(n) {\n  if (n < 2) return n;\n  return fib(n - 1) + fib(n - 2);\n}\nconsole.log(fib(${n}));`;
    const seq = Array.from({ length: n + 1 }, (_, i) => fib(i));
    return {
      q: T('這段遞迴程式會印出什麼？', 'What does this recursive program print?'), code,
      options: opts(fib(n), [fib(n - 1), fib(n + 1), fib(n) + 1, fib(n) - 1].filter((x) => x !== fib(n))),
      sol: [T('fib(0) = 0、fib(1) = 1，之後每一個都是前兩個的和。', 'fib(0) = 0, fib(1) = 1, and each next one is the sum of the two before it.'),
        T(`${seq.map((x, i) => `fib(${i})=${x}`).join('，')}。`, `${seq.map((x, i) => `fib(${i})=${x}`).join(', ')}.`)],
    };
  },
  (r) => {
    // a number parameter is a copy, an array is shared
    const a = r.int(1, 9), k = r.int(2, 9), arr = r.chance(0.5);
    const code = arr ? `function g(list) {\n  list.push(${k});\n}\nlet a = [${a}];\ng(a);\nconsole.log(a.length);` : `function g(x) {\n  x = x + ${k};\n}\nlet a = ${a};\ng(a);\nconsole.log(a);`;
    const v = arr ? 2 : a;
    return {
      q: WHAT(), code,
      options: opts(v, arr ? [1, 3, k] : [a + k, k, 0]),
      sol: arr ? [T('陣列傳進函式時，函式拿到的是「同一個陣列」。', 'When you pass an array, the function gets the SAME array.'), T('push 讓 a 從 1 個元素變成 2 個，所以印出 2。', 'push changes a from 1 element to 2, so it prints 2.')]
        : [T('數字傳進函式時，x 只是 a 的「複本」。', 'When you pass a number, x is only a COPY of a.'), T(`改變 x 不會影響外面的 a，所以印出 ${a}。`, `Changing x does not change a outside, so it prints ${a}.`)],
    };
  },
  (r) => {
    // nested calls
    const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, 5);
    const code = `function sq(x) {\n  return x * x;\n}\nfunction add(x, y) {\n  return x + y;\n}\nconsole.log(add(sq(${a}), ${b}) - ${c});`;
    const v = a * a + b - c;
    return {
      q: WHAT(), code,
      options: opts(v, [a * 2 + b - c, a * a + b, (a + b) * (a + b) - c, ...nearNums(r, v, 2, 4)].filter((x) => x !== v)),
      sol: [T(`先算最裡面：sq(${a}) = ${a * a}。`, `Innermost first: sq(${a}) = ${a * a}.`), T(`add(${a * a}, ${b}) = ${a * a + b}。`, `add(${a * a}, ${b}) = ${a * a + b}.`), T(`${a * a + b} − ${c} = ${v}。`, `${a * a + b} − ${c} = ${v}.`)],
    };
  },
];

// ---------------------------------------------------------------- AP CSP concepts (G12): a fixed bank, shuffled options
const CSP = [
  [T('網際網路上的資料在傳送時，通常會被切成什麼？', 'When data is sent over the Internet, it is usually split into what?'), [T('封包（packets）', 'Packets'), T('資料夾', 'Folders'), T('網址', 'URLs'), T('像素', 'Pixels')], T('資料被切成小封包，各自可以走不同路線，到達後再依序組合。', 'Data is split into small packets that may take different routes and are put back together in order at the destination.')],
  [T('DNS 的主要工作是什麼？', 'What is the main job of DNS?'), [T('把網域名稱（如 example.com）轉成 IP 位址', 'Translate domain names (like example.com) into IP addresses'), T('加密密碼', 'Encrypt passwords'), T('壓縮圖片', 'Compress images'), T('阻擋病毒', 'Block viruses')], T('DNS 像電話簿：人記得名字，電腦用 IP 位址連線。', 'DNS is like a phone book: people remember names, computers connect with IP addresses.')],
  [T('網際網路的「容錯能力（fault tolerance）」主要來自什麼？', 'Where does the Internet’s fault tolerance mainly come from?'), [T('兩台電腦之間有很多條可以走的路徑（冗餘）', 'There are many possible paths between two computers (redundancy)'), T('每台電腦都裝了防毒軟體', 'Every computer has antivirus software'), T('所有資料都存在同一台伺服器', 'All data is stored on one server'), T('網路線特別粗', 'The cables are extra thick')], T('有冗餘的路徑，一條斷了，封包還能改走別條。', 'With redundant paths, packets can go around a broken link.')],
  [T('下面哪一種壓縮方式可以「完全還原」原本的資料？', 'Which kind of compression lets you get the original data back exactly?'), [T('無失真壓縮（lossless）', 'Lossless compression'), T('有失真壓縮（lossy）', 'Lossy compression'), T('兩種都不行', 'Neither'), T('只有影片壓縮可以', 'Only video compression')], T('無失真壓縮（例如 ZIP、PNG）可以完全還原；有失真壓縮（例如 JPEG、MP3）丟掉部分細節來換取更小的檔案。', 'Lossless compression (e.g. ZIP, PNG) restores everything; lossy compression (e.g. JPEG, MP3) throws away some detail to make files smaller.')],
  [T('公開金鑰加密中，別人要傳祕密訊息給你，應該用哪一把金鑰加密？', 'In public-key encryption, which key should someone use to encrypt a secret message to you?'), [T('你的公開金鑰', 'Your public key'), T('你的私密金鑰', 'Your private key'), T('他自己的私密金鑰', 'Their own private key'), T('不需要金鑰', 'No key at all')], T('任何人都可以用你的公開金鑰加密；只有你手上的私密金鑰能解開。', 'Anyone may use your public key to encrypt; only your private key can decrypt.')],
  [T('8 位元的無號整數最大是 255。如果程式把 255 + 1 存進同樣的 8 位元，會發生什麼？', 'An 8-bit unsigned integer can hold at most 255. If a program stores 255 + 1 in the same 8 bits, what happens?'), [T('溢位（overflow），存下來的值是錯的', 'Overflow — the stored value is wrong'), T('自動變成 256', 'It becomes 256 automatically'), T('電腦會關機', 'The computer shuts down'), T('變成小數', 'It turns into a decimal')], T('位元數固定時，超過能表示的範圍就會溢位（8 位元的 255 + 1 會繞回 0）。', 'With a fixed number of bits, going past the largest value overflows (in 8 bits, 255 + 1 wraps around to 0).')],
  [T('「網路釣魚（phishing）」是什麼？', 'What is phishing?'), [T('假裝成可信任的人或網站，騙你說出密碼或個資', 'Pretending to be someone trustworthy to trick you into giving passwords or personal data'), T('讓電腦變慢的硬體故障', 'A hardware fault that slows the computer'), T('一種壓縮方法', 'A compression method'), T('一種排序演算法', 'A sorting algorithm')], T('釣魚是社交工程：看起來像真的信件或網站，其實是騙局。', 'Phishing is social engineering: a fake email or site that looks real.')],
  [T('「數位落差（digital divide）」指的是什麼？', 'What does “the digital divide” mean?'), [T('有些人能方便使用電腦和網路，有些人不能', 'Some people have easy access to computers and the Internet, others do not'), T('二進位和十進位的差別', 'The difference between binary and decimal'), T('螢幕上像素之間的距離', 'The gap between pixels on a screen'), T('硬碟分割', 'Disk partitions')], T('因為地區、收入等原因，取得科技的機會不平均，就是數位落差。', 'Unequal access to technology — because of place, income and so on — is the digital divide.')],
  [T('下面哪一個是「群眾外包（crowdsourcing）」的例子？', 'Which is an example of crowdsourcing?'), [T('很多志工一起在照片中標記星系', 'Many volunteers together label galaxies in photos'), T('一個人自己寫完整個程式', 'One person writes a whole program alone'), T('把檔案壓縮成 ZIP', 'Zipping a file'), T('用二分搜尋找數字', 'Using binary search')], T('群眾外包是請很多人各貢獻一小部分，一起完成大工作。', 'Crowdsourcing gets many people to each contribute a small part of a big job.')],
  [T('某個問題用已知演算法無法在合理時間內找到最佳解。「啟發式（heuristic）」方法可以做什麼？', 'No known algorithm finds the best answer to a problem in reasonable time. What can a heuristic do?'), [T('很快找到「夠好」但不一定最好的答案', 'Quickly find a “good enough” answer that may not be the best'), T('保證找到最佳答案，而且更快', 'Always find the best answer, faster'), T('讓問題消失', 'Make the problem disappear'), T('把程式變成硬體', 'Turn the program into hardware')], T('啟發式用經驗法則換取速度，答案通常不錯，但不保證最佳。', 'A heuristic trades the guarantee of the best answer for speed; answers are usually good, not guaranteed optimal.')],
  [T('「無法判定的問題（undecidable problem）」是什麼意思？', 'What is an undecidable problem?'), [T('不存在任何演算法能對所有輸入都給出正確的是／否答案', 'No algorithm can give a correct yes/no answer for every input'), T('答案太長印不出來', 'The answer is too long to print'), T('只要電腦夠快就能解', 'It can be solved with a faster computer'), T('它有兩個正確答案', 'It has two right answers')], T('例如「停機問題」：不可能寫出一個程式，判斷任何程式會不會停下來。', 'For example the halting problem: no program can decide, for every program, whether it will stop.')],
  [T('下面哪一個是「後設資料（metadata）」？', 'Which of these is metadata?'), [T('照片的拍攝時間和地點', 'The date and place a photo was taken'), T('照片中每個像素的顏色', 'The color of each pixel in the photo'), T('照片中人物的笑容', 'The smile of the person in the photo'), T('照片的畫面本身', 'The picture itself')], T('後設資料是「描述資料的資料」，像檔案的建立時間、作者、位置。', 'Metadata is data about data — like when a file was made, by whom, and where.')],
  [T('平行運算把工作分給 4 個處理器。如果其中有一部分只能一步接一步做（循序），整體速度會怎樣？', 'Parallel computing splits work over 4 processors. If part of the work must be done one step after another (sequentially), what about the overall speed?'), [T('加速會被循序的部分限制，不會剛好快 4 倍', 'The speedup is limited by the sequential part — it will not be a full 4×'), T('一定剛好快 4 倍', 'It is always exactly 4× faster'), T('一定變更慢', 'It always gets slower'), T('和處理器數量無關', 'It has nothing to do with the number of processors')], T('循序的部分不能分工，所以總時間至少是那部分的時間。', 'The sequential part cannot be shared, so the total time is at least that part’s time.')],
  [T('IP 位址的主要用途是什麼？', 'What is an IP address mainly used for?'), [T('在網路上辨識裝置，讓封包知道要送到哪裡', 'Identify a device on the network so packets know where to go'), T('儲存網頁的文字', 'Store the text of web pages'), T('檢查拼字', 'Check spelling'), T('讓螢幕更亮', 'Make the screen brighter')], T('IP 位址像門牌號碼，路由器靠它把封包送到正確的地方。', 'An IP address is like a street address; routers use it to deliver packets.')],
  [T('「多因素驗證（multi-factor authentication）」是什麼？', 'What is multi-factor authentication?'), [T('登入時要提供兩種以上不同類型的證明，例如密碼加手機驗證碼', 'Logging in with two or more different kinds of proof, like a password plus a code on your phone'), T('同一個密碼輸入兩次', 'Typing the same password twice'), T('使用很長的密碼', 'Using a very long password'), T('換一台電腦登入', 'Logging in on another computer')], T('結合「你知道的」（密碼）、「你擁有的」（手機）或「你本身的」（指紋），更安全。', 'It combines something you know (a password), have (a phone) or are (a fingerprint) — much safer.')],
  [T('用電腦模擬（simulation）研究傳染病，有什麼好處？', 'What is a benefit of studying a disease outbreak with a computer simulation?'), [T('可以安全、便宜地測試很多不同情況', 'You can test many situations safely and cheaply'), T('結果保證和真實世界完全一樣', 'The results are guaranteed to match the real world exactly'), T('不需要任何假設', 'It needs no assumptions'), T('不需要電腦', 'It needs no computer')], T('模擬會簡化現實（有假設），但能安全又快速地比較各種情況。', 'Simulations simplify reality (they make assumptions) but let you compare many situations quickly and safely.')],
  [T('機器學習模型如果用「有偏差的資料」訓練，可能會怎樣？', 'If a machine-learning model is trained on biased data, what can happen?'), [T('模型的判斷也會帶有偏差，對某些人不公平', 'Its decisions can be biased and unfair to some people'), T('偏差會自動消失', 'The bias disappears automatically'), T('模型會跑得更快', 'The model runs faster'), T('沒有任何影響', 'It has no effect')], T('模型從資料中學習，資料裡的偏差也會被學進去。', 'Models learn from their data — including its biases.')],
  [T('「開放原始碼（open source）」軟體有什麼特點？', 'What is true of open-source software?'), [T('任何人都可以查看它的程式碼，通常也可以修改', 'Anyone can read its source code, and usually change it'), T('一定要付費才能使用', 'You must always pay to use it'), T('不能在網路上分享', 'It cannot be shared online'), T('不能有任何授權條款', 'It cannot have any license')], T('開放原始碼公開程式碼，並用授權條款（例如 MIT、GPL）說明別人可以怎麼使用和修改。', 'Open source publishes the code; a license (like MIT or GPL) says how others may use and change it.')],
  [T('HTTPS 和 HTTP 最大的不同是什麼？', 'What is the main difference between HTTPS and HTTP?'), [T('HTTPS 會把傳輸的資料加密', 'HTTPS encrypts the data being sent'), T('HTTPS 的網頁一定比較漂亮', 'HTTPS pages always look nicer'), T('HTTPS 不需要網路', 'HTTPS needs no network'), T('HTTP 比較安全', 'HTTP is more secure')], T('HTTPS 用 TLS 加密，避免別人在半路偷看或竄改資料。', 'HTTPS uses TLS encryption so others cannot read or change the data on the way.')],
  [T('類比訊號（例如聲音）要存進電腦，需要先做什麼？', 'To store an analog signal (like sound) in a computer, what must happen first?'), [T('取樣（sampling）：每隔一小段時間量一次，變成數字', 'Sampling: measure it at regular moments and turn it into numbers'), T('把它加密', 'Encrypt it'), T('把它排序', 'Sort it'), T('什麼都不用做', 'Nothing')], T('取樣把連續的訊號變成一串數字（數位化）；取樣越密，聽起來越接近原聲。', 'Sampling turns a continuous signal into a list of numbers (digitizing); more samples sound closer to the original.')],
];
const csp = [(r) => { const [q, os, why] = r.pick(CSP); return { q, options: os, sol: [why] }; }];

export const QUIZ = {
  'q7-trace': traceVars,
  'q8-trace': traceLoops,
  'q9-binary': binary,
  'q10-bool': boolGens,
  'q10-trace': traceArr,
  'q11-bigo': bigO,
  'q11-trace': traceFn,
  'q12-csp': csp,
};
export { pad };
