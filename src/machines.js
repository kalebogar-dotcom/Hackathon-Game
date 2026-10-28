// The three cabinets in the arcade. Each `load` must resolve to a module exporting createGame(api).
import { PAL } from './core/palette.js';

export const MACHINES = [
  {
    id: 'shooter',
    name: 'BEAR IN THE RED WOODS',
    marquee: ['BEAR IN THE', 'RED WOODS'], // two lines so it fits the cabinet
    genre: 'FPS SURVIVAL',
    hint: 'WASD MOVE  MOUSE AIM  CLICK FIRE  E BUY WALL GUNS  SURVIVE 3 WAVES',
    colors: { body: PAL.brown, trim: PAL.red, dark: PAL.black },
    load: () => import('./games/shooter/index.js'),
  },
    {
    id: 'platformer',
    name: 'PIXEL CHIC',
    genre: 'DRESS-UP',
    hint: 'UP DOWN PICK  LEFT RIGHT CHANGE  C COLOR  X SWAP  ENTER DONE',
    colors: { body: PAL.violet, trim: PAL.yellow, dark: PAL.night },
    load: () => import('./games/platformer/index.js'),
  },
  {
    id: 'rpg',
    name: 'EMBER TALE',
    genre: 'RPG',
    hint: 'WASD / ARROWS WALK  SPACE TALK  HELP WREN',
    colors: { body: PAL.forest, trim: PAL.green, dark: PAL.night },
    load: () => import('./games/rpg/index.js'),
  },
];
