// Grid raycaster: draws walls column by column on the shared 2D canvas and fills a depth buffer
// so billboard sprites can be clipped behind walls.

const OPEN = new Set(['.', 'P', 'S']);

export function isSolid(map, x, y) {
  const tile = map[Math.floor(y)]?.[Math.floor(x)];
  return tile === undefined || !OPEN.has(tile);
}

export function findTiles(map, ch) {
  const out = [];
  map.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push({ x, y }); }));
  return out;
}

/** Camera vectors for a position + angle. Plane points to screen-right with length = tan(FOV/2). */
export function makeCamera(x, y, angle, fovScale) {
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  return { x, y, dirX, dirY, planeX: -dirY * fovScale, planeY: dirX * fovScale };
}

/** Project a world point into screen space: { screenX, depth } (depth <= 0 means behind the camera). */
export function project(cam, wx, wy, viewW) {
  const sx = wx - cam.x, sy = wy - cam.y;
  const invDet = 1 / (cam.planeX * cam.dirY - cam.dirX * cam.planeY);
  const tx = invDet * (cam.dirY * sx - cam.dirX * sy);
  const depth = invDet * (-cam.planeY * sx + cam.planeX * sy);
  return { screenX: (viewW / 2) * (1 + tx / depth), depth };
}

function band(dist) {
  return dist < 2.5 ? 0 : dist < 5 ? 1 : dist < 8.5 ? 2 : 3;
}

export function drawWalls(g, map, cam, viewW, viewH, zbuf, shades) {
  for (let col = 0; col < viewW; col++) {
    const camX = (2 * col) / viewW - 1;
    const rdx = cam.dirX + cam.planeX * camX;
    const rdy = cam.dirY + cam.planeY * camX;
    let mx = Math.floor(cam.x), my = Math.floor(cam.y);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
    let sdx = rdx < 0 ? (cam.x - mx) * ddx : (mx + 1 - cam.x) * ddx;
    let sdy = rdy < 0 ? (cam.y - my) * ddy : (my + 1 - cam.y) * ddy;
    let side = 0, tile = '#';
    for (let i = 0; i < 64; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      tile = map[my]?.[mx];
      if (tile === undefined || !OPEN.has(tile)) break;
    }
    const dist = Math.max(0.0001, side === 0 ? sdx - ddx : sdy - ddy);
    zbuf[col] = dist;
    const h = Math.min(viewH * 8, viewH / dist);
    const top = (viewH - h) / 2;
    const palette = shades[tile] ?? shades['#'];
    const shade = Math.min(palette.length - 1, band(dist) + side);
    g.fillStyle = palette[shade];
    g.fillRect(col, top, 1, h);
    // Block seams + one mortar line give a cheap stone-block texture.
    let wallX = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx;
    wallX -= Math.floor(wallX);
    const darker = palette[Math.min(palette.length - 1, shade + 1)];
    g.fillStyle = darker;
    if (wallX < 0.05 || Math.abs(wallX - 0.5) < 0.025) g.fillRect(col, top, 1, h);
    else g.fillRect(col, top + h * 0.5, 1, Math.max(1, h / 48));
  }
}

/** Draw a billboard sprite standing on the floor at world (wx, wy), clipped by the depth buffer. */
export function drawBillboard(g, sprite, cam, wx, wy, viewW, viewH, zbuf, heightScale = 0.75, lift = 0) {
  const { screenX, depth } = project(cam, wx, wy, viewW);
  if (depth <= 0.15) return;
  const full = viewH / depth;            // height of a full wall at this depth
  const h = full * heightScale;
  const w = h * (sprite.width / sprite.height);
  const floorY = viewH / 2 + full / 2;
  const top = floorY - h - lift * full;
  const left = screenX - w / 2;
  const x0 = Math.max(0, Math.floor(left)), x1 = Math.min(viewW, Math.ceil(left + w));
  for (let col = x0; col < x1; col++) {
    if (depth >= zbuf[col]) continue;
    const texX = Math.min(sprite.width - 1, Math.floor(((col - left) / w) * sprite.width));
    g.drawImage(sprite, texX, 0, 1, sprite.height, col, top, 1, h);
  }
}
