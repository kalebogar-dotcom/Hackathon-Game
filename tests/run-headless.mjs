// `npm test` — plays every minigame headlessly with scripted bots and checks win/lose/idle behavior.
import { runGame } from './harness.mjs';
import { shooterTurret, platformerRunner, rpgQuester, walkRight, idle } from './bots.js';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${JSON.stringify(detail)}` : ''}`);
};
const once = r => r.finishCalls === 1;

// GHOUL SHIFT
let r = await runGame('shooter', shooterTurret(), { seconds: 120, drawEvery: 1 });
check('shooter: turret bot clears 3 waves', r.result?.won === true && once(r), { score: r.result?.score, t: r.seconds });
r = await runGame('shooter', idle(), { seconds: 120 });
check('shooter: idle player loses', r.result?.won === false && once(r), { t: r.seconds });

// PEBBLE JUMP
r = await runGame('platformer', platformerRunner(), { seconds: 60 });
check('platformer: runner reaches the flag', r.result?.won === true && once(r), { score: r.result?.score, lives: r.state.lives, t: r.seconds });
r = await runGame('platformer', walkRight(), { seconds: 60 });
check('platformer: walking into hazards loses after 3 lives', r.result?.won === false && once(r) && r.state.lives === 0, { t: r.seconds });
r = await runGame('platformer', idle(), { seconds: 20 });
check('platformer: idle never ends the game', r.result === null);

// EMBER TALE
r = await runGame('rpg', rpgQuester({ heal: true }), { seconds: 120 });
check('rpg: full quest completes', r.result?.won === true && once(r) && r.state.quest === 'done', { score: r.result?.score, t: r.seconds });
const realRandom = Math.random;
let n = 0;
Math.random = () => (n++ % 2 ? 0.99 : 0); // Ember rolls minimum damage, the slime rolls maximum
r = await runGame('rpg', rpgQuester({ heal: false }), { seconds: 120 });
Math.random = realRandom;
check('rpg: unlucky attack-only battle loses', r.result?.won === false && once(r), { t: r.seconds });
let wins = 0;
for (let i = 0; i < 30; i++) if ((await runGame('rpg', rpgQuester({ heal: true }), { seconds: 120, drawEvery: 60 })).result?.won) wins++;
check('rpg: healing strategy wins reliably (30 runs)', wins >= 28, { wins });
r = await runGame('rpg', idle(), { seconds: 20 });
check('rpg: idle never ends the game', r.result === null);

const failed = results.filter(ok => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
