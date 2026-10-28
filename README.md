# Retro Arcade

A retro pixel-art arcade you walk up to in the browser. Three cabinets, three minigames:

| # | Machine | Type | Goal |
|---|---------|------|------|
| 1 | **GHOUL SHIFT** | First-person wave shooter (raycast pseudo-3D) | Survive 3 waves of ghouls |
| 2 | **PEBBLE JUMP** | 2D platformer | Reach the flag |
| 3 | **EMBER TALE** | Top-down RPG | Help the lantern keeper and win one turn-based battle |

Everything is original placeholder art drawn in code, one 16-color palette, and synthesized arcade sound effects. No downloads, no build step, no dependencies.

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
| Every machine | **Esc** (or click **ESC MENU** top-right) → Resume / Restart / Return to Arcade |
| Ghoul Shift | **WASD** move · **mouse** aim (click to capture the mouse) · **Arrow keys / Q E** turn · **Click / Space** shoot |
| Pebble Jump | **A D / Arrows** run · **W / Space / Up** jump |
| Ember Tale | **WASD / Arrows** walk · **Space / Enter / E** talk & confirm · battle menu: Up/Down + Enter or click |

The arcade remembers each machine's **CLEARED** status and **BEST** score for the current browser session (refreshing the page resets it).

## Project layout

```
index.html            page + canvas
server.js             zero-dependency local server (npm start)
src/main.js           boot + the single game loop
src/machines.js       the three cabinets (names, colors, module paths)
src/core/             shared engine: manager (switching/overlays/progress), input, audio,
                      palette, font, sprite, ui
src/hub/              arcade room scene + cabinet art
src/games/_template/  minimal machine that exercises the whole contract
src/games/shooter/    GHOUL SHIFT   (logic / raycaster / sprites / map data)
src/games/platformer/ PEBBLE JUMP   (logic / physics / sprites / level data)
src/games/rpg/        EMBER TALE    (logic / battle / sprites / map + dialogue data)
```

See **TEAM.md** for the game contract (lifecycle, input, audio, scoring) and ownership.

## Debugging

In the browser console, `window.__arcade.manager.debug()` shows the current mode, machine, overlay, listener count, live sounds, frame stats and session progress.
