// Shared overlay widgets: framed panels and keyboard + mouse menus.
import { PAL } from './palette.js';
import { drawText, textWidth } from './font.js';

export function drawPanel(g, x, y, w, h, fill = PAL.night, border = PAL.cream) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = PAL.black;
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = border;
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}

const labelOf = it => (typeof it.label === 'function' ? it.label() : it.label);

/**
 * Vertical menu. items: [{ id, label }] (label may be a function for live text).
 * update(input) returns the chosen id or null.
 * Up/Down or W/S move, Enter/Space choose, mouse hover highlights, click chooses.
 */
export function createMenu(items, audio = null) {
  let index = 0;
  let rects = [];
  const ROW = 11;

  return {
    get index() { return index; },
    update(input) {
      const n = items.length;
      if (input.wasPressed('ArrowUp', 'KeyW')) { index = (index + n - 1) % n; audio?.play('blip'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { index = (index + 1) % n; audio?.play('blip'); }
      const m = input.mouse;
      const hover = input.pointerLocked ? -1 : rects.findIndex(r => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
      if (hover >= 0 && m.moved && hover !== index) { index = hover; audio?.play('blip'); }
      input.setCursor(hover >= 0 ? 'pointer' : 'default');
      if (hover >= 0 && m.pressed) return items[hover].id;
      if (input.wasPressed('Enter', 'NumpadEnter', 'Space')) return items[index].id;
      return null;
    },
    /** Draws the items centered on cx starting at y; returns the height used. */
    draw(g, cx, y) {
      const w = Math.max(...items.map(it => textWidth(labelOf(it)))) + 16;
      rects = items.map((it, i) => ({ x: Math.round(cx - w / 2), y: y + i * ROW - 3, w, h: ROW }));
      items.forEach((it, i) => {
        const r = rects[i];
        const on = i === index;
        if (on) {
          g.fillStyle = PAL.indigo;
          g.fillRect(r.x, r.y, r.w, r.h - 1);
          drawText(g, '>', r.x + 3, r.y + 3, PAL.yellow);
        }
        drawText(g, labelOf(it), cx, r.y + 3, on ? PAL.yellow : PAL.cream, { align: 'center' });
      });
      return items.length * ROW;
    },
  };
}
