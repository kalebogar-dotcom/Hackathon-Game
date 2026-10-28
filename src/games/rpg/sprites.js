// EMBER TALE art: Ember (front/back/side), Wren the lantern keeper, the cellar slime, and room tiles.
const EMBER_FRONT = [
  '...oooooo...',
  '..ooyooyoo..',
  '.oooooooooo.',
  '.ossssssso..',
  '.osksssksso.',
  '..ssssssss..',
  '...ssmmss...',
  '..bbbbbbbb..',
  '.sbbbbbbbbs.',
  '.sbbyyyybbs.',
  '..bbbbbbbb..',
  '..bb....bb..',
  '..kk....kk..',
];
const EMBER_BACK = [
  '...oooooo...',
  '..ooyooyoo..',
  '.oooooooooo.',
  '.oooooooooo.',
  '.oooyoooooo.',
  '..oooooooo..',
  '...ssssss...',
  '..bbbbbbbb..',
  '.sbbbbbbbbs.',
  '.sbbbbbbbbs.',
  '..bbbbbbbb..',
  '..bb....bb..',
  '..kk....kk..',
];
const EMBER_SIDE = [
  '...ooooo....',
  '..ooyoooo...',
  '.ooooooooo..',
  '..oosssss...',
  '..oossksss..',
  '...sssssss..',
  '....ssms....',
  '...bbbbbb...',
  '...bsbbbb...',
  '...bsbyyb...',
  '...bbbbbb...',
  '...bb..bb...',
  '...kk..kk...',
];
const WREN = [
  '....vvvv....',
  '...vvvvvv...',
  '..vvssssvv..',
  '..vskssksv..',
  '..vsssssss..',
  '...vccccv...',
  '..vvvvvvvv..',
  '.vvvvvvvvvvy',
  '.vvvvvvvvvyY',
  '.vvvvvvvvvvy',
  '..vvvvvvvv..',
  '..vvvvvvvv..',
  '...kk..kk...',
];
const SLIME = [
  '......gggg......',
  '....gggggggg....',
  '...gggllggggg...',
  '..ggglllgggggg..',
  '.gggggkggggkggg.',
  '.gggggkggggkggg.',
  'gggggggggggggggg',
  'ggggggkkkkgggggg',
  'gggggggggggggggg',
  '.gggggggggggggg.',
  '..gggggggggggg..',
];

export function buildSprites(api) {
  const P = api.palette;
  const ember = { o: P.orange, y: P.yellow, s: P.cream, k: P.black, m: P.red, b: P.blue };
  const side = api.sprite(EMBER_SIDE, ember);
  return {
    emberDown: api.sprite(EMBER_FRONT, ember),
    emberUp: api.sprite(EMBER_BACK, ember),
    emberRight: side,
    emberLeft: api.flipSprite(side),
    wren: api.sprite(WREN, { v: P.violet, s: P.cream, k: P.black, c: P.grey, y: P.orange, Y: P.yellow }),
    slime: api.sprite(SLIME, { g: P.teal, l: P.cream, k: P.black }),
    slimeHurt: api.sprite(SLIME, { g: P.cream, l: P.cream, k: P.cream }),
  };
}

export function drawTile(g, P, ch, x, y, T, time) {
  // Floor under everything except walls/door
  if (ch !== '#' && ch !== 'D') {
    g.fillStyle = P.brown;
    g.fillRect(x, y, T, T);
    g.fillStyle = P.maroon;
    g.fillRect(x, y + T - 1, T, 1);
    g.fillRect(x + T - 1, y, 1, T);
  }
  switch (ch) {
    case '#':
      g.fillStyle = P.indigo;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.night;
      g.fillRect(x, y + 7, T, 1);
      g.fillRect(x, y + 15, T, 1);
      g.fillRect(x + 7, y, 1, 7);
      g.fillRect(x + 3, y + 8, 1, 7);
      g.fillRect(x + 12, y + 8, 1, 7);
      break;
    case ',':
      g.fillStyle = P.maroon;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.yellow;
      g.fillRect(x + 2, y + 2, T - 4, 1);
      g.fillRect(x + 2, y + T - 3, T - 4, 1);
      break;
    case 'b':
      g.fillStyle = P.brown;
      g.fillRect(x + 3, y + 2, 10, 13);
      g.fillStyle = P.orange;
      g.fillRect(x + 4, y + 2, 8, 2);
      g.fillStyle = P.black;
      g.fillRect(x + 3, y + 6, 10, 1);
      g.fillRect(x + 3, y + 11, 10, 1);
      break;
    case 't':
      g.fillStyle = P.orange;
      g.fillRect(x + 1, y + 3, 14, 9);
      g.fillStyle = P.brown;
      g.fillRect(x + 1, y + 10, 14, 2);
      g.fillRect(x + 2, y + 12, 2, 4);
      g.fillRect(x + 12, y + 12, 2, 4);
      break;
    case 'w':
      g.fillStyle = P.grey;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.night;
      g.fillRect(x + 1, y + 1, T - 2, T - 2);
      g.fillStyle = Math.sin(time * 3 + x) > 0 ? P.blue : P.sky;
      g.fillRect(x + 4, y + 5, 6, 2);
      break;
    case 'D':
      g.fillStyle = P.brown;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.black;
      g.fillRect(x + T / 2, y, 1, T);
      g.fillStyle = P.yellow;
      g.fillRect(x + (x % 32 ? 3 : T - 4), y + 8, 1, 2);
      break;
    default:
      break;
  }
}
