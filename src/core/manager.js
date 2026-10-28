// The arcade's control center. It runs either the hub or exactly one minigame,
// owns the pause / result / crash overlays, and tracks session progress.
// Games only ever see the api object built in makeApi() — see TEAM.md for the contract.
import { PAL } from './palette.js';
import { drawText, textWidth } from './font.js';
import { makeSprite, flipSprite } from './sprite.js';
import { createMenu, drawPanel } from './ui.js';

const TAG_LABEL = 'ESC MENU';
const OVERLAY_INPUT_DELAY = 0.25; // seconds before an overlay accepts input (avoids instant re-selection)

export function createManager({ W, H, input, audio, machines, hub }) {
  const progress = {};
  for (const m of machines) progress[m.id] = { plays: 0, wins: 0, cleared: false, best: null, last: null };
  const modules = {}; // id -> module namespace, or { error }
  const stats = { frames: 0, gameUpdates: 0, entries: 0 };
  const tag = { w: textWidth(TAG_LABEL) + 6, h: 9, y: 2 };
  tag.x = W - tag.w - 2;

  let mode = 'hub';     // 'hub' | 'game'
  let current = null;   // the running machine: { machine, session, game, finished, crashed, result, pointerWanted, listeners }
  let overlay = null;   // { kind: 'pause' | 'result' | 'crash', menu, age, message }
  let sessions = 0;

  window.addEventListener('blur', () => {
    if (mode === 'game' && current && !current.finished && !overlay) pause();
  });
  input.onPointerLockChange(locked => {
    // Esc releases pointer lock in the browser before the page sees the key; treat it as "pause".
    if (!locked && mode === 'game' && current?.pointerWanted && !current.finished && !overlay) pause();
  });

  async function preload() {
    await Promise.all(machines.map(async m => {
      try {
        const mod = await m.load();
        if (typeof mod.createGame !== 'function') throw new Error(`${m.id}/index.js must export createGame(api)`);
        modules[m.id] = mod;
      } catch (err) {
        console.error(`[arcade] machine "${m.id}" failed to load`, err);
        modules[m.id] = { error: err };
      }
    }));
  }

  function makeApi(run) {
    const alive = () => current === run;
    return Object.freeze({
      W, H,
      machineId: run.machine.id,
      palette: PAL,
      text: drawText,
      textWidth,
      sprite: makeSprite,
      flipSprite,
      best: progress[run.machine.id].best,
      input: Object.freeze({
        isDown: input.isDown,
        wasPressed: input.wasPressed,
        mouse: input.mouse,
        get pointerLocked() { return input.pointerLocked; },
        lockPointer() {
          if (!alive() || run.finished || overlay) return;
          run.pointerWanted = true;
          input.lockPointer();
        },
        unlockPointer() {
          if (!alive()) return;
          run.pointerWanted = false;
          input.unlockPointer();
        },
      }),
      audio: Object.freeze({ play: name => { if (alive()) audio.play(name); } }),
      listen(target, type, fn, options) {
        if (!alive()) return;
        target.addEventListener(type, fn, options);
        run.listeners.push([target, type, fn, options]);
      },
      finish: result => finish(run, result),
      exitToArcade() { if (alive()) exitToArcade(); },
    });
  }

  function enter(id) {
    stopCurrent();
    const machine = machines.find(m => m.id === id);
    if (!machine) throw new Error(`Unknown machine "${id}"`);
    current = { machine, session: ++sessions, game: null, finished: false, crashed: false, result: null, pointerWanted: false, listeners: [] };
    mode = 'game';
    overlay = null;
    stats.entries++;
    progress[id].plays++;
    input.setCursor('default');
    audio.play('select');
    const mod = modules[id];
    if (!mod || mod.error) {
      showCrash(mod?.error ?? new Error('Machine is still loading — try again'));
      return;
    }
    try {
      current.game = mod.createGame(makeApi(current));
    } catch (err) {
      showCrash(err);
    }
  }

  function releasePointer(run) {
    run.pointerWanted = false;
    input.unlockPointer();
  }

  function stopCurrent() {
    if (!current) return;
    const run = current;
    current = null; // first, so the old api goes inert
    releasePointer(run);
    try { run.game?.destroy?.(); } catch (err) { console.error('[arcade] destroy() failed', err); }
    for (const [target, type, fn, options] of run.listeners) target.removeEventListener(type, fn, options);
    run.listeners.length = 0;
    overlay = null;
    audio.stopAll();
    input.reset();
  }

  function exitToArcade() {
    stopCurrent();
    mode = 'hub';
    audio.play('blip');
  }

  function restart() {
    if (current) enter(current.machine.id);
  }

  function finish(run, result = {}) {
    if (current !== run || run.finished) return false;
    run.finished = true;
    const won = !!result.won;
    const score = Math.max(0, Math.floor(Number(result.score) || 0));
    const p = progress[run.machine.id];
    const newBest = p.best === null || score > p.best;
    if (newBest) p.best = score;
    p.last = score;
    if (won) { p.wins++; p.cleared = true; }
    run.result = { won, score, newBest };
    releasePointer(run);
    audio.stopAll();
    audio.play(won ? 'win' : 'lose');
    openOverlay('result');
    return true;
  }

  function pause() {
    if (!current || current.finished || overlay) return;
    openOverlay('pause');
    input.unlockPointer(); // keeps pointerWanted so resume can re-lock
    audio.stopAll();
    audio.play('pause');
  }

  function resume() {
    overlay = null;
    input.reset();
    if (current?.pointerWanted) input.lockPointer();
  }

  function showCrash(err) {
    console.error('[arcade] machine crashed', err);
    if (current) {
      current.finished = true;
      current.crashed = true;
      releasePointer(current);
    }
    audio.stopAll();
    openOverlay('crash', { message: String(err?.message ?? err).slice(0, 34) });
  }

  function openOverlay(kind, extra = {}) {
    const items = kind === 'pause'
      ? [{ id: 'resume', label: 'RESUME' }, { id: 'restart', label: 'RESTART' }, { id: 'arcade', label: 'RETURN TO ARCADE' }]
      : kind === 'result'
        ? [{ id: 'restart', label: 'PLAY AGAIN' }, { id: 'arcade', label: 'RETURN TO ARCADE' }]
        : [{ id: 'arcade', label: 'RETURN TO ARCADE' }];
    overlay = { kind, menu: createMenu(items, audio), age: 0, ...extra };
    input.reset();
  }

  function tagClicked() {
    const m = input.mouse;
    if (!m.pressed || input.pointerLocked) return false;
    const hit = m.x >= tag.x && m.x < tag.x + tag.w && m.y >= tag.y && m.y < tag.y + tag.h;
    if (hit) input.consumeMouse();
    return hit;
  }

  function update(dt) {
    stats.frames++;
    if (mode === 'hub') {
      hub.update(dt);
      return;
    }
    if (overlay) {
      overlay.age += dt;
      if (overlay.age < OVERLAY_INPUT_DELAY) return;
      if (overlay.kind === 'pause' && input.wasPressed('Escape')) { resume(); return; }
      const choice = overlay.menu.update(input);
      if (choice === 'resume') resume();
      else if (choice === 'restart') restart();
      else if (choice === 'arcade') exitToArcade();
      return;
    }
    if (input.wasPressed('Escape') || tagClicked()) {
      input.consume('Escape');
      pause();
      return;
    }
    if (!current?.game || current.finished) return;
    try {
      current.game.update(dt);
      stats.gameUpdates++;
    } catch (err) {
      showCrash(err);
    }
  }

  function draw(g) {
    g.imageSmoothingEnabled = false;
    if (mode === 'hub') {
      hub.draw(g);
      return;
    }
    g.fillStyle = PAL.black;
    g.fillRect(0, 0, W, H);
    if (current?.game && !current.crashed) {
      g.save();
      try {
        current.game.draw(g);
      } catch (err) {
        showCrash(err);
      }
      g.restore();
    }
    if (overlay) drawOverlay(g);
    else drawTag(g);
  }

  function drawTag(g) {
    const m = input.mouse;
    const hover = !input.pointerLocked && m.x >= tag.x && m.x < tag.x + tag.w && m.y >= tag.y && m.y < tag.y + tag.h;
    if (!input.pointerLocked) input.setCursor(hover ? 'pointer' : 'default');
    g.fillStyle = hover ? PAL.indigo : PAL.black;
    g.fillRect(tag.x, tag.y, tag.w, tag.h);
    drawText(g, TAG_LABEL, tag.x + 3, tag.y + 2, hover ? PAL.yellow : PAL.grey);
  }

  function drawOverlay(g) {
    const o = overlay;
    g.globalAlpha = 0.7;
    g.fillStyle = PAL.black;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    const pw = 168;
    const ph = o.kind === 'result' ? 90 : o.kind === 'crash' ? 72 : 78;
    const px = Math.round((W - pw) / 2);
    const py = Math.round((H - ph) / 2);
    drawPanel(g, px, py, pw, ph);
    let y = py + 7;
    drawText(g, current?.machine.name ?? '', W / 2, y, PAL.grey, { align: 'center' });
    y += 10;
    if (o.kind === 'pause') {
      drawText(g, 'PAUSED', W / 2, y, PAL.yellow, { scale: 2, align: 'center', shadow: PAL.black });
      y += 18;
    } else if (o.kind === 'result') {
      const r = current.result;
      drawText(g, r.won ? 'YOU WIN!' : 'GAME OVER', W / 2, y, r.won ? PAL.green : PAL.red, { scale: 2, align: 'center', shadow: PAL.black });
      y += 15;
      drawText(g, `SCORE ${r.score}`, W / 2, y, PAL.cream, { align: 'center' });
      y += 8;
      drawText(g, r.newBest ? 'NEW BEST!' : `BEST ${progress[current.machine.id].best}`, W / 2, y, r.newBest ? PAL.yellow : PAL.grey, { align: 'center' });
      y += 12;
    } else {
      drawText(g, 'OUT OF ORDER', W / 2, y, PAL.red, { scale: 2, align: 'center', shadow: PAL.black });
      y += 14;
      drawText(g, o.message, W / 2, y, PAL.grey, { align: 'center' });
      y += 12;
    }
    o.menu.draw(g, W / 2, y + 2);
  }

  return {
    preload,
    update,
    draw,
    enter,
    exitToArcade,
    /** Hub-facing status for one machine. */
    info(id) {
      return { ...progress[id], broken: !!modules[id]?.error, loading: !modules[id] };
    },
    /** Snapshot for debugging/tests (window.__arcade.manager.debug()). */
    debug() {
      return {
        mode,
        overlay: overlay?.kind ?? null,
        machine: current?.machine.id ?? null,
        session: current?.session ?? null,
        finished: current?.finished ?? null,
        listeners: current?.listeners.length ?? 0,
        pointerWanted: current?.pointerWanted ?? false,
        pointerLocked: input.pointerLocked,
        liveSounds: audio.activeCount,
        stats: { ...stats },
        progress: JSON.parse(JSON.stringify(progress)),
      };
    },
  };
}
