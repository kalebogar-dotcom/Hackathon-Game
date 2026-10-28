// Tiny 3x5 pixel font. Each glyph is 15 bits, row by row, left to right.
// Text is drawn uppercase; unknown characters render as '?'.
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
  '?': '110001010000010', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
  '/': '001001010100100', "'": '010010000000000', '(': '001010010010001', ')': '100010010010100',
  '>': '100010001010100', '<': '001010100010001', '%': '101001010100101', '=': '000111000111000',
  '*': '000101010101000', '#': '101111101111101', '[': '011010010010011', ']': '110010010010110',
  '_': '000000000000111', '"': '101101000000000',
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;

/** Width in pixels of `text` at `scale` (1 glyph = 3px + 1px gap). */
export function textWidth(text, scale = 1) {
  const n = String(text).length;
  return n ? (n * 4 - 1) * scale : 0;
}

/**
 * Draw pixel text. options: { scale = 1, align = 'left'|'center'|'right', shadow = color|null }
 * (x, y) is the top-left (or top-center / top-right) of the text.
 */
export function drawText(g, text, x, y, color, { scale = 1, align = 'left', shadow = null } = {}) {
  const str = String(text).toUpperCase();
  const w = textWidth(str, scale);
  const left = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const top = Math.round(y);
  if (shadow) drawRaw(g, str, left + scale, top + scale, shadow, scale);
  drawRaw(g, str, left, top, color, scale);
}

function drawRaw(g, str, x, y, color, s) {
  g.fillStyle = color;
  for (const ch of str) {
    const bits = GLYPHS[ch] ?? GLYPHS['?'];
    for (let i = 0; i < 15; i++) {
      if (bits.charCodeAt(i) === 49) g.fillRect(x + (i % 3) * s, y + ((i / 3) | 0) * s, s, s);
    }
    x += 4 * s;
  }
}
