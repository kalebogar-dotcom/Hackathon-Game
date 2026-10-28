// Bear in the Red Woods unit checks: the real shooter modules run headless against a stub arcade api
// with a seeded RNG. Covers map, purchases, weapons, navigation, the bear's charge and the finish handoff.
// Usage: node tests/bear-unit.mjs   (also part of `npm test`)
import { createGame, tryBuy, traceShot, makeZombie, makeBear, findBuyNear, findRepairNear, windowBlocked } from '../src/games/shooter/index.js';
import { MAP, MAP_W, MAP_H, WALL_BUYS, WINDOWS, findTiles, isWallTile, isWall, isWalkableTile, createNav, insideCabin } from '../src/games/shooter/world.js';
import { WEAPONS, BEAR, BARRICADE } from '../src/games/shooter/config.js';

let seed = 12345;
Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function stubContext() {
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}

function headless() {
  const held = new Set(), pressed = new Set();
  const mouse = { x: 0, y: 0, dx: 0, dy: 0, down: false, pressed: false };
  const sounds = [];
  const finishes = [];
  const api = {
    W: 320, H: 180, best: null,
    text() {},
    sprite: rows => ({ width: Math.max(...rows.map(r => r.length)), height: rows.length }),
    input: {
      mouse, pointerLocked: false, lockPointer() {}, unlockPointer() {},
      isDown: (...c) => c.some(x => held.has(x)),
      wasPressed: (...c) => c.some(x => pressed.has(x)),
    },
    audio: { play: n => sounds.push(n) },
    finish(r) { finishes.push(r); return finishes.length === 1; },
  };
  const game = createGame(api);
  const ctx = stubContext();
  let frame = 0;
  return {
    game, sounds, finishes,
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  bear: ${name}${detail ? `  (${detail})` : ''}`);
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

// ---- title screen ----
{
  const h = headless();
  h.step(1);
  check('starts on its title screen', h.game.mode === 'title' && h.game.debug().mode === 'title');
  h.tap('Enter'); h.step(0.05);
  check('Enter starts a run', h.game.mode === 'play' && h.game.debug().player.health === 100);
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
  check('debug() reports the bear for the health bar', h.game.debug().bear?.maxHp === BEAR.hp);
}

// ---- barricades: map, collision, navigation ----
const north = () => WINDOWS.find(w => w.axis === 'x');
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  check('two barricaded windows, both start full', WINDOWS.length === 2 && w.barricades.every(b => b.boards === BARRICADE.boards));
  const nav = createNav();
  nav.update(12.5, 7.5);
  check('window tiles stay on the nav graph', WINDOWS.every(win => isWalkableTile(win.x, win.y) && nav.distanceAt(win.x, win.y) > 0));
  const b = w.barricades[0];
  const solidWithBoards = isWall(b.cx, b.cy);
  b.boards = 0;
  check('boards block bodies; an empty window does not', solidWithBoards && !isWall(b.cx, b.cy));
  check('shots pass through boards (rays ignore barricades)', !isWallTile(b.x, b.y));
}

// ---- barricades: a zombie tears in through the north window ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  const win = north();
  const b = w.barricades.find(x => x.x === win.x && x.y === win.y);
  Object.assign(w.player, { x: win.cx, y: win.cy + 2.6, god: true }); // inside the cabin, beyond attack reach of the window
  const z = makeZombie(win.cx, win.cy - 2.5, 0);
  w.enemies.push(z);
  const boardLog = [];
  let throughBoards = false, inWall = false, enteredAt = -1, firstTearAt = -1;
  h.step(25, () => {
    if (boardLog.at(-1) !== b.boards) boardLog.push(b.boards);
    if (firstTearAt < 0 && b.boards < BARRICADE.boards) firstTearAt = w.time;
    if (b.boards > 0 && Math.floor(z.x) === b.x && Math.floor(z.y) === b.y) throughBoards = true;
    if (wallAt(z)) inWall = true;
    if (enteredAt < 0 && insideCabin(z.x, z.y)) enteredAt = w.time;
  });
  check('zombie tears boards off one at a time', boardLog.join(',') === '5,4,3,2,1,0', boardLog.join(','));
  check('zombie never occupies a boarded window', !throughBoards);
  check('zombie never enters a wall tile', !inWall);
  check('zombie gets in only after the last board', enteredAt > 0 && enteredAt >= firstTearAt + (BARRICADE.boards - 1) * BARRICADE.breakEvery - 0.1,
    `first tear ${firstTearAt.toFixed(1)}s, inside ${enteredAt.toFixed(1)}s`);
  check('tearing plays the board-break sound', h.sounds.filter(s => s === 'boardBreak').length === BARRICADE.boards);
}

// ---- barricades: holding E repairs one board at a time, with a capped reward ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  const win = north();
  const b = w.barricades.find(x => x.x === win.x && x.y === win.y);
  Object.assign(w.player, { x: win.cx, y: win.cy + 0.95 });
  b.boards = 2;
  check('repair target found inside range, gun not in range', findRepairNear(w) === b && !findBuyNear(w.player));
  h.tap('KeyE'); h.hold('KeyE');
  h.step(BARRICADE.repairTime * 0.5);
  check('half a repair adds no board yet', b.boards === 2 && w.repair.progress > 0.4);
  h.step(BARRICADE.repairTime * 0.55);
  check('one board after repairTime, +repairPoints', b.boards === 3 && w.points === BARRICADE.repairPoints, `boards=${b.boards} pts=${w.points}`);
  h.step(BARRICADE.repairTime * 4);
  check('holding keeps repairing up to full, then stops', b.boards === BARRICADE.boards && w.repairs === 3);
  h.hold('KeyE', false); h.step(0.1);

  b.boards = 0; b.rewarded = 0; w.points = 0;
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 5.5); h.hold('KeyE', false); h.step(0.1);
  b.boards = 0;
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 5.5); h.hold('KeyE', false); h.step(0.1);
  check('reward capped per window per wave', b.boards === BARRICADE.boards && w.points === BARRICADE.rewardCapPerWave, `pts=${w.points}`);

  // releasing E mid-board loses that board's progress
  b.boards = 3;
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 0.6); h.hold('KeyE', false); h.step(0.05);
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 0.6); h.hold('KeyE', false); h.step(0.05);
  check('releasing E cancels the board in progress', b.boards === 3);

  // the cap resets when the next wave starts
  w.director = true; w.phase = 'intermission'; w.phaseTime = 0.01;
  h.step(0.05);
  check('repair reward cap resets when a wave starts', b.rewarded === 0 && w.wave === 0);
}

// ---- barricades: E needs a fresh press at the window; wall guns win when both are in range ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  const win = north();
  const b = w.barricades.find(x => x.x === win.x && x.y === win.y);
  b.boards = 1;
  Object.assign(w.player, { x: 12.5, y: 8.5 }); // inside, near nothing
  h.tap('KeyE'); h.hold('KeyE'); h.step(0.1);
  Object.assign(w.player, { x: win.cx, y: win.cy + 0.95 }); // walk up while still holding
  h.step(BARRICADE.repairTime * 2);
  check('an E held from elsewhere does not start a repair', b.boards === 1);
  h.hold('KeyE', false); h.step(0.05);

  const smg = WALL_BUYS.find(x => x.weapon === 'smg');
  Object.assign(w.player, { x: 12.5, y: 5.1 });
  check('test spot is in range of both the SMG and the window', findBuyNear(w.player) === smg && Math.hypot(12.5 - b.cx, 5.1 - b.cy) <= BARRICADE.repairRange);
  w.points = 1000; b.boards = 2;
  const pts0 = w.points;
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 3); h.hold('KeyE', false); h.step(0.05);
  check('one E press at both buys the gun and repairs nothing', w.player.owned.has('smg') && w.points === pts0 - WEAPONS.smg.price && b.boards === 2 && w.repairs === 0,
    `owned=${[...w.player.owned]} pts=${w.points} boards=${b.boards}`);

  // a body standing in an empty opening blocks the repair
  b.boards = 0;
  Object.assign(w.player, { x: b.cx, y: b.cy });
  h.tap('KeyE'); h.hold('KeyE'); h.step(BARRICADE.repairTime * 2); h.hold('KeyE', false); h.step(0.05);
  check('cannot board up a window someone is standing in', b.boards === 0 && windowBlocked(w, b));
}

// ---- barricades: two zombies at one window do not jam (regression: found by the god-mode run) ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  for (const b of w.barricades) b.boards = 0;
  Object.assign(w.player, { x: 15.76, y: 5.22, god: true });
  const zs = [makeZombie(17.28, 7.22, 0), makeZombie(17.28, 7.78, 0)];
  w.enemies.push(...zs);
  let bothInAt = -1;
  h.step(12, () => { if (bothInAt < 0 && zs.every(z => insideCabin(z.x, z.y))) bothInAt = w.time; });
  check('two zombies side by side at a window both get through', bothInAt > 0, bothInAt > 0 ? `${bothInAt.toFixed(1)}s` : zs.map(z => `${z.x.toFixed(2)},${z.y.toFixed(2)}`).join(' '));
}

// ---- barricades: the bear smashes a whole window ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.director = false;
  const win = north();
  const b = w.barricades.find(x => x.x === win.x && x.y === win.y);
  Object.assign(w.player, { x: win.cx, y: win.cy + 1.5, god: true });
  const bear = makeBear(win.cx, win.cy - 2.2);
  bear.cooldown = 99; // no charge: test the walk-up smash
  w.enemies.push(bear); w.bear = bear;
  let tornAt = -1;
  h.step(10, () => { if (tornAt < 0 && b.boards === 0) tornAt = w.time; });
  check('bear smashes every board at once', tornAt > 0 && w.boardsTorn === BARRICADE.boards, `torn=${w.boardsTorn}`);
}

// ---- full run with god mode: win, then the arcade handoff ----
{
  const h = headless();
  h.game.start();
  const w = h.game.world;
  w.player.god = true;
  const shotgun = WALL_BUYS.find(b => b.weapon === 'shotgun'), smg = WALL_BUYS.find(b => b.weapon === 'smg');
  let bearSeen = false, wonAt = -1;
  h.hold('Space');
  h.step(400, () => {
    if (h.game.mode === 'won' && wonAt < 0) wonAt = w.time;
    if (h.game.mode !== 'play') return;
    const p = w.player;
    if (w.bear) bearSeen = true;
    const want = !p.owned.has('shotgun') && w.points >= 400 ? shotgun : p.owned.has('shotgun') && !p.owned.has('smg') && w.points >= 750 ? smg : null;
    if (want) { Object.assign(p, { x: want.fx, y: want.fy + 0.4 }); h.tap('KeyE'); return; }
    const target = w.enemies.reduce((a, e) => (!a || Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? e : a), null);
    if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    if (p.weapon !== 'smg' && Math.random() < 0.3) h.tap('Space');
  });
  h.hold('Space', false);
  check('god-mode run reaches the win card', h.game.mode === 'won', `mode=${h.game.mode} wave=${w.wave + 1}` +
    (h.game.mode === 'won' ? '' : ` left=${JSON.stringify(w.enemies.map(e => ({ k: e.kind, x: +e.x.toFixed(2), y: +e.y.toFixed(2), s: e.state, tear: e.tearTimer })))} boards=${w.barricades.map(b => b.boards)} player=${w.player.x.toFixed(2)},${w.player.y.toFixed(2)}`));
  check('bought both wall guns', w.purchases.join(',') === 'shotgun,smg', w.purchases.join(','));
  check('the bear appeared in wave 3', bearSeen);
  check('all 24 zombies and the bear died', w.kills === 25, `kills=${w.kills}`);
  check('finish({ won: true, score }) called exactly once after the card',
    h.finishes.length === 1 && h.finishes[0].won === true && h.finishes[0].score === w.earned, JSON.stringify(h.finishes));
}

// ---- loss hands over to the arcade; a new instance is clean ----
{
  const h = headless();
  h.game.start();
  for (let i = 0; i < 240 * 60 && h.game.mode === 'play'; i++) h.step(1 / 60);
  check('idle player dies', h.game.mode === 'lost', `t=${h.game.world.time.toFixed(0)}s`);
  h.step(0.5);
  check('lose card shows before the result menu', h.finishes.length === 0);
  h.step(2);
  check('finish({ won: false }) called exactly once', h.finishes.length === 1 && h.finishes[0].won === false, JSON.stringify(h.finishes));
  const fresh = headless();
  fresh.game.start();
  const d = fresh.game.debug();
  check('a new instance starts clean', d.points === 0 && d.wave === 0 && d.player.health === 100 && d.enemies.length === 0 && d.player.weapon === 'pistol');
}

console.log(failed ? `\n${failed} bear check(s) failed` : '\nAll bear checks passed');
process.exitCode = failed ? 1 : 0;
