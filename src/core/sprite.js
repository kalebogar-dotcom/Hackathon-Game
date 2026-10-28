// Turns small text pixel grids into reusable canvases.
// rows: array of equal-ish length strings; colors: { char: '#hex' }. '.' and ' ' are transparent.
export function makeSprite(rows, colors) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]];
      if (color) {
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  return c;
}

/** Horizontally mirrored copy of a sprite canvas (for facing left/right). */
export function flipSprite(sprite) {
  const c = document.createElement('canvas');
  c.width = sprite.width;
  c.height = sprite.height;
  const g = c.getContext('2d');
  g.translate(sprite.width, 0);
  g.scale(-1, 1);
  g.drawImage(sprite, 0, 0);
  return c;
}
