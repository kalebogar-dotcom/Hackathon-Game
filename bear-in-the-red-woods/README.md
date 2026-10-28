# Bear in the Red Woods

A retro first-person zombie survival game. You hold a forest clearing and its log cabin through three waves of the dead. Earn points, buy guns off the cabin walls, and kill the red bear that comes out of the trees in wave 3.

Everything is original pixel art drawn in code from one 16-color palette, with synthesized sound effects. No downloads, no build step, no dependencies.

## Requirements

- **Node.js 18+** (only used to serve the files locally)
- A modern desktop browser (Edge, Chrome, Firefox)

## Launch

From this folder (`bear-in-the-red-woods/`):

```bash
npm start
```

Then open **http://localhost:8090** and click the game once so it captures the mouse. Stop the server with `Ctrl+C`.

- Port busy? `$env:PORT=8091; npm start` (PowerShell) or `PORT=8091 npm start` (Git Bash).
- Opening `index.html` directly (file://) will not work, because browsers block ES modules there.
- If the arcade server in the parent folder is already running, the game is also at http://localhost:8080/bear-in-the-red-woods/.

## Controls

| Action | Keys |
|---|---|
| Move | **WASD** (or **Up/Down** arrows) |
| Aim | **Mouse** (click the game to capture it) or **Left/Right** arrows |
| Fire | **Left click** or **Space** (SMG: hold) |
| Buy wall gun | **E** when the prompt shows |
| Switch gun | **1 / 2 / 3**, or **Q** to cycle |
| Pause | **Esc** or **P** (Enter / click resumes, **R** restarts, **T** title) |
| Mute | **M** (remembered between visits) |

## How to play

- Survive **3 waves**. You start with a pistol and 0 points.
- **+10** points for each shot that hits, **+60** per zombie kill, **+500** for the bear.
- Two guns hang on the cabin walls. Stand next to one to see its name, price and **Press E to buy**. Points come off only when the purchase succeeds.
  - **SPLIT-BARREL** shotgun, 400 points, outside on the front wall right of the door. 7-pellet spread, brutal up close.
  - **SAWMILL SMG**, 750 points, inside on the back wall. Hold to fire about 11 shots a second.
- Ammunition is unlimited. Health regenerates after a few seconds without being hit.
- Zombies path around trees and walls and come into the cabin through the door and the two window gaps.
- **The red bear** arrives in wave 3. It has a health bar at the top of the screen. When it rears up and a red **!** appears ("CHARGE INCOMING!"), it is about to dash in a straight line. Step aside before it locks on. If it slams into a wall or tree it is stunned for a moment, and it waits 5 seconds before charging again.
- **Win:** kill the bear and every zombie in wave 3. **Lose:** health reaches 0. Either screen shows your score; press Enter or click to play again.

## Tests

```bash
npm test
```

Runs the real game modules headless in Node (stub canvas and audio, seeded randomness). 30 checks cover the map, purchases, weapon behavior, zombie navigation into the cabin, the bear's telegraphed charge and cooldown, a full bot playthrough to the win screen, losing, restart, pause and mute.

## Files

| File | What it does |
|---|---|
| `index.html` | Page shell and the 320x180 canvas |
| `server.js` | Zero-dependency static server (port 8090) |
| `src/config.js` | Palette, resolution and every gameplay number (weapons, zombies, bear, waves) |
| `src/world.js` | Map, collision, hitscan rays, enemy pathfinding |
| `src/game.js` | Screens, player, weapons, wall buys, zombies, bear, wave director |
| `src/render.js` | Raycaster, sprites, held gun, HUD, title/pause/end screens |
| `src/art.js` | All pixel art, drawn in code |
| `src/audio.js` | Synthesized sound effects and mute |
| `src/input.js`, `src/font.js` | Keyboard/mouse state and the 3x5 pixel font |
| `src/main.js` | Boot and game loop |
| `tests/run.mjs` | Headless test suite |

See [TEAM.md](TEAM.md) for the design brief, milestones and interfaces.
