// Boot: wires shared systems together and runs the ONE game loop for the whole app.
import { createInput } from './core/input.js';
import { createAudio } from './core/audio.js';
import { createManager } from './core/manager.js';
import { createHub } from './hub/hub.js';
import { MACHINES } from './machines.js';

const W = 320;
const H = 180;
const MAX_DT = 1 / 20; // clamp long frames (tab switches, breakpoints) so games never jump

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
const input = createInput(canvas, W, H);
const audio = createAudio();

let manager = null;
const hub = createHub({
  W, H, input, audio,
  machines: MACHINES,
  enter: id => manager.enter(id),
  info: id => manager.info(id),
});
manager = createManager({ W, H, input, audio, machines: MACHINES, hub });

// Integer scaling keeps pixels crisp; fall back to fractional on tiny windows.
function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const k = s >= 1 ? Math.floor(s) : s;
  canvas.style.width = `${W * k}px`;
  canvas.style.height = `${H * k}px`;
}
window.addEventListener('resize', fit);
fit();
canvas.focus();

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;
  manager.update(dt);
  manager.draw(g);
  input.endFrame();
  requestAnimationFrame(frame);
}

manager.preload().then(() => requestAnimationFrame(frame));

// Debug handle for the browser console and automated checks.
window.__arcade = { manager, input, audio };
