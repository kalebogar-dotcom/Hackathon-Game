// Headless harness: runs one minigame's createGame(api) in Node with simulated input,
// calling update at 60 fps and draw on a stub canvas context (so draw-time exceptions surface).
const coreUrl = new URL('../src/core/palette.js', import.meta.url);
const { PAL } = await import(coreUrl);

function stubContext() {
  const state = { calls: 0 };
  return new Proxy(state, {
    get: (t, k) => (k in t ? t[k] : () => { t.calls++; }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

// PIXEL CHIC builds its canvases with document.createElement instead of api.sprite and recolors them
// through getImageData/putImageData; give it stub canvases with blank pixel buffers.
function stubCanvasContext() {
  const ctx = stubContext();
  ctx.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
  return ctx;
}
globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: stubCanvasContext, toDataURL: () => '' }) };

export async function runGame(id, bot, { seconds = 180, dt = 1 / 60, drawEvery = 10 } = {}) {
  const mod = await import(new URL(`../src/games/${id}/index.js`, import.meta.url));
  const held = new Set();
  const desired = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, pressed: false, released: false, moved: false };
  const sounds = {};
  let result = null;
  let finishCalls = 0;
  const api = Object.freeze({
    W: 320, H: 180, machineId: id, palette: PAL,
    text() {}, textWidth: (t, s = 1) => (String(t).length * 4 - 1) * s,
    sprite: rows => ({ width: Math.max(...rows.map(r => r.length)), height: rows.length }),
    flipSprite: s => ({ ...s }),
    best: null,
    input: Object.freeze({
      isDown: (...c) => c.some(x => held.has(x)),
      wasPressed: (...c) => c.some(x => pressed.has(x)),
      mouse, pointerLocked: false, lockPointer() {}, unlockPointer() {},
    }),
    audio: Object.freeze({ play: n => { sounds[n] = (sounds[n] || 0) + 1; } }),
    listen() {},
    finish(r) { finishCalls++; if (result) return false; result = { ...r }; return true; },
    exitToArcade() {},
  });
  const ctl = {
    hold(code, on = true) { if (on) desired.add(code); else desired.delete(code); },
    tap(code) { pressed.add(code); },
  };
  const g = stubContext();
  const game = mod.createGame(api);
  let t = 0, frames = 0;
  while (!result && t < seconds) {
    bot(game.debug(), ctl, t);
    for (const c of desired) if (!held.has(c)) { held.add(c); pressed.add(c); }
    for (const c of [...held]) if (!desired.has(c)) held.delete(c);
    game.update(dt);
    if (frames % drawEvery === 0) game.draw(g);
    pressed.clear();
    t += dt;
    frames++;
  }
  // After finish, updates must be harmless no-ops and finish must not fire again.
  for (let i = 0; i < 30; i++) game.update(dt);
  game.draw(g);
  game.destroy?.();
  return { result, seconds: +t.toFixed(2), finishCalls, sounds, state: game.debug() };
}
