// Python mode: loads Pyodide (only when the student picks Python) and runs js/harness.py on the student's code.
/* global importScripts, loadPyodide */
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@0.26.4/';
let ready = null;
function boot() {
  ready ||= (async () => {
    importScripts(PYODIDE + 'pyodide.js');
    const py = await loadPyodide({ indexURL: PYODIDE });
    const src = await (await fetch('harness.py?v=1')).text();
    py.runPython(src);
    return py;
  })();
  return ready;
}
self.onmessage = async (e) => {
  try {
    const py = await boot();
    if (e.data.ping) { self.postMessage({ ready: true }); return; }
    self.postMessage({ started: true });
    py.globals.set('_ch', e.data.ch);
    py.globals.set('_code', e.data.code);
    const out = py.runPython('run_challenge(_ch, _code)');
    self.postMessage({ out });
  } catch (err) {
    self.postMessage({ error: String(err && err.message || err) });
  }
};
