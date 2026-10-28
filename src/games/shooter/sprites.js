// GHOUL SHIFT pixel art: the ghoul, the spark blaster, its muzzle flash, and wall shading.
const GHOUL = [
  '....gggg....',
  '...gggggg...',
  '...gRggRg...',
  '...gggggg...',
  '....gkkg....',
  '..vvvggvvv..',
  '.vvvvvvvvvv.',
  'g.vvvvvvvv.g',
  'g.vvvvvvvv.g',
  'gg.vvvvvv.gg',
  '...vvvvvv...',
  '...vv..vv...',
  '...vv..vv...',
  '...gg..gg...',
  '..ggg..ggg..',
];

const BLASTER = [
  '......kk......',
  '.....kssk.....',
  '.....kssk.....',
  '.....kssk.....',
  '....kssssk....',
  '....ksyysk....',
  '....ksyysk....',
  '....kssssk....',
  '...kkkkkkkk...',
  '..kbbbbbbbbk..',
  '..kbbbbbbbbk..',
  '..kbbkkkkbbk..',
];

const FLASH = [
  '..y..y..',
  '...yy...',
  '.yyooyy.',
  '..yooy..',
  '...yy...',
];

export function buildSprites(api) {
  const P = api.palette;
  return {
    ghoul: api.sprite(GHOUL, { g: P.green, R: P.red, k: P.black, v: P.violet }),
    ghoulHurt: api.sprite(GHOUL, { g: P.cream, R: P.cream, k: P.cream, v: P.cream }),
    blaster: api.sprite(BLASTER, { k: P.black, s: P.grey, y: P.sky, b: P.brown }),
    flash: api.sprite(FLASH, { y: P.yellow, o: P.orange }),
    // Wall colors from near to far; the darker "side" faces start one step further along.
    wallShades: {
      '#': [P.brown, P.maroon, P.indigo, P.night, P.black],
      B: [P.teal, P.forest, P.indigo, P.night, P.black],
    },
  };
}
