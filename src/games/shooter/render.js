// Drawing: raycast walls, billboard sprites, the held gun, the HUD and the menu screens.
import { W, H, PAL, DARKER, FOV_SCALE, PLAYER, WEAPONS, WEAPON_ORDER, WAVES } from './config.js';
import { tileAt, isWallTile, TREES, insideCabin } from './world.js';

// The pixel font comes from the arcade (api.text); createGame hands it over before the first draw.
let drawText = () => {};
export function useText(fn) { drawText = fn; }

const HORIZON = H / 2;
const FOG = [3, 6, 10];
const zbuf = new Float32Array(W).fill(Infinity);

export const fogLevel = d => (d < FOG[0] ? 0 : d < FOG[1] ? 1 : d < FOG[2] ? 2 : 3);

export function makeCamera(x, y, angle) {
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  return { x, y, angle, dirX, dirY, planeX: -dirY * FOV_SCALE, planeY: dirX * FOV_SCALE };
}

/** World point to screen: { screenX, depth } (depth <= 0 is behind the camera). */
export function project(cam, wx, wy) {
  const sx = wx - cam.x, sy = wy - cam.y;
  const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);
  const tx = invDet * (cam.dirY * sx - cam.dirX * sy);
  const depth = invDet * (-cam.planeY * sx + cam.planeX * sy);
  return { screenX: (W / 2) * (1 + tx / depth), depth };
}

/** Screen x for a sky object at a world bearing, or null when off screen. */
function skyX(bearing, angle) {
  let rel = bearing - angle;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  if (Math.abs(rel) > 1.2) return null;
  return W / 2 + (Math.tan(rel) / FOV_SCALE) * (W / 2);
}

const rowAt = d => Math.round(HORIZON + H / (2 * d));

function drawBackdrop(g, art, angle, indoors) {
  if (indoors) {
    const bands = [[0, PAL.bark], [H - rowAt(FOG[0]), PAL.night], [H - rowAt(FOG[1]), PAL.black]];
    bands.forEach(([y, c], i) => { g.fillStyle = c; g.fillRect(0, y, W, (bands[i + 1]?.[0] ?? HORIZON) - y); });
  } else {
    const bands = [[0, PAL.black], [34, PAL.night], [62, PAL.dusk], [80, PAL.bloodDark]];
    bands.forEach(([y, c], i) => { g.fillStyle = c; g.fillRect(0, y, W, (bands[i + 1]?.[0] ?? HORIZON) - y); });
    for (const s of art.stars) {
      const x = skyX(s.a, angle);
      if (x !== null) { g.fillStyle = s.c; g.fillRect(Math.round(x), s.y, 1, 1); }
    }
    const mx = skyX(-Math.PI / 2 + 0.45, angle);
    if (mx !== null) g.drawImage(art.moon, Math.round(mx - art.moon.width / 2), 14);
  }
  const floor = [[HORIZON, PAL.black], [rowAt(FOG[2]), PAL.night], [rowAt(FOG[1]), PAL.bark], [rowAt(FOG[0]), PAL.bloodDark]];
  floor.forEach(([y, c], i) => { g.fillStyle = c; g.fillRect(0, y, W, (floor[i + 1]?.[0] ?? H) - y); });
}

function drawWalls(g, art, cam) {
  for (let col = 0; col < W; col++) {
    const camX = (2 * col) / W - 1;
    const rdx = cam.dirX + cam.planeX * camX, rdy = cam.dirY + cam.planeY * camX;
    let mx = Math.floor(cam.x), my = Math.floor(cam.y);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (cam.x - mx) * ddx : (mx + 1 - cam.x) * ddx;
    let sdy = rdy < 0 ? (cam.y - my) * ddy : (my + 1 - cam.y) * ddy;
    let side = 0;
    for (let i = 0; i < 64; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (isWallTile(mx, my)) break;
    }
    const dist = Math.max(0.0001, side === 0 ? sdx - ddx : sdy - ddy);
    zbuf[col] = dist;
    const face = side === 0 ? (stepX > 0 ? 'W' : 'E') : (stepY > 0 ? 'N' : 'S');
    const set = art.walls[tileAt(mx, my)] ?? art.walls.L;
    const tex = (set.face === face ? set.faceTex : set.tex)[Math.min(3, fogLevel(dist) + side)];
    let wallX = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx;
    wallX -= Math.floor(wallX);
    let texX = Math.floor(wallX * tex.width);
    if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) texX = tex.width - 1 - texX;
    const h = Math.min(H * 8, H / dist);
    g.drawImage(tex, texX, 0, 1, tex.height, col, HORIZON - h / 2, 1, h);
  }
}

/** Billboard standing on the floor at (wx, wy), clipped column by column against the walls. */
function drawBillboard(g, img, cam, wx, wy, heightScale) {
  const { screenX, depth } = project(cam, wx, wy);
  if (depth <= 0.15) return null;
  const full = H / depth, h = full * heightScale, w = h * (img.width / img.height);
  const top = HORIZON + full / 2 - h, left = screenX - w / 2;
  const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(W, Math.ceil(left + w));
  for (let col = x0; col < x1; col++) {
    if (depth >= zbuf[col]) continue;
    const texX = Math.min(img.width - 1, Math.floor(((col - left) / w) * img.width));
    g.drawImage(img, texX, 0, 1, img.height, col, top, 1, h);
  }
  return { screenX, depth, top };
}

const shade = (color, steps) => { for (let i = 0; i < steps; i++) color = DARKER[color]; return color; };
const PLANK_TILT = [0.05, -0.06, 0.04, -0.05, 0.06];

/**
 * Boards nailed across a window: a flat plane on the window's center line, drawn column by column with
 * perspective-correct depth so walls in front clip it. Only boards still in place are drawn.
 */
function drawBarricade(g, cam, b) {
  const NEAR = 0.1;
  const [ax, ay, bx, by] = b.axis === 'x' ? [b.x, b.cy, b.x + 1, b.cy] : [b.cx, b.y, b.cx, b.y + 1];
  let A = project(cam, ax, ay), B = project(cam, bx, by);
  let ua = 0, ub = 1;
  if (A.depth < NEAR && B.depth < NEAR) return;
  if (A.depth < NEAR || B.depth < NEAR) {
    // Depth is linear along the plank in world space, so clip the behind-camera end at the near plane.
    const u = (NEAR - A.depth) / (B.depth - A.depth);
    const clipped = project(cam, ax + (bx - ax) * u, ay + (by - ay) * u);
    if (A.depth < NEAR) { A = clipped; ua = u; } else { B = clipped; ub = u; }
  }
  let L = { s: A.screenX, iz: 1 / A.depth, uz: ua / A.depth };
  let R = { s: B.screenX, iz: 1 / B.depth, uz: ub / B.depth };
  if (L.s > R.s) [L, R] = [R, L];
  const x0 = Math.max(0, Math.ceil(L.s)), x1 = Math.min(W - 1, Math.floor(R.s));
  for (let col = x0; col <= x1; col++) {
    const k = R.s === L.s ? 0 : (col - L.s) / (R.s - L.s);
    const iz = L.iz + (R.iz - L.iz) * k, depth = 1 / iz;
    if (depth >= zbuf[col]) continue;
    const u = (L.uz + (R.uz - L.uz) * k) / iz;
    const full = H / depth, top = HORIZON - full / 2, fog = fogLevel(depth);
    const th = Math.max(1, Math.round(full * 0.075));
    for (let i = 0; i < b.boards; i++) {
      const y = Math.round(top + full * (0.24 + i * 0.12 + PLANK_TILT[i % PLANK_TILT.length] * (u - 0.5)));
      g.fillStyle = shade(PAL.tan, fog);
      g.fillRect(col, y, 1, th);
      if (th >= 3) { g.fillStyle = shade(PAL.log, fog); g.fillRect(col, y + th - 1, 1, 1); }
    }
  }
}

function pickImage(sheet, fog, flash) {
  return flash > 0 ? sheet.flash : sheet.fog[fog];
}

function drawEnemy(g, art, cam, e, clock) {
  const depth = e._depth, fog = fogLevel(depth);
  if (e.kind === 'zombie') {
    const sheet = e.swipe > 0 ? art.zombie.attack : Math.floor(e.anim) % 2 ? art.zombie.b : art.zombie.a;
    drawBillboard(g, pickImage(sheet, fog, e.flash), cam, e.x, e.y, 0.85);
    return;
  }
  if (e.state === 'windup') {
    const img = Math.floor(clock * 12) % 2 ? art.bear.rear.red : pickImage(art.bear.rear, fog, e.flash);
    const r = drawBillboard(g, img, cam, e.x, e.y, 1.35);
    const col = r && Math.round(r.screenX);
    if (r && col >= 0 && col < W && zbuf[col] > depth) drawText(g, '!', r.screenX, r.top - 14, PAL.red, { scale: 3, align: 'center', shadow: PAL.black });
    return;
  }
  const sheet = e.state === 'stunned' ? art.bear.a : Math.floor(e.anim) % 2 ? art.bear.b : art.bear.a;
  const r = drawBillboard(g, pickImage(sheet, fog, e.flash), cam, e.x, e.y, 1.05);
  if (r && e.state === 'stunned') {
    const col = Math.round(r.screenX);
    if (col >= 0 && col < W && zbuf[col] > depth) drawText(g, '* * *', r.screenX + Math.sin(clock * 8) * 4, r.top - 6, PAL.gold, { align: 'center' });
  }
}

function drawParticles(g, cam, particles) {
  for (const q of particles) {
    const { screenX, depth } = project(cam, q.x, q.y);
    if (depth <= 0.2) continue;
    const col = Math.round(screenX);
    if (col < 0 || col >= W || zbuf[col] <= depth) continue;
    const full = H / depth, s = Math.max(1, Math.round(q.size * full));
    g.fillStyle = q.color;
    g.fillRect(col - (s >> 1), Math.round(HORIZON + full * (0.5 - q.z)) - (s >> 1), s, s);
  }
}

function drawGun(g, art, p) {
  const vm = art.guns[p.weapon], k = 2;
  const w = vm.img.width * k, h = vm.img.height * k;
  const x = Math.round(W / 2 - w / 2 + 24 + Math.sin(p.bob) * 4);
  const y = Math.round(H - h + Math.abs(Math.sin(p.bob)) * 3 + p.recoil + p.raise * 40);
  if (p.muzzle > 0) {
    const f = art.flash;
    g.drawImage(f, x + vm.muzzle[0] * k - f.width, y + vm.muzzle[1] * k - f.height, f.width * 2, f.height * 2);
  }
  g.drawImage(vm.img, x, y, w, h);
}

// ---------- HUD ----------

function panel(g, x, y, w, h) {
  g.fillStyle = PAL.black;
  g.fillRect(x, y, w, h);
  g.fillStyle = PAL.dusk;
  g.fillRect(x, y, w, 1);
}

function bar(g, x, y, w, h, frac, color) {
  g.fillStyle = PAL.black; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = PAL.bloodDark; g.fillRect(x, y, w, h);
  g.fillStyle = color; g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
}

function drawHud(g, world, o) {
  const p = world.player;
  // crosshair + hit marker
  g.fillStyle = PAL.bone;
  g.fillRect(W / 2 - 4, HORIZON, 3, 1); g.fillRect(W / 2 + 2, HORIZON, 3, 1);
  g.fillRect(W / 2, HORIZON - 4, 1, 3); g.fillRect(W / 2, HORIZON + 2, 1, 3);
  if (world.hitMarker > 0) {
    g.fillStyle = PAL.red;
    for (let i = 2; i < 5; i++) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(W / 2 + sx * i, HORIZON + sy * i, 1, 1);
  }

  panel(g, 2, 2, 66, 17);
  drawText(g, `WAVE ${Math.max(1, world.wave + 1)}/${WAVES.length}`, 5, 5, PAL.bone);
  drawText(g, `ZOMBIES ${o.remaining}`, 5, 12, PAL.moss);

  const bear = world.bear;
  if (bear) {
    const charging = bear.state === 'windup';
    panel(g, W / 2 - 64, 2, 128, 17);
    drawText(g, charging ? 'CHARGE INCOMING!' : bear.state === 'stunned' ? 'THE RED BEAR - STUNNED' : 'THE RED BEAR', W / 2, 5,
      charging ? (Math.floor(o.clock * 10) % 2 ? PAL.gold : PAL.red) : PAL.ember, { align: 'center' });
    bar(g, W / 2 - 60, 12, 120, 4, bear.hp / bear.maxHp, PAL.red);
  }

  panel(g, 2, H - 20, 88, 18);
  drawText(g, 'HP', 5, H - 16, PAL.bone);
  const low = p.health < 35;
  bar(g, 16, H - 16, 50, 5, p.health / PLAYER.maxHealth, low && Math.floor(o.clock * 4) % 2 ? PAL.ember : PAL.red);
  drawText(g, Math.ceil(p.health), 70, H - 16, low ? PAL.red : PAL.bone);
  drawText(g, `${world.points} PTS`, 5, H - 9, PAL.gold);

  panel(g, W - 90, H - 20, 88, 18);
  drawText(g, WEAPONS[p.weapon].name, W - 5, H - 16, PAL.bone, { align: 'right' });
  WEAPON_ORDER.forEach((id, i) => {
    const c = p.weapon === id ? PAL.gold : p.owned.has(id) ? PAL.bone : PAL.dusk;
    drawText(g, String(i + 1), W - 29 + i * 9, H - 9, c);
  });
  drawText(g, 'GUN', W - 87, H - 9, PAL.fog);

  if (o.buy) {
    const { weapon: w, owned, equipped, affordable, denied } = o.buy;
    const line2 = equipped ? 'EQUIPPED' : owned ? 'OWNED - PRESS E TO EQUIP' : affordable ? 'PRESS E TO BUY' : `NEED ${w.price} PTS`;
    const c2 = equipped ? PAL.fog : owned || affordable ? PAL.gold : denied && Math.floor(o.clock * 12) % 2 ? PAL.bone : PAL.red;
    panel(g, W / 2 - 70, 124, 140, 20);
    drawText(g, `${w.name} - ${w.price} PTS`, W / 2, 128, PAL.bone, { align: 'center' });
    drawText(g, line2, W / 2, 136, c2, { align: 'center' });
  }

  if (o.repair) {
    const { boards, max, progress, blocked, capped } = o.repair;
    const full = boards >= max;
    const line2 = full ? 'WINDOW SECURE' : blocked ? 'CLEAR THE WINDOW FIRST' : capped ? 'HOLD E TO REPAIR (NO PTS)' : 'HOLD E TO REPAIR';
    panel(g, W / 2 - 70, 124, 140, progress > 0 ? 26 : 20);
    drawText(g, `WINDOW - ${boards}/${max} BOARDS`, W / 2, 128, boards === 0 ? PAL.red : PAL.bone, { align: 'center' });
    drawText(g, line2, W / 2, 136, full ? PAL.fog : blocked ? PAL.red : PAL.gold, { align: 'center' });
    if (progress > 0) bar(g, W / 2 - 40, 144, 80, 3, progress, PAL.gold);
  }

  if (world.banner.time > 0) {
    drawText(g, world.banner.text, W / 2, 40, PAL.gold, { scale: 2, align: 'center', shadow: PAL.black });
    if (world.banner.sub) drawText(g, world.banner.sub, W / 2, 55, PAL.bone, { align: 'center', shadow: PAL.black });
  } else if (world.phase === 'intermission') {
    drawText(g, `NEXT WAVE IN ${Math.ceil(world.phaseTime)}`, W / 2, 40, PAL.bone, { align: 'center', shadow: PAL.black });
  }

  if (o.live && !o.locked) drawText(g, 'CLICK TO AIM WITH THE MOUSE', W / 2, 24, PAL.fog, { align: 'center', shadow: PAL.black });

  const pain = p.hurtFlash / 0.35;
  const edge = pain > 0 ? Math.ceil(pain * 8) : low ? 2 : 0;
  if (edge) {
    g.fillStyle = pain > 0 ? PAL.blood : PAL.bloodDark;
    g.fillRect(0, 0, W, edge); g.fillRect(0, H - edge, W, edge); g.fillRect(0, 0, edge, H); g.fillRect(W - edge, 0, edge, H);
  }
}

/** One gameplay frame: world, sprites, gun, HUD. */
export function drawFrame(g, art, world, o) {
  const p = world.player;
  // Hits and the bear's charge shake 2 px; the bear's distant footsteps only rumble 1 px.
  const amp = !o.live ? 0 : world.shakeTime > 0 ? 2 : world.rumbleTime > 0 ? 1 : 0;
  g.save();
  if (amp) g.translate(Math.round(Math.random() * 2 * amp - amp), Math.round(Math.random() * 2 * amp - amp));
  const cam = makeCamera(p.x, p.y, p.angle);
  drawBackdrop(g, art, p.angle, insideCabin(p.x, p.y));
  drawWalls(g, art, cam);
  const sprites = TREES.map(t => ({ kind: 'tree', x: t.x, y: t.y }))
    .concat(world.enemies)
    .concat(world.barricades.filter(b => b.boards > 0).map(b => ({ kind: 'barricade', ref: b, x: b.cx, y: b.cy })));
  for (const s of sprites) s._depth = project(cam, s.x, s.y).depth;
  sprites.sort((a, b) => b._depth - a._depth);
  for (const s of sprites) {
    if (s.kind === 'barricade') { drawBarricade(g, cam, s.ref); continue; } // clips itself at the near plane
    if (s._depth <= 0.15) continue;
    if (s.kind === 'tree') drawBillboard(g, art.tree[fogLevel(s._depth)], cam, s.x, s.y, 1.9);
    else drawEnemy(g, art, cam, s, o.clock);
  }
  drawParticles(g, cam, world.particles);
  g.restore();
  drawGun(g, art, p);
  drawHud(g, world, o);
}

// ---------- screens ----------

const CONTROLS = [
  ['WASD', 'MOVE'],
  ['MOUSE', 'AIM (CLICK TO CAPTURE)'],
  ['ARROWS', 'TURN / MOVE'],
  ['CLICK / SPACE', 'FIRE'],
  ['E', 'BUY / HOLD: REPAIR'],
  ['1 2 3 / Q', 'SWITCH GUN'],
  ['ESC', 'PAUSE / ARCADE MENU'],
  ['M', 'MUTE'],
];

function drawControls(g, x, y) {
  CONTROLS.forEach(([k, v], i) => {
    drawText(g, k, x + 52, y + i * 8, PAL.gold, { align: 'right' });
    drawText(g, v, x + 58, y + i * 8, PAL.bone);
  });
}

export function drawTitle(g, art, clock, best) {
  g.drawImage(art.title, 0, 0);
  if (Math.floor(clock * 1.5) % 4 !== 0) { g.fillStyle = PAL.red; g.fillRect(214, 140, 2, 1); g.fillRect(219, 140, 2, 1); }
  drawText(g, 'BEAR IN THE', 160, 14, PAL.bone, { scale: 2, align: 'center', shadow: PAL.black });
  drawText(g, 'RED WOODS', 160, 28, PAL.red, { scale: 4, align: 'center', shadow: PAL.black });
  panel(g, 92, 56, 136, 70);
  drawControls(g, 96, 60);
  drawText(g, 'SURVIVE 3 WAVES. KILL THE BEAR.', 160, 128, PAL.bone, { align: 'center', shadow: PAL.black });
  if (Math.floor(clock * 2) % 2 === 0) drawText(g, 'PRESS ENTER OR CLICK TO START', 160, 160, PAL.gold, { align: 'center', shadow: PAL.black });
  if (best) drawText(g, `BEST ${best}`, 4, H - 8, PAL.fog);
}

// Win/lose card. Text stays above and below the middle, where the arcade's result menu opens next.
export function drawEnd(g, world, won, t) {
  g.fillStyle = won ? PAL.night : PAL.bloodDark;
  g.globalAlpha = Math.min(0.85, t * 1.5);
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  drawText(g, won ? 'YOU SURVIVED' : 'THE WOODS TOOK YOU', 160, 10, won ? PAL.gold : PAL.red, { scale: 3, align: 'center', shadow: PAL.black });
  drawText(g, won ? 'THE RED BEAR IS DEAD. DAWN COMES.' : `FELL ON WAVE ${Math.max(1, world.wave + 1)} OF ${WAVES.length}`, 160, 32, PAL.bone, { align: 'center', shadow: PAL.black });
  drawText(g, `SCORE ${world.earned}`, 160, 142, PAL.gold, { scale: 2, align: 'center', shadow: PAL.black });
  drawText(g, `KILLS ${world.kills}    TIME ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`, 160, 160, PAL.bone, { align: 'center', shadow: PAL.black });
}
