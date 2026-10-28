// PIXEL CHIC layered character renderer. Draws a 16x32-pixel character at scale s.
import { SKINS, EYE_COLORS, HAIR_COLORS, HAIR, SLOT_ITEMS } from './items.js';

const BLUSH = '#f28ab2';
const BODY = [
  [4, 3, 8, 8], [5, 11, 6, 1], [7, 12, 2, 1],            // head, chin, neck
  [5, 13, 6, 9], [3, 13, 2, 8], [11, 13, 2, 8],          // torso, arms
  [3, 21, 2, 1], [11, 21, 2, 1],                         // hands
  [5, 22, 3, 9], [8, 22, 3, 9],                          // legs
];

const col = (pal, c) => (c && c[0] === '#' ? c : pal[c]);

export function drawLook(g, pal, look, ox, oy, s, blink) {
  const skin = SKINS[look.skin].c;
  const hairC = HAIR_COLORS[look.hairColor].c;
  const eyeC = EYE_COLORS[look.eyes].c;
  const hair = HAIR.find((h) => h.id === look.hair) || HAIR[0];

  const fill = (r, c) => {
    g.fillStyle = col(pal, c);
    g.fillRect(ox + r[0] * s, oy + r[1] * s, r[2] * s, r[3] * s);
  };
  const drawItem = (slot) => {
    const piece = look[slot];
    if (!piece) return;
    const item = SLOT_ITEMS[slot].find((i) => i.id === piece.id);
    if (!item) return;
    for (const r of item.rects) fill(r, r[4] === 'c1' ? piece.c : r[4] === 'c2' ? item.c2 : r[4]);
  };

  for (const r of hair.back) fill(r, r[4] || hairC);
  for (const r of BODY) fill(r, skin);

  // face
  fill([5, 6, 2, 1], 'brown'); fill([9, 6, 2, 1], 'brown');               // brows
  if (blink) { fill([5, 8, 2, 1], 'black'); fill([9, 8, 2, 1], 'black'); }
  else {
    fill([5, 7, 2, 2], eyeC); fill([9, 7, 2, 2], eyeC);
    fill([5, 7, 1, 1], 'cream'); fill([9, 7, 1, 1], 'cream');             // eye shine
  }
  fill([7, 10, 2, 1], 'maroon');                                          // smile
  fill([4, 9, 1, 1], BLUSH); fill([11, 9, 1, 1], BLUSH);

  if (!look.dress) drawItem('bottom');
  drawItem('shoes');
  if (look.dress) drawItem('dress'); else drawItem('top');
  drawItem('outer');
  for (const r of hair.front) fill(r, r[4] || hairC);
  drawItem('acc');
}
