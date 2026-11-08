// Runs student JavaScript off the main thread; the page terminates this worker if it takes too long (endless loop).
import { runJS } from './judge.js';

self.onmessage = (e) => {
  const { ch, code } = e.data;
  try {
    runJS(ch, code, (i, r) => self.postMessage({ i, r }));
  } catch (err) {
    self.postMessage({ fatal: String(err) });
  }
  self.postMessage({ done: true });
};
