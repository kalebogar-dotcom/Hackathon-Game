// PIXEL CHIC (Machine #2): dress-up studio, Halloween special, disco party, prizes, photo + PNG download.
import { SKINS, EYE_COLORS, HAIR_COLORS, CLOTH_COLORS, HAIR, SLOT_ITEMS, PRESETS, COSTUMES, DEFAULT_LOOKS } from './items.js';
import { drawLook, drawPrize, exportPng, PRIZE_H } from './sprites.js';

const SLOTS = ['top', 'bottom', 'dress', 'outer', 'shoes', 'hat', 'back', 'acc'];
const POP_TIME = 0.18;
const RH = 9, TOP = 12;
const clone = (o) => JSON.parse(JSON.stringify(o));
const wrap = (i, n, d) => (i + d + n) % n;
const itemOf = (slot, id) => (SLOT_ITEMS[slot] || []).find((i) => i.id === id);

export function createGame(api) {
  const { palette: pal, input, audio } = api;
  const mouse = input.mouse;
  const rc = (c) => (c[0] === '#' ? c : pal[c]);

  const looks = { girl: clone(DEFAULT_LOOKS.girl), boy: clone(DEFAULT_LOOKS.boy) };
  let who = 'girl';
  let screen = 'select';
  let sel = 0;
  let cat = 0;
  let lastPreset = -1, lastCostume = -1;
  let theme = 'normal';
  let t = 0, blinkIn = 2.5, blinking = 0, pop = 0;
  let msg = '', msgT = 0;
  let partyT = 0, lastBeat = -1, prizePlayed = false;
  const sparks = [], ghosts = [], bats = [], confetti = [];
  const cur = () => looks[who];

  for (let i = 0; i < 4; i++) ghosts.push({ x: Math.random() * 300, y: 22 + Math.random() * 80, sp: 7 + Math.random() * 9, ph: Math.random() * 6, s: i % 2 ? 1 : 2 });
  for (let i = 0; i < 3; i++) bats.push({ x: Math.random() * 300, y: 10 + Math.random() * 50, sp: 16 + Math.random() * 14, ph: Math.random() * 6 });

  const hasHalloween = (look) => SLOTS.some((s) => look[s] && itemOf(s, look[s].id) && itemOf(s, look[s].id).collection === 'HALLOWEEN');
  const spooky = () => theme === 'halloween' || hasHalloween(cur());
  const prizeKind = () => (spooky() ? 'ghost' : 'bear');
  const prizeColor = () => (cur().dress && cur().dress.c) || (cur().top && cur().top.c) || 'red';

  function spawn(n) {
    const cs = [pal.yellow, pal.cream, pal.sky];
    for (let i = 0; i < n; i++) {
      sparks.push({ x: 20 + Math.random() * 110, y: 24 + Math.random() * 120, life: 0.5 + Math.random() * 0.5, c: cs[i % 3] });
    }
  }
  function changed() { pop = POP_TIME; spawn(8); audio.play('coin'); }
  function note(s) { msg = s; msgT = 2; }

  function applySet(l, items) {
    for (const slot of SLOTS) {
      const e = items[slot];
      l[slot] = e ? { id: e[0], c: e[1] || itemOf(slot, e[0]).c1 } : null;
    }
  }

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
    slotCat('JACKET', 'outer'), slotCat('SHOES', 'shoes'), slotCat('HAT', 'hat'),
    slotCat('BACK', 'back'), slotCat('EXTRA', 'acc'),
    { name: 'PRESETS',
      label: () => (lastPreset < 0 ? 'PICK ONE' : PRESETS[lastPreset].name),
      swatch: () => null,
      step: (l, d) => {
        lastPreset = lastPreset < 0 ? (d > 0 ? 0 : PRESETS.length - 1) : wrap(lastPreset, PRESETS.length, d);
        applySet(l, PRESETS[lastPreset].items);
      } },
    { name: 'COSTUME',
      label: () => (lastCostume < 0 ? 'HALLOWEEN' : COSTUMES[lastCostume].name),
      swatch: () => null,
      step: (l, d) => {
        lastCostume = lastCostume < 0 ? (d > 0 ? 0 : COSTUMES.length - 1) : wrap(lastCostume, COSTUMES.length, d);
        applySet(l, COSTUMES[lastCostume].items);
        theme = 'halloween';
      } },
    { name: 'THEME',
      label: () => (theme === 'halloween' ? 'HALLOWEEN' : 'NORMAL'),
      swatch: () => null,
      step: () => { theme = theme === 'halloween' ? 'normal' : 'halloween'; } },
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
  function toggleTheme() { theme = theme === 'halloween' ? 'normal' : 'halloween'; changed(); }
  function startStudio() { who = sel ? 'boy' : 'girl'; screen = 'studio'; audio.play('select'); spawn(14); }

  function goParty() {
    screen = 'party'; partyT = 0; lastBeat = -1; prizePlayed = false;
    confetti.length = 0;
    const cs = [pal.yellow, pal.red, pal.sky, pal.green, pal.violet, pal.orange, pal.cream];
    for (let i = 0; i < 60; i++) confetti.push({ x: Math.random() * 320, y: Math.random() * 180, vy: 25 + Math.random() * 35, c: cs[i % cs.length] });
    audio.play('win');
  }
  function goPhoto() { screen = 'photo'; audio.play('select'); spawn(24); }
  function backToStudio() { screen = 'studio'; audio.play('blip'); }
  function download() {
    try {
      const a = document.createElement('a');
      a.href = exportPng(pal, cur(), prizeKind(), prizeColor(), 8);
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
    api.finish({ won: true, score: 100 + n * 10 + (spooky() ? 50 : 0) });
  }

  function studioClick() {
    const { x, y } = mouse;
    if (y >= 152 && y < 164) {
      if (x >= 148 && x < 188) return swap();
      if (x >= 192 && x < 232) return cycleColor();
      if (x >= 264 && x < 312) return goParty();
    }
    if (x >= 146 && y >= TOP && y < TOP + CATS.length * RH) {
      const row = Math.floor((y - TOP) / RH);
      if (row !== cat) { cat = row; audio.play('blip'); }
      if (x >= 210 && x < 230) stepCat(-1);
      else if (x >= 286 && x < 306) stepCat(1);
    }
    return undefined;
  }
  function partyClick() {
    const { x, y } = mouse;
    if (y >= 163 && y < 176) {
      if (x >= 8 && x < 108) goPhoto();
      else if (x >= 212 && x < 312) backToStudio();
    }
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
    const rangeW = screen === 'studio' ? 144 : 320;
    for (const gh of ghosts) { gh.x += gh.sp * dt; if (gh.x > rangeW + 20) gh.x = -20; }
    for (const b of bats) { b.x += b.sp * dt; if (b.x > rangeW + 20) b.x = -20; }
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
      if (input.wasPressed('KeyH')) toggleTheme();
      if (click) studioClick();
      if (input.wasPressed('Enter')) goParty();
    } else if (screen === 'party') {
      partyT += dt;
      const beat = Math.floor(partyT * 2);
      if (beat !== lastBeat) { lastBeat = beat; audio.play('blip'); }
      if (!prizePlayed && partyT > 2.2) { prizePlayed = true; audio.play('coin'); spawn(20); }
      for (const f of confetti) { f.y += f.vy * dt; if (f.y > 182) { f.y = -2; f.x = Math.random() * 320; } }
      if (click) partyClick();
      if (input.wasPressed('Enter')) goPhoto();
      if (input.wasPressed('KeyB', 'Backspace')) backToStudio();
    } else {
      if (Math.random() < dt * 3) spawn(1);
      if (click) photoClick();
      if (input.wasPressed('KeyD')) download();
      if (input.wasPressed('KeyB', 'Backspace')) backToStudio();
      if (input.wasPressed('Enter')) finishUp();
    }
  }

  // ---------- drawing helpers ----------
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
  function ghostSprite(g, x, y, s) {
    g.fillStyle = pal.cream;
    g.fillRect(x + s, y, 5 * s, s);
    g.fillRect(x, y + s, 7 * s, 5 * s);
    g.fillRect(x, y + 6 * s, 2 * s, s); g.fillRect(x + 3 * s, y + 6 * s, s, s); g.fillRect(x + 5 * s, y + 6 * s, 2 * s, s);
    g.fillStyle = pal.black;
    g.fillRect(x + 2 * s, y + 2 * s, s, 2 * s); g.fillRect(x + 4 * s, y + 2 * s, s, 2 * s);
    g.fillStyle = '#f28ab2';
    g.fillRect(x + s, y + 4 * s, s, s); g.fillRect(x + 5 * s, y + 4 * s, s, s);
  }
  function batSprite(g, x, y, up) {
    g.fillStyle = pal.violet;
    g.fillRect(x + 3, y + 1, 2, 3);
    if (up) { g.fillRect(x, y, 3, 1); g.fillRect(x + 5, y, 3, 1); g.fillRect(x + 1, y + 1, 2, 1); g.fillRect(x + 5, y + 1, 2, 1); }
    else { g.fillRect(x, y + 3, 3, 1); g.fillRect(x + 5, y + 3, 3, 1); g.fillRect(x + 1, y + 2, 2, 1); g.fillRect(x + 5, y + 2, 2, 1); }
    g.fillStyle = pal.red;
    g.fillRect(x + 3, y + 1, 1, 1); g.fillRect(x + 4, y + 1, 1, 1);
  }
  function pumpkinSprite(g, x, y) {
    g.fillStyle = pal.green; g.fillRect(x + 4, y, 2, 3);
    g.fillStyle = pal.orange; g.fillRect(x, y + 2, 10, 7);
    g.fillStyle = pal.red; g.fillRect(x + 2, y + 2, 1, 7); g.fillRect(x + 7, y + 2, 1, 7);
    g.fillStyle = pal.yellow;
    g.fillRect(x + 2, y + 4, 2, 2); g.fillRect(x + 6, y + 4, 2, 2); g.fillRect(x + 3, y + 7, 4, 1);
  }
  function drawSpooks(g, bats3) {
    g.globalAlpha = 0.9;
    for (const gh of ghosts) ghostSprite(g, Math.round(gh.x), Math.round(gh.y + Math.sin(t * 2 + gh.ph) * 4), gh.s);
    g.globalAlpha = 1;
    if (bats3) for (const b of bats) batSprite(g, Math.round(b.x), Math.round(b.y + Math.sin(t * 3 + b.ph) * 5), Math.sin(t * 14 + b.ph) > 0);
  }

  // ---------- screens ----------
  function drawSelect(g) {
    g.fillStyle = pal.indigo; g.fillRect(0, 0, 320, 180);
    g.fillStyle = pal.violet; g.fillRect(0, 140, 320, 40);
    api.text(g, 'PIXEL CHIC', 160, 6, pal.yellow, { scale: 2, align: 'center', shadow: pal.black });
    api.text(g, 'PICK YOUR STYLE', 160, 20, pal.cream, { align: 'center' });
    [['girl', 80, 'GIRL'], ['boy', 240, 'BOY']].forEach(([key, cx, label], i) => {
      const bob = Math.sin(t * 3 + i) > 0.3 ? 1 : 0;
      drawLook(g, pal, looks[key], cx - 39, 28 + bob, 3, blinking > 0);
      if (sel === i) {
        g.fillStyle = pal.yellow;
        g.fillRect(cx - 44, 26, 88, 1); g.fillRect(cx - 44, 142, 88, 1);
        g.fillRect(cx - 44, 26, 1, 117); g.fillRect(cx + 43, 26, 1, 117);
      }
      api.text(g, label, cx, 148, sel === i ? pal.yellow : pal.cream, { scale: 2, align: 'center', shadow: pal.black });
    });
    api.text(g, 'LEFT RIGHT CHOOSE  ENTER OR CLICK START', 160, 169, pal.cream, { align: 'center' });
  }

  function drawStudioBg(g) {
    const hal = theme === 'halloween';
    g.fillStyle = hal ? pal.black : pal.indigo; g.fillRect(0, 0, 144, 180);
    g.fillStyle = pal.night; for (let x = 8; x < 144; x += 16) g.fillRect(x, 0, 2, 150);
    if (hal) {
      g.fillStyle = pal.cream; g.fillRect(108, 12, 12, 12); g.fillRect(106, 14, 16, 8);
      g.fillStyle = pal.grey; g.fillRect(111, 15, 2, 2); g.fillRect(114, 19, 3, 2);
      for (let i = 0; i < 8; i++) {
        if (Math.sin(t * 3 + i * 2) > 0) { g.fillStyle = pal.yellow; g.fillRect(6 + i * 17, 6 + ((i * 29) % 40), 1, 1); }
      }
      g.fillStyle = pal.maroon; g.fillRect(0, 150, 144, 30);
      g.fillStyle = pal.orange; g.fillRect(0, 150, 144, 1);
      drawSpooks(g, true);
      pumpkinSprite(g, 3, 142); pumpkinSprite(g, 131, 142);
    } else {
      g.fillStyle = pal.violet; g.fillRect(0, 150, 144, 30);
    }
    g.fillStyle = pal.night; g.fillRect(26, 149, 92, 3);
  }

  function drawStudio(g) {
    drawStudioBg(g);
    const hop = pop > 0 ? Math.round(Math.sin((1 - pop / POP_TIME) * Math.PI) * 5) : 0;
    const bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
    drawLook(g, pal, cur(), 20, 6 + bob - hop, 4, blinking > 0);
    drawSparks(g);
    api.text(g, 'PIXEL CHIC', 6, 6, pal.yellow, { shadow: pal.black });
    api.text(g, who.toUpperCase() + ' STYLE', 72, 160, pal.cream, { align: 'center' });

    g.fillStyle = pal.night; g.fillRect(144, 0, 176, 180);
    g.fillStyle = pal.blue; g.fillRect(144, 0, 1, 180);
    const look = cur();
    CATS.forEach((c, i) => {
      const y = TOP + 2 + i * RH;
      const on = i === cat;
      if (on) { g.fillStyle = pal.indigo; g.fillRect(146, TOP + i * RH, 172, RH); }
      api.text(g, c.name, 150, y, on ? pal.yellow : pal.grey);
      api.text(g, c.label(look), 258, y, on ? pal.cream : pal.grey, { align: 'center' });
      if (on) { arrow(g, 216, y, -1, pal.yellow); arrow(g, 292, y, 1, pal.yellow); }
      const sw = c.swatch(look);
      if (sw) { g.fillStyle = rc(sw); g.fillRect(304, y, 6, 5); }
    });
    button(g, 148, 152, 40, 12, 'SWAP X');
    button(g, 192, 152, 40, 12, 'COLOR C');
    button(g, 264, 152, 48, 12, 'DONE');
    api.text(g, 'UP DOWN PICK  LEFT RIGHT
