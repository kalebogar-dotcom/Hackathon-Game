// The three cabinets in the arcade. Each `load` must resolve to a module exporting createGame(api).
import { PAL } from './core/palette.js';

export const MACHINES = [
  {
    id: 'shooter',
    name: 'GHOUL SHIFT',
    genre: 'FIRST-PERSON',
    colors: { body: PAL.maroon, trim: PAL.red, dark: PAL.black },
    load: () => import('./games/shooter/index.js'),
  },
  {
    id: 'platformer',
    name: 'PEBBLE JUMP',
    genre: 'PLATFORMER',
    colors: { body: PAL.blue, trim: PAL.yellow, dark: PAL.night },
    load: () => import('./games/platformer/index.js'),
  },
  {
    id: 'rpg',
    name: 'EMBER TALE',
    genre: 'RPG',
    colors: { body: PAL.forest, trim: PAL.green, dark: PAL.night },
    load: () => import('./games/rpg/index.js'),
  },
];
