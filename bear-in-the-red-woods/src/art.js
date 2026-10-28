// All pixel art, drawn in code from the palette. Each piece is painted into a Grid of palette colors,
// then rasterized at 4 fog levels (plus white "hit flash" and red "warning" versions).
// makeCanvas(w, h) is injected so tests can pass a stub.
import { W, H, PAL, DARKER } from './config.js';

class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  blob(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    }
  }
  line(x0, y0, x1, y1, c, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), t, t, c);
  }
  /** Pine layer: a triangle from (cx, top) widening to halfW at bottom; left side lit, right side shaded. */
  pine(cx, top, bottom, halfW, light, dark) {
    for (let y = top; y <= bottom; y++) {
      const hw = Math.round((halfW * (y - top)) / (bottom - top)) + 1;
      for (let x = cx - hw; x < cx + hw; x++) this.set(x, y, x < cx + ((y * 3) % 2) ? light : dark);
    }
  }
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!this.get(x, y) && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }
}

const darken = (c, n) => { for (let i = 0; i < n; i++) c = DARKER[c] ?? c; return c; };

function raster(grid, mk, map) {
  const c = mk(grid.w, grid.h), g = c.getContext('2d');
  for (let y = 0; y < grid.h; y++) {
    let x = 0;
    while (x < grid.w) {
      const src = grid.px[y * grid.w + x];
      if (!src) { x++; continue; }
      const out = map(src);
      let run = 1;
      while (x + run < grid.w && grid.px[y * grid.w + x + run] && map(grid.px[y * grid.w + x + run]) === out) run++;
      g.fillStyle = out;
      g.fillRect(x, y, run, 1);
      x += run;
    }
  }
  return c;
}

const fogSet = (grid, mk) => [0, 1, 2, 3].map(n => raster(grid, mk, c => darken(c, n)));
const sheet = (grid, mk) => ({ fog: fogSet(grid, mk), flash: raster(grid, mk, () => PAL.bone), red: raster(grid, mk, c => (c === PAL.black ? PAL.black : PAL.red)) });

// ---------- wall textures (32 x 32) ----------

function forestTex() {
  const t = new Grid(32, 32);
  t.rect(0, 0, 32, 32, PAL.black);
  for (const [x, w] of [[1, 5], [9, 4], [15, 6], [24, 5]]) {
    t.rect(x, 6, w, 26, PAL.bark);
    t.rect(x, 6, 1, 26, PAL.log);
    for (let y = 9; y < 30; y += 6) t.rect(x + 1 + ((y >> 1) % (w - 1)), y, 2, 1, PAL.night);
  }
  for (let x = 0; x < 32; x++) {
    const h = 5 + ((x * 7) % 5);
    for (let y = 0; y < h; y++) t.set(x, y, (x * 3 + y) % 4 === 0 ? PAL.red : (x + y) % 3 === 0 ? PAL.blood : PAL.bloodDark);
  }
  t.rect(0, 30, 32, 2, PAL.bloodDark);
  return t;
}

function logTex() {
  const t = new Grid(32, 32);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    t.rect(0, y, 32, 8, PAL.log);
    t.rect(0, y, 32, 1, PAL.tan);
    t.rect(0, y + 6, 32, 2, PAL.bark);
    for (let x = (row * 5) % 7; x < 32; x += 9) t.rect(x, y + 3, 4, 1, PAL.bark);
    t.blob(((row * 11 + 6) % 26) + 3, y + 3.5, 1.5, 1.5, PAL.bark);
  }
  return t;
}

function crateTex() {
  const t = new Grid(32, 32);
  t.rect(0, 0, 32, 32, PAL.tan);
  for (let y = 5; y < 32; y += 7) t.rect(0, y, 32, 1, PAL.log);
  t.line(3, 28, 28, 3, PAL.log, 3);
  t.rect(0, 0, 32, 3, PAL.bark); t.rect(0, 29, 32, 3, PAL.bark); t.rect(0, 0, 3, 32, PAL.bark); t.rect(29, 0, 3, 32, PAL.bark);
  return t;
}

function plaque(drawGun) {
  const t = logTex();
  t.rect(2, 7, 28, 18, PAL.gold);
  t.rect(3, 8, 26, 16, PAL.bark);
  drawGun(t);
  t.rect(4, 22, 24, 1, PAL.night);
  return t;
}

const shotgunPlaque = () => plaque(t => {
  t.rect(4, 12, 17, 3, PAL.fog); t.rect(4, 13, 17, 1, PAL.black); t.rect(4, 12, 17, 1, PAL.bone);
  t.rect(10, 15, 7, 2, PAL.tan);
  t.rect(20, 11, 4, 6, PAL.night);
  t.rect(24, 12, 4, 4, PAL.log); t.rect(25, 15, 3, 4, PAL.log); t.rect(24, 12, 4, 1, PAL.tan);
});

const smgPlaque = () => plaque(t => {
  t.rect(4, 13, 6, 2, PAL.fog);
  t.rect(10, 11, 11, 6, PAL.night); t.rect(10, 13, 11, 1, PAL.ember);
  t.rect(13, 17, 3, 5, PAL.fog);
  t.rect(18, 17, 3, 4, PAL.night);
  t.rect(21, 12, 6, 2, PAL.fog); t.rect(26, 12, 2, 5, PAL.fog);
});

// ---------- sprites ----------

function treeArt() {
  const t = new Grid(32, 64);
  t.rect(13, 34, 6, 28, PAL.bark); t.rect(13, 34, 2, 28, PAL.log); t.rect(18, 34, 1, 28, PAL.night);
  t.rect(10, 60, 12, 3, PAL.bark);
  t.pine(16, 2, 18, 8, PAL.red, PAL.blood);
  t.pine(16, 10, 30, 12, PAL.red, PAL.blood);
  t.pine(16, 20, 42, 15, PAL.blood, PAL.bloodDark);
  for (let i = 0; i < 9; i++) t.set(10 + ((i * 7) % 13), 8 + i * 4, PAL.ember);
  return t.outline(PAL.black);
}

function zombieArt(pose) {
  const z = new Grid(32, 48);
  const skin = PAL.moss, skinDark = PAL.pine, shirt = PAL.fog, shirtDark = PAL.dusk;
  const liftL = pose === 'b' ? 2 : 0, liftR = pose === 'a' ? 2 : 0;
  z.rect(10, 31, 5, 15 - liftL, PAL.night); z.rect(17, 31, 5, 15 - liftR, PAL.night);
  z.rect(9, 46 - liftL, 6, 2, PAL.bark); z.rect(17, 46 - liftR, 6, 2, PAL.bark);
  z.rect(9, 16, 14, 15, shirt); z.rect(18, 16, 5, 15, shirtDark);
  z.rect(12, 20, 3, 4, PAL.blood); z.set(14, 24, PAL.blood); z.set(19, 26, PAL.blood);
  z.rect(9, 30, 14, 1, PAL.bark);
  for (let x = 9; x < 23; x += 3) z.set(x, 31, shirt);
  const armY = pose === 'attack' ? 11 : 17, sway = pose === 'a' ? 1 : 0;
  z.rect(5, armY + sway, 4, 9, shirt); z.rect(5, armY + sway + 9, 4, 3, skin); z.set(5, armY + sway + 12, skin); z.set(7, armY + sway + 12, skin);
  z.rect(23, armY + 1 - sway, 4, 9, shirtDark); z.rect(23, armY + 10 - sway, 4, 3, skinDark); z.set(24, armY + 13 - sway, skinDark); z.set(26, armY + 13 - sway, skinDark);
  z.rect(14, 13, 4, 3, skinDark);
  z.blob(17.5, 7.5, 6, 7, skinDark);
  z.blob(15.5, 7.5, 5.5, 7, skin);
  z.rect(11, 1, 3, 2, PAL.night); z.rect(16, 0, 4, 2, PAL.night); z.set(21, 2, PAL.night);
  z.rect(11, 6, 3, 3, PAL.black); z.rect(18, 6, 3, 3, PAL.black);
  z.set(12, 7, PAL.gold); z.set(19, 7, PAL.gold);
  const mouth = pose === 'attack' ? 3 : 2;
  z.rect(13, 11, 6, mouth, PAL.black); z.set(14, 11, PAL.bone); z.set(17, 11, PAL.bone);
  z.set(20, 4, PAL.blood); z.set(21, 5, PAL.blood);
  return z.outline(PAL.black);
}

function bearArt(pose) {
  const b = new Grid(64, 64);
  const fur = PAL.log, dark = PAL.bark, light = PAL.tan;
  if (pose === 'rear') {
    b.rect(20, 50, 9, 14, dark); b.rect(35, 50, 9, 14, dark);
    b.blob(32, 40, 16, 18, fur); b.blob(37, 42, 10, 15, dark); b.blob(30, 40, 11, 15, fur);
    b.blob(32, 44, 7, 10, light);
    b.line(19, 32, 11, 12, fur, 5); b.line(45, 32, 53, 12, dark, 5);
    b.blob(12, 10, 5, 4, dark); b.blob(53, 10, 5, 4, dark);
    for (const x of [8, 11, 14, 49, 52, 55]) b.rect(x, 4, 1, 3, PAL.bone);
    b.blob(22, 8, 4, 4, fur); b.blob(42, 8, 4, 4, fur); b.blob(22, 8, 2, 2, PAL.bloodDark); b.blob(42, 8, 2, 2, PAL.bloodDark);
    b.blob(32, 17, 11, 10, fur);
    b.blob(32, 22, 7, 6, light);
    b.blob(32, 24, 4, 4, PAL.blood); b.rect(29, 21, 6, 1, PAL.bone); b.rect(29, 27, 6, 1, PAL.bone);
    b.rect(29, 19, 6, 2, PAL.black);
    b.rect(25, 13, 3, 2, PAL.red); b.rect(36, 13, 3, 2, PAL.red); b.set(26, 13, PAL.gold); b.set(37, 13, PAL.gold);
    b.line(38, 9, 41, 17, PAL.bloodDark);
  } else {
    const step = pose === 'b' ? 2 : 0;
    b.blob(32, 30, 27, 17, fur); b.blob(42, 34, 16, 13, dark);
    b.rect(14, 42, 10, 20 - step, dark); b.rect(40, 42, 10, 18 + step, dark);
    b.rect(14, 42, 2, 20 - step, fur);
    for (const [x, y] of [[15, 61 - step], [18, 61 - step], [21, 61 - step], [41, 59 + step], [44, 59 + step], [47, 59 + step]]) b.rect(x, y, 1, 3, PAL.bone);
    b.blob(21, 24, 4, 4, fur); b.blob(43, 24, 4, 4, fur); b.blob(21, 24, 2, 2, PAL.bloodDark); b.blob(43, 24, 2, 2, PAL.bloodDark);
    b.blob(32, 34, 12, 11, fur); b.blob(36, 37, 8, 8, dark); b.blob(31, 33, 9, 9, fur);
    b.blob(32, 40, 7, 5, light);
    b.rect(29, 36, 6, 3, PAL.black); b.rect(28, 43, 8, 1, PAL.black);
    b.rect(25, 31, 3, 2, PAL.red); b.rect(36, 31, 3, 2, PAL.red); b.set(26, 31, PAL.gold); b.set(37, 31, PAL.gold);
    b.line(38, 27, 41, 34, PAL.bloodDark);
  }
  return b.outline(PAL.black);
}

// ---------- held guns (drawn 2x, muzzle = where the flash appears) ----------

function hand(g, cx, cy) {
  g.blob(cx, cy, 8, 6, PAL.tan); g.blob(cx + 3, cy + 1, 5, 4, PAL.log);
  g.rect(cx - 10, cy + 5, 20, 4, PAL.pine);
}

function pistolArt() {
  const g = new Grid(32, 36);
  g.rect(12, 4, 8, 17, PAL.fog); g.rect(12, 4, 1, 17, PAL.bone); g.rect(18, 4, 2, 17, PAL.dusk);
  g.rect(15, 2, 2, 3, PAL.black); g.rect(13, 19, 2, 2, PAL.black); g.rect(17, 19, 2, 2, PAL.black);
  g.rect(11, 21, 10, 5, PAL.night);
  hand(g, 16, 28);
  return { img: g.outline(PAL.black), muzzle: [16, 2] };
}

function shotgunArt() {
  const g = new Grid(48, 40);
  g.rect(17, 2, 6, 24, PAL.fog); g.rect(24, 2, 6, 24, PAL.fog);
  g.rect(17, 2, 1, 24, PAL.bone); g.rect(29, 2, 1, 24, PAL.dusk);
  g.rect(19, 2, 2, 2, PAL.black); g.rect(26, 2, 2, 2, PAL.black);
  g.rect(15, 16, 17, 9, PAL.log); g.rect(15, 16, 17, 1, PAL.tan);
  for (let y = 18; y < 25; y += 2) g.rect(16, y, 15, 1, PAL.bark);
  g.rect(16, 26, 15, 6, PAL.night);
  hand(g, 23, 32);
  return { img: g.outline(PAL.black), muzzle: [23, 2] };
}

function smgArt() {
  const g = new Grid(40, 40);
  g.rect(18, 0, 4, 10, PAL.fog); g.rect(18, 0, 1, 10, PAL.bone);
  g.rect(13, 9, 14, 20, PAL.night); g.rect(13, 9, 14, 1, PAL.fog);
  g.rect(13, 14, 14, 2, PAL.ember);
  g.blob(20, 21, 4, 4, PAL.fog); g.blob(20, 21, 2, 2, PAL.night);
  g.rect(6, 20, 7, 12, PAL.fog); g.rect(6, 20, 7, 1, PAL.bone);
  hand(g, 21, 31);
  return { img: g.outline(PAL.black), muzzle: [20, 0] };
}

function flashArt() {
  const g = new Grid(16, 16);
  g.line(8, 0, 8, 15, PAL.ember); g.line(0, 8, 15, 8, PAL.ember);
  g.line(2, 2, 13, 13, PAL.red); g.line(13, 2, 2, 13, PAL.red);
  g.blob(8, 8, 5, 5, PAL.gold); g.blob(8, 8, 2.5, 2.5, PAL.bone);
  return g;
}

function moonArt() {
  const g = new Grid(24, 24);
  g.blob(12, 12, 11, 11, PAL.blood); g.blob(11, 11, 10, 10, PAL.red);
  g.blob(8, 9, 2.5, 2, PAL.blood); g.blob(15, 15, 3, 2.5, PAL.blood); g.blob(14, 6, 1.5, 1.5, PAL.blood);
  return g;
}

// ---------- title backdrop (320 x 180) ----------

function titleArt(rand) {
  const g = new Grid(W, H);
  [[0, PAL.black], [44, PAL.night], [92, PAL.dusk], [118, PAL.bloodDark]].forEach(([y, c], i, a) => g.rect(0, y, W, (a[i + 1]?.[0] ?? H) - y, c));
  for (let i = 0; i < 90; i++) g.set(rand() * W, rand() * 100, rand() < 0.3 ? PAL.bone : PAL.fog);
  g.blob(262, 52, 22, 22, PAL.blood); g.blob(260, 50, 20, 20, PAL.red);
  g.blob(253, 44, 4, 3, PAL.blood); g.blob(268, 58, 5, 4, PAL.blood); g.blob(266, 40, 2, 2, PAL.blood);
  for (let x = -8; x < W + 8; x += 14) {
    const top = 90 + ((x * 37) % 23);
    g.pine(x, top, 150, 9, PAL.bloodDark, PAL.night);
  }
  g.rect(0, 146, W, 34, PAL.black);
  for (let i = 0; i < 70; i++) g.set(rand() * W, 147 + rand() * 33, rand() < 0.5 ? PAL.bloodDark : PAL.blood);
  // cabin with a lit window
  g.rect(36, 116, 74, 34, PAL.bark);
  for (let y = 118; y < 150; y += 5) g.rect(36, y, 74, 1, PAL.night);
  for (let y = 98; y < 117; y++) { const hw = Math.round(((y - 98) / 18) * 44); g.rect(73 - hw, y, hw * 2, 1, PAL.black); }
  g.rect(48, 124, 14, 11, PAL.gold); g.rect(54, 124, 2, 11, PAL.bark); g.rect(48, 129, 14, 1, PAL.bark);
  g.rect(78, 126, 12, 24, PAL.night);
  // near pines framing the scene
  g.pine(10, 40, 170, 30, PAL.black, PAL.black);
  g.pine(306, 30, 170, 34, PAL.black, PAL.black);
  g.pine(228, 92, 160, 16, PAL.black, PAL.black);
  return g;
}

export function buildArt(makeCanvas) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const log = logTex();
  const wall = grid => ({ tex: fogSet(grid, makeCanvas) });
  const logSet = fogSet(log, makeCanvas);
  return {
    walls: {
      F: wall(forestTex()),
      L: { tex: logSet },
      C: wall(crateTex()),
      1: { tex: logSet, face: 'S', faceTex: fogSet(shotgunPlaque(), makeCanvas) },
      2: { tex: logSet, face: 'S', faceTex: fogSet(smgPlaque(), makeCanvas) },
    },
    tree: fogSet(treeArt(), makeCanvas),
    zombie: { a: sheet(zombieArt('a'), makeCanvas), b: sheet(zombieArt('b'), makeCanvas), attack: sheet(zombieArt('attack'), makeCanvas) },
    bear: { a: sheet(bearArt('a'), makeCanvas), b: sheet(bearArt('b'), makeCanvas), rear: sheet(bearArt('rear'), makeCanvas) },
    guns: Object.fromEntries([['pistol', pistolArt()], ['shotgun', shotgunArt()], ['smg', smgArt()]]
      .map(([id, a]) => [id, { img: raster(a.img, makeCanvas, c => c), muzzle: a.muzzle }])),
    flash: raster(flashArt(), makeCanvas, c => c),
    moon: raster(moonArt(), makeCanvas, c => c),
    stars: Array.from({ length: 70 }, () => ({ a: rand() * Math.PI * 2, y: Math.floor(2 + rand() * 66), c: rand() < 0.3 ? PAL.bone : PAL.fog })),
    title: raster(titleArt(rand), makeCanvas, c => c),
  };
}
