// Headless tests: run the real game modules in Node with stub canvas/input/audio and a seeded RNG.
// Usage: npm test   (from bear-in-the-red-woods/)
import { buildArt } from '../src/art.js';
import { createGame, tryBuy, traceShot, makeZombie, makeBear } from '../src/game.js';
import { MAP, MAP_W, MAP_H, WALL_BUYS, findTiles, isWallTile, isWalkableTile, createNav, insideCabin } from '../src/world.js';
import { WEAPONS, BEAR } from '../src/config.js';

let seed = 12345;
Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function stubContext() {
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
const stubCanvas = (w, h) => ({ width: w, height: h, getContext: () => stubContext() });
const art = buildArt(stubCanvas);

function headless() {
  const held = new Set(), pressed = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, pressed: false };
  const sounds = [];
  const input = {
    mouse, pointerLocked: false,
    isDown: (...c) => c.some(x => held.has(x)),
    wasPressed: (...c) => c.some(x => pressed.has(x)),
    consumeMouse() { mouse.pressed = false; }, lockPointer() {}, unlockPointer() {},
  };
  const audio = { muted: false, play: n => sounds.push(n), toggleMute() { this.muted = !this.muted; return this.muted; } };
  const game = createGame({ input, audio, art });
  const ctx = stubContext();
  let frame = 0;
  return {
    game, sounds, audio,
    tap(code) { pressed.add(code); },
    hold(code, on = true) { if (on) held.add(code); else held.delete(code); },
    step(seconds, each) {
      for (let t = 0; t < seconds; t += 1 / 60) {
        each?.();
        game.update(1 / 60);
        if (frame++ % 15 === 0) game.draw(ctx);
        pressed.clear();
      }
    },
  };
}

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
}
const wallAt = e => isWallTile(Math.floor(e.x), Math.floor(e.y));

// ---- map ----
check('map is rectangular with a solid border', MAP.every(r => r.length === MAP_W) &&
  [...MAP[0], ...MAP[MAP_H - 1]].every(c => c === 'F') && MAP.every(r => r[0] === 'F' && r[MAP_W - 1] === 'F'));
{
  const nav = createNav();
  const p = findTiles('P')[0];
  nav.update(p.x + 0.5, p.y + 0.5);
  const spawnsOk = findTiles('S').every(s => nav.distanceAt(s.x, s.y) > 0);
  let cabinOk = true;
  for (let y = 5; y <= 9; y++) for (let x = 8; x <= 15; x++) if (isWalkableTile(x, y) && nav.distanceAt(x, y) < 0) cabinOk = false;
  check('every spawn and cabin tile is reachable', spawnsOk && cabinOk);
  check('wall-gun faces open onto walkable tiles', WALL_BUYS.every(b => isWalkableTile(Math.floor(b.fx), Math.floor(b.fy + 0.01))));
}

// ---- purchases ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  const shotgun = WALL_BUYS.find(b => b.weapon === 'shotgun'), smg = WALL_BUYS.find(b => b.weapon === 'smg');
  const r1 = tryBuy(w, shotgun);
  check('buy fails without points and deducts nothing', !r1.ok && w.points === 0 && w.player.weapon === 'pistol');
  w.points = 450;
  const r2 = tryBuy(w, shotgun);
  check('buy succeeds, deducts price, equips', r2.ok && w.points === 50 && w.player.weapon === 'shotgun');
  tryBuy(w, shotgun);
  check('rebuying an owned gun costs nothing', w.points === 50);
  w.points = 749;
  check('SMG at 749 fails', !tryBuy(w, smg).ok && w.points === 749 && w.player.weapon === 'shotgun');
  w.points = 750;
  check('SMG at 750 succeeds', tryBuy(w, smg).ok && w.points === 0 && w.player.weapon === 'smg');

  // E key near the shotgun's wall face
  const h2 = headless();
  h2.game.start();
  const w2 = h2.game.world;
  w2.director = false;
  Object.assign(w2.player, { x: shotgun.fx, y: shotgun.fy + 0.4 });
  h2.tap('KeyE'); h2.step(0.05);
  check('E with too few points plays deny', h2.sounds.includes('deny') && w2.points === 0);
  w2.points = 400;
  h2.tap('KeyE'); h2.step(0.05);
  check('E with enough points buys the shotgun', w2.player.weapon === 'shotgun' && w2.points === 0 && h2.sounds.includes('buy'));
}

// ---- weapons ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  const p = w.player;
  const z = makeZombie(p.x, p.y - 2, 0);
  w.enemies.push(z);
  const shot = traceShot(w, WEAPONS.shotgun);
  check('shotgun fires 7 pellets', shot.hits.length + shot.impacts.length === 7, `${shot.hits.length} hit`);
  check('close shotgun blast kills a wave-1 zombie', shot.hits.reduce((s, x) => s + x.damage, 0) >= z.hp);
  w.enemies = [];
  h.tap('Space'); h.hold('Space'); h.step(1); h.hold('Space', false);
  const pistolShots = h.sounds.filter(s => s === 'pistol').length;
  p.owned.add('smg'); h.tap('Digit3'); h.step(0.3);
  h.hold('Space'); h.step(1); h.hold('Space', false);
  const smgShots = h.sounds.filter(s => s === 'smg').length;
  check('pistol is semi-auto (holding fires once)', pistolShots === 1, `${pistolShots}`);
  check('SMG is full-auto (~11 shots per second held)', smgShots >= 9 && smgShots <= 13, `${smgShots}`);
}

// ---- navigation: zombie walks around walls into the cabin ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  Object.assign(w.player, { x: 12.5, y: 7.5, god: true });
  const z = makeZombie(3.5, 17.5, 0);
  w.enemies.push(z);
  let inWall = false, reachedAt = -1;
  h.step(30, () => {
    if (wallAt(z)) inWall = true;
    if (reachedAt < 0 && Math.hypot(z.x - w.player.x, z.y - w.player.y) < 1) reachedAt = w.time;
  });
  check('zombie never enters a wall tile', !inWall);
  check('zombie reaches the player inside the cabin', reachedAt > 0 && insideCabin(z.x, z.y), reachedAt > 0 ? `${reachedAt.toFixed(1)}s` : 'never');
}

// ---- bear: telegraphed charge with a cooldown ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  // Row 11 is open from wall to wall: the player kites the bear along it.
  Object.assign(w.player, { x: 3.5, y: 11.5, god: true });
  const b = makeBear(19.5, 11.5);
  w.enemies.push(b);
  w.bear = b;
  const log = [];
  let prev = b.state, inWall = false;
  h.step(30, () => {
    if (b.state !== prev) { log.push({ s: b.state, t: w.time }); prev = b.state; }
    if (wallAt(b)) inWall = true;
    const p = w.player;
    // dodge each charge after the aim locks; keep out of swipe range while it walks
    if (b.state === 'windup' && b.timer < BEAR.lockAt) p.y = 13.5;
    if (b.state === 'walk' && Math.hypot(b.x - p.x, b.y - p.y) < 3) Object.assign(p, { x: b.x > 11.5 ? 2.5 : 21.5, y: 11.5 });
  });
  const charges = log.filter(e => e.s === 'charge');
  const telegraphed = log.every((e, i) => e.s !== 'charge' || log[i - 1]?.s === 'windup');
  const gaps = charges.slice(1).map((c, i) => c.t - charges[i].t);
  check('bear charges at least twice in 30 s', charges.length >= 2, `${charges.length}`);
  check('every charge is preceded by a windup', telegraphed);
  check('charges respect the cooldown', gaps.every(g => g >= BEAR.cooldown + BEAR.windup - 0.05), gaps.map(g => g.toFixed(1)).join(', '));
  check('bear never enters a wall tile', !inWall);
}

// ---- full run: bot aims at the nearest enemy, buys guns, wins ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.player.god = true;
  const shotgun = WALL_BUYS.find(b => b.weapon === 'shotgun'), smg = WALL_BUYS.find(b => b.weapon === 'smg');
  let bearSeen = false;
  h.hold('Space');
  h.step(400, () => {
    if (h.game.mode !== 'play') return;
    const p = w.player;
    if (w.bear) bearSeen = true;
    const want = !p.owned.has('shotgun') && w.points >= 400 ? shotgun : p.owned.has('shotgun') && !p.owned.has('smg') && w.points >= 750 ? smg : null;
    if (want) { Object.assign(p, { x: want.fx, y: want.fy + 0.4 }); h.tap('KeyE'); return; }
    const target = w.enemies.reduce((a, e) => (!a || Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? e : a), null);
    if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    // SMG is auto; semi guns need fresh presses
    if (p.weapon !== 'smg' && Math.random() < 0.3) h.tap('Space');
  });
  h.hold('Space', false);
  check('bot run reaches the win screen', h.game.mode === 'won', `mode=${h.game.mode} wave=${w.wave + 1} t=${w.time.toFixed(0)}s`);
  check('bot bought both wall guns', w.purchases.join(',') === 'shotgun,smg', w.purchases.join(','));
  check('the bear appeared in wave 3', bearSeen);
  check('score counts earned points', w.earned > 0 && w.kills === 24 + 1, `earned=${w.earned} kills=${w.kills}`);
}

// ---- lose, restart, pause, mute ----
{
  const h = headless();
  h.game.start();
  for (let i = 0; i < 240 * 60 && h.game.mode === 'play'; i++) h.step(1 / 60);
  check('idle player eventually dies', h.game.mode === 'lost', `t=${h.game.world.time.toFixed(0)}s`);
  h.tap('Enter'); h.step(0.1);
  check('lose screen ignores input for the first second', h.game.mode === 'lost');
  h.step(1); h.tap('Enter'); h.step(0.05);
  const w = h.game.world;
  check('restart gives a fresh run', h.game.mode === 'play' && w.points === 0 && w.wave === -1 && w.player.health === 100);
  h.tap('Escape'); h.step(0.05);
  const t = w.time;
  h.step(1);
  check('Esc pauses and time stops', h.game.mode === 'paused' && w.time === t);
  h.tap('Enter'); h.step(0.05);
  check('Enter resumes', h.game.mode === 'play');
  h.tap('KeyM'); h.step(0.05);
  check('M mutes', h.audio.muted === true);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
