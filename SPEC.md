# Code Dojo content spec (for whoever writes a level or challenge bank)

The site teaches programming to kids in grades 1–12, bilingual: Traditional Chinese (繁體中文, Taiwan usage) + English.
Every name, tip, hint and explanation is a `{ zh, en }` object (use `T(zh, en)` from `../util.js`). Code itself is
English. Units (ids, grades, lesson text) are fixed in `js/units.js` — use only those unit ids.

Run `node test/run.mjs` until it prints `0 problems`. It checks every level is solvable with its solution, star
targets are right, and every challenge's sample solution passes its own tests in JavaScript **and** in Python.

---------------------------------------------------------------------------------------------------------------------
## 1. Grid levels (robot G1–3 in `js/levels/g1-3.js`, block levels G4–6 in `js/levels/g4-6.js`)

```js
{
  id: 'r1-03',                 // unique; r<grade>-NN for robot levels, b<grade>-NN for block levels
  unit: 'g1-move',             // a unit id from js/units.js with kind robot / blocks
  name: T('轉個彎', 'Around the corner'),
  tip: T('…', '…'),            // one or two sentences: what is new in this level, a gentle hint (not the answer)
  map: ['#####', '#>..#', '###*#'],   // or  maps: [[...], [...]]  — the SAME program must solve every map
  blocks: ['F', 'L', 'R'],     // the palette (see below)
  best: 5,                     // block count of the best known solution (3 stars at ≤ best)
  max: 6,                      // optional: programs longer than this are refused (forces a loop)
  start: 'F F R F',            // optional (debug levels): the buggy program the level starts with; must FAIL
  sol: 'F F R F F',            // a solution (program text, see js/engine.js); must succeed on every map, size == best
  nums: { rep: [2, 3, 4, 5] }, // optional value choices offered in the block dropdowns (sol's numbers must be in them)
  conds: ['path', 'gem'],      // optional condition choices for if/while/until (sol's conditions must be in them)
}
```
Map characters: `.` ground, `#` rock, `~` water, `G` gem, `*` flag, `> < ^ v` robot facing E/W/N/S.
Every row of a map must have the same length; surround the play area with `#` or `~`. Keep maps ≤ 9 wide and
≤ 8 tall so they fit a phone.
Win = every gem picked up, and if there is a flag, the robot ends on it. Walking into rock = bump (fail), into water =
splash (fail), picking up where there is no gem = fail.

Palette block names: `F` forward, `L` turn left, `R` turn right, `P` pick up, `rep` repeat N, `until` repeat until,
`while` while, `if` if, `ifelse` if/else, `call` call f (the level then also shows the “function f” editor), `set` set c,
`add` add to c, `repc` repeat c times.
Conditions: `path` path ahead, `pathL` path to the left, `pathR` path to the right, `blocked` wall or water ahead,
`gem` gem here, `nogem` all gems collected, `goal` at the flag (or: all gems collected, on maps without a flag),
`notgoal` not at the flag.

Program text: `F L R P`, `rep 3 { F P }`, `until goal { F }`, `while path { F }`, `if gem { P } else { F }`,
`def { F F R }` (body of f, written once at the start) and `call`, `set 2 repc { F } add 1`.

Size (stars): every block counts 1, containers count 1 plus their contents; the `def` header is free, its body counts.
For sequence-only levels (blocks only from F L R P) `best` must equal the BFS shortest solution — the test checks it.
Stars: ≤ best → 3, ≤ best + 2 → 2, otherwise 1.

## 2. Turtle levels (G4–6, also in `js/levels/g4-6.js`)

```js
{
  id: 't4-02', unit: 'g4-turtle', kind: 'turtle',
  name: T('…', '…'), tip: T('…', '…'),
  at: [130, 270, 0],           // optional start x, y, heading (default 200, 200, 0 = up); canvas is 400 × 400, y down
  blocks: ['fd', 'rt', 'lt', 'rep'],
  nums: { fd: [50, 100, 150], ang: [60, 90, 120], rep: [3, 4, 5, 6] },   // dropdown values (sol's values must be in them)
  sol: 'rep 4 { fd 100 rt 90 }',   // the target drawing is what sol draws
  best: 3, max: 6,
}
```
Turtle blocks: `fd N` move N, `bk N`, `rt A`, `lt A` turn A degrees, `pu` pen up, `pd` pen down, `col NAME`
(black red orange green blue purple), `rep N {}`, `set N`, `add N`, `fdc` move c steps, `rtc` turn c degrees, `call`.
nums keys: `fd` (also used by bk), `ang` (rt/lt), `rep`, `set`, `add`. The drawing must stay inside the canvas
(4 px margin). The student's drawing matches when every part of the target is drawn and nothing else (4 px tolerance);
colors are decoration only.

---------------------------------------------------------------------------------------------------------------------
## 3. Code challenges (G7–12, `js/bank/c07-09.js`, `js/bank/c10-12.js`)

```js
{
  id: 'c8-loop-03',            // unique: <unit id>-NN
  unit: 'c8-loop',
  name: T('…', '…'),
  prompt: T('HTML …', 'HTML …'),     // the task; may use <code>, <b>, <br>, <ul><li>. Say the function name and what it returns.
  kind: 'fn',                  // 'fn' | 'out' | 'class'
  fn: 'sumTo', params: ['n'],  // kind fn: JS function name (camelCase) and parameter names. Python name = snake_case (sum_to).
  // kind class: cls: 'Counter', methods: ['inc', 'value'] (Python method names = snake_case of these)
  starter: 'function sumTo(n) {\n  // your code here\n}\n',   // JS starting code
  pyStarter: 'def sum_to(n):\n    # your code here\n    pass\n',
  hints: [T('…', '…'), T('…', '…')],   // 2–3 hints, from gentle to almost-the-answer
  sol: [                        // JS sample solution, one entry per line: [code, zh, en]; '' explanation for } lines
    ['function sumTo(n) {', '定義函式 sumTo，接收 n。', 'Define sumTo, which takes n.'],
    ['  let total = 0;', '…', '…'],
    ['}', '', ''],
  ],
  py: 'def sum_to(n):\n    total = 0\n    ...\n',   // Python sample solution (plain text)
  tests: [ { args: [3], out: 6 }, … ],              // 4–8 tests incl. edge cases (0, empty array, negative …)
}
```
- `kind: 'out'`: the program prints; `tests: [{ out: 'line1\nline2' }]` (one test). Only print strings and integers
  (Python prints `True`/`2.0` differently from JS), no arrays.
- `kind: 'class'`: `tests: [{ ops: [['new', [args]], ['push', [5]], ['size', []]], out: [null, 1] }]` — `out` has one entry
  per method call (not for 'new'); methods that return nothing give `null`.
- Values in args/out must be JSON (numbers, strings, booleans, null, arrays, plain objects with string keys).
  Numbers are compared within 1e-6. Return booleans as real booleans.
- Python solutions must produce exactly the same values (lists for arrays, dicts for objects, `None` for null).
  Avoid things that differ between the languages (integer division: use Math.floor(a / b) and a // b; rounding:
  avoid Math.round on .5; sorting: give JS sort a comparator `(a, b) => a - b`).
- Explanations: kid-friendly, for that grade, explain *why*, both languages. The Chinese uses 繁體 Taiwan terms
  (變數、函式、陣列、迴圈、條件、回傳、字串、物件、類別、遞迴、索引).
- Order challenges within a unit from easy to hard.
