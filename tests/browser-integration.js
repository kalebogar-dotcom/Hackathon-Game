// In-browser integration test. With the game open (pane visible), run in the console:
//   (await import('/tests/browser-integration.js')).run().then(console.table)
// It drives the real page with synthetic key/mouse events and checks the arcade's debug() state.
// Real (trusted) input during the run is counted so a run disturbed by a person can be spotted.
import { shooterTurret, platformerRunner, rpgQuester } from './bots.js';

export async function run() {
  const A = window.__arcade;
  const M = A.manager;
  const canvas = document.getElementById('screen');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code }));
  const tap = async (code, gap = 60) => { key(code); await sleep(40); key(code, 'keyup'); await sleep(gap); };
  const D = () => M.debug();
  const out = [];
  let userEvents = 0;
  const spy = e => { if (e.isTrusted) userEvents++; };
  const check = (name, ok, extra) => out.push({ check: name, result: ok ? 'PASS' : 'FAIL', userInput: userEvents, ...(ok || extra === undefined ? {} : { detail: JSON.stringify(extra) }) });
  const waitFor = async (pred, ms = 40000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (pred(D())) return true; await sleep(30); }
    return false;
  };
  const click = async (gx, gy) => {
    const r = canvas.getBoundingClientRect();
    const o = { clientX: r.left + (gx * r.width) / 320, clientY: r.top + (gy * r.height) / 180, button: 0, bubbles: true };
    canvas.dispatchEvent(new MouseEvent('mousedown', o));
    await sleep(40);
    window.dispatchEvent(new MouseEvent('mouseup', o));
    await sleep(60);
  };
  const toHubViaPause = async () => { await tap('Escape', 350); await tap('ArrowDown'); await tap('ArrowDown'); await tap('Enter', 150); };
  const hubClean = label => {
    const d = D();
    check(`${label}: back in hub clean`, d.mode === 'hub' && d.listeners === 0 && d.liveSounds === 0 && !d.pointerLocked && !A.input.isDown('KeyW', 'ArrowRight', 'Space'),
      { mode: d.mode, listeners: d.listeners, liveSounds: d.liveSounds });
  };
  // Drive a bot with real key events until the machine shows a result (or times out).
  async function playUntilResult(bot, ms = 60000) {
    const held = new Set();
    const desired = new Set();
    const ctl = {
      hold(code, on = true) { if (on) desired.add(code); else desired.delete(code); },
      tap(code) { key(code); setTimeout(() => { if (!desired.has(code)) key(code, 'keyup'); }, 30); },
    };
    const t0 = performance.now();
    while (D().mode === 'game' && D().overlay === null && performance.now() - t0 < ms) {
      bot(D().game, ctl, (performance.now() - t0) / 1000);
      for (const c of desired) if (!held.has(c)) { held.add(c); key(c); }
      for (const c of [...held]) if (!desired.has(c)) { held.delete(c); key(c, 'keyup'); }
      await sleep(16);
    }
    for (const c of held) key(c, 'keyup');
    await sleep(100);
  }

  ['keydown', 'mousedown'].forEach(t => window.addEventListener(t, spy, true));
  try {
    if (D().mode !== 'hub') M.exitToArcade();
    await sleep(300);
    canvas.focus();
    check('starts in hub', D().mode === 'hub');

    // GHOUL SHIFT: key entry, pause/resume, real loss, play again, exit via pause menu
    const e0 = D().stats.entries;
    await tap('Digit1', 200);
    check('shooter: entered by key 1', D().machine === 'shooter' && D().stats.entries === e0 + 1 && D().listeners === 0);
    key('KeyW');
    await sleep(300);
    await tap('Escape', 100);
    let p = D();
    check('shooter: Esc pauses and clears held keys', p.overlay === 'pause' && !A.input.isDown('KeyW'), { overlay: p.overlay });
    key('KeyW', 'keyup');
    const u0 = D().stats.gameUpdates;
    await sleep(400);
    check('shooter: updates frozen while paused', D().stats.gameUpdates === u0);
    await tap('Escape', 200);
    check('shooter: Esc resumes', D().overlay === null && D().stats.gameUpdates > u0);
    check('shooter: idle player loses', await waitFor(d => d.overlay === 'result', 40000));
    p = D();
    check('shooter: loss recorded once', p.finished && p.progress.shooter.wins === 0 && p.progress.shooter.best !== null && !p.pointerLocked, p.progress.shooter);
    const session = p.session;
    await sleep(300);
    await tap('Enter', 300);
    p = D();
    check('shooter: play again is fresh', p.session === session + 1 && p.overlay === null && p.game?.kills === 0 && p.game?.player.health === 100 && p.game?.ghouls.length === 0,
      { session: p.session, kills: p.game?.kills });
    await toHubViaPause();
    hubClean('shooter');

    // PEBBLE JUMP: mouse entry, real win, play again, ESC MENU tag, exit
    await click(160, 88);
    check('platformer: entered by mouse click', D().machine === 'platformer');
    await playUntilResult(platformerRunner());
    p = D();
    check('platformer: bot reaches the flag', p.overlay === 'result' && p.progress.platformer.cleared, p.progress.platformer);
    await sleep(300);
    await tap('Enter', 300);
    p = D();
    check('platformer: play again is fresh', p.overlay === null && p.game?.coins === 0 && p.game?.lives === 3 && Math.round(p.game?.player.x) === 21, p.game);
    await click(299, 6);
    check('platformer: ESC MENU tag pauses', D().overlay === 'pause');
    await sleep(300);
    await tap('ArrowDown');
    await tap('ArrowDown');
    await tap('Enter', 150);
    hubClean('platformer');

    // EMBER TALE: key entry, full quest, return from result screen, re-enter fresh
    await tap('Digit3', 200);
    check('rpg: entered by key 3', D().machine === 'rpg' && D().game?.quest === 'talk');
    await playUntilResult(rpgQuester({ heal: true }));
    p = D();
    check('rpg: quest completed', p.overlay === 'result' && p.progress.rpg.cleared, p.progress.rpg);
    await sleep(300);
    await tap('ArrowDown');
    await tap('Enter', 200);
    hubClean('rpg (from result screen)');
    await tap('Digit3', 200);
    p = D();
    check('rpg: re-entry after win is fresh', p.game?.quest === 'talk' && p.game?.mode === 'explore' && p.game?.slime === null, { quest: p.game?.quest });
    await toHubViaPause();

    // GHOUL SHIFT win in the real page
    await tap('Digit1', 200);
    await playUntilResult(shooterTurret(), 70000);
    p = D();
    check('shooter: turret bot wins in the page', p.overlay === 'result' && p.progress.shooter.cleared, p.progress.shooter);
    await sleep(300);
    await tap('ArrowDown');
    await tap('Enter', 200);

    // Rapid switching: no duplicate loops, no leaks
    for (let i = 0; i < 3; i++) for (const k of ['Digit1', 'Digit2', 'Digit3']) { await tap(k, 120); await toHubViaPause(); }
    hubClean('after 9 rapid switches');
    const f0 = D().stats.frames;
    await sleep(1000);
    const fps = D().stats.frames - f0;
    check('single loop: ~60 updates/sec after switching', fps > 40 && fps < 75, { fps });
    p = D();
    check('hub shows progress for all three', p.progress.shooter.cleared && p.progress.platformer.cleared && p.progress.rpg.cleared, p.progress);
  } catch (err) {
    check('no exceptions', false, String(err.stack || err));
  } finally {
    ['keydown', 'mousedown'].forEach(t => window.removeEventListener(t, spy, true));
  }
  return out;
}
