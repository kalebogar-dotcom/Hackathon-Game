// PIXEL CHIC (Machine #2): retro dress-up studio. Character select, studio, photo + PNG download.
import { SKINS, EYE_COLORS, HAIR_COLORS, CLOTH_COLORS, HAIR, SLOT_ITEMS, PRESETS, DEFAULT_LOOKS } from './items.js';
import { drawLook, exportPng } from './sprites.js';

const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'acc'];
const POP_TIME = 0.18;
const clone = (o) => JSON.parse(JSON.stringify(o));
const wrap = (i, n, d) => (i + d + n) % n;
const itemOf = (slot, id) => SLOT_ITEMS[slot].find((i) => i.id === id);

export function createGame(api) {
  const { palette: pal, input, audio } = api;
  const mouse = input.mouse;
  const rc = (c) => (c[0] === '#' ? c : pal[c]);

  const looks = { girl: clone(DEFAULT_LOOKS.girl), boy: clone(DEFAULT_LOOKS.boy) };
  let who = 'girl';
  let screen = 'select';
  let sel = 0;
  let cat = 0;
  let lastPreset = -1;
  let t = 0, blinkIn = 2.5, blinking = 0, pop = 0;
  let msg = '', msgT = 0;
  const sparks = [];
  const cur = () => looks[who];

  function spawn(n) {
    const cs = [pal.yellow, pal.cream, pal.sky];
    for (let i = 0; i < n; i++) {
      sparks.push({ x: 20 + Math.random() * 110, y: 24 + Math.random() * 120, life: 0.5 + Math.random() * 0.5, c: cs[i % 3] });
    }
  }
  function changed() { pop = POP_TIME; spawn(8); audio.play('coin'); }
  function note(s) { msg = s; msgT = 2; }

  const slotCat = (name, slot) => {
    const opts = [null, ...SLOT_ITEMS[slot]];
    return {
      name, slot,
      label: (l) => (l[slot] ? itemOf(slot, l[slot].id).name : 'NONE'),
      swatch: (l) => (l[slot] ? l[slot].c : null),
      step: (l, d) => {
        const at = opts.findIndex((o) => (o ? (l[slot] && l[slot].id === o.id) : !l[slot]));
        const next = opts[wrap(at < 0 ? 0 : at, opts.length, d)];
        l[slot] = next ? { id: next.id, c: next.c1 } : null;
      },
    };
  };

  const CATS = [
    { name: 'HAIR',
      label: (l) => (HAIR.find((h) => h.id === l.hair) || HAIR[0]).name,
      swatch: () => null,
      step: (l, d) => { l.hair = HAIR[wrap(Math.max(0, HAIR.findIndex((h) => h.id === l.hair)), HAIR.length, d)].id; } },
    { name: 'HAIR COLOR', label: (l) => HAIR_COLORS[l.hairColor].name, swatch: (l) => HAIR_COLORS[l.hairColor].c,
      step: (l, d) => { l.hairColor = wrap(l.hairColor, HAIR_COLORS.length, d); } },
    { name: 'SKIN', label: (l) => SKINS[l.skin].name, swatch: (l) => SKINS[l.skin].c,
      step: (l, d) => { l.skin = wrap(l.skin, SKINS.length, d); } },
    { name: 'EYES', label: (l) => EYE_COLORS[l.eyes].name, swatch: (l) => EYE_COLORS[l.eyes].c,
      step: (l, d) => { l.eyes = wrap(l.eyes, EYE_COLORS.length, d); } },
    slotCat('TOP', 'top'), slotCat('BOTTOM', 'bottom'), slotCat('DRESS', 'dress'),
    slotCat('JACKET', 'outer'), slotCat('SHOES', 'shoes'), slotCat('EXTRA', 'acc'),
    { name: 'PRESETS',
      label: () => (lastPreset < 0 ? 'PICK ONE' : PRESETS[lastPreset].name),
      swatch: () => null,
      step: (l, d) => {
        lastPreset = lastPreset < 0 ? (d > 0 ? 0 : PRESETS.length - 1) : wrap(lastPreset, PRESETS.length, d);
        const p = PRESETS[lastPreset];
        for (const slot of SLOTS) { const e = p.items[slot]; l[slot] = e ? { id: e[0], c: e[1] } : null; }
      } },
  ];

  function stepCat(d) { CATS[cat].step(cur(), d); changed(); }
  function cycleColor() {
    const slot = CATS[cat].slot;
    const piece = slot && cur()[slot];
    if (!piece) return;
    piece.c = CLOTH_COLORS[wrap(Math.max(0, CLOTH_COLORS.indexOf(piece.c)), CLOTH_COLORS.length, 1)];
    changed();
  }
  function swap() { who = who === 'girl' ? 'boy' : 'girl'; changed(); audio.play('select'); }
  function goPhoto() { screen = 'photo'; audio.play('select'); spawn(24); }
  function backToStudio() { screen = 'studio'; audio.play('blip'); }
  function download() {
    try {
      const a = document.createElement('a');
      a.href = exportPng(pal, cur(), 8);
      a.download = 'pixel-chic-' + who + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      note('SAVED TO DOWNLOADS');
    } catch (e) { note('DOWNLOAD FAILED'); }
    audio.play('coin');
  }
  function finishUp() {
    const n = SLOTS.filter((s) => cur()[s]).length;
    api.finish({ won: true, score: 100 + n * 10 });
  }
  function startStudio() { who = sel ? 'boy' : 'girl'; screen = 'studio'; audio.play('select'); spawn(14); }

  function studioClick() {
    const { x, y } = mouse;
    if (y >= 152 && y < 164) {
      if (x >= 148 && x < 188) return swap();
      if (x >= 192 && x < 232) return cycleColor();
      if (x >= 264 && x < 312) return goPhoto();
    }
    if (x >= 146 && y >= 15 && y < 15 + CATS.length * 12) {
      const row = Math.floor((y - 15) / 12);
      if (row !== cat) { cat = row; audio.play('blip'); }
      if (x >= 210 && x < 230) stepCat(-1);
      else if (x >= 286 && x < 306) stepCat(1);
    }
    return undefined;
  }
  function photoClick() {
    const { x, y } = mouse;
    if (x < 170 || x >= 300) return;
    if (y >= 50 && y < 68) download();
    else if (y >= 76 && y < 94) backToStudio();
    else if (y >= 102 && y < 120) finishUp();
  }

  function update(dt) {
    t += dt;
    blinkIn -= dt;
    if (blinkIn <= 0) { blinking = 0.12; blinkIn = 2 + Math.random() * 2.5; }
    if (blinking > 0) blinking -= dt;
    pop = Math.max(0, pop - dt);
    msgT = Math.max(0, msgT - dt);
    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].life -= dt; sparks[i].y -= dt * 12;
      if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
    if (t < 0.25) return; // ignore the keypress that entered the machine
    const click = mouse.pressed && !(mouse.x >= 276 && mouse.y < 12); // top-right belongs to ESC MENU

    if (screen === 'select') {
      if (input.wasPressed('ArrowLeft', 'KeyA')) { sel = 0; audio.play('blip'); }
      if (input.wasPressed('ArrowRight', 'KeyD')) { sel = 1; audio.play('blip'); }
      if (click) { sel = mouse.x < 160 ? 0 : 1; startStudio(); }
      else if (input.wasPressed('Enter', 'Space')) startStudio();
    } else if (screen === 'studio') {
      if (Math.random() < dt * 2) spawn(1);
      if (input.wasPressed('ArrowUp', 'KeyW')) { cat = wrap(cat, CATS.length, -1); audio.play('blip'); }
      if (input.wasPressed('ArrowDown', 'KeyS')) { cat = wrap(cat, CATS.length, 1); audio.play('blip'); }
      if (input.wasPressed('ArrowLeft', 'KeyA')) stepCat(-1);
      if (input.wasPressed('ArrowRight', 'KeyD')) stepCat(1);
      if (input.wasPressed('KeyC')) cycleColor();
      if (input.wasPressed('KeyX')) swap();
      if (click) studioClick();
      if (input.wasPressed('Enter')) goPhoto();
    } else {
      if (Math.random() < dt * 3) spawn(1);
      if (click) photoClick();
      if (input.wasPressed('KeyD')) download();
      if (input.wasPressed('KeyB', 'Backspace')) backToStudio();
      if (input.wasPressed('Enter')) finishUp();
    }
  }

  function arrow(g, x, y, dir, c) {
    g.fillStyle = c;
    if (dir < 0) { g.fillRect(x + 2, y, 1, 5); g.fillRect(x + 1, y + 1, 1, 3); g.fillRect(x, y + 2, 1, 1); }
    else { g.fillRect(x, y, 1, 5); g.fillRect(x + 1, y + 1, 1, 3); g.fillRect(x + 2, y + 2, 1, 1); }
  }
  function button(g, x, y, w, h, label) {
    g.fillStyle = pal.blue; g.fillRect(x, y, w, h);
    api.text(g, label, x + w / 2, y + Math.floor((h - 5) / 2), pal.cream, { align: 'center' });
  }
  function drawSparks(g) {
    for (const s of sparks) {
      const x = Math.round(s.x), y = Math.round(s.y);
      g.fillStyle = s.c; g.fillRect(x, y, 1, 1);
      if (s.life > 0.25) { g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); }
    }
  }

  function drawSelect(g) {
    g.fillStyle = pal.indigo; g.fillRect(0, 0, 320, 180);
    g.fillStyle = pal.violet; g.fillRect(0, 140, 320, 40);
    api.text(g, 'PIXEL CHIC', 160, 8, pal.yellow, { scale: 2, align: 'center', shadow: pal.black });
    api.text(g, 'PICK YOUR STYLE', 160, 24, pal.cream, { align: 'center' });
    [['girl', 80, 'GIRL'], ['boy', 240, 'BOY']].forEach(([key, cx, label], i) => {
      const bob = Math.sin(t * 3 + i) > 0.3 ? 1 : 0;
      drawLook(g, pal, looks[key], cx - 39, 34 + bob, 3, blinking > 0);
      if (sel === i) {
        g.fillStyle = pal.yellow;
        g.fillRect(cx - 44, 32, 88, 1); g.fillRect(cx - 44, 140, 88, 1);
        g.fillRect(cx - 44, 32, 1, 109); g.fillRect(cx + 43, 32, 1, 109);
      }
      api.text(g, label, cx, 148, sel === i ? pal.yellow : pal.cream, { scale: 2, align: 'center', shadow: pal.black });
    });
    api.text(g, 'LEFT RIGHT CHOOSE  ENTER OR CLICK START', 160, 169, pal.cream, { align: 'center' });
  }

  function drawStudio(g) {
    g.fillStyle = pal.indigo; g.fillRect(0, 0, 144, 180);
    g.fillStyle = pal.night; for (let x = 8; x < 144; x += 16) g.fillRect(x, 0, 2, 150);
    g.fillStyle = pal.violet; g.fillRect(0, 150, 144, 30);
    g.fillStyle = pal.night; g.fillRect(26, 149, 92, 3);
    const hop = pop > 0 ? Math.round(Math.sin((1 - pop / POP_TIME) * Math.PI) * 5) : 0;
    const bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
    drawLook(g, pal, cur(), 20, 22 + bob - hop, 4, blinking > 0);
    drawSparks(g);
    api.text(g, 'PIXEL CHIC', 6, 6, pal.yellow, { shadow: pal.black });
    api.text(g, who.toUpperCase() + ' STYLE', 72, 160, pal.cream, { align: 'center' });

    g.fillStyle = pal.night; g.fillRect(144, 0, 176, 180);
    g.fillStyle = pal.blue; g.fillRect(144, 0, 1, 180);
    const look = cur();
    CATS.forEach((c, i) => {
      const y = 16 + i * 12;
      const on = i === cat;
      if (on) { g.fillStyle = pal.indigo; g.fillRect(146, y - 1, 172, 11); }
      api.text(g, c.name, 150, y, on ? pal.yellow : pal.grey);
      api.text(g, c.label(look), 258, y, on ? pal.cream : pal.grey, { align: 'center' });
      if (on) { arrow(g, 216, y, -1, pal.yellow); arrow(g, 292, y, 1, pal.yellow); }
      const sw = c.swatch(look);
      if (sw) { g.fillStyle = rc(sw); g.fillRect(304, y, 6, 5); }
    });
    button(g, 148, 152, 40, 12, 'SWAP X');
    button(g, 192, 152, 40, 12, 'COLOR C');
    button(g, 264, 152, 48, 12, 'DONE');
    api.text(g, 'UP DOWN PICK  LEFT RIGHT CHANGE', 232, 168, pal.grey, { align: 'center' });
    api.text(g, 'C COLOR  X SWAP  ENTER DONE', 232, 174, pal.grey, { align: 'center' });
  }

  function drawPhoto(g) {
    g.fillStyle = pal.indigo; g.fillRect(0, 0, 320, 180);
    g.fillStyle = pal.night; for (let x = 8; x < 320; x += 16) g.fillRect(x, 0, 2, 180);
    g.fillStyle = pal.black; g.fillRect(24, 18, 120, 152);           // shadow
    g.fillStyle = pal.cream; g.fillRect(20, 14, 120, 152);           // frame
    g.fillStyle = pal.violet; g.fillRect(26, 20, 108, 118);          // photo
    drawLook(g, pal, cur(), 41, 28, 3, blinking > 0);
    drawSparks(g);
    api.text(g, who === 'girl' ? 'GIRL LOOK' : 'BOY LOOK', 80, 148, pal.night, { align: 'center' });
    api.text(g, 'PIXEL CHIC', 80, 157, pal.maroon, { align: 'center' });

    api.text(g, 'LOOKING GOOD!', 235, 24, pal.yellow, { scale: 2, align: 'center', shadow: pal.black });
    button(g, 170, 50, 130, 18, 'DOWNLOAD PNG  D');
    button(g, 170, 76, 130, 18, 'BACK TO STUDIO  B');
    button(g, 170, 102, 130, 18, 'FINISH  ENTER');
    if (msgT > 0) api.text(g, msg, 235, 130, pal.green, { align: 'center', shadow: pal.black });
    api.text(g, 'FINISH SAVES YOUR CLEARED STATUS', 235, 150, pal.grey, { align: 'center' });
  }

  function draw(g) {
    if (screen === 'select') drawSelect(g);
    else if (screen === 'studio') drawStudio(g);
    else drawPhoto(g);
  }

  function debug() {
    return { screen, who, category: CATS[cat].name, equipped: SLOTS.filter((s) => cur()[s]).length, look: clone(cur()) };
  }

  return { update, draw, debug };
}
