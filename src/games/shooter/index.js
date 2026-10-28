// BEAR IN THE RED WOODS — first-person zombie survival with a bear boss (the arcade's shooter machine).
// Gameplay: title screen, player, weapons, wall buys, zombies, the bear and the wave director.
// Everything shared comes in through the arcade `api`; pause, mute and Play Again belong to the arcade.
import {
  PLAYER, WEAPONS, WEAPON_ORDER, BUY_RANGE, SCORE, ZOMBIE, BEAR, WAVES, MAX_ALIVE, INTERMISSION,
} from './config.js';
import { findTiles, WALL_BUYS, moveCircle, castRay, trunkHit, segmentClear, createNav } from './world.js';
import { useText, drawFrame, drawTitle, drawEnd } from './render.js';
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
    attackTimer: ZOMBIE.windup, swipe: 0, flash: 0, anim: Math.random() * 4, groan: 2 + Math.random() * 5, dead: false,
  };
}

export function makeBear(x, y) {
  return {
    kind: 'bear', x, y, radius: BEAR.radius, hitRadius: BEAR.hitRadius, hp: BEAR.hp, maxHp: BEAR.hp,
    state: 'walk', timer: 0, cooldown: BEAR.firstCharge, swipeTimer: BEAR.swipeWindup, swipe: 0,
    dirX: 0, dirY: 0, hitPlayer: false, flash: 0, anim: 0, charges: 0, dead: false,
  };
}

// ---------- enemies ----------

function chaseTarget(e, world) {
  const p = world.player;
  if (Math.hypot(p.x - e.x, p.y - e.y) < 2.2 && segmentClear(e.x, e.y, p.x, p.y)) return p;
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
    steer(z, t.x, t.y, z.speed * dt);
    z.anim += dt * z.speed * 3;
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
        steer(b, t.x, t.y, BEAR.speed * dt);
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

function separate(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i], b = enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.radius + b.radius;
      if (d >= min || d < 1e-4) continue;
      const push = (min - d) / 2, nx = dx / d, ny = dy / d;
      if (!(a.kind === 'bear' && a.state === 'charge')) moveCircle(a, -nx * push, -ny * push, a.radius);
      if (!(b.kind === 'bear' && b.state === 'charge')) moveCircle(b, nx * push, ny * push, b.radius);
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
      hitMarker: 0, shakeTime: 0, denyTime: 0,
      nav: createNav(), audio,
      hurtPlayer, knockPlayer,
      shake: t => { w.shakeTime = Math.max(w.shakeTime, t); },
    };
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
    world.banner = { text: `WAVE ${world.wave + 1}`, sub: cfg.bear ? 'SOMETHING BIG IS AWAKE' : `${cfg.zombies} ZOMBIES`, time: 2 };
    audio.play('wave');
  }

  function updateWaves(dt) {
    if (world.phase === 'intermission') {
      world.phaseTime -= dt;
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
      world.banner = { text: `WAVE ${world.wave + 1} CLEARED`, sub: 'BUY GUNS ON THE CABIN WALLS', time: 3 };
      audio.play('clear');
    }
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

    const buy = findBuyNear(p);
    if (buy && input.wasPressed('KeyE')) {
      const r = tryBuy(world, buy);
      if (r.reason === 'bought') { audio.play('buy'); world.purchases.push(buy.weapon); }
      else if (r.reason === 'equipped') audio.play('equip');
      else if (!r.ok) { audio.play('deny'); world.denyTime = 0.6; }
    }

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
    if (input.mouse.pressed && !input.pointerLocked) input.lockPointer(); // this click never fires: aiming needs the lock
    world.time += dt;
    updatePlayer(dt);
    if (mode !== 'play') return;
    world.nav.update(world.player.x, world.player.y);
    for (const e of world.enemies) (e.kind === 'bear' ? updateBear : updateZombie)(e, world, dt);
    if (mode !== 'play') return;
    separate(world.enemies);
    if (world.director) updateWaves(dt);
    updateParticles(dt);
    world.banner.time -= dt;
    world.hitMarker = Math.max(0, world.hitMarker - dt);
    world.shakeTime = Math.max(0, world.shakeTime - dt);
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
    drawFrame(g, art, world, {
      clock, locked: input.pointerLocked, live: mode === 'play', remaining: remaining(),
      buy: buy && { weapon: WEAPONS[buy.weapon], owned: world.player.owned.has(buy.weapon), equipped: world.player.weapon === buy.weapon, affordable: world.points >= WEAPONS[buy.weapon].price, denied: world.denyTime > 0 },
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
    };
  }

  return {
    update, draw, debug,
    destroy() {}, // nothing to release: no DOM listeners, timers or loops of its own
    // Used by tests/bear-unit.mjs to drive scenarios directly.
    get mode() { return mode; },
    get world() { return world; },
    start: startRun,
  };
}
