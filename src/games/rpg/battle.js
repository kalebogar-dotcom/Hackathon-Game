// EMBER TALE turn-based battle: choose ATTACK or HEAL, then the slime answers. First to 0 HP loses.
import { BATTLE_TEXT as TXT } from './dialogue.js';

export const BATTLE = {
  playerMaxHp: 30,
  enemyMaxHp: 30,
  attack: [5, 8],
  enemyAttack: [4, 8],
  heal: 10,
  herbs: 3,
  beat: 0.9, // seconds each action message stays up
};

const CONFIRM = ['Space', 'Enter', 'NumpadEnter', 'KeyE', 'KeyZ'];
const roll = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** Split text into lines of at most maxChars, breaking on spaces. */
export function wrapText(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export function createBattle({ api, art, onEnd }) {
  const { W, palette: P, input, audio } = api;
  const s = {
    hp: BATTLE.playerMaxHp, enemyHp: BATTLE.enemyMaxHp, herbs: BATTLE.herbs,
    phase: 'intro', timer: 1.2, message: TXT.start, choice: 0,
    enemyFlash: 0, shake: 0, time: 0, ended: false,
    popups: [],      // floating numbers: { text, x, y, color, t }
    lunge: null,     // { who: 'ember' | 'slime', t }
    sparkle: 0,      // heal sparkle timer
  };
  const EMBER_POS = { x: 50, y: 68 };
  const SLIME_POS = { x: 196, y: 28 };
  const LUNGE_TIME = 0.25;
  const POPUP_TIME = 0.9;
  const popup = (text, x, y, color) => s.popups.push({ text, x, y, color, t: 0 });
  const options = () => [{ id: 'attack', label: 'ATTACK' }, { id: 'heal', label: `HEAL X${s.herbs}` }];
  let optionRects = [];

  function act(id) {
    if (id === 'heal') {
      if (s.herbs <= 0) { s.message = TXT.noHerbs; audio.play('blip'); return; }
      s.herbs--;
      const amount = Math.min(BATTLE.heal, BATTLE.playerMaxHp - s.hp);
      s.hp += amount;
      s.message = TXT.heal(amount);
      s.sparkle = 0.6;
      popup(`+${amount}`, EMBER_POS.x + 18, EMBER_POS.y - 4, P.green);
      audio.play('heal');
    } else {
      const dmg = roll(BATTLE.attack);
      s.enemyHp = Math.max(0, s.enemyHp - dmg);
      s.enemyFlash = 0.3;
      s.lunge = { who: 'ember', t: 0 };
      popup(`-${dmg}`, SLIME_POS.x + 32, SLIME_POS.y - 14, P.yellow);
      s.message = TXT.attack(dmg);
      audio.play('hit');
    }
    s.phase = 'player';
    s.timer = BATTLE.beat;
  }

  function bar(g, x, y, w, value, max, color) {
    g.fillStyle = P.black;
    g.fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle = P.maroon;
    g.fillRect(x, y, w, 4);
    g.fillStyle = value / max > 0.3 ? color : P.red;
    g.fillRect(x, y, Math.round((w * value) / max), 4);
  }

  return {
    state: s,

    update(dt) {
      s.time += dt;
      s.enemyFlash = Math.max(0, s.enemyFlash - dt);
      s.shake = Math.max(0, s.shake - dt);
      s.sparkle = Math.max(0, s.sparkle - dt);
      if (s.lunge && (s.lunge.t += dt) >= LUNGE_TIME) s.lunge = null;
      for (const p of s.popups) p.t += dt;
      s.popups = s.popups.filter(p => p.t < POPUP_TIME);

      if (s.phase === 'menu') {
        const n = options().length;
        if (input.wasPressed('ArrowUp', 'KeyW')) { s.choice = (s.choice + n - 1) % n; audio.play('blip'); }
        if (input.wasPressed('ArrowDown', 'KeyS')) { s.choice = (s.choice + 1) % n; audio.play('blip'); }
        const m = input.mouse;
        const hover = optionRects.findIndex(r => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
        if (hover >= 0 && m.moved) s.choice = hover;
        if (hover >= 0 && m.pressed) act(options()[hover].id);
        else if (input.wasPressed(...CONFIRM)) act(options()[s.choice].id);
        return;
      }

      s.timer -= dt;
      if (s.timer > 0) return;
      if (s.phase === 'won' || s.phase === 'lost') {
        if (!s.ended) { s.ended = true; onEnd(s.phase === 'won', s.hp); }
        return;
      }
      if (s.phase === 'intro') {
        s.phase = 'menu';
        s.message = TXT.prompt;
      } else if (s.phase === 'player') {
        if (s.enemyHp <= 0) {
          s.phase = 'won';
          s.message = TXT.won;
          s.timer = 1.6;
          audio.play('explode');
        } else {
          const dmg = roll(BATTLE.enemyAttack);
          s.hp = Math.max(0, s.hp - dmg);
          s.shake = 0.3;
          s.lunge = { who: 'slime', t: 0 };
          popup(`-${dmg}`, EMBER_POS.x + 18, EMBER_POS.y - 4, P.red);
          s.message = TXT.enemy(dmg);
          audio.play('hurt');
          s.phase = 'enemy';
          s.timer = BATTLE.beat;
        }
      } else if (s.phase === 'enemy') {
        if (s.hp <= 0) { s.phase = 'lost'; s.message = TXT.lost; s.timer = 1.4; }
        else { s.phase = 'menu'; s.message = TXT.prompt; }
      }
    },

    draw(g) {
      const shakeX = s.shake > 0 ? Math.round(Math.sin(s.time * 90) * 2) : 0;
      g.translate(shakeX, 0);
      // Backdrop: dark cellar bands + two stone platforms
      g.fillStyle = P.black;
      g.fillRect(-4, 0, W + 8, 126);
      g.fillStyle = P.night;
      for (let y = 8; y < 120; y += 16) g.fillRect(-4, y, W + 8, 6);
      g.fillStyle = P.indigo;
      g.fillRect(180, 70, 96, 10);
      g.fillRect(30, 106, 76, 10);

      // Lunges: the attacker hops toward the other side and back
      const reach = who => (s.lunge?.who === who ? Math.sin((s.lunge.t / LUNGE_TIME) * Math.PI) : 0);
      const emberDx = Math.round(reach('ember') * 14), emberDy = -Math.round(reach('ember') * 6);
      const slimeDx = -Math.round(reach('slime') * 18), slimeDy = Math.round(reach('slime') * 8);

      // Slime (fades out when defeated)
      const bob = Math.round(Math.sin(s.time * 3) * 2);
      if (s.phase === 'won') g.globalAlpha = Math.max(0, s.timer / 1.6);
      const slime = s.enemyFlash > 0 && Math.floor(s.time * 20) % 2 ? art.slimeHurt : art.slime;
      g.drawImage(slime, SLIME_POS.x + slimeDx, SLIME_POS.y + bob + slimeDy, slime.width * 4, slime.height * 4);
      g.globalAlpha = 1;
      // Ember from behind
      g.drawImage(art.emberUp, EMBER_POS.x + emberDx, EMBER_POS.y + emberDy, art.emberUp.width * 3, art.emberUp.height * 3);
      // Heal sparkles drifting up around Ember
      if (s.sparkle > 0) {
        g.fillStyle = Math.floor(s.time * 16) % 2 ? P.cream : P.green;
        for (let i = 0; i < 6; i++) {
          const rise = (0.6 - s.sparkle) * 40 + (i % 3) * 5;
          g.fillRect(EMBER_POS.x + 2 + i * 6, EMBER_POS.y + 34 - rise, 1, 2);
        }
      }
      // Floating damage / heal numbers
      for (const p of s.popups) {
        const k = p.t / POPUP_TIME;
        api.text(g, p.text, p.x, p.y - k * 14, p.color, { scale: 2, align: 'center', shadow: P.black });
      }

      // Status panels
      api.text(g, 'CELLAR SLIME', 16, 14, P.cream, { shadow: P.black });
      bar(g, 16, 22, 70, s.enemyHp, BATTLE.enemyMaxHp, P.green);
      api.text(g, 'EMBER', 196, 92, P.orange, { shadow: P.black });
      bar(g, 196, 100, 70, s.hp, BATTLE.playerMaxHp, P.green);
      api.text(g, `HP ${s.hp}/${BATTLE.playerMaxHp}`, 196, 107, P.cream, { shadow: P.black });

      // Message box + action menu
      g.fillStyle = P.cream;
      g.fillRect(3, 127, W - 6, 50);
      g.fillStyle = P.night;
      g.fillRect(4, 128, W - 8, 48);
      const inMenu = s.phase === 'menu';
      wrapText(s.message, inMenu ? 50 : 74).forEach((line, i) => api.text(g, line, 10, 136 + i * 8, P.cream));
      optionRects = [];
      if (inMenu) {
        options().forEach((opt, i) => {
          const r = { x: 222, y: 134 + i * 14, w: 88, h: 12 };
          optionRects.push(r);
          const on = i === s.choice;
          const disabled = opt.id === 'heal' && s.herbs <= 0;
          g.fillStyle = on ? P.indigo : P.black;
          g.fillRect(r.x, r.y, r.w, r.h);
          if (on) api.text(g, '>', r.x + 3, r.y + 4, P.yellow);
          api.text(g, opt.label, r.x + 10, r.y + 4, disabled ? P.grey : on ? P.yellow : P.cream);
        });
      }
      g.translate(-shakeX, 0);
    },
  };
}
