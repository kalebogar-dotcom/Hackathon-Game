// The map, collision, hitscan rays and enemy pathfinding. No DOM access.

// F tree line (wall)     T single tree (sprite, trunk blocks)   L log cabin wall   C crate
// 1 shotgun on a wall    2 SMG on a wall                          . ground
// P player start (facing north)                                   S zombie spawn
export const MAP = Object.freeze([
  'FFFFFFFFFFFFFFFFFFFFFFFF',
  'F..S.......T.......S...F',
  'F.....T..........T.....F',
  'F.T..................T.F',
  'F......LLLL.L2LLL......F',
  'F..T...L........L....T.F',
  'F......L..C.....L......F',
  'FS.....L............T.SF',
  'F......LC.......L......F',
  'F.T....L........L..T...F',
  'F......LLLL..L1LL......F',
  'F......................F',
  'F...T..........T.......F',
  'F..........P...........F',
  'F.......T.......T......F',
  'F.T..................T.F',
  'F....T.......T.........F',
  'F..S.......T.......S...F',
  'FFFFFFFFFFFFFFFFFFFFFFFF',
]);
export const MAP_W = MAP[0].length;
export const MAP_H = MAP.length;

const SOLID = new Set(['F', 'L', 'C', '1', '2']);
export const tileAt = (tx, ty) => MAP[ty]?.[tx] ?? 'F';
export const isWallTile = (tx, ty) => SOLID.has(tileAt(tx, ty));
export const isWall = (x, y) => isWallTile(Math.floor(x), Math.floor(y));
/** Tiles enemies path through: not a wall and not a tree. */
export const isWalkableTile = (tx, ty) => { const t = tileAt(tx, ty); return !SOLID.has(t) && t !== 'T'; };

export function findTiles(ch) {
  const out = [];
  MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push({ x, y }); }));
  return out;
}

export const TREES = Object.freeze(findTiles('T').map(t => ({ x: t.x + 0.5, y: t.y + 0.5 })));
export const TRUNK_RADIUS = 0.3;
export const CABIN = Object.freeze({ x0: 8, y0: 5, x1: 15, y1: 9 }); // interior tiles, inclusive
export const insideCabin = (x, y) => x >= CABIN.x0 && x < CABIN.x1 + 1 && y >= CABIN.y0 && y < CABIN.y1 + 1;

const FACE_NORMAL = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function mount(ch, weapon, face) {
  const t = findTiles(ch)[0];
  const [nx, ny] = FACE_NORMAL[face];
  return Object.freeze({ weapon, tile: ch, face, x: t.x, y: t.y, fx: t.x + 0.5 + nx * 0.5, fy: t.y + 0.5 + ny * 0.5 });
}
// Each wall gun: the tile it hangs on, the face it shows on, and (fx, fy) the middle of that face.
export const WALL_BUYS = Object.freeze([mount('1', 'shotgun', 'S'), mount('2', 'smg', 'S')]);

/** Move a circle by (dx, dy), sliding along walls and trunks. Returns true if anything blocked it. */
export function moveCircle(body, dx, dy, r) {
  let blocked = false;
  if (dx) {
    const nx = body.x + dx, edge = nx + Math.sign(dx) * r;
    if (!isWall(edge, body.y - r * 0.9) && !isWall(edge, body.y + r * 0.9)) body.x = nx; else blocked = true;
  }
  if (dy) {
    const ny = body.y + dy, edge = ny + Math.sign(dy) * r;
    if (!isWall(body.x - r * 0.9, edge) && !isWall(body.x + r * 0.9, edge)) body.y = ny; else blocked = true;
  }
  for (const t of TREES) {
    const ox = body.x - t.x, oy = body.y - t.y, min = r + TRUNK_RADIUS;
    if (Math.abs(ox) >= min || Math.abs(oy) >= min) continue;
    const d = Math.hypot(ox, oy);
    if (d >= min || d < 1e-4) continue;
    const k = (min - d) / d;
    const px = body.x + ox * k, py = body.y + oy * k;
    if (!isWall(px + Math.sign(ox) * r, py) && !isWall(px, py + Math.sign(oy) * r)) { body.x = px; body.y = py; }
    blocked = true;
  }
  return blocked;
}

/** Distance along the unit ray (dx, dy) to the first wall tile. */
export function castRay(x, y, dx, dy, max = 48) {
  let mx = Math.floor(x), my = Math.floor(y);
  const ddx = dx === 0 ? 1e30 : Math.abs(1 / dx), ddy = dy === 0 ? 1e30 : Math.abs(1 / dy);
  const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
  let tx = dx < 0 ? (x - mx) * ddx : (mx + 1 - x) * ddx;
  let ty = dy < 0 ? (y - my) * ddy : (my + 1 - y) * ddy;
  let t = 0;
  while (t < max) {
    if (tx < ty) { t = tx; tx += ddx; mx += sx; } else { t = ty; ty += ddy; my += sy; }
    if (isWallTile(mx, my)) return t;
  }
  return max;
}

/** Distance along the unit ray to the nearest tree trunk (Infinity if none). */
export function trunkHit(x, y, dx, dy) {
  let best = Infinity;
  const r2 = TRUNK_RADIUS * TRUNK_RADIUS;
  for (const tr of TREES) {
    const ox = tr.x - x, oy = tr.y - y, t = ox * dx + oy * dy;
    if (t <= 0) continue;
    const perp2 = ox * ox + oy * oy - t * t;
    if (perp2 > r2) continue;
    const hit = t - Math.sqrt(r2 - perp2);
    if (hit > 0 && hit < best) best = hit;
  }
  return best;
}

export function segmentClear(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay);
  if (d < 1e-6) return true;
  const dx = (bx - ax) / d, dy = (by - ay) / d;
  return castRay(ax, ay, dx, dy, d + 0.01) >= d && trunkHit(ax, ay, dx, dy) >= d;
}

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Breadth-first distance field from the player's tile. Enemies walk downhill, so they go around walls and through openings. */
export function createNav() {
  const dist = new Int16Array(MAP_W * MAP_H).fill(-1);
  const queue = new Int32Array(MAP_W * MAP_H);
  let seed = -1;

  function rebuild(tx, ty) {
    dist.fill(-1);
    let head = 0, tail = 0;
    const s = ty * MAP_W + tx;
    dist[s] = 0;
    queue[tail++] = s;
    while (head < tail) {
      const c = queue[head++], cx = c % MAP_W, cy = (c / MAP_W) | 0;
      for (const [ox, oy] of DIRS4) {
        const nx = cx + ox, ny = cy + oy;
        if (!isWalkableTile(nx, ny)) continue;
        const n = ny * MAP_W + nx;
        if (dist[n] >= 0) continue;
        dist[n] = dist[c] + 1;
        queue[tail++] = n;
      }
    }
  }

  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H ? -1 : dist[ty * MAP_W + tx]);

  return {
    update(px, py) {
      const tx = Math.floor(px), ty = Math.floor(py), k = ty * MAP_W + tx;
      if (k !== seed) { seed = k; rebuild(tx, ty); }
    },
    distanceAt: at,
    /** Center of the next tile toward the player, or null when already in the player's tile. */
    waypoint(x, y) {
      const tx = Math.floor(x), ty = Math.floor(y);
      const here = at(tx, ty);
      if (here === 0) return null;
      let best = null, bestD = here >= 0 ? here : Infinity;
      for (const [ox, oy] of DIRS8) {
        const nx = tx + ox, ny = ty + oy;
        if (!isWalkableTile(nx, ny)) continue;
        if (ox && oy && (!isWalkableTile(tx + ox, ty) || !isWalkableTile(tx, ty + oy))) continue; // no corner cutting
        const nd = at(nx, ny);
        if (nd >= 0 && nd < bestD) { bestD = nd; best = { x: nx + 0.5, y: ny + 0.5 }; }
      }
      return best;
    },
  };
}
