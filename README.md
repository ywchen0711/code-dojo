# 程式小學堂 Code Dojo

**Play:** https://ywchen0711.github.io/code-dojo/

Learn to program from grade 1 to grade 12, in Traditional Chinese and English. 一到十二年級學寫程式，中英雙語。
Placement follows Taiwan's 108 curriculum (資訊科技, junior and senior high), the US CSTA K-12 Computer Science
Standards, a Code.org-style progression for the younger grades, and AP CSP / AP CS A ideas in high school.

- **Grades 1–3 · Robot puzzles** — a grid world with a robot, gems, rocks and water. Tap command blocks
  (forward, turn left, turn right, pick up) into a program, press Run and watch it go step by step (or one step at
  a time). Sequences, debugging levels that start with a buggy program, and repeat loops. Stars for short programs.
- **Grades 4–6 · Block coding and turtle drawing** — nested blocks: repeat N, repeat until, while, if / if-else
  (path ahead? gem here?), functions (define f, call f) and a counter variable. Some levels have several maps that
  one program must solve, so conditions really matter. The turtle track draws polygons, stars, flowers and spirals;
  the drawing is compared with the target shape.
- **Grades 7–12 · Code challenges** — write real JavaScript in a code editor (line numbers, Tab / Shift+Tab indent,
  auto-indent). Tests run in a Web Worker with a time limit, so an endless loop cannot freeze the page. Every
  challenge has hints, a sample solution explained line by line in both languages, and tests. **Python mode**: pick
  Python and the page loads Pyodide 0.26.4 from jsDelivr (only then) and runs the same tests on Python code.
- **Concept quizzes** — endless generated multiple choice: trace-the-code output, binary / hexadecimal / ASCII,
  boolean logic and truth tables, Big-O, recursion traces and AP CSP ideas (Internet, data, security, impact).
- Stars per level and challenge, progress bars per grade, a bilingual toggle, sound effects (can be muted), works on a
  phone and with a keyboard. Progress is saved only in the browser (localStorage, prefix `cd2-`) and reported to the
  Learning Hub through `js/learnlog.js`.

## Files
```
index.html, style.css
js/app.js          pages: grades, grade page with units, quiz practice, routing
js/play.js         robot / block / turtle level player: block editor, SVG world, animation, stars
js/code.js         code challenge page: editor, JS worker runner, Pyodide runner, hints, solution
js/engine.js       program language, interpreter for the grid world and the turtle, BFS solver, drawing compare
js/judge.js        runs challenge tests on JavaScript and compares results (used by the worker and the tests)
js/harness.py      the same for Python (used by js/pyworker.js in Pyodide and by test/pycheck.py)
js/worker.js       Web Worker for student JavaScript;  js/pyworker.js  Web Worker that loads Pyodide
js/quiz.js         generated quiz questions
js/units.js        all units by grade with lessons and standards tags
js/levels/g1-3.js  robot levels;  js/levels/g4-6.js  block and turtle levels
js/bank/c07-09.js, js/bank/c10-12.js   code challenges
js/ui.js, js/util.js, js/learnlog.js   shared helpers, seeded random numbers, Learning Hub log
SPEC.md            how to write levels and challenges
test/run.mjs       node test/run.mjs — checks every level, challenge and quiz generator
```

## Tests
`node test/run.mjs` checks that every level's solution solves every map, that `best` (the 3-star block count) equals
the BFS-shortest program for sequence levels, that buggy starting programs really fail, that turtle drawings stay on
the canvas, that every sample solution passes its tests in JavaScript and (if Python is installed) in Python while the
starter code does not, and that generated trace questions print exactly the stated answer. It prints `0 problems`
when everything is clean.
