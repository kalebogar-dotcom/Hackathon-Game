# Retro Arcade

A retro pixel-art arcade you walk up to in the browser. Three cabinets, three minigames:

| # | Machine | Type | Goal |
|---|---------|------|------|
| 1 | **BEAR IN THE RED WOODS** | First-person zombie survival (raycast pseudo-3D) | Hold the forest clearing and log cabin through 3 waves, buy guns off the cabin walls, kill the red bear |
| 2 | **PIXEL CHIC** | Dress-up | Style a model, take the photo |
| 3 | **EMBER TALE** | Top-down RPG | Help the lantern keeper and win one turn-based battle |

Everything is original pixel art drawn in code with synthesized arcade sound effects. The hub and most machines share one 16-color palette (`src/core/palette.js`); Bear in the Red Woods keeps its own 16-color crimson-forest palette (`src/games/shooter/config.js`). No downloads, no build step, no dependencies.

## Requirements

- **Node.js 18+** (only used to serve the files locally; verified with Node 22)
- A modern browser (Edge, Chrome, Firefox)

## Launch

```bash
npm start
```

Then open **http://localhost:8080**. Stop the server with `Ctrl+C`.

- Port busy? Run on another port: `PORT=8081 npm start` (Git Bash) or `$env:PORT=8081; npm start` (PowerShell).
- Opening `index.html` directly (file://) will not work — browsers block ES modules there.
- Alternative server if you prefer: `npx serve .` (downloads `serve` on first use, needs internet).

## Controls

| Where | Controls |
|-------|----------|
| Arcade | Click a cabinet, or press **1 / 2 / 3**, or **Left/Right + Enter** |
| Every machine | **Esc** (or click **ESC MENU** top-right) → Resume / Restart / Return to Arcade / Sound |
| Anywhere | **M** toggles sound |
| Bear in the Red Woods | **Enter / click** start · **WASD** move · **mouse** aim (click to capture the mouse) or **Left/Right** turn · **Click / Space** fire (SMG: hold) · **E** buy wall gun / pick up litter · **hold E** repair a window · **1 2 3 / Q** switch gun · creek mission: **A B C** answer, **N** skip |
| Pixel Chic | **Up/Down** pick a category · **Left/Right** change it · **C** color · **X** swap model · **Enter** next / done |
| Ember Tale | **WASD / Arrows** walk · **Space / Enter / E** talk & confirm · battle menu: Up/Down + Enter or click |

The arcade remembers each machine's **CLEARED** status and **BEST** score for the current browser session (refreshing the page resets it).

## Bear in the Red Woods

- Start with a pistol and 0 points. **+10** for each shot that hits, **+60** per zombie, **+500** for the bear. The score is every point earned.
- Two guns hang on the cabin walls. Stand next to one to see its name, price and **PRESS E TO BUY**; points come off only when the purchase succeeds.
  - **SPLIT-BARREL** shotgun — 400 — outside, on the front wall right of the door. 7-pellet spread.
  - **SAWMILL SMG** — 750 — inside, on the back wall. Full-auto.
- Ammo is unlimited; health regenerates after a few seconds without being hit.
- Zombies path around trees and walls and come into the cabin through the door and two windows.
- **Barricades:** both cabin windows start with 5 boards. Boards stop bodies but not bullets. A zombie at a boarded window stops and tears off one board every 1.3 s, and only climbs in once the last board is gone; the bear smashes a whole window in one blow. **Hold E** near a window to hammer boards back, one every 0.9 s (+10 pts each, at most 50 pts per window per wave). If a wall gun is also in range, E buys the gun instead; a repair only starts on a fresh E press. You cannot board up a window someone is standing in.
- **Breaks:** after waves 1 and 2 there is a 12-second break with no zombies. The top of the screen shows the next wave and a countdown (with ticks at 3-2-1). Buy guns and repair windows. The arcade's pause freezes the countdown.
- **Creek mission (after wave 1):** see *Learning mission: Protect the Creek* below. **N** skips it.
- **Bear warning:** in the last 4.5 seconds of the break before wave 3 you hear heavy footsteps and a distant roar, the screen rumbles slightly and "SOMETHING IS IN THE WOODS..." appears. It plays once per bear appearance, pauses with the game and respects mute.
- **The red bear** arrives in wave 3 with a health bar at the top. When it rears up with a red **!** ("CHARGE INCOMING!") it is about to dash in a straight line — step aside. It is stunned if it hits a wall or tree, and waits 5 seconds between charges.
- **Win:** kill the bear and every zombie in wave 3. **Lose:** health reaches 0. A short end card shows, then the arcade's PLAY AGAIN / RETURN TO ARCADE menu.

## Learning mission: Protect the Creek

**Learning objective:** rain can carry litter and pollutants from land into streams, and preventing pollution at its source helps protect freshwater habitats.

**How it plays (about 30–60 seconds):**
1. After wave 1 is cleared, the break's countdown stops and a ranger says: *"Rain can wash litter from the clearing into the creek. Remove it before it reaches the water."*
2. A small creek runs beside the cabin (east side). Three pieces of ordinary litter lie on its banks: a plastic bottle, a snack wrapper and a soda can, each marked with a gold arrow. Walk up and press **E** to pick each one up. The top of the screen shows **CREEK CLEANUP: 0/3**.
3. With all three collected you get a one-time **+100** bonus and a short explanation: *"Removing litter helps protect stream habitats. Preventing new litter keeps the problem from returning."*
4. The player then applies the lesson: *"How can we help keep new litter out of the creek?"*
   - A. Move the litter pile farther upstream: wrong. Upstream litter can still wash into the creek when it rains.
   - **B. Secure the litter in a covered collection bin away from the creek: correct**, one-time **+50**.
   - C. Push the litter into the water: wrong. Litter in the water can harm fish and other stream life, and it drifts downstream.

   Wrong answers explain why and let you try again; nothing is lost. Answer with A/B/C, 1/2/3 or a mouse click. Moving and shooting are paused while the question is open.
5. Press Enter and the countdown resumes. **N** skips the mission at any point and resumes the countdown.

**How the player demonstrates understanding:** by removing the litter before it reaches the water (the cleanup) and by choosing the prevention option, B, that keeps *new* litter away from the creek, with a short reason given for every answer.

**Design rules:**
- The mission runs only in the safe break after wave 1, never during combat, and once per run. Litter can't be picked up before the mission starts.
- A wall gun in range always takes E first. Litter is placed out of range of the guns and windows, so a pickup never buys a gun or repairs a barricade.
- Mission bonuses (cleanup 100, lesson 50) are spendable points, but they are tracked separately (`mission.bonus`) and are **not** part of the combat score reported to the arcade. Each bonus is paid at most once. A new run resets the mission.
- Only ordinary litter is shown: no chemicals, sharp objects or unknown substances. The game never says that collecting litter makes water safe to drink.

**Fact vs. fiction:** the ranger's lines, the explanation and the answer feedback are real-world facts, labeled **REAL-WORLD FACT** in the game. The zombie outbreak and the red bear are fiction. Nothing in the game connects litter to the zombies or to the bear's behavior.

**Source.** The ecology statements were checked against U.S. EPA Trash Free Waters pages:
- [Learn About Aquatic Trash](https://www.epa.gov/trash-free-waters/learn-about-aquatic-trash) (EPA, page updated May 19, 2026). It covers litter left on the ground being carried by rain and wind into storm drains, streams and rivers, and the harm trash does to wildlife and aquatic plants.
- [What You Can Do About Trash Pollution](https://www.epa.gov/trash-free-waters/what-you-can-do-about-trash-pollution) (EPA, page updated June 11, 2026). It covers keeping outdoor bin lids closed and not overfilling bins, putting trash in proper bins, reducing waste at the source, and joining cleanups.

Mission text lives in `src/games/shooter/mission-text.js`. Tuning (ranges, bonuses, timings) is `MISSION` in `src/games/shooter/config.js`.

## Project layout

```
index.html            page + canvas
server.js             zero-dependency local server (npm start)
src/main.js           boot + the single game loop
src/machines.js       the three cabinets (names, marquee lines, colors, hints, module paths)
src/core/             shared engine: manager (switching/overlays/progress), input, audio,
                      palette, font, sprite, ui
src/hub/              arcade room scene + cabinet art
src/games/_template/  minimal machine that exercises the whole contract
src/games/shooter/    BEAR IN THE RED WOODS  (index: gameplay + createGame / world: map, collision,
                      pathfinding / render: raycaster + HUD / sprites: pixel art / config: tuning + palette)
src/games/platformer/ PIXEL CHIC    (logic / sprites / item data)
src/games/rpg/        EMBER TALE    (logic / battle / sprites / map + dialogue data)
tests/                bots, headless runner + Bear unit checks (npm test), in-browser integration suite
```

See **TEAM.md** for the game contract (lifecycle, input, audio, scoring) and ownership.

## Tests

```bash
npm test
```

1. `tests/run-headless.mjs` plays all three machines headlessly with scripted bots (`tests/bots.js`): each must be winnable, losable or finishable, must not end on its own while idle, and `finish` must fire exactly once. The Bear bot plays with keys only — it turns, fires, walks to both wall guns and buys them, backs away from zombies and the bear, and strafes when the bear winds up a charge. It wins about 2 runs in 3, so the test uses three fixed random seeds.
2. `tests/bear-unit.mjs` checks Bear in the Red Woods directly: map and pathfinding, purchases (points deducted only on success), pistol / shotgun / SMG firing behavior, zombies entering the cabin only through openings, the bear's telegraphed charge and cooldown, barricades (tearing, entry only after the last board, repairs, reward cap, gun priority, fresh-press rule, blocked windows, bear smash, two zombies at one window), wave breaks (length, no spawns, single advance, ticks, buying and repairing), the bear warning (timing, order, once only) and restart resets, and the `finish` handoff.

In-browser integration suite (game open at http://localhost:8080, window visible, hands off the game for ~3–6 minutes — the Bear win plays in real time):

```js
(await import('/tests/browser-integration.js')).run().then(console.table)
```

It drives the real page with key/mouse events through every machine (enter, pause, resume, win/lose, play again, return, re-enter, rapid switching) and reports a `userInput` count so a run disturbed by real clicks is easy to spot.

## Debugging

In the browser console, `window.__arcade.manager.debug()` shows the current mode, machine, overlay, listener count, live sounds, frame stats, session progress and the running game's own `debug()` snapshot.
