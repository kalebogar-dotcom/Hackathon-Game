// EMBER TALE — tiny top-down RPG. Talk to Wren, drive off the cellar slime in a
// turn-based battle, then report back to complete the quest.
import { ROOM, TILE as T, TOP, SOLID } from './map.js';
import { DIALOGUE, QUEST_TEXT } from './dialogue.js';
import { buildSprites, drawTile } from './sprites.js';
import { createBattle, wrapText, BATTLE } from './battle.js';

const STEP_TIME = 0.14;   // seconds per tile
const TYPE_SPEED = 45;    // dialogue characters per second
const CONFIRM = ['Space', 'Enter', 'NumpadEnter', 'KeyE', 'KeyZ'];
const DIRS = [
  ['up', ['ArrowUp', 'KeyW'], 0, -1],
  ['down', ['ArrowDown', 'KeyS'], 0, 1],
  ['left', ['ArrowLeft', 'KeyA'], -1, 0],
  ['right', ['ArrowRight', 'KeyD'], 1, 0],
];
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function createGame(api) {
  const { W, H, palette: P, input, audio } = api;
  const art = buildSprites(api);
  const tiles = ROOM.map(row => row.split(''));
  let start = { x: 9, y: 6 }, npc = { x: 10, y: 3 }, slimeSpot = { x: 16, y: 4 };
  tiles.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'P') { start = { x, y }; row[x] = ','; }
    else if (c === 'N') { npc = { x, y }; row[x] = '.'; }
    else if (c === 'S') { slimeSpot = { x, y }; row[x] = '.'; }
  }));

  const hero = { x: start.x, y: start.y, fromX: start.x, fromY: start.y, t: 1, facing: 'up' };
  let quest = 'talk';      // talk → hunt → report → done
  let mode = 'explore';    // explore | dialog | battle | ending
  let dialog = null;       // { lines, index, shown, onDone }
  let battle = null;
  let slime = null;        // { x, y } once the quest starts
  let finalHp = BATTLE.playerMaxHp;
  let time = 0, endTimer = 0, typed = 0;
  let over = false;

  const isBlocked = (x, y) =>
    SOLID.has(tiles[y]?.[x] ?? '#') || (x === npc.x && y === npc.y) || (slime && x === slime.x && y === slime.y);
  const isAt = (o, x, y) => o && o.x === x && o.y === y;

  function say(lines, onDone = null) {
    mode = 'dialog';
    dialog = { lines, index: 0, shown: 0, onDone };
    typed = 0;
  }

  function talkToWren() {
    if (quest === 'talk') {
      say(DIALOGUE.intro, () => {
        quest = 'hunt';
        slime = { ...slimeSpot };
        say(DIALOGUE.slimeAppears);
      });
    } else if (quest === 'hunt') {
      say(DIALOGUE.waiting);
    } else if (quest === 'report') {
      say(DIALOGUE.thanks, () => {
        quest = 'done';
        mode = 'ending';
        endTimer = 1.2;
        audio.play('coin');
      });
    }
  }

  function startBattle() {
    mode = 'battle';
    audio.play('wave');
    battle = createBattle({
      api, art,
      onEnd(won, hp) {
        if (won) {
          battle = null;
          slime = null;
          finalHp = hp;
          quest = 'report';
          mode = 'explore';
        } else {
          over = true;
          api.finish({ won: false, score: 0 });
        }
      },
    });
  }

  function faceTile() {
    const [dx, dy] = STEP[hero.facing];
    return { x: hero.x + dx, y: hero.y + dy };
  }

  function interact() {
    const f = faceTile();
    if (isAt(npc, f.x, f.y)) return talkToWren();
    if (isAt(slime, f.x, f.y)) return startBattle();
    // Forgiving: talk to Wren from any adjacent tile.
    for (const [name, , dx, dy] of DIRS) {
      if (isAt(npc, hero.x + dx, hero.y + dy)) { hero.facing = name; return talkToWren(); }
    }
  }

  function updateExplore(dt) {
    if (hero.t < 1) {
      hero.t = Math.min(1, hero.t + dt / STEP_TIME);
      if (hero.t < 1) return;
    }
    if (input.wasPressed(...CONFIRM)) { interact(); return; }
    const dir = DIRS.find(([, keys]) => input.isDown(...keys));
    if (!dir) return;
    const [name, , dx, dy] = dir;
    hero.facing = name;
    const nx = hero.x + dx, ny = hero.y + dy;
    if (isAt(slime, nx, ny)) { startBattle(); return; }
    if (isBlocked(nx, ny)) return;
    hero.fromX = hero.x;
    hero.fromY = hero.y;
    hero.x = nx;
    hero.y = ny;
    hero.t = 0;
  }

  function updateDialog(dt) {
    const line = dialog.lines[dialog.index];
    if (dialog.shown < line.length) {
      dialog.shown = Math.min(line.length, dialog.shown + TYPE_SPEED * dt);
      if (Math.floor(dialog.shown / 3) > typed) { typed = Math.floor(dialog.shown / 3); audio.play('talk'); }
    }
    if (!(input.wasPressed(...CONFIRM) || input.mouse.pressed)) return;
    if (dialog.shown < line.length) { dialog.shown = line.length; return; }
    if (dialog.index < dialog.lines.length - 1) {
      dialog.index++;
      dialog.shown = 0;
      typed = 0;
      return;
    }
    const done = dialog.onDone;
    dialog = null;
    mode = 'explore';
    done?.();
  }

  function heroPixel() {
    const k = hero.t;
    return {
      x: Math.round((hero.fromX + (hero.x - hero.fromX) * k) * T),
      y: Math.round(TOP + (hero.fromY + (hero.y - hero.fromY) * k) * T),
    };
  }

  return {
    update(dt) {
      if (over) return;
      time += dt;
      if (mode === 'explore') updateExplore(dt);
      else if (mode === 'dialog') updateDialog(dt);
      else if (mode === 'battle') battle.update(dt);
      else if (mode === 'ending') {
        endTimer -= dt;
        if (endTimer <= 0) {
          over = true;
          api.finish({ won: true, score: 100 + finalHp * 10 });
        }
      }
    },

    draw(g) {
      if (mode === 'battle') { battle.draw(g); return; }

      // Quest strip
      g.fillStyle = P.black;
      g.fillRect(0, 0, W, TOP);
      api.text(g, QUEST_TEXT[quest], 4, 4, quest === 'done' ? P.green : P.yellow);
      api.text(g, 'WASD / ARROWS MOVE   SPACE TALK', 4, 12, P.grey);

      // Room
      for (let r = 0; r < tiles.length; r++) {
        for (let c = 0; c < tiles[r].length; c++) drawTile(g, P, tiles[r][c], c * T, TOP + r * T, T, time);
      }

      // Wren with a flickering lantern glow and a "!" when she has something to say
      const nx = npc.x * T + 2, ny = TOP + npc.y * T + 2;
      if (Math.sin(time * 9) > -0.6) {
        g.fillStyle = P.orange;
        g.globalAlpha = 0.35;
        g.fillRect(nx + 8, ny + 4, 7, 7);
        g.globalAlpha = 1;
      }
      g.drawImage(art.wren, nx, ny);
      if ((quest === 'talk' || quest === 'report') && mode === 'explore' && Math.sin(time * 6) > -0.3) {
        api.text(g, '!', nx + 5, ny - 9, P.yellow, { scale: 2, shadow: P.black });
      }

      if (slime) {
        const bob = Math.round(Math.sin(time * 4) * 1);
        g.drawImage(art.slime, slime.x * T, TOP + slime.y * T + 4 + bob);
      }

      const hp = heroPixel();
      const sprite = { up: art.emberUp, down: art.emberDown, left: art.emberLeft, right: art.emberRight }[hero.facing];
      const walk = hero.t < 1 ? Math.round(Math.sin(hero.t * Math.PI)) : 0;
      g.drawImage(sprite, hp.x + 2, hp.y + 2 - walk);

      // Dialogue box
      if (mode === 'dialog') {
        g.fillStyle = P.cream;
        g.fillRect(5, H - 46, W - 10, 42);
        g.fillStyle = P.night;
        g.fillRect(6, H - 45, W - 12, 40);
        const line = dialog.lines[dialog.index].slice(0, Math.floor(dialog.shown));
        wrapText(line, 74).forEach((l, i) => api.text(g, l, 12, H - 38 + i * 9, P.cream));
        if (dialog.shown >= dialog.lines[dialog.index].length && Math.sin(time * 8) > 0) {
          api.text(g, '>', W - 16, H - 14, P.yellow);
        }
      }

      if (mode === 'ending') {
        api.text(g, 'QUEST COMPLETE!', W / 2, H / 2 - 10, P.yellow, { scale: 2, align: 'center', shadow: P.black });
      }
    },

    destroy() {},

    debug() {
      return {
        hero: { x: hero.x, y: hero.y, t: hero.t, facing: hero.facing },
        npc, slime, quest, mode,
        dialog: dialog && { index: dialog.index, count: dialog.lines.length },
        battle: battle && { hp: battle.state.hp, enemyHp: battle.state.enemyHp, herbs: battle.state.herbs, phase: battle.state.phase, choice: battle.state.choice },
      };
    },
  };
}
