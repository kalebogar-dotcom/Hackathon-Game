// PIXEL CHIC renderer: builds a 26x34 sprite with an automatic dark outline, cached per look.
import { SKINS, EYE_COLORS, HAIR_COLORS, HAIR, SLOT_ITEMS } from './items.js';

export const SPR_W = 26;
export const SPR_H = 34;
const cache = new Map();

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (h, o, f) => {
  const a = rgb(h), b = rgb(o);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
};

function build(pal, look, blink) {
  const hx = (c) => (c[0] === '#' ? c : pal[c]);
  const skin = SKINS[look.skin].c;
  const hair = hx(HAIR_COLORS[look.hairColor].c);
  const eye = hx(EYE_COLORS[look.eyes].c);
  const style = HAIR.find((h) => h.id === look.hair) || HAIR[0];
  const base = {
    s: skin, sd: mix(skin, '#000000', 0.22),
    h: hair, hd: mix(hair, '#000000', 0.3), hl: mix(hair, '#ffffff', 0.3),
  };

  const c = document.createElement('canvas');
  c.width = SPR_W; c.height = SPR_H;
  const x = c.getContext('2d');

  const paint = (sh, colors, dflt) => {
    const isO = sh[0] === 'o';
    const key = (isO ? sh[5] : sh[4]) || dflt;
    x.fillStyle = colors[key] || hx(key);
    if (isO) {
      const [, cx, cy, rx, ry] = sh;
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
        for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
          if (((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2 <= 1) x.fillRect(px + 1, py + 1, 1, 1);
        }
      }
    } else {
      x.fillRect(sh[0] + 1, sh[1] + 1, sh[2], sh[3]);
    }
  };

  const drawItem = (slot) => {
    const piece = look[slot];
    if (!piece) return;
    const item = SLOT_ITEMS[slot].find((i) => i.id === piece.id);
    if (!item) return;
    const c1 = hx(piece.c), c2 = hx(item.c2);
    const cols = {
      ...base, c1, c1d: mix(c1, '#000000', 0.28), c1l: mix(c1, '#ffffff', 0.25),
      c2, c2d: mix(c2, '#000000', 0.28),
    };
    for (const sh of item.rects) paint(sh, cols, 'c1');
  };

  // 1. hair behind the body
  for (const sh of style.back) paint(sh, base, 'h');

  // 2. body
  const BODY = [
    [8, 2, 8, 1], [6, 3, 12, 1], [5, 4, 14, 8], [6, 12, 12, 1], [8, 13, 8, 1, 'sd'],
    [8, 14, 8, 8], [6, 14, 2, 8], [16, 14, 2, 8],
    [9, 22, 3, 8], [12, 22, 3, 8], [12, 23, 1, 7, 'sd'], [8, 30, 4, 2], [12, 30, 4, 2],
  ];
  for (const sh of BODY) paint(sh, base, 's');

  // 3. face
  paint([6, 10, 2, 1, '#f28ab2'], base, 's');
  paint([16, 10, 2, 1, '#f28ab2'], base, 's');
  for (const ex of [7, 14]) {
    if (blink) {
      paint([ex, 9, 3, 1, 'black'], base, 's');
    } else {
      paint([ex, 7, 3, 1, 'black'], base, 's');
      x.fillStyle = eye; x.fillRect(ex + 1, 9, 3, 2);
      paint([ex, 8, 3, 2, eye], base, 's');
      paint([ex + 1, 9, 1, 1, 'black'], base, 's');
      paint([ex, 8, 1, 1, 'cream'], base, 's');
    }
  }
  paint([11, 11, 2, 1, 'maroon'], base, 's');

  // 4. clothes (bottom, shoes, top or dress, jacket)
  if (!look.dress) drawItem('bottom');
  drawItem('shoes');
  if (look.dress) drawItem('dress'); else drawItem('top');
  drawItem('outer');

  // 5. front hair, brows, accessory
  for (const sh of style.front) paint(sh, base, 'h');
  paint([7, 5, 3, 1, 'hd'], base, 'hd');
  paint([14, 5, 3, 1, 'hd'], base, 'hd');
  drawItem('acc');

  // 6. outline
  const img = x.getImageData(0, 0, SPR_W, SPR_H);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const [r, g, b] = rgb(hx('night'));
  const solid = (px, py) => px >= 0 && py >= 0 && px < SPR_W && py < SPR_H && src[(py * SPR_W + px) * 4 + 3] > 0;
  for (let py = 0; py < SPR_H; py++) {
    for (let px = 0; px < SPR_W; px++) {
      if (!solid(px, py) && (solid(px - 1, py) || solid(px + 1, py) || solid(px, py - 1) || solid(px, py + 1))) {
        const i = (py * SPR_W + px) * 4;
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
      }
    }
  }
  x.putImageData(new ImageData(out, SPR_W, SPR_H), 0, 0);
  return c;
}

export function renderLook(pal, look, blink) {
  const key = JSON.stringify(look) + (blink ? 'b' : '');
  let spr = cache.get(key);
  if (!spr) {
    if (cache.size > 80) cache.clear();
    spr = build(pal, look, blink);
    cache.set(key, spr);
  }
  return spr;
}

export function drawLook(g, pal, look, ox, oy, s, blink) {
  g.imageSmoothingEnabled = false;
  g.drawImage(renderLook(pal, look, blink), ox, oy, SPR_W * s, SPR_H * s);
}

// PNG data URL of the character on a colored backdrop
export function exportPng(pal, look, scale = 8) {
  const spr = renderLook(pal, look, false);
  const pad = 3;
  const c = document.createElement('canvas');
  c.width = (SPR_W + pad * 2) * scale;
  c.height = (SPR_H + pad * 2) * scale;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = pal.violet;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(spr, pad * scale, pad * scale, SPR_W * scale, SPR_H * scale);
  return c.toDataURL('image/png');
}
