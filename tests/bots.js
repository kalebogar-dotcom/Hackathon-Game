// Scripted players for the automated playtests (headless and in-browser).
// A bot is (state, ctl, t) => void, called every tick with the game's debug() snapshot.
// ctl.hold(code, on) sets whether a key is held (persists until changed); ctl.tap(code) presses once.
import { ROOM, SOLID } from '../src/games/rpg/map.js';

const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * BEAR IN THE RED WOODS, played with keys only: start from the title, turn toward the nearest enemy and fire,
 * walk to each wall gun and press E once it is affordable, then fight from the open clearing, backing away
 * from zombies that get close and strafing while the bear winds up a charge.
 */
export function bearHunter() {
  const SHOTGUN = [[14.5, 11.6]];
  const SMG = [[12.0, 11.5], [12.0, 9.0], [13.5, 5.6]]; // through the cabin door to the back wall
  const OUT = [[12.0, 9.0], [12.0, 11.5], [11.5, 13.5]]; // back out to the clearing
  let route = null, buyAtEnd = false, trigger = false, dodgeUntil = -1, dodgeKey = 'KeyA';
  return (s, ctl, t) => {
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'Space']) ctl.hold(k, false);
    if (!s) return;
    if (s.mode === 'title') { ctl.tap('Enter'); return; }
    if (s.mode !== 'play') return;
    if (s.mission?.active) { ctl.tap('KeyN'); return; } // a combat bot: skip the creek mission
    const p = s.player;
    if (s.bear?.state === 'windup' && t > dodgeUntil) { dodgeUntil = t + 0.8; dodgeKey = dodgeKey === 'KeyA' ? 'KeyD' : 'KeyA'; }
    if (t < dodgeUntil) ctl.hold(dodgeKey, true);

    if (!route && !p.owned.includes('shotgun') && s.points >= 400) { route = [...SHOTGUN]; buyAtEnd = true; }
    if (!route && p.owned.includes('shotgun') && !p.owned.includes('smg') && s.points >= 750) { route = [...SMG]; buyAtEnd = true; }

    let target = null, best = Infinity;
    for (const e of s.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < best) { best = d; target = e; }
    }
    let goal = target, walking = false;
    if (route && best > 1.6) {
      const [wx, wy] = route[0];
      if (Math.hypot(wx - p.x, wy - p.y) < 0.25) {
        route.shift();
        if (!route.length) {
          route = null;
          if (buyAtEnd) { ctl.tap('KeyE'); buyAtEnd = false; if (p.owned.includes('shotgun')) route = [...OUT]; }
        }
      } else { goal = { x: wx, y: wy }; walking = true; }
    }
    if (!goal) return;
    const dist = Math.hypot(goal.x - p.x, goal.y - p.y);
    const diff = wrap(Math.atan2(goal.y - p.y, goal.x - p.x) - p.angle);
    if (diff > 0.03) ctl.hold('ArrowRight', true);
    else if (diff < -0.03) ctl.hold('ArrowLeft', true);
    if (walking) { if (Math.abs(diff) < 0.35) ctl.hold('ArrowUp', true); return; }
    if (dist < (target.kind === 'bear' ? 2.6 : 2.2)) ctl.hold('ArrowDown', true); // back off while shooting
    const tolerance = Math.atan2((target.kind === 'bear' ? 0.55 : 0.34) * 0.8, dist);
    if (Math.abs(diff) < tolerance) {
      if (p.weapon === 'smg') ctl.hold('Space', true);
      else { trigger = !trigger; ctl.hold('Space', trigger); } // semi-auto guns need fresh presses
    }
  };
}

/** PIXEL CHIC: pick the first model, open the photo booth, finish (Enter three times). */
export function pixelChicStylist() {
  let next = 0;
  return (s, ctl, t) => {
    if (s && t >= next) { ctl.tap('Enter'); next = t + 0.3; }
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

/** Leaves a title screen with Enter, then does nothing. */
export function startThenIdle() {
  return (s, ctl) => { if (s?.mode === 'title') ctl.tap('Enter'); };
}

export function idle() {
  return () => {};
}
