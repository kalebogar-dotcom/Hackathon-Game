// `npm test` — plays every minigame headlessly with scripted bots and checks win/lose/idle behavior.
import { runGame } from './harness.mjs';
import { bearHunter, pixelChicStylist, rpgQuester, startThenIdle, idle } from './bots.js';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${JSON.stringify(detail)}` : ''}`);
};
const once = r => r.finishCalls === 1;
const realRandom = Math.random;
const seeded = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// BEAR IN THE RED WOODS — the key-only bot wins about 2 runs in 3, so three fixed seeds keep this deterministic.
const bearRuns = [];
for (const s of [11, 22, 33]) {
  Math.random = seeded(s);
  const run = await runGame('shooter', bearHunter(), { seconds: 400, drawEvery: s === 11 ? 1 : 30 });
  bearRuns.push({ seed: s, won: run.result?.won ?? null, score: run.result?.score, once: once(run), wave: run.state.wave, bought: run.state.purchases.join('+'), t: run.seconds });
}
Math.random = realRandom;
check('shooter: key-only bot buys both wall guns and reaches wave 3', bearRuns.every(b => b.bought === 'shotgun+smg' && b.wave === 3 && b.once), bearRuns);
check('shooter: key-only bot kills the bear and wins', bearRuns.some(b => b.won === true), bearRuns.map(b => `${b.seed}:${b.won ? 'W' : 'L'}${b.score}`));
let r = await runGame('shooter', startThenIdle(), { seconds: 240 });
check('shooter: idle player loses', r.result?.won === false && once(r), { score: r.result?.score, t: r.seconds });
r = await runGame('shooter', idle(), { seconds: 2 });
check('shooter: waits on its title screen', r.result === null && r.state.mode === 'title');

// PIXEL CHIC
r = await runGame('platformer', pixelChicStylist(), { seconds: 10 });
check('platformer: stylist finishes a look (PIXEL CHIC)', r.result?.won === true && once(r), { score: r.result?.score, t: r.seconds });
r = await runGame('platformer', idle(), { seconds: 20 });
check('platformer: idle never ends the game', r.result === null);

// EMBER TALE
r = await runGame('rpg', rpgQuester({ heal: true }), { seconds: 120 });
check('rpg: full quest completes', r.result?.won === true && once(r) && r.state.quest === 'done', { score: r.result?.score, t: r.seconds });
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
