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
| Bear in the Red Woods | **Enter / click** start · **WASD** move · **mouse** aim (click to capture the mouse) or **Left/Right** turn · **Click / Space** fire (SMG: hold) · **E** buy wall gun · **1 2 3 / Q** switch gun |
| Pixel Chic | **Up/Down** pick a category · **Left/Right** change it · **C** color · **X** swap model · **Enter** next / done |
| Ember Tale | **WASD / Arrows** walk · **Space / Enter / E** talk & confirm · battle menu: Up/Down + Enter or click |

The arcade remembers each machine's **CLEARED** status and **BEST** score for the current browser session (refreshing the page resets it).

## Bear in the Red Woods

- Start with a pistol and 0 points. **+10** for each shot that hits, **+60** per zombie, **+500** for the bear. The score is every point earned.
- Two guns hang on the cabin walls. Stand next to one to see its name, price and **PRESS E TO BUY**; points come off only when the purchase succeeds.
  - **SPLIT-BARREL** shotgun — 400 — outside, on the front wall right of the door. 7-pellet spread.
  - **SAWMILL SMG** — 750 — inside, on the back wall. Full-auto.
- Ammo is unlimited; health regenerates after a few seconds without being hit.
- Zombies path around trees and walls and come into the cabin through the door and two window gaps.
- **The red bear** arrives in wave 3 with a health bar at the top. When it rears up with a red **!** ("CHARGE INCOMING!") it is about to dash in a straight line — step aside. It is stunned if it hits a wall or tree, and waits 5 seconds between charges.
- **Win:** kill the bear and every zombie in wave 3. **Lose:** health reaches 0. A short end card shows, then the arcade's PLAY AGAIN / RETURN TO ARCADE menu.

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
2. `tests/bear-unit.mjs` checks Bear in the Red Woods directly: map and pathfinding, purchases (points deducted only on success), pistol / shotgun / SMG firing behavior, zombies entering the cabin only through openings, the bear's telegraphed charge and cooldown, and the `finish` handoff.

In-browser integration suite (game open at http://localhost:8080, window visible, hands off the game for ~3–6 minutes — the Bear win plays in real time):

```js
(await import('/tests/browser-integration.js')).run().then(console.table)
```

It drives the real page with key/mouse events through every machine (enter, pause, resume, win/lose, play again, return, re-enter, rapid switching) and reports a `userInput` count so a run disturbed by real clicks is easy to spot.

## Debugging

In the browser console, `window.__arcade.manager.debug()` shows the current mode, machine, overlay, listener count, live sounds, frame stats, session progress and the running game's own `debug()` snapshot.
