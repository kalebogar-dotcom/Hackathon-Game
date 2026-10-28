// BEAR IN THE RED WOODS: the 16-color palette and every gameplay number in one place.
export const W = 320;
export const H = 180;
export const FOV_SCALE = 0.66; // camera plane length = tan(FOV / 2), about 66 degrees

export const PAL = Object.freeze({
  black: '#0b0a10', night: '#1a1424', dusk: '#2e1a2e', fog: '#6b6a7a',
  bloodDark: '#4a1420', blood: '#8c1c24', red: '#d0342c', ember: '#f07a2a',
  gold: '#f2c94c', bone: '#efe3c2', pineDark: '#13261c', pine: '#24442c',
  moss: '#5f8a3c', bark: '#3b2418', log: '#6e4128', tan: '#a8754a',
});

// One step darker for each color. Distance fog applies this 0-3 times, so it never leaves the palette.
export const DARKER = Object.freeze({
  [PAL.black]: PAL.black, [PAL.night]: PAL.black, [PAL.dusk]: PAL.night, [PAL.fog]: PAL.dusk,
  [PAL.bloodDark]: PAL.night, [PAL.blood]: PAL.bloodDark, [PAL.red]: PAL.blood, [PAL.ember]: PAL.red,
  [PAL.gold]: PAL.ember, [PAL.bone]: PAL.tan, [PAL.pineDark]: PAL.black, [PAL.pine]: PAL.pineDark,
  [PAL.moss]: PAL.pine, [PAL.bark]: PAL.night, [PAL.log]: PAL.bark, [PAL.tan]: PAL.log,
});

export const PLAYER = Object.freeze({
  radius: 0.22, speed: 3.2, turnSpeed: 2.6, mouseSens: 0.0025,
  maxHealth: 100, regenDelay: 3.5, regenPerSec: 14,
});

// falloff: [full damage up to, minimum damage from] in tiles. auto: hold to fire.
export const WEAPONS = Object.freeze({
  pistol: { id: 'pistol', name: 'PISTOL', price: 0, auto: false, cooldown: 0.2, pellets: 1, spread: 0.008, damage: 34, falloff: [6, 14], minFactor: 0.7, recoil: 5 },
  shotgun: { id: 'shotgun', name: 'SPLIT-BARREL', price: 400, auto: false, cooldown: 0.75, pellets: 7, spread: 0.11, damage: 24, falloff: [2.5, 7], minFactor: 0.25, recoil: 12 },
  smg: { id: 'smg', name: 'SAWMILL SMG', price: 750, auto: true, cooldown: 0.085, pellets: 1, spread: 0.035, damage: 18, falloff: [5, 12], minFactor: 0.6, recoil: 3 },
});
export const WEAPON_ORDER = Object.freeze(['pistol', 'shotgun', 'smg']); // keys 1 2 3

export const BUY_RANGE = 1.1; // tiles from the face of the wall the gun hangs on
export const SCORE = Object.freeze({ hit: 10, kill: 60, bearKill: 500 });

export const ZOMBIE = Object.freeze({
  radius: 0.28, hitRadius: 0.34, reach: 0.72, damage: 18, windup: 0.4, attackEvery: 1.0,
  hp: [100, 140, 180], speed: [1.15, 1.45, 1.7], // indexed by wave
});

export const BEAR = Object.freeze({
  radius: 0.4, hitRadius: 0.55, hp: 2400, speed: 1.35,
  reach: 1.0, swipeDamage: 30, swipeWindup: 0.5, swipeEvery: 1.4,
  firstCharge: 3, chargeMin: 2.5, chargeMax: 10,
  windup: 1.0, lockAt: 0.3, // aim follows the player until 0.3 s before the dash
  chargeSpeed: 7.5, chargeTime: 1.4, chargeDamage: 45, knockback: 1.4, stun: 1.6, cooldown: 5,
});

export const WAVES = Object.freeze([
  { zombies: 6, spawnEvery: 1.6, bear: false },
  { zombies: 10, spawnEvery: 1.1, bear: false },
  { zombies: 8, spawnEvery: 1.6, bear: true, bearAfter: 2.5 },
]);
export const MAX_ALIVE = 8;
export const INTERMISSION = Object.freeze({ first: 3, between: 6 });
