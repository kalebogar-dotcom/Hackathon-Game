// The arcade room: click a cabinet (or press 1-3, or Left/Right + Enter) to enter its machine.
import { PAL } from '../core/palette.js';
import { drawText } from '../core/font.js';
import { drawRoom, drawCabinet } from './hub-art.js';

const CAB_W = 56;
const CAB_H = 92;
const CAB_Y = 42;
const SPACING = 104;

export function createHub({ W, H, input, audio, machines, enter, info }) {
  let selected = 0;
  let t = 0;
  const slots = machines.map((m, i) => ({
    m,
    x: Math.round(W / 2 + (i - (machines.length - 1) / 2) * SPACING - CAB_W / 2),
  }));

  // Hit area covers the cabinet and its labels underneath.
  const hitTest = (mx, my) => slots.findIndex(s => mx >= s.x - 4 && mx < s.x + CAB_W + 4 && my >= CAB_Y - 4 && my < CAB_Y + CAB_H + 26);

  return {
    update(dt) {
      t += dt;
      const n = slots.length;
      if (input.wasPressed('ArrowLeft', 'KeyA')) { selected = (selected + n - 1) % n; audio.play('blip'); }
      if (input.wasPressed('ArrowRight', 'KeyD')) { selected = (selected + 1) % n; audio.play('blip'); }
      const m = input.mouse;
      const hover = hitTest(m.x, m.y);
      if (hover >= 0 && m.moved && hover !== selected) { selected = hover; audio.play('blip'); }
      input.setCursor(hover >= 0 ? 'pointer' : 'default');
      for (let i = 0; i < n; i++) {
        if (input.wasPressed(`Digit${i + 1}`, `Numpad${i + 1}`)) return enter(slots[i].m.id);
      }
      if (hover >= 0 && m.pressed) return enter(slots[hover].m.id);
      if (input.wasPressed('Enter', 'NumpadEnter', 'Space')) return enter(slots[selected].m.id);
    },

    draw(g) {
      drawRoom(g, W, H, t);
      slots.forEach((s, i) => {
        const on = i === selected;
        drawCabinet(g, s.x, CAB_Y - (on ? 2 : 0), CAB_W, CAB_H, s.m, t + i, on);
        const cx = s.x + CAB_W / 2;
        const ly = CAB_Y + CAB_H + 4;
        drawText(g, `${i + 1} ${s.m.name}`, cx, ly, on ? PAL.yellow : PAL.cream, { align: 'center', shadow: PAL.black });
        drawText(g, s.m.genre, cx, ly + 7, PAL.grey, { align: 'center' });
        const st = info(s.m.id);
        let label = 'NOT PLAYED', color = PAL.grey;
        if (st.broken) { label = 'OUT OF ORDER'; color = PAL.red; }
        else if (st.cleared) { label = `CLEARED  BEST ${st.best}`; color = PAL.green; }
        else if (st.best !== null) { label = `BEST ${st.best}`; color = PAL.cream; }
        drawText(g, label, cx, ly + 15, color, { align: 'center', shadow: PAL.black });
      });
      drawText(g, slots[selected].m.hint ?? '', W / 2, H - 16, PAL.sky, { align: 'center', shadow: PAL.black });
      drawText(g, `CLICK A MACHINE OR PRESS 1-3    M: SOUND ${audio.muted ? 'OFF' : 'ON'}`, W / 2, H - 7, PAL.cream, { align: 'center', shadow: PAL.black });
    },
  };
}
