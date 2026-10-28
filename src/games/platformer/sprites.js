// PEBBLE JUMP art: the pebble hero sprite plus procedural tiles, coins, spikes, flag and scenery.
const PEBBLE = [
  '...kkkk...',
  '..kllggk..',
  '.klgggggk.',
  'kgggggwkwk',
  'kggggggggk',
  'kooooooook',
  'kgoggggggk',
  '.kgggggggk',
  '..kkggggk.',
  '...kk.kk..',
];

const BEETLE = [
  '..kkkkk...',
  '.kvvlvvk..',
  'kvvvvvvvkk',
  'kvvvvvvkyk',
  'kkkkkkkkkk',
  '.k.k..k.k.',
];

export function buildSprites(api) {
  const P = api.palette;
  const right = api.sprite(PEBBLE, { k: P.black, l: P.cream, g: P.grey, w: P.cream, o: P.orange });
  const beetleRight = api.sprite(BEETLE, { k: P.black, v: P.violet, l: P.cream, y: P.yellow });
  return {
    pebbleRight: right,
    pebbleLeft: api.flipSprite(right),
    beetleRight,
    beetleLeft: api.flipSprite(beetleRight),
  };
}

export function drawSky(g, P, W, H, camX, time) {
  g.fillStyle = P.sky;
  g.fillRect(0, 0, W, H);
  // Clouds (slow parallax)
  g.fillStyle = P.cream;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 97 - camX * 0.15 + time * 4) % (W + 60) + W + 60) % (W + 60) - 40;
    const y = 18 + (i * 23) % 50;
    g.fillRect(x, y, 26, 5);
    g.fillRect(x + 6, y - 3, 14, 3);
  }
  // Far hills (medium parallax), blocky steps
  g.fillStyle = P.teal;
  for (let x = 0; x < W; x += 4) {
    const wx = x + camX * 0.35;
    const h = 28 + Math.round(Math.sin(wx / 37) * 12 + Math.sin(wx / 13) * 4);
    g.fillRect(x, H - 20 - h, 4, h + 20);
  }
}

export function drawTile(g, P, ch, x, y, T, above, time) {
  switch (ch) {
    case '#': {
      g.fillStyle = P.brown;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.maroon;
      g.fillRect(x + 2, y + 5, 2, 2);
      g.fillRect(x + 7, y + 8, 1, 1);
      if (above !== '#') {
        g.fillStyle = P.green;
        g.fillRect(x, y, T, 3);
        g.fillStyle = P.forest;
        g.fillRect(x, y + 3, T, 1);
      }
      break;
    }
    case '=': {
      g.fillStyle = P.orange;
      g.fillRect(x, y, T, T);
      g.fillStyle = P.maroon;
      g.fillRect(x, y + 4, T, 1);
      g.fillRect(x, y + T - 1, T, 1);
      g.fillRect(x + 4, y, 1, 4);
      g.fillRect(x + 8, y + 5, 1, 4);
      break;
    }
    case '^': {
      g.fillStyle = P.grey;
      for (let i = 0; i < 2; i++) {
        const sx = x + i * 5;
        g.fillRect(sx + 2, y + 4, 1, 1);
        g.fillRect(sx + 1, y + 5, 3, 2);
        g.fillRect(sx, y + 7, 5, 3);
      }
      g.fillStyle = P.cream;
      g.fillRect(x + 2, y + 4, 1, 1);
      g.fillRect(x + 7, y + 4, 1, 1);
      break;
    }
    case 'o': {
      const spin = Math.abs(Math.sin(time * 4 + x * 0.05));
      const w = Math.max(1, Math.round(4 * spin));
      g.fillStyle = P.yellow;
      g.fillRect(x + 5 - w / 2, y + 2, w, 6);
      g.fillStyle = P.orange;
      if (w > 2) g.fillRect(x + 5 - w / 2 + w - 1, y + 3, 1, 4);
      break;
    }
    case 'F': {
      // Pole 7 tiles tall with a waving flag
      g.fillStyle = P.cream;
      g.fillRect(x + 4, y - T * 6, 2, T * 7);
      g.fillStyle = P.yellow;
      g.fillRect(x + 3, y - T * 6 - 3, 4, 3);
      const wave = Math.round(Math.sin(time * 6));
      g.fillStyle = P.red;
      g.fillRect(x + 6, y - T * 6 + 1, 10, 3);
      g.fillRect(x + 6, y - T * 6 + 4, 8 + wave, 2);
      g.fillRect(x + 6, y - T * 6 + 6, 5, 2);
      g.fillStyle = P.grey;
      g.fillRect(x + 1, y + T - 2, 8, 2);
      break;
    }
    default:
      break;
  }
}
