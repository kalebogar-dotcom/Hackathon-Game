// PIXEL CHIC renderer: layered 26x38 character + prize sprites with automatic outlines, cached.
import { SKINS, EYE_COLORS, HAIR_COLORS, HAIR, SLOT_ITEMS } from './items.js';

export const SPR_W = 26;
export const SPR_H = 38;
export const PRIZE_W = 18;
export const PRIZE_H = 20;
const OX = 1, OY = 5; // room for hats above the head
const cache = new Map();
const pcache = new Map();

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (h, o, f) => {
  const a = rgb(h), b = rgb(o);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, '0')).join('');
};

function makePaint(x, hx, ox, oy) {
  return (sh, colors, dflt) => {
    const isO = sh[0] === 'o';
    const key = (isO ? sh[5] : sh[4]) || dflt;
    x.fillStyle = colors[key] || hx(key);
    if (isO) {
      const [, cx, cy, rx, ry] = sh;
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
        for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
          if (((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2 <= 1) x.fillRect(px + ox, py + oy, 1, 1);
        }
      }
    } else {
      x.fillRect(sh[0] + ox, sh[1] + oy, sh[2], sh[3]);
    }
  };
}

function outline(x, W, H, color) {
  const img = x.getImageData(0, 0, W, H);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const [r, g, b] = rgb(color);
  const solid = (px, py) => px >= 0 && py >= 0 && px < W && py < H && src[(py * W + px) * 4 + 3] > 0;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      if (!solid(px, py) && (solid(px - 1, py) || solid(px + 1, py) || solid(px, py - 1) || solid(px, py + 1))) {
        const i = (py * W + px) * 4;
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
      }
    }
  }
  x.putImageData(new ImageData(out, W, H), 0, 0);
}

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
  const paint = makePaint(x, hx, OX, OY);

  const drawItem = (slot) => {
    const piece = look[slot];
    if (!piece) return;
    const item = (SLOT_ITEMS[slot] || []).find((i) => i.id === piece.id);
    if (!item) return;
    const c1 = hx(piece.c), c2 = hx(item.c2);
    const cols = {
      ...base, c1, c1d: mix(c1, '#000000', 0.28), c1l: mix(c1, '#ffffff', 0.25),
      c2, c2d: mix(c2, '#000000', 0.28),
    };
    for (const sh of item.rects) paint(sh, cols, 'c1');
  };

  // behind the body: back hair, wings / capes / tails
  for (const sh of style.back) paint(sh, base, 'h');
  drawItem('back');

  const BODY = [
    [8, 2, 8, 1], [6, 3, 12, 1], [5, 4, 14, 8], [6, 12, 12, 1], [8, 13, 8, 1, 'sd'],
    [8, 14, 8, 8], [6, 14, 2, 8], [16, 14, 2, 8],
    [9, 22, 3, 8], [12, 22, 3, 8], [12, 23, 1, 7, 'sd'], [8, 30, 4, 2], [12, 30, 4, 2],
  ];
  for (const sh of BODY) paint(sh, base, 's');

  // face
  paint([6, 10, 2, 1, '#f28ab2'], base, 's');
  paint([16, 10, 2, 1, '#f28ab2'], base, 's');
  for (const ex of [7, 14]) {
    if (blink) {
      paint([ex, 9, 3, 1, 'black'], base, 's');
    } else {
      paint([ex, 7, 3, 1, 'black'], base, 's');
      paint([ex, 8, 3, 2, eye], base, 's');
      paint([ex + 1, 9, 1, 1, 'black'], base, 's');
      paint([ex, 8, 1, 1, 'cream'], base, 's');
    }
  }
  paint([11, 11, 2, 1, 'maroon'], base, 's');

  // clothes
  if (!look.dress) drawItem('bottom');
  drawItem('shoes');
  if (look.dress) drawItem('dress'); else drawItem('top');
  drawItem('outer');

  // front hair, brows, hat, accessory
  for (const sh of style.front) paint(sh, base, 'h');
  paint([7, 5, 3, 1, 'hd'], base, 'hd');
  paint([14, 5, 3, 1, 'hd'], base, 'hd');
  drawItem('hat');
  drawItem('acc');

  outline(x, SPR_W, SPR_H, hx('night'));
  return c;
}

function buildPrize(pal, kind, bowColor) {
  const hx = (c) => (c[0] === '#' ? c : pal[c]);
  const bow = hx(bowColor || 'red');
  const c = document.createElement('canvas');
  c.width = PRIZE_W; c.height = PRIZE_H;
  const x = c.getContext('2d');
  const paint = makePaint(x, hx, 1, 1);
  const cols = {
    br: '#a8683a', tan: '#e8c39a', pk: '#f28ab2', wh: '#f4f6ff', sh: '#c9d2ee',
    bw: bow, bd: mix(bow, '#000000', 0.3),
  };
  let shapes;
  if (kind === 'ghost') {
    shapes = [
      ['o', 8, 6.5, 6, 5.5, 'wh'], [2, 7, 12, 9, 'wh'], [12, 8, 2, 8, 'sh'],
      [2, 16, 3, 1, 'wh'], [6, 16, 4, 1, 'wh'], [11, 16, 3, 1, 'wh'],
      [0, 10, 2, 2, 'wh'], [14, 10, 2, 2, 'wh'],
      [5, 6, 2, 3, 'black'], [9, 6, 2, 3, 'black'], [5, 6, 1, 1, 'wh'], [9, 6, 1, 1, 'wh'],
      [3, 10, 2, 1, 'pk'], [11, 10, 2, 1, 'pk'], [7, 10, 2, 1, 'maroon'],
      [9, 0, 2, 2, 'bw'], [12, 0, 2, 2, 'bw'], [11, 1, 1, 1, 'bd'],
    ];
  } else {
    shapes = [
      ['o', 4, 3, 2.2, 2.2, 'br'], ['o', 12, 3, 2.2, 2.2, 'br'], ['o', 4, 3.2, 1, 1, 'pk'], ['o', 12, 3.2, 1, 1, 'pk'],
      ['o', 8, 7, 6, 5.2, 'br'], ['o', 3, 13, 1.6, 2.5, 'br'], ['o', 13, 13, 1.6, 2.5, 'br'],
      ['o', 8, 14, 5, 3.2, 'br'], ['o', 8, 14.5, 3, 2.2, 'tan'],
      ['o', 5.5, 16.3, 2.3, 1.2, 'br'], ['o', 10.5, 16.3, 2.3, 1.2, 'br'],
      ['o', 8, 9, 3, 2.2, 'tan'], [7, 8, 2, 1, 'black'], [8, 10, 1, 1, 'black'],
      [5, 6, 1, 2, 'black'], [10, 6, 1, 2, 'black'], [3, 9, 2, 1, 'pk'], [11, 9, 2, 1, 'pk'],
      [5, 11, 2, 2, 'bw'], [9, 11, 2, 2, 'bw'], [7, 11, 2, 2, 'bd'],
    ];
  }
  for (const sh of shapes) paint(sh, cols, 'br');
  outline(x, PRIZE_W, PRIZE_H, hx('night'));
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

export function renderPrize(pal, kind, bowColor) {
  const key = kind + '|' + bowColor;
  let spr = pcache.get(key);
  if (!spr) {
    if (pcache.size > 40) pcache.clear();
    spr = buildPrize(pal, kind, bowColor);
    pcache.set(key, spr);
  }
  return spr;
}

export function drawLook(g, pal, look, ox, oy, s, blink) {
  g.imageSmoothingEnabled = false;
  g.drawImage(renderLook(pal, look, blink), ox, oy, SPR_W * s, SPR_H * s);
}

export function drawPrize(g, pal, kind, bowColor, ox, oy, s) {
  g.imageSmoothingEnabled = false;
  g.drawImage(renderPrize(pal, kind, bowColor), ox, oy, PRIZE_W * s, PRIZE_H * s);
}

// PNG data URL: character + prize on a colored backdrop
export function exportPng(pal, look, kind, bowColor, scale = 8) {
  const spr = renderLook(pal, look, false);
  const prize = renderPrize(pal, kind, bowColor);
  const pad = 3;
  const c = document.createElement('canvas');
  c.width = (SPR_W + PRIZE_W + pad * 3) * scale;
  c.height = (SPR_H + pad * 2) * scale;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = kind === 'ghost' ? pal.indigo : pal.violet;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(spr, pad * scale, pad * scale, SPR_W * scale, SPR_H * scale);
  x.drawImage(prize, (pad * 2 + SPR_W) * scale, (pad + SPR_H - PRIZE_H - 1) * scale, PRIZE_W * scale, PRIZE_H * scale);
  return c.toDataURL('image/png');
}
