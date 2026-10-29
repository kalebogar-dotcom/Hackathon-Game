// `npm test` — plays every minigame headlessly with scripted bots and checks win/lose/idle behavior.
import { runGame } from './harness.mjs';
import { shooterTurret, pixelChicStylist, pixelChicPartyHopper, rpgQuester, idle } from './bots.js';

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

// PIXEL CHIC
r = await runGame('platformer', pixelChicStylist(), { seconds: 30, drawEvery: 1 });
check('platformer: styled look finishes with a teddy bear', r.result?.won === true && once(r) && r.state.prize === 'bear' && !r.state.spooky
  && r.result.score === 100 + r.state.equipped * 10, { score: r.result?.score, state: r.state.screen, t: r.seconds });
r = await runGame('platformer', pixelChicStylist({ halloween: true }), { seconds: 30, drawEvery: 1 });
check('platformer: costume stays spooky, wins a ghost and the bonus', r.result?.won === true && once(r) && r.state.theme === 'normal' && r.state.spooky
  && r.state.prize === 'ghost' && r.result.score === 150 + r.state.equipped * 10, { score: r.result?.score, theme: r.state.theme, t: r.seconds });
r = await runGame('platformer', pixelChicPartyHopper(), { seconds: 20, drawEvery: 1 });
check('platformer: leaving the party returns to the studio without finishing', r.result === null && r.state.screen === 'studio');
r = await runGame('platformer', idle(), { seconds: 20 });
check('platformer: idle never ends the game', r.result === null && r.state.screen === 'select');

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
