// GHOUL SHIFT — first-person wave shooter (raycast pseudo-3D). Survive three waves of ghouls.
import { ARENA, WAVES } from './map.js';
import { buildSprites } from './sprites.js';
import { isSolid, findTiles, makeCamera, project, drawWalls, drawBillboard } from './raycaster.js';

const FOV_SCALE = 0.66;
const MOVE_SPEED = 2.6;      // tiles per second
const TURN_SPEED = 2.4;      // radians per second (keyboard)
const MOUSE_SENS = 0.0028;   // radians per mouse pixel
const PLAYER_RADIUS = 0.22;
const MAX_HEALTH = 100;
const FIRE_COOLDOWN = 0.28;
const GHOUL = { hp: 2, radius: 0.3, reach: 0.75, damage: 6, attackEvery: 1.0, baseSpeed: 0.95, speedPerWave: 0.2 };
const WAVE_HEAL = 20;

export function createGame(api) {
  const { W, H, palette: P, input, audio } = api;
  const art = buildSprites(api);
  const start = findTiles(ARENA, 'P')[0];
  const spawns = findTiles(ARENA, 'S');
  const zbuf = new Float32Array(W).fill(Infinity);

  const player = { x: start.x + 0.5, y: start.y + 0.5, angle: -Math.PI / 2, health: MAX_HEALTH };
  let ghouls = [];
  let waveIndex = -1;
  let waveState = 'break';  // 'break' | 'wave'
  let breakTime = 1.2;      // seconds until the next wave starts
  let toSpawn = 0;
  let spawnTimer = 0;
  let banner = 'GET READY';
  let bannerTime = 1.0;
  let kills = 0;
  let fireCooldown = 0;
  let muzzle = 0, recoil = 0, hurt = 0, bob = 0, time = 0, hitMarker = 0;
  let particles = [];
  let over = false;

  const camera = () => makeCamera(player.x, player.y, player.angle, FOV_SCALE);

  function moveCircle(body, dx, dy, r) {
    if (!isSolid(ARENA, body.x + dx + Math.sign(dx) * r, body.y - r * 0.9) && !isSolid(ARENA, body.x + dx + Math.sign(dx) * r, body.y + r * 0.9)) body.x += dx;
    if (!isSolid(ARENA, body.x - r * 0.9, body.y + dy + Math.sign(dy) * r) && !isSolid(ARENA, body.x + r * 0.9, body.y + dy + Math.sign(dy) * r)) body.y += dy;
  }

  function startWave() {
    waveIndex++;
    waveState = 'wave';
    toSpawn = WAVES[waveIndex];
    spawnTimer = 0.2;
    banner = `WAVE ${waveIndex + 1}`;
    bannerTime = 1.6;
    audio.play('wave');
  }

  function spawnGhoul() {
    const far = spawns.filter(s => Math.hypot(s.x + 0.5 - player.x, s.y + 0.5 - player.y) > 6);
    const pool = far.length ? far : spawns;
    const s = pool[Math.floor(Math.random() * pool.length)];
    ghouls.push({
      x: s.x + 0.5, y: s.y + 0.5, hp: GHOUL.hp, flash: 0,
      speed: GHOUL.baseSpeed + waveIndex * GHOUL.speedPerWave + Math.random() * 0.2,
      attackTimer: 0.6, phase: Math.random() * 6,
    });
  }

  function fire() {
    fireCooldown = FIRE_COOLDOWN;
    muzzle = 0.06;
    recoil = 1;
    audio.play('shoot');
    const cam = camera();
    const center = W / 2;
    let target = null, best = Infinity;
    for (const gh of ghouls) {
      const { screenX, depth } = project(cam, gh.x, gh.y, W);
      if (depth <= 0.15 || depth >= zbuf[center | 0]) continue;
      const halfWidth = ((H / depth) * 0.75 * (12 / 15)) / 2;
      if (Math.abs(screenX - center) < halfWidth * 0.85 && depth < best) { best = depth; target = gh; }
    }
    if (!target) return;
    target.hp--;
    target.flash = 0.12;
    // knockback
    const d = Math.hypot(target.x - player.x, target.y - player.y) || 1;
    moveCircle(target, ((target.x - player.x) / d) * 0.25, ((target.y - player.y) / d) * 0.25, GHOUL.radius);
    hitMarker = 0.12;
    if (target.hp <= 0) {
      ghouls = ghouls.filter(gh => gh !== target);
      kills++;
      burst(target.x, target.y);
      audio.play('explode');
    } else {
      audio.play('hit');
    }
  }

  // Pixel debris flung out of a defeated ghoul (z = height in wall units).
  function burst(x, y) {
    const colors = [P.green, P.green, P.violet, P.red];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.2;
      particles.push({
        x, y, z: 0.35 + Math.random() * 0.25,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0.6 + Math.random() * 0.9,
        life: 0.7 + Math.random() * 0.4, color: colors[i % colors.length],
      });
    }
  }

  function updateParticles(dt) {
    for (const pt of particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vz -= 3 * dt;
      pt.z = Math.max(0, pt.z + pt.vz * dt);
      pt.life -= dt;
    }
    particles = particles.filter(pt => pt.life > 0);
  }

  function drawParticles(g, cam) {
    for (const pt of particles) {
      const { screenX, depth } = project(cam, pt.x, pt.y, W);
      const col = Math.round(screenX);
      if (depth <= 0.2 || col < 0 || col >= W || depth >= zbuf[col]) continue;
      const full = H / depth;
      const size = Math.max(1, Math.round(full * 0.05));
      g.fillStyle = pt.color;
      g.fillRect(col, Math.round(H / 2 + full / 2 - pt.z * full), size, size);
    }
  }

  function drawMinimap(g) {
    const s = 2, ox = 4, oy = H - 16 - ARENA.length * s;
    g.fillStyle = P.black;
    g.fillRect(ox - 1, oy - 1, ARENA[0].length * s + 2, ARENA.length * s + 2);
    ARENA.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#' || c === 'B') {
        g.fillStyle = c === '#' ? P.brown : P.teal;
        g.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }));
    g.fillStyle = P.red;
    for (const gh of ghouls) g.fillRect(ox + Math.floor(gh.x * s) - 1, oy + Math.floor(gh.y * s) - 1, 2, 2);
    const px = ox + Math.floor(player.x * s), py = oy + Math.floor(player.y * s);
    g.fillStyle = P.yellow;
    g.fillRect(px + Math.round(Math.cos(player.angle) * 3), py + Math.round(Math.sin(player.angle) * 3), 1, 1);
    g.fillStyle = P.cream;
    g.fillRect(px - 1, py - 1, 2, 2);
  }

  function end(won) {
    over = true;
    api.finish({ won, score: kills * 100 + (won ? Math.max(0, Math.round(player.health)) : 0) });
  }

  return {
    update(dt) {
      if (over) return;
      time += dt;

      // Aim: mouse while captured, keyboard always. First click captures the mouse.
      if (input.mouse.pressed && !input.pointerLocked) input.lockPointer();
      player.angle += input.mouse.dx * MOUSE_SENS;
      if (input.isDown('ArrowLeft', 'KeyQ')) player.angle -= TURN_SPEED * dt;
      if (input.isDown('ArrowRight', 'KeyE')) player.angle += TURN_SPEED * dt;

      // Move: forward/back along view, strafe sideways.
      const dirX = Math.cos(player.angle), dirY = Math.sin(player.angle);
      let mx = 0, my = 0;
      if (input.isDown('KeyW', 'ArrowUp')) { mx += dirX; my += dirY; }
      if (input.isDown('KeyS', 'ArrowDown')) { mx -= dirX; my -= dirY; }
      if (input.isDown('KeyD')) { mx -= dirY; my += dirX; }
      if (input.isDown('KeyA')) { mx += dirY; my -= dirX; }
      const len = Math.hypot(mx, my);
      if (len > 0) {
        moveCircle(player, (mx / len) * MOVE_SPEED * dt, (my / len) * MOVE_SPEED * dt, PLAYER_RADIUS);
        bob += dt * 10;
      }

      // Shoot
      fireCooldown -= dt;
      const trigger = input.isDown('Space') || input.mouse.down || input.mouse.pressed;
      if (trigger && fireCooldown <= 0) fire();

      // Waves: 'break' counts down to the next wave; 'wave' spawns ghouls until all are dead.
      if (waveState === 'break') {
        breakTime -= dt;
        if (breakTime <= 0) startWave();
      } else {
        if (toSpawn > 0) {
          spawnTimer -= dt;
          if (spawnTimer <= 0) { spawnGhoul(); toSpawn--; spawnTimer = 0.7; }
        } else if (ghouls.length === 0) {
          if (waveIndex === WAVES.length - 1) { end(true); return; }
          waveState = 'break';
          breakTime = 2.4;
          banner = 'WAVE CLEARED  +HP';
          bannerTime = 2;
          player.health = Math.min(MAX_HEALTH, player.health + WAVE_HEAL);
          audio.play('heal');
        }
      }

      // Ghouls chase and claw
      for (const gh of ghouls) {
        gh.flash = Math.max(0, gh.flash - dt);
        const dx = player.x - gh.x, dy = player.y - gh.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > GHOUL.reach * 0.85) {
          moveCircle(gh, (dx / d) * gh.speed * dt, (dy / d) * gh.speed * dt, GHOUL.radius);
        }
        gh.attackTimer -= dt;
        if (d < GHOUL.reach && gh.attackTimer <= 0) {
          gh.attackTimer = GHOUL.attackEvery;
          player.health -= GHOUL.damage;
          hurt = 0.35;
          audio.play('hurt');
        }
      }
      // Keep ghouls from stacking on one spot
      for (let i = 0; i < ghouls.length; i++) {
        for (let j = i + 1; j < ghouls.length; j++) {
          const a = ghouls[i], b = ghouls[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d > 0 && d < 0.55) {
            const push = (0.55 - d) / 2;
            moveCircle(a, (-dx / d) * push, (-dy / d) * push, GHOUL.radius);
            moveCircle(b, (dx / d) * push, (dy / d) * push, GHOUL.radius);
          }
        }
      }

      updateParticles(dt);
      hitMarker = Math.max(0, hitMarker - dt);
      muzzle = Math.max(0, muzzle - dt);
      recoil = Math.max(0, recoil - dt * 6);
      hurt = Math.max(0, hurt - dt);
      bannerTime = Math.max(0, bannerTime - dt);
      if (player.health <= 0) { player.health = 0; end(false); }
    },

    draw(g) {
      const cam = camera();
      // Ceiling + banded floor
      g.fillStyle = P.night;
      g.fillRect(0, 0, W, H / 2);
      g.fillStyle = P.black;
      g.fillRect(0, H / 2, W, H / 2);
      g.fillStyle = P.indigo;
      g.fillRect(0, H / 2 + 22, W, H / 2 - 22);
      g.fillStyle = P.violet;
      g.fillRect(0, H - 22, W, 22);

      drawWalls(g, ARENA, cam, W, H, zbuf, art.wallShades);

      // Ghouls, far to near
      const sorted = ghouls
        .map(gh => ({ gh, d: (gh.x - player.x) ** 2 + (gh.y - player.y) ** 2 }))
        .sort((a, b) => b.d - a.d);
      for (const { gh } of sorted) {
        const sway = Math.sin(time * 8 + gh.phase) * 0.02;
        drawBillboard(g, gh.flash > 0 ? art.ghoulHurt : art.ghoul, cam, gh.x, gh.y, W, H, zbuf, 0.75, Math.max(0, sway));
      }
      drawParticles(g, cam);

      // Blaster with walk bob + recoil, and muzzle flash
      const scale = 3;
      const gw = art.blaster.width * scale, gh = art.blaster.height * scale;
      const gx = Math.round(W / 2 - gw / 2 + Math.sin(bob) * 3);
      const gy = Math.round(H - gh + 4 + Math.abs(Math.cos(bob)) * 2 + recoil * 5);
      if (muzzle > 0) g.drawImage(art.flash, W / 2 - 12, gy - 14, art.flash.width * 3, art.flash.height * 3);
      g.drawImage(art.blaster, gx, gy, gw, gh);

      // Crosshair (red flash on a hit)
      g.fillStyle = hitMarker > 0 ? P.red : P.cream;
      g.fillRect(W / 2 - 5, H / 2, 3, 1);
      g.fillRect(W / 2 + 3, H / 2, 3, 1);
      g.fillRect(W / 2, H / 2 - 5, 1, 3);
      g.fillRect(W / 2, H / 2 + 3, 1, 3);

      // Damage flash
      if (hurt > 0) {
        g.globalAlpha = Math.min(0.5, hurt);
        g.fillStyle = P.red;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }

      // HUD
      drawMinimap(g);
      const hpW = 60;
      g.fillStyle = P.black;
      g.fillRect(4, H - 12, hpW + 18, 9);
      api.text(g, 'HP', 6, H - 10, P.cream);
      g.fillStyle = P.maroon;
      g.fillRect(16, H - 10, hpW, 5);
      g.fillStyle = player.health > 35 ? P.green : P.red;
      g.fillRect(16, H - 10, Math.round((hpW * player.health) / MAX_HEALTH), 5);
      const left = Math.max(0, toSpawn) + ghouls.length;
      api.text(g, `WAVE ${Math.max(1, waveIndex + 1)}/${WAVES.length}`, 4, 4, P.cream, { shadow: P.black });
      api.text(g, `KILLS ${kills}`, 4, 11, P.cream, { shadow: P.black });
      if (waveIndex >= 0) api.text(g, `GHOULS ${left}`, W - 4, H - 10, P.cream, { align: 'right', shadow: P.black });
      if (!input.pointerLocked && Math.sin(time * 5) > -0.2) {
        api.text(g, 'CLICK TO AIM WITH MOUSE  /  ARROWS TURN', W / 2, 22, P.yellow, { align: 'center', shadow: P.black });
      }
      if (bannerTime > 0) {
        api.text(g, banner, W / 2, H / 2 - 30, P.yellow, { scale: 2, align: 'center', shadow: P.black });
      }
    },

    destroy() {},

    debug() {
      return {
        player: { x: player.x, y: player.y, angle: player.angle, health: player.health },
        ghouls: ghouls.map(gh => ({ x: gh.x, y: gh.y, hp: gh.hp })),
        wave: waveIndex + 1, waveState, toSpawn, kills,
      };
    },
  };
}
