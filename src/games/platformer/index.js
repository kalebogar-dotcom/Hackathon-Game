// PEBBLE JUMP — 2D platformer. Run, jump, grab coins, dodge spikes and reach the flag.
import { LEVEL, TILE as T, START_LIVES } from './level.js';
import { moveBody, isGrounded, overlaps } from './physics.js';
import { buildSprites, drawSky, drawTile } from './sprites.js';

const GRAVITY = 900;        // px/s²
const MAX_FALL = 360;
const RUN_SPEED = 85;
const ACCEL_GROUND = 900;
const ACCEL_AIR = 600;
const FRICTION = 1100;
const JUMP_SPEED = 300;     // peak ≈ 5 tiles
const JUMP_CUT = 0.45;      // releasing jump early cuts upward speed to this fraction
const COYOTE_TIME = 0.08;   // can still jump just after leaving a ledge
const JUMP_BUFFER = 0.12;   // jump pressed just before landing still counts
const RESPAWN_DELAY = 0.9;
const JUMP_KEYS = ['Space', 'KeyW', 'ArrowUp', 'KeyK'];
const BEETLE_SPEED = 22;
const STOMP_BOUNCE = 220;
const STOMP_POINTS = 25;

export function createGame(api) {
  const { W, H, palette: P, input, audio } = api;
  const art = buildSprites(api);
  const tiles = LEVEL.map(row => row.split(''));
  const cols = tiles[0].length;
  const rows = tiles.length;
  const levelW = cols * T;

  let start = { x: 1, y: rows - 3 };
  let flag = null;
  let totalCoins = 0;
  const beetles = [];
  tiles.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'P') { start = { x, y }; row[x] = '.'; }
    else if (c === 'e') { beetles.push({ x: x * T + 1, y: y * T + T - 6, w: 8, h: 6, vx: -BEETLE_SPEED, alive: true, squash: 0 }); row[x] = '.'; }
    else if (c === 'F') flag = { x: x * T + 2, y: (y - 6) * T, w: 6, h: 7 * T };
    else if (c === 'o') totalCoins++;
  }));

  const solid = (col, row) => {
    if (col < 0 || col >= cols) return true;
    if (row < 0 || row >= rows) return false;
    const c = tiles[row][col];
    return c === '#' || c === '=';
  };

  const player = { x: 0, y: 0, w: 8, h: 9, vx: 0, vy: 0, facing: 1 };
  let coins = 0;
  let stomps = 0;
  let lives = START_LIVES;
  let coyote = 0, buffer = 0, dead = 0, invuln = 0, time = 0, camX = 0;
  let over = false;

  function respawn() {
    player.x = start.x * T + 1;
    player.y = start.y * T + (T - player.h);
    player.vx = player.vy = 0;
    player.facing = 1;
    invuln = 1;
  }
  respawn();

  function die() {
    lives--;
    audio.play('hurt');
    if (lives <= 0) {
      over = true;
      api.finish({ won: false, score: coins * 10 + stomps * STOMP_POINTS });
      return;
    }
    dead = RESPAWN_DELAY;
  }

  // Beetles patrol, turning at walls, spikes and ledges.
  function updateBeetles(dt) {
    for (const b of beetles) {
      if (!b.alive) { b.squash = Math.max(0, b.squash - dt); continue; }
      const nx = b.x + b.vx * dt;
      const frontCol = Math.floor((b.vx < 0 ? nx : nx + b.w) / T);
      const row = Math.floor((b.y + b.h - 1) / T);
      const blocked = solid(frontCol, row) || tiles[row]?.[frontCol] === '^' || !solid(frontCol, row + 1);
      if (blocked) b.vx = -b.vx;
      else b.x = nx;
    }
  }

  // Landing on a beetle stomps it; any other touch hurts.
  function touchBeetles() {
    for (const b of beetles) {
      if (!b.alive || !overlaps(player, b)) continue;
      if (player.vy > 0 && player.y + player.h - b.y < 8) {
        b.alive = false;
        b.squash = 0.5;
        stomps++;
        player.vy = -STOMP_BOUNCE;
        audio.play('hit');
      } else if (invuln <= 0) {
        return true;
      }
    }
    return false;
  }

  function touchTiles() {
    const c0 = Math.floor(player.x / T), c1 = Math.floor((player.x + player.w - 0.01) / T);
    const r0 = Math.floor(player.y / T), r1 = Math.floor((player.y + player.h - 0.01) / T);
    for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
        const ch = tiles[r][c];
        if (ch === 'o' && overlaps(player, { x: c * T + 2, y: r * T + 2, w: 6, h: 6 })) {
          tiles[r][c] = '.';
          coins++;
          audio.play('coin');
        } else if (ch === '^' && overlaps(player, { x: c * T + 1, y: r * T + 5, w: 8, h: 5 })) {
          return 'spike';
        }
      }
    }
    return null;
  }

  return {
    update(dt) {
      if (over) return;
      time += dt;
      updateBeetles(dt);
      if (dead > 0) {
        dead -= dt;
        if (dead <= 0) respawn();
        return;
      }
      invuln = Math.max(0, invuln - dt);

      const dir = (input.isDown('ArrowRight', 'KeyD') ? 1 : 0) - (input.isDown('ArrowLeft', 'KeyA') ? 1 : 0);
      const grounded = isGrounded(player, solid, T) && player.vy >= 0;
      coyote = grounded ? COYOTE_TIME : coyote - dt;
      buffer = input.wasPressed(...JUMP_KEYS) ? JUMP_BUFFER : buffer - dt;

      // Horizontal: accelerate toward target speed, with friction when idle on ground
      const target = dir * RUN_SPEED;
      const accel = dir ? (grounded ? ACCEL_GROUND : ACCEL_AIR) : (grounded ? FRICTION : ACCEL_AIR * 0.3);
      if (player.vx < target) player.vx = Math.min(target, player.vx + accel * dt);
      else if (player.vx > target) player.vx = Math.max(target, player.vx - accel * dt);
      if (dir) player.facing = dir;

      // Jump (buffered + coyote) and variable height
      if (buffer > 0 && coyote > 0) {
        player.vy = -JUMP_SPEED;
        buffer = coyote = 0;
        audio.play('jump');
      }
      if (!input.isDown(...JUMP_KEYS) && player.vy < -JUMP_SPEED * JUMP_CUT) player.vy = -JUMP_SPEED * JUMP_CUT;
      player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * dt);

      const hit = moveBody(player, player.vx * dt, player.vy * dt, solid, T);
      if (hit.hitX) player.vx = 0;
      if (hit.hitY) player.vy = 0;

      if (touchTiles() === 'spike' || touchBeetles() || player.y > rows * T + 12) { die(); return; }
      if (flag && overlaps(player, flag)) {
        over = true;
        api.finish({ won: true, score: coins * 10 + stomps * STOMP_POINTS + lives * 50 });
        return;
      }

      camX = Math.max(0, Math.min(levelW - W, player.x + player.w / 2 - W * 0.4));
    },

    draw(g) {
      const cx = Math.round(camX);
      drawSky(g, P, W, H, cx, time);
      const c0 = Math.max(0, Math.floor(cx / T) - 1);
      const c1 = Math.min(cols - 1, Math.ceil((cx + W) / T) + 2); // +2 keeps the flag visible as it nears
      for (let r = 0; r < rows; r++) {
        for (let c = c0; c <= c1; c++) {
          const ch = tiles[r][c];
          if (ch !== '.') drawTile(g, P, ch, c * T - cx, r * T, T, tiles[r - 1]?.[c], time);
        }
      }

      for (const b of beetles) {
        const bx = Math.round(b.x - 1 - cx);
        if (bx < -12 || bx > W) continue;
        if (b.alive) {
          g.drawImage(b.vx < 0 ? art.beetleLeft : art.beetleRight, bx, Math.round(b.y));
        } else if (b.squash > 0) {
          g.fillStyle = P.violet;
          g.fillRect(bx, Math.round(b.y + b.h - 2), 10, 2);
        }
      }

      if (dead <= 0 && !(invuln > 0 && Math.floor(time * 12) % 2)) {
        const sprite = player.facing < 0 ? art.pebbleLeft : art.pebbleRight;
        g.drawImage(sprite, Math.round(player.x - 1 - cx), Math.round(player.y - 1));
      }

      // HUD
      g.fillStyle = P.black;
      g.fillRect(2, 2, 92, 9);
      g.fillStyle = P.yellow;
      g.fillRect(5, 4, 3, 5);
      api.text(g, `${coins}/${totalCoins}`, 11, 4, P.cream);
      api.text(g, 'LIVES', 42, 4, P.cream);
      for (let i = 0; i < START_LIVES; i++) {
        g.fillStyle = i < lives ? P.red : P.night;
        g.fillRect(64 + i * 8, 4, 5, 5);
      }
      if (time < 4 && dead <= 0) {
        api.text(g, 'A D / ARROWS RUN    SPACE / W JUMP', W / 2, 24, P.night, { align: 'center' });
      }
      if (dead > 0) api.text(g, 'OUCH!', W / 2, H / 2 - 20, P.red, { scale: 2, align: 'center', shadow: P.black });
    },

    destroy() {},

    debug() {
      return {
        player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy },
        grounded: isGrounded(player, solid, T),
        enemies: beetles.map(b => ({ x: b.x, y: b.y, alive: b.alive })),
        coins, totalCoins, stomps, lives, dead, over,
      };
    },
  };
}
