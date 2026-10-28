# Bear in the Red Woods: team notes

## Team

**One Claude session** (the lead) builds, tests and merges everything, so there are no per-session assignments. Work happens on the Git branch `bear-prototype`. The arcade hub in the parent folder and the separate `WhiteBoard` project are not touched.

## Design brief

**Pitch.** First-person, wave-based zombie survival in a crimson forest clearing around a log cabin, in the style of early raycast shooters. Fight inside and outside the cabin, earn points, buy guns mounted on its walls, and bring down a bear boss.

**Core loop.** Shoot zombies to earn points, spend the points on a wall gun, survive a harder wave. One strong mechanic: the wall buy, which turns score into power and pulls the player back to the cabin.

**Scope (prototype).**
- One map (24x19 tiles): tree line boundary, scattered trees, an enterable cabin with a door and two window gaps.
- 3 waves: 6 zombies, then 10 faster zombies, then 8 tougher zombies plus the bear.
- Weapons: pistol (start, semi-auto), Split-Barrel shotgun (400, 7-pellet spread), Sawmill SMG (750, full-auto). Unlimited ammo.
- One zombie type and one boss.
- Title with controls, pause, mute, win/lose screens with score, restart.
- Out of scope: multiplayer, more maps, ammo and reloading, perks, saving runs.

**Bear boss.** 2400 HP and a health bar at the top of the screen. It walks and swipes up close. When it has line of sight at 2.5 to 10 tiles and its cooldown is ready, it rears up for 1.0 s with a red **!**, a flashing sprite, a roar and "CHARGE INCOMING!". Its aim tracks the player until 0.3 s before the dash, then locks. It dashes at 7.5 tiles/s for up to 1.4 s, dealing 45 damage plus knockback. Hitting a wall or tree stuns it for 1.6 s. Cooldown is 5 s.

## Technical spec

| Item | Value |
|---|---|
| Tech | HTML5 Canvas + plain JavaScript modules, no libraries, no build; Node static server |
| Resolution | 320x180, scaled up by whole multiples (`image-rendering: pixelated`) |
| Rendering | Grid raycaster with 32x32 wall textures, billboard sprites clipped by a depth buffer |
| Palette | 16 colors in `src/config.js` (`PAL`). Distance fog darkens through the `DARKER` table, so no color ever leaves the palette |
| Font | 3x5 pixel font, scale 1 for HUD text, 2-4 for titles |
| Asset sizes | Wall textures 32x32 · tree 32x64 · zombie 32x48 (3 frames) · bear 64x64 (walk x2, rear) · held guns 32-48 px drawn at 2x · muzzle flash 16x16 · title backdrop 320x180 |
| Sound | Web Audio synthesis, 22 named effects in `src/audio.js` |
| Navigation | Breadth-first distance field from the player's tile, rebuilt when the player changes tile. Enemies step to the neighbor tile with the lowest distance and never cut wall corners |

## Milestones (2-hour target)

| Time | Milestone | Status |
|---|---|---|
| 0:00-0:15 | Scaffold: page, loop, input, palette, font, server | Done |
| 0:15-0:45 | Raycast map and cabin, movement and collision, pistol, chasing zombie, health, HUD | Done |
| 0:45-1:05 | Waves, points, wall buys, shotgun and SMG | Done |
| 1:05-1:20 | Bear boss: health bar, charge telegraph, dash, stun, cooldown, win condition | Done |
| 1:20-1:30 | Screens, pixel art, sound, mute | Done (art drawn directly, no placeholder pass) |
| 1:30-2:00 | **Reserved:** playtesting, bug fixes, packaging | Headless suite passes (30/30) and a browser smoke test is done; hands-on balance playtesting is next |

## Playtest checklist (last 30 minutes)

- [ ] Movement and mouse aim feel responsive; no sticking on door or window edges
- [ ] Shotgun is affordable after wave 1 and the SMG during or after wave 2
- [ ] Buy prompt shows name, price, "Press E to buy"; a failed buy flashes red and costs nothing
- [ ] Zombies come through the door and windows, never through walls
- [ ] The bear's charge can be read and dodged; stun on wall impact
- [ ] Win and lose screens, restart, pause, mute all work
- [ ] Tune numbers in `src/config.js` only

## File ownership

All files are owned by the lead session. If more sessions join later, split along these lines, one branch each, and have the lead merge:

| Area | Files | Notes |
|---|---|---|
| Lead / integration | `src/main.js`, `src/game.js`, `index.html`, `server.js`, docs, tests | Merges branches and runs `npm test` plus a browser check |
| World and enemies | `src/world.js`, enemy sections of `src/game.js` | Coordinate with the lead before touching `game.js` |
| Art and render | `src/art.js`, `src/render.js` | Must keep to `PAL` and the asset sizes above |
| Audio | `src/audio.js` | New sound = new key in `SOUNDS` |
| Balance | `src/config.js` | Numbers only; no logic |

## Shared interfaces

**Boot** (`main.js`): `createGame({ input, audio, art, storage })` returns `{ update(dt), draw(ctx), onPointerLock(locked), mode, world, start() }`. `mode` is `'title' | 'play' | 'paused' | 'won' | 'lost'`. `window.__bear` exposes `{ game, input, audio }` for debugging.

**Input** (`input.js`): `isDown(...codes)`, `wasPressed(...codes)` (KeyboardEvent.code values), `mouse { dx, dy, down, pressed }`, `pointerLocked`, `lockPointer()`, `unlockPointer()`, `consumeMouse()`, `endFrame()`.

**Audio** (`audio.js`): `play(name)`, `muted`, `toggleMute()`. Names: `select pause pistol shotgun smg hit bearHit zdie groan hurt buy equip deny wave clear roar charge thud bearDie win lose`. The game plays the weapon id as its fire sound.

**Art** (`art.js`): `buildArt(makeCanvas)` returns `walls[tile] { tex[4], face?, faceTex[4] }`, `tree[4]`, `zombie.{a,b,attack}` and `bear.{a,b,rear}` as `{ fog[4], flash, red }`, `guns[id] { img, muzzle:[x,y] }`, `flash`, `moon`, `stars`, `title`. Index 0-3 is the fog level.

**World state** (`game.world`): `player { x, y, angle, health, owned:Set, weapon, god }`, `enemies[]` (zombie `{ kind:'zombie', x, y, hp, maxHp }`, bear `{ kind:'bear', state:'walk'|'windup'|'charge'|'stunned', hp, maxHp, charges }`), `bear`, `points` (spendable), `earned` (score), `kills`, `wave` (0-based, -1 before wave 1), `phase`, `purchases[]`, `director` (false stops the wave spawner; used in tests).

**Map legend** (`world.js`): `F` tree line, `T` tree, `L` log wall, `C` crate, `1` shotgun mount, `2` SMG mount, `.` ground, `P` start, `S` spawn. `WALL_BUYS` lists `{ weapon, face, fx, fy }`, where `(fx, fy)` is the middle of the wall face the gun hangs on.

**Pure helpers** (`game.js`, used by tests): `tryBuy(world, buy)` returns `{ ok, reason:'bought'|'equipped'|'owned'|'points' }`, `traceShot(world, weapon)`, `findBuyNear(player)`, `makeZombie(x, y, wave)`, `makeBear(x, y)`.
