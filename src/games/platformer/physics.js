// Axis-separated AABB vs tile collision. Bodies are { x, y, w, h } in pixels.
// solid(col, row) decides which tiles block. Movement is sub-stepped so fast falls never tunnel.
const MAX_STEP = 4;

export function moveBody(body, dx, dy, solid, tile) {
  const result = { hitX: false, hitY: false, onGround: false, hitCeiling: false };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
  for (let i = 0; i < steps; i++) {
    if (!result.hitX && dx) result.hitX = stepX(body, dx / steps, solid, tile);
    if (!result.hitY && dy) {
      const hit = stepY(body, dy / steps, solid, tile);
      if (hit) {
        result.hitY = true;
        if (dy > 0) result.onGround = true; else result.hitCeiling = true;
      }
    }
  }
  return result;
}

function stepX(body, dx, solid, T) {
  body.x += dx;
  const top = Math.floor(body.y / T);
  const bottom = Math.floor((body.y + body.h - 0.01) / T);
  const col = dx > 0 ? Math.floor((body.x + body.w - 0.01) / T) : Math.floor(body.x / T);
  for (let row = top; row <= bottom; row++) {
    if (solid(col, row)) {
      body.x = dx > 0 ? col * T - body.w : (col + 1) * T;
      return true;
    }
  }
  return false;
}

function stepY(body, dy, solid, T) {
  body.y += dy;
  const left = Math.floor(body.x / T);
  const right = Math.floor((body.x + body.w - 0.01) / T);
  const row = dy > 0 ? Math.floor((body.y + body.h - 0.01) / T) : Math.floor(body.y / T);
  for (let col = left; col <= right; col++) {
    if (solid(col, row)) {
      body.y = dy > 0 ? row * T - body.h : (row + 1) * T;
      return true;
    }
  }
  return false;
}

/** True if the body is standing on something solid (1px probe below its feet). */
export function isGrounded(body, solid, T) {
  const row = Math.floor((body.y + body.h + 0.5) / T);
  const left = Math.floor(body.x / T);
  const right = Math.floor((body.x + body.w - 0.01) / T);
  for (let col = left; col <= right; col++) if (solid(col, row)) return true;
  return false;
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
