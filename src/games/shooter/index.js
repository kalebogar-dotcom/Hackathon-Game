// BEAR IN THE RED WOODS — first-person zombie survival with a bear boss (the arcade's shooter machine).
// Gameplay: title screen, player, weapons, wall buys, zombies, the bear and the wave director.
// Everything shared comes in through the arcade `api`; pause, mute and Play Again belong to the arcade.
import {
  PLAYER, WEAPONS, WEAPON_ORDER, BUY_RANGE, SCORE, ZOMBIE, BEAR, WAVES, MAX_ALIVE, INTERMISSION, BARRICADE, BEAR_WARNING, MISSION,
} from './config.js';
import { findTiles, WALL_BUYS, WINDOWS, LITTER, moveCircle, castRay, trunkHit, segmentClear, createNav, setBoardedCheck } from './world.js';
import { useText, drawFrame, drawTitle, drawEnd, quizOptionRects } from './render.js';
import { buildArt } from './sprites.js';

const START = findTiles('P')[0];
const SPAWNS = findTiles('S');
const END_CARD = 1.6; // seconds the win/lose card shows before the arcade's result menu

// Pixel art is immutable, so it is built once per sprite factory and shared by every run.
let artCache = null;
function getArt(sprite) {
  if (artCache?.sprite !== sprite) artCache = { sprite, art: buildArt(sprite) };
  return artCache.art;
}

// ---------- pure helpers (exported for tests) ----------

export function damageFactor(w, dist) {
  const [near, far] = w.falloff;
  if (dist <= near) return 1;
  if (dist >= far) return w.minFactor;
  return 1 - ((1 - w.minFactor) * (dist - near)) / (far - near);
}

/** Trace one trigger pull: each pellet hits the nearest enemy in front of the first wall or trunk. */
export function traceShot(world, weapon, rand = Math.random) {
  const p = world.player;
  const hits = [], impacts = [];
  for (let i = 0; i < weapon.pellets; i++) {
    const a = p.angle + (rand() * 2 - 1) * weapon.spread;
    const dx = Math.cos(a), dy = Math.sin(a);
    const wall = Math.min(castRay(p.x, p.y, dx, dy), trunkHit(p.x, p.y, dx, dy));
    let best = null, bestT = wall;
    for (const e of world.enemies) {
      if (e.dead) continue;
      const ox = e.x - p.x, oy = e.y - p.y, t = ox * dx + oy * dy;
      if (t <= 0 || t >= bestT) continue;
      if (Math.abs(ox * dy - oy * dx) <= e.hitRadius) { best = e; bestT = t; }
    }
    if (best) hits.push({ enemy: best, damage: weapon.damage * damageFactor(weapon, bestT), x: p.x + dx * bestT, y: p.y + dy * bestT });
    else impacts.push({ x: p.x + dx * (wall - 0.05), y: p.y + dy * (wall - 0.05) });
  }
  return { hits, impacts };
}

export function findBuyNear(player) {
  return WALL_BUYS.find(b => Math.hypot(player.x - b.fx, player.y - b.fy) <= BUY_RANGE) ?? null;
}

/** The nearest window within repair range of the player, or null. */
export function findRepairNear(world) {
  const p = world.player;
  let best = null, bestD = BARRICADE.repairRange;
  for (const b of world.barricades) {
    const d = Math.hypot(p.x - b.cx, p.y - b.cy);
    if (d <= bestD) { best = b; bestD = d; }
  }
  return best;
}

// ---------- the creek mission ----------

// waiting -> pending (wave-cleared banner) -> cleanup -> explain -> quiz -> answered -> done; N skips from any active state.
const MISSION_ACTIVE = new Set(['pending', 'cleanup', 'explain', 'quiz', 'answered']);
export const QUIZ_ANSWERS = Object.freeze({ A: false, B: true, C: false }); // B: covered bin away from the creek

export function newMission() {
  return { state: 'waiting', time: 0, collected: [], cleanupRewarded: false, answers: [], feedback: null, correct: false, lessonRewarded: false, bonus: 0 };
}
export const missionActive = world => MISSION_ACTIVE.has(world.mission.state);
const missionModal = world => world.mission.state === 'quiz' || world.mission.state === 'answered';

/** The nearest uncollected piece of litter in pickup range, only while the cleanup is on. */
export function findLitterNear(world) {
  if (world.mission.state !== 'cleanup') return null;
  const p = world.player;
  let best = null, bestD = MISSION.pickupRange;
  for (const l of LITTER) {
    if (world.mission.collected.includes(l.id)) continue;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d <= bestD) { best = l; bestD = d; }
  }
  return best;
}

/** True when a new board would trap someone standing in an empty window opening. */
export function windowBlocked(world, b) {
  if (b.boards > 0) return false; // nobody can stand inside a boarded opening
  const inside = e => Math.abs(e.x - b.cx) < 0.5 + e.radius && Math.abs(e.y - b.cy) < 0.5 + e.radius;
  return inside(world.player) || world.enemies.some(e => !e.dead && inside(e));
}

/** Buy (or re-equip) a wall gun. Points are deducted only when the purchase succeeds. */
export function tryBuy(world, buy) {
  const p = world.player, w = WEAPONS[buy.weapon];
  if (p.owned.has(w.id)) {
    const changed = p.weapon !== w.id;
    if (changed) equip(p, w.id);
    return { ok: true, reason: changed ? 'equipped' : 'owned' };
  }
  if (world.points < w.price) return { ok: false, reason: 'points' };
  world.points -= w.price;
  p.owned.add(w.id);
  equip(p, w.id);
  return { ok: true, reason: 'bought' };
}

function equip(p, id) {
  p.weapon = id;
  p.cooldown = 0.25;
  p.raise = 1;
}

export function makeZombie(x, y, wave) {
  return {
    kind: 'zombie', x, y, radius: ZOMBIE.radius, hitRadius: ZOMBIE.hitRadius,
    hp: ZOMBIE.hp[wave], maxHp: ZOMBIE.hp[wave], speed: ZOMBIE.speed[wave] * (0.9 + Math.random() * 0.2),
    attackTimer: ZOMBIE.windup, tearTimer: BARRICADE.breakEvery, swipe: 0, flash: 0, anim: Math.random() * 4, groan: 2 + Math.random() * 5, dead: false,
  };
}

export function makeBear(x, y) {
  return {
    kind: 'bear', x, y, radius: BEAR.radius, hitRadius: BEAR.hitRadius, hp: BEAR.hp, maxHp: BEAR.hp,
    state: 'walk', timer: 0, cooldown: BEAR.firstCharge, swipeTimer: BEAR.swipeWindup, swipe: 0,
    dirX: 0, dirY: 0, hitPlayer: false, flash: 0, anim: 0, charges: 0, dead: false,
  };
}

// ---------- barricades ----------

/** The first boarded window on the straight line from (ax, ay) to (bx, by), or null. */
function boardedAlong(world, ax, ay, bx, by) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.1));
  for (let i = 1; i <= n; i++) {
    const b = world.boardedAt(Math.floor(ax + ((bx - ax) * i) / n), Math.floor(ay + ((by - ay) * i) / n));
    if (b) return b;
  }
  return null;
}

/** Where an enemy on the (x, y) side of a window stands to tear at it. */
function approachPoint(b, x, y) {
  return b.axis === 'x'
    ? { x: b.cx, y: b.cy + (y < b.cy ? -0.8 : 0.8) }
    : { x: b.cx + (x < b.cx ? -0.8 : 0.8), y: b.cy };
}

function tearBoards(world, b, count) {
  const torn = Math.min(count, b.boards);
  if (!torn) return;
  b.boards -= torn;
  world.boardsTorn += torn;
  world.audio.play('boardBreak');
  world.burst(b.cx, b.cy, 0.5, ['#a8754a', '#6e4128'], 5 * torn, 1.2);
}

// ---------- enemies ----------

/** Clear for the whole body, not just its center: both edges of the swept path miss walls and trunks. */
function wideClear(e, p) {
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  const ox = (-dy / d) * e.radius, oy = (dx / d) * e.radius;
  return segmentClear(e.x + ox, e.y + oy, p.x + ox, p.y + oy) && segmentClear(e.x - ox, e.y - oy, p.x - ox, p.y - oy);
}

function chaseTarget(e, world) {
  const p = world.player;
  // Close by, walk straight at the player only if the body fits; otherwise follow the path grid (no corner scraping).
  if (Math.hypot(p.x - e.x, p.y - e.y) < 2.2 && wideClear(e, p)) return p;
  return world.nav.waypoint(e.x, e.y) ?? p;
}

function steer(e, tx, ty, step) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 1e-4) return;
  const s = Math.min(d, step);
  moveCircle(e, (dx / d) * s, (dy / d) * s, e.radius);
}

function updateZombie(z, world, dt) {
  const p = world.player;
  z.flash = Math.max(0, z.flash - dt);
  z.swipe = Math.max(0, z.swipe - dt);
  const d = Math.hypot(p.x - z.x, p.y - z.y);
  if (d <= ZOMBIE.reach + p.radius) {
    z.attackTimer -= dt;
    if (z.attackTimer <= 0) {
      z.attackTimer = ZOMBIE.attackEvery;
      z.swipe = 0.25;
      world.hurtPlayer(ZOMBIE.damage);
    }
  } else {
    z.attackTimer = ZOMBIE.windup;
    const t = chaseTarget(z, world);
    const b = boardedAlong(world, z.x, z.y, t.x, t.y);
    if (b && Math.hypot(b.cx - z.x, b.cy - z.y) <= BARRICADE.breakReach) {
      // At a boarded window: stand and tear off one board every breakEvery seconds.
      z.tearTimer -= dt;
      if (z.tearTimer <= 0) {
        z.tearTimer = BARRICADE.breakEvery;
        z.swipe = 0.25;
        tearBoards(world, b, 1);
      }
    } else {
      z.tearTimer = BARRICADE.breakEvery;
      const goal = b ? approachPoint(b, z.x, z.y) : t;
      steer(z, goal.x, goal.y, z.speed * dt);
      z.anim += dt * z.speed * 3;
    }
  }
  z.groan -= dt;
  if (z.groan <= 0) {
    z.groan = 4 + Math.random() * 5;
    if (d < 9) world.audio.play('groan');
  }
}

function updateBear(b, world, dt) {
  const p = world.player;
  b.flash = Math.max(0, b.flash - dt);
  b.swipe = Math.max(0, b.swipe - dt);
  const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
  switch (b.state) {
    case 'walk':
      b.cooldown -= dt;
      if (b.cooldown <= 0 && d >= BEAR.chargeMin && d <= BEAR.chargeMax && segmentClear(b.x, b.y, p.x, p.y)) {
        b.state = 'windup';
        b.timer = BEAR.windup;
        b.dirX = dx / d; b.dirY = dy / d;
        world.audio.play('roar');
        break;
      }
      if (d <= BEAR.reach + p.radius) {
        b.swipeTimer -= dt;
        if (b.swipeTimer <= 0) {
          b.swipeTimer = BEAR.swipeEvery;
          b.swipe = 0.3;
          world.hurtPlayer(BEAR.swipeDamage);
        }
      } else {
        b.swipeTimer = BEAR.swipeWindup;
        const t = chaseTarget(b, world);
        const win = boardedAlong(world, b.x, b.y, t.x, t.y);
        // The bear smashes a whole window in one blow.
        if (win && Math.hypot(win.cx - b.x, win.cy - b.y) <= BARRICADE.breakReach + 0.3) { tearBoards(world, win, win.boards); world.shake(0.25); }
        const goal = win && win.boards > 0 ? approachPoint(win, b.x, b.y) : t;
        steer(b, goal.x, goal.y, BEAR.speed * dt);
        b.anim += dt * 4;
      }
      break;
    case 'windup':
      b.timer -= dt;
      if (b.timer > BEAR.lockAt) { b.dirX = dx / d; b.dirY = dy / d; }
      if (b.timer <= 0) {
        b.state = 'charge';
        b.timer = BEAR.chargeTime;
        b.hitPlayer = false;
        b.charges++;
        world.audio.play('charge');
      }
      break;
    case 'charge': {
      b.timer -= dt;
      b.anim += dt * 12;
      const blocked = moveCircle(b, b.dirX * BEAR.chargeSpeed * dt, b.dirY * BEAR.chargeSpeed * dt, b.radius);
      if (!b.hitPlayer && Math.hypot(p.x - b.x, p.y - b.y) <= b.radius + p.radius + 0.2) {
        b.hitPlayer = true;
        world.hurtPlayer(BEAR.chargeDamage);
        world.knockPlayer(b.dirX, b.dirY, BEAR.knockback);
      }
      if (blocked && !b.hitPlayer) {
        const win = world.barricades.find(w => w.boards > 0 && Math.hypot(w.cx - b.x, w.cy - b.y) <= BARRICADE.breakReach + 0.3);
        if (win) tearBoards(world, win, win.boards);
        b.state = 'stunned';
        b.timer = BEAR.stun;
        world.audio.play('thud');
        world.shake(0.4);
      } else if (b.timer <= 0 || b.hitPlayer) {
        b.state = 'walk';
        b.cooldown = BEAR.cooldown;
      }
      break;
    }
    case 'stunned':
      b.timer -= dt;
      if (b.timer <= 0) { b.state = 'walk'; b.cooldown = BEAR.cooldown; }
      break;
  }
}

const nearWindow = e => WINDOWS.some(w => Math.abs(e.x - w.cx) < 1.5 && Math.abs(e.y - w.cy) < 1.5);

export function separate(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i], b = enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.radius + b.radius;
      if (d >= min || d < 1e-4) continue;
      const push = (min - d) / 2, nx = dx / d, ny = dy / d;
      // A window is one tile wide: an even push can pin two zombies against the walls on either side of it.
      // There they go single file instead: the later one gives way and the earlier one lines up with the gap.
      const singleFile = a.kind === 'zombie' && b.kind === 'zombie' && nearWindow(a) && nearWindow(b);
      const pushA = singleFile ? 0 : push, pushB = singleFile ? push * 2 : push;
      if (pushA && !(a.kind === 'bear' && a.state === 'charge')) moveCircle(a, -nx * pushA, -ny * pushA, a.radius);
      if (!(b.kind === 'bear' && b.state === 'charge')) moveCircle(b, nx * pushB, ny * pushB, b.radius);
    }
  }
}

// ---------- the game ----------

export function createGame(api) {
  const { input, audio } = api;
  const art = getArt(api.sprite);
  useText(api.text);
  let mode = 'title'; // title | play | won | lost
  let modeTime = 0, clock = 0;
  let world = null;
  let reported = false;

  function setMode(m) { mode = m; modeTime = 0; }

  function createWorld() {
    const w = {
      time: 0,
      player: {
        x: START.x + 0.5, y: START.y + 0.5, angle: -Math.PI / 2, radius: PLAYER.radius,
        health: PLAYER.maxHealth, lastHurt: -99, hurtFlash: 0, god: false,
        owned: new Set(['pistol']), weapon: 'pistol', cooldown: 0, trigger: 0, recoil: 0, muzzle: 0, raise: 0, bob: 0,
      },
      enemies: [], particles: [],
      points: 0, earned: 0, kills: 0, purchases: [],
      wave: -1, phase: 'intermission', phaseTime: INTERMISSION.first, waveTime: 0,
      toSpawn: 0, bearPending: false, spawnTimer: 0, bear: null, director: true,
      banner: { text: 'SURVIVE THE NIGHT', sub: 'WAVE 1 IS COMING', time: INTERMISSION.first },
      hitMarker: 0, shakeTime: 0, rumbleTime: 0, denyTime: 0,
      barricades: WINDOWS.map((win, i) => ({ ...win, id: i, boards: BARRICADE.boards, rewarded: 0 })),
      repair: { target: null, progress: 0 }, repairs: 0, boardsTorn: 0,
      warning: null, warned: new Set(),
      mission: newMission(),
      nav: createNav(), audio,
      hurtPlayer, knockPlayer, burst,
      shake: t => { w.shakeTime = Math.max(w.shakeTime, t); },
    };
    w.boardedAt = (tx, ty) => w.barricades.find(b => b.boards > 0 && b.x === tx && b.y === ty) ?? null;
    w.boardedCheck = (tx, ty) => w.boardedAt(tx, ty) !== null;
    setBoardedCheck(w.boardedCheck);
    w.nav.update(w.player.x, w.player.y);
    return w;
  }

  function hurtPlayer(amount) {
    const p = world.player;
    p.hurtFlash = 0.35;
    p.lastHurt = world.time;
    world.shake(0.15);
    audio.play('hurt');
    if (p.god) return;
    p.health = Math.max(0, p.health - amount);
    if (p.health <= 0) endRun(false);
  }

  function knockPlayer(dx, dy, dist) {
    for (let i = 0; i < 4; i++) moveCircle(world.player, (dx * dist) / 4, (dy * dist) / 4, world.player.radius);
  }

  function burst(x, y, z, colors, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      world.particles.push({
        x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0.6 + Math.random() * 1.2,
        life: 0.4 + Math.random() * 0.5, color: colors[i % colors.length], size: 0.03 + Math.random() * 0.03,
      });
    }
  }

  function startRun() {
    world = createWorld();
    setMode('play');
    audio.play('select');
    input.lockPointer();
  }

  // The card shows for END_CARD seconds, then api.finish hands over to the arcade's result menu
  // (which records the score and plays the win/lose jingle).
  function endRun(won) {
    if (mode !== 'play') return;
    setMode(won ? 'won' : 'lost');
    input.unlockPointer();
  }

  // ----- waves -----

  function pickSpawn(farthest = false) {
    const p = world.player;
    const byDist = [...SPAWNS].sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
    if (farthest) return byDist[0];
    const far = byDist.filter(s => Math.hypot(s.x + 0.5 - p.x, s.y + 0.5 - p.y) >= 6);
    const pool = far.length ? far : byDist;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function beginWave() {
    world.wave++;
    const cfg = WAVES[world.wave];
    world.phase = 'active';
    world.waveTime = 0;
    world.toSpawn = cfg.zombies;
    world.bearPending = cfg.bear;
    world.spawnTimer = 0.5;
    for (const b of world.barricades) b.rewarded = 0; // repair rewards are capped per window per wave
    world.banner = { text: `WAVE ${world.wave + 1}`, sub: cfg.bear ? 'SOMETHING BIG IS AWAKE' : `${cfg.zombies} ZOMBIES`, time: 2 };
    audio.play('wave');
  }

  function updateWaves(dt) {
    if (world.phase === 'intermission') {
      // The creek mission holds the countdown (and the bear warning) until it is finished or skipped.
      if (missionActive(world)) return;
      // Preparation break: no spawns. Runs on game time, so the arcade's pause freezes it.
      const before = world.phaseTime;
      world.phaseTime -= dt;
      if (world.wave >= 0 && [3, 2, 1].some(s => before > s && world.phaseTime <= s)) audio.play('blip');
      // The bear announces itself during the last seconds before its wave, once per appearance.
      const next = world.wave + 1;
      if (WAVES[next]?.bear && !world.warned.has(next) && world.phaseTime <= BEAR_WARNING.lead) {
        world.warned.add(next);
        world.warning = { t: 0, step: 0, roared: false };
      }
      if (world.phaseTime <= 0) beginWave();
      return;
    }
    const cfg = WAVES[world.wave];
    world.waveTime += dt;
    world.spawnTimer -= dt;
    const alive = world.enemies.filter(e => e.kind === 'zombie').length;
    if (world.toSpawn > 0 && world.spawnTimer <= 0 && alive < MAX_ALIVE) {
      const s = pickSpawn();
      world.enemies.push(makeZombie(s.x + 0.5, s.y + 0.5, world.wave));
      world.toSpawn--;
      world.spawnTimer = cfg.spawnEvery;
    }
    if (world.bearPending && world.waveTime >= cfg.bearAfter) {
      const s = pickSpawn(true);
      world.bear = makeBear(s.x + 0.5, s.y + 0.5);
      world.enemies.push(world.bear);
      world.bearPending = false;
      world.banner = { text: 'THE RED BEAR', sub: 'WATCH FOR ITS CHARGE', time: 2.5 };
      audio.play('roar');
      world.shake(0.5);
    }
    if (world.toSpawn === 0 && !world.bearPending && world.enemies.length === 0) {
      if (world.wave === WAVES.length - 1) { endRun(true); return; }
      world.phase = 'intermission';
      world.phaseTime = INTERMISSION.between;
      world.banner = { text: `WAVE ${world.wave + 1} CLEARED`, sub: 'BUY GUNS - REPAIR THE WINDOWS', time: 3 };
      audio.play('clear');
      if (world.wave === MISSION.afterWave && world.mission.state === 'waiting') setMission('pending');
    }
  }

  // ----- creek mission -----

  function setMission(state) {
    world.mission.state = state;
    world.mission.time = 0;
  }

  function collectLitter(l) {
    const m = world.mission;
    if (m.collected.includes(l.id)) return;
    m.collected.push(l.id);
    audio.play('pickup');
    burst(l.x, l.y, 0.1, ['#efe3c2', '#f2c94c'], 6, 0.8);
    if (m.collected.length < LITTER.length) return;
    if (!m.cleanupRewarded) {
      m.cleanupRewarded = true;
      m.bonus += MISSION.cleanupBonus;
      world.points += MISSION.cleanupBonus; // spendable, but kept out of the combat score (world.earned)
    }
    audio.play('clear');
    setMission('explain');
  }

  function quizPick() {
    if (input.wasPressed('KeyA', 'Digit1')) return 'A';
    if (input.wasPressed('KeyB', 'Digit2')) return 'B';
    if (input.wasPressed('KeyC', 'Digit3')) return 'C';
    const m = input.mouse;
    if (m.pressed && !input.pointerLocked) {
      const hit = quizOptionRects().find(r => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
      if (hit) return hit.id;
    }
    return null;
  }

  function answerQuiz(choice) {
    const m = world.mission;
    m.answers.push(choice);
    m.feedback = choice;
    if (!QUIZ_ANSWERS[choice]) { audio.play('deny'); return; } // wrong: explain and let them retry, nothing lost
    m.correct = true;
    if (!m.lessonRewarded) {
      m.lessonRewarded = true;
      m.bonus += MISSION.lessonBonus;
      world.points += MISSION.lessonBonus;
    }
    audio.play('buy');
    setMission('answered');
  }

  function endMission(state, text) {
    setMission(state);
    world.banner = { text, sub: 'NEXT WAVE COUNTDOWN RESUMED', time: 2.5 };
  }

  function updateMission(dt) {
    const m = world.mission;
    if (!MISSION_ACTIVE.has(m.state)) return;
    m.time += dt;
    if (input.wasPressed('KeyN')) { endMission('skipped', 'MISSION SKIPPED'); audio.play('blip'); return; }
    switch (m.state) {
      case 'pending': // wait for the wave-cleared banner, then the ranger speaks
        if (world.banner.time <= 0) { setMission('cleanup'); audio.play('talk'); }
        break;
      case 'explain':
        if (m.time >= MISSION.explainTime || input.wasPressed('Enter')) { setMission('quiz'); input.unlockPointer(); }
        break;
      case 'quiz': {
        const pick = quizPick();
        if (pick) answerQuiz(pick);
        break;
      }
      case 'answered':
        if (m.time > 0.3 && (input.wasPressed('Enter', 'Space') || input.mouse.pressed)) endMission('done', 'CREEK PROTECTED');
        break;
    }
  }

  /** Footsteps, then a distant roar, on game time: pausing freezes it, a restart or exit drops it with the run. */
  function updateWarning(dt) {
    const wn = world.warning;
    if (!wn) return;
    wn.t += dt;
    while (wn.step < BEAR_WARNING.steps.length && wn.t >= BEAR_WARNING.steps[wn.step]) {
      wn.step++;
      audio.play('bearStep');
      world.rumbleTime = Math.max(world.rumbleTime, BEAR_WARNING.rumble);
    }
    if (!wn.roared && wn.t >= BEAR_WARNING.roarAt) {
      wn.roared = true;
      audio.play('bearCall');
      world.rumbleTime = Math.max(world.rumbleTime, 0.5);
    }
    if (wn.t >= BEAR_WARNING.duration) world.warning = null;
  }

  // ----- player -----

  function damageEnemy(e, amount) {
    e.hp -= amount;
    e.flash = 0.08;
    if (e.hp > 0 || e.dead) return;
    e.dead = true;
    if (e.kind === 'bear') {
      world.points += SCORE.bearKill; world.earned += SCORE.bearKill;
      world.bear = null;
      world.banner = { text: 'THE BEAR FALLS', sub: world.enemies.some(o => !o.dead) ? 'FINISH THE REST' : '', time: 2.5 };
      audio.play('bearDie');
      world.shake(0.6);
      burst(e.x, e.y, 0.5, ['#8c1c24', '#d0342c', '#6e4128'], 26, 2.2);
    } else {
      world.points += SCORE.kill; world.earned += SCORE.kill;
      audio.play('zdie');
      burst(e.x, e.y, 0.5, ['#8c1c24', '#5f8a3c', '#d0342c'], 12, 1.6);
    }
    world.kills++;
  }

  function fire(w) {
    const p = world.player;
    p.cooldown = w.cooldown;
    p.recoil = w.recoil;
    p.muzzle = 0.06;
    audio.play(w.id);
    const { hits, impacts } = traceShot(world, w);
    for (const h of hits) {
      damageEnemy(h.enemy, h.damage);
      burst(h.x, h.y, 0.55, ['#8c1c24', '#d0342c'], 3, 0.8);
    }
    for (const i of impacts) burst(i.x, i.y, 0.5, ['#a8754a', '#6b6a7a'], 2, 0.6);
    if (hits.length) {
      world.points += SCORE.hit; world.earned += SCORE.hit;
      world.hitMarker = 0.12;
      audio.play(hits.some(h => h.enemy.kind === 'bear') ? 'bearHit' : 'hit');
    }
    world.enemies = world.enemies.filter(e => !e.dead);
  }

  function updatePlayer(dt) {
    const p = world.player;
    if (input.pointerLocked) p.angle += input.mouse.dx * PLAYER.mouseSens;
    if (input.isDown('ArrowLeft')) p.angle -= PLAYER.turnSpeed * dt;
    if (input.isDown('ArrowRight')) p.angle += PLAYER.turnSpeed * dt;

    const fwd = (input.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (input.isDown('KeyS', 'ArrowDown') ? 1 : 0);
    const side = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    const cx = Math.cos(p.angle), cy = Math.sin(p.angle);
    let mx = cx * fwd - cy * side, my = cy * fwd + cx * side;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len; my /= len;
      moveCircle(p, mx * PLAYER.speed * dt, my * PLAYER.speed * dt, p.radius);
      p.bob += dt * 9;
    }
    for (const e of world.enemies) {
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), min = p.radius + e.radius;
      if (d < min && d > 1e-4) moveCircle(p, (dx / d) * (min - d), (dy / d) * (min - d), p.radius);
    }

    if (world.time - p.lastHurt > PLAYER.regenDelay) p.health = Math.min(PLAYER.maxHealth, p.health + PLAYER.regenPerSec * dt);

    // Weapons: 1 2 3 pick an owned gun, Q cycles.
    WEAPON_ORDER.forEach((id, i) => {
      if (input.wasPressed(`Digit${i + 1}`) && p.owned.has(id) && p.weapon !== id) { equip(p, id); audio.play('equip'); }
    });
    if (input.wasPressed('KeyQ') && p.owned.size > 1) {
      const owned = WEAPON_ORDER.filter(id => p.owned.has(id));
      equip(p, owned[(owned.indexOf(p.weapon) + 1) % owned.length]);
      audio.play('equip');
    }

    // E does one thing per press, in priority order: wall gun, then litter, then (held) window repair.
    const buy = findBuyNear(p);
    const litter = buy ? null : findLitterNear(world);
    if (buy && input.wasPressed('KeyE')) {
      const r = tryBuy(world, buy);
      if (r.reason === 'bought') { audio.play('buy'); world.purchases.push(buy.weapon); }
      else if (r.reason === 'equipped') audio.play('equip');
      else if (!r.ok) { audio.play('deny'); world.denyTime = 0.6; }
    }
    if (litter && input.wasPressed('KeyE')) collectLitter(litter);
    updateRepair(buy || litter ? null : findRepairNear(world), dt);

    const w = WEAPONS[p.weapon];
    const mouseFire = input.pointerLocked && (w.auto ? input.mouse.down : input.mouse.pressed);
    const keyFire = w.auto ? input.isDown('Space') : input.wasPressed('Space');
    if (!w.auto && (mouseFire || keyFire)) p.trigger = 0.15; // buffer a semi-auto press made during cooldown
    p.cooldown -= dt;
    if (p.cooldown <= 0 && (w.auto ? mouseFire || keyFire : p.trigger > 0)) { p.trigger = 0; fire(w); }
    p.trigger = Math.max(0, p.trigger - dt);
    p.recoil = Math.max(0, p.recoil - dt * 60);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.raise = Math.max(0, p.raise - dt * 4);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  }

  /** Hold E at a window to hammer boards back one at a time. Releasing E or walking off cancels the board in progress. */
  function updateRepair(fix, dt) {
    const r = world.repair;
    if (fix && input.wasPressed('KeyE')) { r.target = fix; r.progress = 0; }
    else if (!input.isDown('KeyE') || r.target !== fix) { r.target = null; r.progress = 0; }
    const b = r.target;
    if (!b || b.boards >= BARRICADE.boards || windowBlocked(world, b)) { r.progress = 0; return; }
    r.progress += dt / BARRICADE.repairTime;
    if (r.progress < 1) return;
    r.progress = 0;
    b.boards++;
    world.repairs++;
    const pts = Math.min(BARRICADE.repairPoints, BARRICADE.rewardCapPerWave - b.rewarded);
    if (pts > 0) { world.points += pts; world.earned += pts; b.rewarded += pts; }
    audio.play('board');
  }

  function updateParticles(dt) {
    for (const q of world.particles) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      q.vz -= 4 * dt;
      if (q.z < 0) { q.z = 0; q.vx *= 0.4; q.vy *= 0.4; q.vz = 0; }
      q.life -= dt;
    }
    world.particles = world.particles.filter(q => q.life > 0);
  }

  function updatePlay(dt) {
    const modal = missionModal(world); // the creek question: no moving or shooting, the mouse is free to click answers
    if (!modal && input.mouse.pressed && !input.pointerLocked) input.lockPointer(); // this click never fires: aiming needs the lock
    setBoardedCheck(world.boardedCheck); // collision always uses this run's barricades
    world.time += dt;
    if (!modal) updatePlayer(dt);
    if (mode !== 'play') return;
    world.nav.update(world.player.x, world.player.y);
    for (const e of world.enemies) (e.kind === 'bear' ? updateBear : updateZombie)(e, world, dt);
    if (mode !== 'play') return;
    separate(world.enemies);
    if (world.director) updateWaves(dt);
    updateMission(dt);
    updateWarning(dt);
    updateParticles(dt);
    world.banner.time -= dt;
    world.hitMarker = Math.max(0, world.hitMarker - dt);
    world.shakeTime = Math.max(0, world.shakeTime - dt);
    world.rumbleTime = Math.max(0, world.rumbleTime - dt);
    world.denyTime = Math.max(0, world.denyTime - dt);
  }

  function update(dt) {
    clock += dt;
    modeTime += dt;
    switch (mode) {
      case 'title':
        if (input.wasPressed('Enter', 'Space') || input.mouse.pressed) startRun();
        break;
      case 'play':
        updatePlay(dt);
        break;
      case 'won':
      case 'lost':
        updateParticles(dt);
        if (!reported && modeTime >= END_CARD) {
          reported = true;
          api.finish({ won: mode === 'won', score: world.earned });
        }
        break;
    }
  }

  function remaining() {
    return world.toSpawn + world.enemies.filter(e => e.kind === 'zombie').length;
  }

  function draw(g) {
    g.imageSmoothingEnabled = false;
    if (mode === 'title') { drawTitle(g, art, clock, api.best); return; }
    const buy = mode === 'play' && findBuyNear(world.player);
    const litter = mode === 'play' && !buy && findLitterNear(world);
    const fix = mode === 'play' && !buy && !litter && findRepairNear(world);
    drawFrame(g, art, world, {
      clock, locked: input.pointerLocked, live: mode === 'play', remaining: remaining(),
      buy: buy && { weapon: WEAPONS[buy.weapon], owned: world.player.owned.has(buy.weapon), equipped: world.player.weapon === buy.weapon, affordable: world.points >= WEAPONS[buy.weapon].price, denied: world.denyTime > 0 },
      repair: fix && {
        boards: fix.boards, max: BARRICADE.boards, blocked: windowBlocked(world, fix),
        progress: world.repair.target === fix ? world.repair.progress : 0,
        capped: fix.rewarded >= BARRICADE.rewardCapPerWave,
      },
      litter: litter && litter.name,
    });
    if (mode === 'won' || mode === 'lost') drawEnd(g, world, mode === 'won', modeTime);
  }

  /** Plain snapshot for the arcade's debug() and the test bots. Never changes state. */
  function debug() {
    if (!world) return { mode, wave: 0 };
    const p = world.player;
    return {
      mode, wave: world.wave + 1, phase: world.phase, points: world.points, score: world.earned, kills: world.kills,
      purchases: [...world.purchases], remaining: remaining(),
      player: { x: p.x, y: p.y, angle: p.angle, health: p.health, weapon: p.weapon, owned: [...p.owned] },
      enemies: world.enemies.map(e => ({ kind: e.kind, x: e.x, y: e.y, hp: e.hp, state: e.state ?? null })),
      bear: world.bear && { hp: world.bear.hp, maxHp: world.bear.maxHp, state: world.bear.state, charges: world.bear.charges },
      phaseTime: world.phaseTime,
      barricades: world.barricades.map(b => ({ x: b.x, y: b.y, boards: b.boards, rewarded: b.rewarded })),
      repairs: world.repairs, boardsTorn: world.boardsTorn,
      warning: world.warning && { t: world.warning.t }, warned: [...world.warned],
      mission: { ...world.mission, collected: [...world.mission.collected], answers: [...world.mission.answers], active: missionActive(world) },
    };
  }

  return {
    update, draw, debug,
    // No DOM listeners, timers or loops of its own; only the shared collision hook for boarded windows.
    destroy() { setBoardedCheck(null); },
    // Used by tests/bear-unit.mjs to drive scenarios directly.
    get mode() { return mode; },
    get world() { return world; },
    start: startRun,
  };
}
