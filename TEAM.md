# TEAM.md — Retro Arcade

## Game brief

A feasibility prototype (~2 hours): a retro arcade hub with three selectable cabinets, each launching a
small original minigame inside the same browser app. Retro style: 320×180 pixels scaled up crisp,
one 16-color palette (`src/core/palette.js`), 3×5 pixel font, synthesized arcade SFX.
**Priority: hub + all three machines playable and switchable cleanly. Polish only after that.**

| Machine | Minimum playable scope | Win | Lose | Score (integer, higher is better) |
|---|---|---|---|---|
| GHOUL SHIFT (shooter) | One arena, WASD + mouse aim, one weapon, one enemy type, health, 3 waves (3/5/8) | Clear wave 3 | Health 0 | `kills × 100 + health remaining` (on loss: `kills × 100`) |
| PEBBLE JUMP (platformer) | One short level, run/jump, platforms, coins, spikes, beetles, flag | Touch the flag | 3 lives lost (spikes / beetles / falling) | `coins × 10 + stomps × 25 + lives × 50` (on loss: `coins × 10 + stomps × 25`) |
| EMBER TALE (rpg) | One room, one NPC, short talk, one turn-based battle (Attack / Heal), report back | Report back after winning the battle | HP 0 in battle | `100 + HP remaining × 10` (on loss: `0`) |

Pre-approved cuts if time runs short (in order): shooter keyboard-only turning → platformer spikes only
(already) → RPG Attack only → plain hub hit areas → one shared SFX for most events.

## Team setup

**1 computer — this session is the lead and builds everything.** Shared remote:
`https://github.com/kalebogar-dotcom/Hackathon-Game` (`main`).

| Owner | Files |
|---|---|
| Lead | Everything below. Shared files (`index.html`, `server.js`, `src/main.js`, `src/machines.js`, `src/core/**`, `src/hub/**`, docs) stay lead-only even if workers are added. |
| (Worker 1 if added) | `src/games/shooter/**` only — branch `shooter` |
| (Worker 2 if added) | `src/games/platformer/**` only — branch `platformer` |
| (Worker 3 if added) | `src/games/rpg/**` only — branch `rpg` |

If computers are added later: each worker makes its **own clone** (never a shared OneDrive folder),
works on its own branch, edits only its folder, and pushes the branch to GitHub. The lead merges.
A game needing a shared change (new sound, new API) asks the lead instead of editing `src/core`.

## Separation rules

Each game folder keeps these apart:
- `index.js` — gameplay logic + `createGame(api)` (the only export the arcade uses)
- `sprites.js` — pixel art (built with `api.sprite`)
- `map.js` / `level.js` / `dialogue.js` — level and text data (plain data, no logic)
- helpers such as `raycaster.js`, `physics.js`, `battle.js`

Games import only from their own folder. Shared things come in through `api` — do not import `src/core` directly.

## The game contract

### Lifecycle

```js
// src/games/<id>/index.js
export function createGame(api) {
  // set up ALL state here — a fresh instance is created every time the machine is entered
  return {
    update(dt) {},   // dt = seconds since last frame (clamped to ≤ 0.05)
    draw(g) {},      // g = CanvasRenderingContext2D for the 320×180 screen
    destroy() {},    // optional: release anything not registered through api.listen
  };
}
```

| Event | What the arcade does |
|---|---|
| **Enter** (click / 1-3 / Enter in hub) | Stops anything running, resets input, calls `createGame(api)` for a **brand-new instance**. |
| **Each frame** | Calls `update(dt)` then `draw(g)` — the arcade owns the only `requestAnimationFrame` loop. |
| **Pause** (Esc, ESC MENU tag, window blur, pointer lock lost) | Stops calling `update`; keeps drawing the frozen game under the menu; stops all sounds; releases the mouse. |
| **Resume** | Clears held keys/mouse, re-captures the mouse if the game had asked for it, calls `update` again. |
| **`api.finish({ won, score })`** | First call only: records the result, stops calling `update`, releases the mouse, stops sounds, plays win/lose jingle, shows **PLAY AGAIN / RETURN TO ARCADE**. Later calls return `false` and do nothing. |
| **Restart / Play Again** | Same as Enter: old instance destroyed, new instance created. |
| **Return to Arcade** | Calls `destroy()`, removes every `api.listen` listener, releases the mouse, stops all sounds, clears input. Any later call on the old `api` is ignored. |
| **Crash** (exception in create/update/draw) | Shows OUT OF ORDER with RETURN TO ARCADE; the rest of the arcade keeps running. |

Rules for games:
- **Never** call `requestAnimationFrame`, `setInterval`, or `setTimeout`. Use `dt` timers inside `update`.
- **Never** add DOM listeners directly. Use the input API, or `api.listen()` if truly needed.
- **Never** use the **Escape** or **M** keys; they belong to the arcade (pause, mute).
- Keep the **top-right 44×12 px** clear of important HUD — the ESC MENU tag lives there.
- Do not reset canvas size or transforms permanently; the arcade wraps `draw` in `save()/restore()`.

### `api` reference

| Member | Type / behavior |
|---|---|
| `api.W`, `api.H` | `320`, `180` |
| `api.machineId` | `'shooter' \| 'platformer' \| 'rpg'` |
| `api.palette` | Frozen object of 16 hex colors: `black night indigo violet maroon red orange yellow cream green forest teal sky blue brown grey` |
| `api.text(g, text, x, y, color, { scale=1, align='left'\|'center'\|'right', shadow=null })` | Pixel font (uppercase, 3×5 glyphs, 4px advance × scale) |
| `api.textWidth(text, scale=1)` | Pixel width of text |
| `api.sprite(rows, colors)` | Builds a canvas from text rows; `colors` maps chars → hex; `.` / space = transparent. Draw with `g.drawImage` |
| `api.flipSprite(canvas)` | Mirrored copy (facing left/right) |
| `api.best` | This machine's best score this session before this run (`null` if none) |
| `api.finish({ won: boolean, score: number })` | See lifecycle. Score is floored and clamped to ≥ 0. Returns `true` the first time, `false` after |
| `api.exitToArcade()` | Leave immediately without recording a result |
| `api.listen(target, type, fn, options)` | `addEventListener` that the arcade removes automatically on exit/restart |

### Input (`api.input`)

Key names are `KeyboardEvent.code` values: `'KeyW'`, `'ArrowLeft'`, `'Space'`, `'Enter'`, `'Digit1'`, `'ShiftLeft'`…

| Member | Behavior |
|---|---|
| `isDown(...codes)` | `true` while **any** listed key is held |
| `wasPressed(...codes)` | `true` only on the frame **any** listed key went down (no key-repeat) |
| `mouse.x`, `mouse.y` | Cursor in game pixels (0–320, 0–180). Frozen while the pointer is locked |
| `mouse.dx`, `mouse.dy` | Raw mouse movement this frame — **only while the pointer is locked** (else 0) |
| `mouse.down` | Left button held |
| `mouse.pressed` / `mouse.released` | Left button went down / up this frame |
| `mouse.moved` | Cursor moved this frame (unlocked only) |
| `pointerLocked` | `true` while the mouse is captured |
| `lockPointer()` | Request mouse capture. Must be called during a click/key frame (browser rule). Ignored after finish or while paused |
| `unlockPointer()` | Release capture and stop wanting it |

Mouse behavior: the arcade releases the pointer on pause, finish, exit and restart. When the player presses
Esc while captured, the browser releases the pointer and the arcade pauses. On resume it tries to re-capture;
if the browser refuses (it may briefly after Esc), the game should show "CLICK TO AIM" and call
`lockPointer()` on the next `mouse.pressed`.

Held keys and mouse state are **cleared** on enter, pause, resume, finish, restart and exit, so nothing
"sticks" between machines. Edge-triggered state resets every frame.

### Audio (`api.audio`)

`api.audio.play(name)` — fire-and-forget synthesized SFX. Available names:

`select blip talk pause shoot hit hurt explode jump coin heal wave win lose`

The arcade plays `select` on enter, `pause` on pause, and `win`/`lose` on finish — games don't need to.
All sounds are stopped automatically on pause, finish, restart and exit. Unknown names log a warning.
New sounds are added by the lead in `src/core/audio.js`.

## Schedule (2 hours)

| Time | Work |
|---|---|
| 0:00–0:20 | Skeleton: loop, manager, hub, shared modules, test machine — **done and tested** |
| 0:20–1:30 | Minimum playable shooter → platformer → RPG (each wired into the hub as soon as it runs) |
| 1:30 | **Feature freeze** |
| 1:30–2:00 | Integration + testing (checklist below), bug fixes only |

## Integration test checklist

For **each** machine:
- [ ] Enter from hub by click, and by number key
- [ ] Play: controls respond, sounds play
- [ ] Esc pauses (gameplay frozen, sound stops) → Resume continues
- [ ] ESC MENU tag click pauses
- [ ] Win → result shows, hub shows CLEARED + BEST
- [ ] Lose → result shows, BEST kept
- [ ] Play Again after win and after loss starts fresh (no leftover enemies/position/score)
- [ ] Return to Arcade from pause and from result
- [ ] Re-enter the same machine → fresh start
- [ ] Switch between all three in a row → no stuck keys, no leftover sound, mouse released, speed normal
- [ ] Console has no errors; `__arcade.manager.debug()` shows `listeners: 0` and `liveSounds: 0` in the hub

Optional: a game may return `debug()` → plain object; it shows up in `__arcade.manager.debug().game`
and is what the automated playtests read. It must not change state.

## Status log

- Skeleton verified in browser: enter → pause → resume → finish (once) → play again → lose → return (mouse
  and keyboard) → re-enter; listeners and sounds drop to 0 on exit; single loop at ~60 fps.
- **All three machines playable** (minimum scope met):
  - GHOUL SHIFT — 3 waves (3/5/8), win and idle-loss both verified in browser and headless (bot: 16 kills, score 1700).
  - PEBBLE JUMP — runner bot reaches the flag (score 240); walking into spikes loses after 3 lives.
    Level tuned after playtests: moved a low platform that blocked the first spike jump, moved spikes that
    sat too close to a pit and to the stair block, narrowed the last pit to 3 tiles.
  - EMBER TALE — full quest (talk → slime appears → battle → report back) verified; balance over 40 runs:
    attack-only wins 36 / loses 4, heal-when-low wins 40 / 40.
- **Integration run in the real page: 21 / 21 checks pass** (no user input during the run): key and mouse
  entry, Esc pause freezes updates and clears held keys, resume, real loss (shooter) and real wins
  (platformer, RPG) recorded once, Play Again is a fresh instance, ESC MENU tag, return from pause and from
  result screen, re-entry after a win is fresh, 9 rapid switches leave 0 listeners / 0 live sounds, loop
  stays at 60 updates/s, hub shows CLEARED / BEST for every machine. No console errors.
- **Polish pass** (each followed by `npm test`, 9/9): hub↔machine blinds transition, M / pause-menu sound
  toggle, per-machine control hint in the hub; PEBBLE JUMP stompable beetles (one moved after testing showed it
  sat in a blind landing spot after a pit); GHOUL SHIFT death bursts, red hit marker, minimap; EMBER TALE
  battle lunges, floating damage/heal numbers, heal sparkles. Tests now live in `tests/` (see README).
- **Browser suite after polish: 18 / 22 pass, 4 not run to completion.** Everything through the RPG section
  passed with no user input. The last four (shooter win in the page, 9 rapid switches, 60 updates/s, all-three
  progress) could not run because the browser window went hidden (page reported 0–2 updates/s before the
  test touched anything). The same four passed in the pre-polish browser run, and the shooter win passes
  headlessly. **To do:** re-run the browser suite once with the window visible.
- **Not verified automatically:** mouse capture (pointer lock) in GHOUL SHIFT — browsers only allow it from a
  real click, so it needs a human check: click to aim, press Esc (should pause and free the mouse), Resume.
  Audio was exercised (correct sounds requested and stopped) but not listened to.
