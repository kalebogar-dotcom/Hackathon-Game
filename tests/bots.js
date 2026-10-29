// Scripted players for the automated playtests (headless and in-browser).
// A bot is (state, ctl, t) => void, called every tick with the game's debug() snapshot.
// ctl.hold(code, on) sets whether a key is held (persists until changed); ctl.tap(code) presses once.
import { ROOM, SOLID } from '../src/games/rpg/map.js';

const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/** GHOUL SHIFT: stand still, turn toward the nearest ghoul, fire when lined up. */
export function shooterTurret() {
  return (s, ctl) => {
    ctl.hold('ArrowLeft', false);
    ctl.hold('ArrowRight', false);
    ctl.hold('Space', false);
    if (!s) return;
    const p = s.player;
    let target = null, best = Infinity;
    for (const g of s.ghouls) {
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < best) { best = d; target = g; }
    }
    if (!target) return;
    let diff = Math.atan2(target.y - p.y, target.x - p.x) - p.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (diff > 0.04) ctl.hold('ArrowRight', true);
    else if (diff < -0.04) ctl.hold('ArrowLeft', true);
    if (Math.abs(diff) < 0.12) ctl.hold('Space', true);
  };
}

/** PIXEL CHIC: pick a character, style an outfit, dance at the party, then finish from the photo screen.
 *  halloween: wear a costume, then flip THEME back to NORMAL (the costume should keep it spooky). */
export function pixelChicStylist({ halloween = false } = {}) {
  const studio = halloween
    ? ['ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'Enter'] // COSTUME -> first costume, THEME -> normal
    : ['ArrowRight', ...Array(12).fill('ArrowDown'), 'ArrowRight', 'Enter'];   // change hair, apply first preset
  let step = 0, readyAt = 0.4, partyAt = -1, finished = false;
  return (s, ctl, t) => {
    if (!s || finished || t < readyAt) return;
    readyAt = t + 0.15;
    if (s.screen === 'select') { ctl.tap('Enter'); readyAt = t + 0.3; return; }
    if (s.screen === 'studio') { if (step < studio.length) ctl.tap(studio[step++]); return; }
    if (s.screen === 'party') {
      if (partyAt < 0) partyAt = t;
      if (t - partyAt > 2.6) ctl.tap('Enter');
      return;
    }
    if (s.screen === 'photo') { ctl.tap('Enter'); finished = true; }
  };
}

/** PIXEL CHIC: go to the party, then leave it with B; should land back in the studio without finishing. */
export function pixelChicPartyHopper() {
  let readyAt = 0.4, partyAt = -1;
  return (s, ctl, t) => {
    if (!s || t < readyAt) return;
    readyAt = t + 0.3;
    if (s.screen === 'select' || (s.screen === 'studio' && partyAt < 0)) ctl.tap('Enter');
    else if (s.screen === 'party') { if (partyAt < 0) partyAt = t; if (t - partyAt > 3) ctl.tap('KeyB'); }
  };
}

/** EMBER TALE: walk to Wren, talk, fight the slime (optionally healing when low), report back. */
export function rpgQuester({ heal = true } = {}) {
  let readyAt = 0;
  let talkNext = false;
  function nextMove(s, goal) {
    for (const [k, [dx, dy]] of Object.entries(ARROWS)) if (s.hero.x + dx === goal.x && s.hero.y + dy === goal.y) return { face: k };
    const blocked = (x, y) => SOLID.has(ROOM[y]?.[x] ?? '#') || (s.npc.x === x && s.npc.y === y) || (s.slime && s.slime.x === x && s.slime.y === y);
    const queue = [[s.hero.x, s.hero.y, null]];
    const seen = new Set([`${s.hero.x},${s.hero.y}`]);
    while (queue.length) {
      const [x, y, first] = queue.shift();
      for (const [k, [dx, dy]] of Object.entries(ARROWS)) {
        const nx = x + dx, ny = y + dy;
        if (seen.has(`${nx},${ny}`) || blocked(nx, ny)) continue;
        seen.add(`${nx},${ny}`);
        const f = first ?? k;
        if (Math.abs(nx - goal.x) + Math.abs(ny - goal.y) === 1) return f;
        queue.push([nx, ny, f]);
      }
    }
    return null;
  }
  return (s, ctl, t) => {
    for (const k of Object.keys(ARROWS)) ctl.hold(k, false);
    if (!s || t < readyAt) return;
    if (s.mode === 'dialog' || s.mode === 'ending') { ctl.tap('Space'); readyAt = t + 0.25; return; }
    if (s.mode === 'battle') {
      const b = s.battle;
      if (b.phase !== 'menu') return;
      const want = heal && b.hp <= 12 && b.herbs > 0 ? 1 : 0;
      ctl.tap(b.choice !== want ? 'ArrowDown' : 'Space');
      readyAt = t + 0.12;
      return;
    }
    if (s.hero.t < 1) return;
    if (talkNext) { talkNext = false; ctl.tap('Space'); readyAt = t + 0.12; return; }
    const mv = nextMove(s, s.quest === 'hunt' ? s.slime : s.npc);
    if (!mv) return;
    if (mv.face) { ctl.hold(mv.face, true); talkNext = s.quest !== 'hunt'; return; }
    ctl.hold(mv, true);
  };
}

export function idle() {
  return () => {};
}
