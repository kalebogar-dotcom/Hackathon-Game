// Boot: canvas scaling, shared systems and the game loop.
import { W, H } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildArt } from './art.js';
import { createGame } from './game.js';

const MAX_DT = 1 / 20; // clamp long frames (tab switches) so nothing jumps

const storage = {
  get(k) { try { return localStorage.getItem(`bear-red-woods:${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`bear-red-woods:${k}`, v); } catch { /* storage blocked */ } },
};

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
const input = createInput(canvas, W, H);
const audio = createAudio({ muted: storage.get('muted') === '1' });
const art = buildArt((w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h }));
const game = createGame({ input, audio, art, storage });
input.onPointerLockChange(locked => game.onPointerLock(locked));

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
  game.update(dt);
  game.draw(g);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handle for the browser console and automated checks.
window.__bear = { game, input, audio };
