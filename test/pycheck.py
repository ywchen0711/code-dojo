# python test/pycheck.py jobs.json  — runs each challenge's Python solution and starter through js/harness.py
# and prints {id: {"sol": [...], "starter": [...]}} as JSON (test/run.mjs compares the results).
import json, os, sys, io, contextlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js'))
from harness import run_challenge  # noqa: E402

jobs = json.load(open(sys.argv[1], encoding='utf-8'))
out = {}
for j in jobs:
    ch = json.dumps(j['ch'])
    sink = io.StringIO()
    with contextlib.redirect_stdout(sink):
        sol = json.loads(run_challenge(ch, j['code']))
        st = json.loads(run_challenge(ch, j['starter']))
    out[j['id']] = {'sol': sol, 'starter': st}
sys.stdout.write(json.dumps(out))
