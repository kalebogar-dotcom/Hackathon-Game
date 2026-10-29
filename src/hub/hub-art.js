// Procedural pixel art for the arcade room and its cabinets.
import { PAL } from '../core/palette.js';
import { drawText } from '../core/font.js';

const FLOOR_Y = 128;

export function drawRoom(g, W, H, t) {
  // Wall with vertical wallpaper stripes
  g.fillStyle = PAL.night;
  g.fillRect(0, 0, W, FLOOR_Y);
  g.fillStyle = PAL.black;
  for (let x = 6; x < W; x += 16) g.fillRect(x, 0, 2, FLOOR_Y);
  // Ceiling lights
  for (let x = 20; x < W; x += 56) {
    g.fillStyle = PAL.grey;
    g.fillRect(x, 0, 16, 2);
    g.fillStyle = PAL.cream;
    g.fillRect(x + 2, 2, 12, 1);
  }
  // Neon sign with an occasional flicker
  const flicker = Math.sin(t * 17) > 0.96 || Math.sin(t * 3.1) > 0.995;
  drawText(g, 'RETRO ARCADE', W / 2 + 1, 13, PAL.violet, { scale: 2, align: 'center' });
  drawText(g, 'RETRO ARCADE', W / 2, 12, flicker ? PAL.indigo : PAL.sky, { scale: 2, align: 'center' });
  // Baseboard + checkered floor
  g.fillStyle = PAL.violet;
  g.fillRect(0, FLOOR_Y - 2, W, 2);
  for (let y = FLOOR_Y; y < H; y += 8) {
    for (let x = 0; x < W; x += 16) {
      g.fillStyle = ((x / 16 + (y - FLOOR_Y) / 8) & 1) ? PAL.indigo : PAL.black;
      g.fillRect(x, y, 16, 8);
    }
  }
}

export function drawCabinet(g, x, y, w, h, machine, t, selected) {
  const c = machine.colors;
  // Selection glow
  if (selected) {
    g.fillStyle = Math.sin(t * 8) > 0 ? PAL.yellow : c.trim;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
  }
  // Shadow on floor
  g.fillStyle = PAL.black;
  g.fillRect(x - 2, y + h - 1, w + 6, 3);
  // Body and side shading, plus any per-machine body art
  g.fillStyle = c.body;
  g.fillRect(x, y, w, h);
  g.fillStyle = c.dark;
  g.fillRect(x + w - 4, y, 4, h);
  BODY_ART[machine.id]?.(g, x, y, w, h);
  // Marquee with the machine name (one line, or two when machine.marquee splits a long name)
  const lines = machine.marquee ?? [machine.name];
  const my = lines.length > 1 ? 2 : 3;
  g.fillStyle = PAL.black;
  g.fillRect(x + 2, y + my, w - 8, lines.length > 1 ? 14 : 11);
  lines.forEach((line, i) => drawText(g, line, x + (w - 4) / 2, y + my + 2 + i * 6, selected ? PAL.yellow : c.trim, { align: 'center' }));
  // Screen bezel + animated attract screen
  g.fillStyle = PAL.black;
  g.fillRect(x + 4, y + 17, w - 12, 34);
  const sx = x + 6, sy = y + 19, sw = w - 16, sh = 30;
  g.save();
  g.beginPath();
  g.rect(sx, sy, sw, sh);
  g.clip();
  (SCREENS[machine.id] ?? staticScreen)(g, sx, sy, sw, sh, t);
  g.restore();
  // Control panel: joystick + buttons
  g.fillStyle = c.trim;
  g.fillRect(x + 1, y + 55, w - 6, 8);
  g.fillStyle = PAL.black;
  g.fillRect(x + 11, y + 51, 2, 5);
  g.fillStyle = PAL.red;
  g.fillRect(x + 10, y + 49, 4, 3);
  g.fillStyle = PAL.cream;
  g.fillRect(x + 28, y + 58, 3, 2);
  g.fillRect(x + 34, y + 58, 3, 2);
  // Coin door (or a machine's own kick panel)
  if (KICK_PANELS[machine.id]) KICK_PANELS[machine.id](g, x, y);
  else {
    g.fillStyle = c.dark;
    g.fillRect(x + 17, y + 70, 16, 15);
    g.fillStyle = PAL.yellow;
    g.fillRect(x + 21, y + 74, 1, 5);
    g.fillRect(x + 28, y + 74, 1, 5);
  }
  // Base
  g.fillStyle = PAL.black;
  g.fillRect(x, y + h - 3, w, 3);
}

// ---- Bear in the Red Woods cabinet pieces ----

// Side-view bear, 14x8, facing right.
const BEAR = [
  '.....##.......',
  '...######..#..',
  '..##########..',
  '.############.',
  '.#############',
  '.###########..',
  '.##.##..##.##.',
  '.##.##..##.##.',
];

function bearSilhouette(g, x, y, color, faceLeft = false) {
  g.fillStyle = color;
  BEAR.forEach((row, r) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(x + (faceLeft ? row.length - 1 - i : i), y + r, 1, 1);
  });
}

function pine(g, cx, top, height, color) {
  g.fillStyle = color;
  for (let i = 0; i < height; i++) {
    const half = Math.floor(i / 2);
    g.fillRect(cx - half, top + i, half * 2 + 1, 1);
  }
  g.fillRect(cx, top + height, 1, 2);
}

function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

const BODY_ART = {
  // Log-cabin walls with dark pines growing up the lower body.
  shooter(g, x, y, w, h) {
    for (let ly = y + 6; ly < y + h - 3; ly += 5) {
      g.fillStyle = PAL.black;
      g.fillRect(x, ly, w - 4, 1);
      g.fillStyle = PAL.maroon;
      g.fillRect(x, ly + 1, w - 4, 1);
    }
    pine(g, x + 6, y + 68, 15, PAL.black);
    pine(g, x + 12, y + 74, 9, PAL.forest);
    pine(g, x + 40, y + 72, 11, PAL.forest);
    pine(g, x + 46, y + 67, 16, PAL.black);
  },
};

const KICK_PANELS = {
  // A bear prowling in front of a red moon.
  shooter(g, x, y) {
    g.fillStyle = PAL.black;
    g.fillRect(x + 17, y + 69, 17, 17);
    disc(g, x + 25, y + 76, 6, PAL.red);
    bearSilhouette(g, x + 19, y + 77, PAL.black);
    g.fillStyle = PAL.red;
    g.fillRect(x + 31, y + 80, 1, 1); // eye
    g.fillStyle = PAL.maroon;
    g.fillRect(x + 17, y + 85, 17, 1);
  },
};

const SCREENS = {
  shooter(g, x, y, w, h, t) {
    // Night over the red woods
    g.fillStyle = PAL.black;
    g.fillRect(x, y, w, h);
    g.fillStyle = PAL.night;
    g.fillRect(x, y + 9, w, 10);
    disc(g, x + w - 8, y + 6, 3, PAL.red);
    for (let i = 0; i < 7; i++) pine(g, x + 2 + i * 6, y + 8 + ((i * 5) % 4), 9, i % 2 ? PAL.forest : PAL.indigo);
    g.fillStyle = PAL.maroon;
    g.fillRect(x, y + h - 8, w, 8);
    // Log cabin with a lit window
    g.fillStyle = PAL.brown;
    g.fillRect(x + 3, y + h - 15, 12, 8);
    g.fillStyle = PAL.black;
    for (let i = 0; i < 4; i++) g.fillRect(x + 2 + i, y + h - 16 - i, 14 - i * 2, 1);
    g.fillRect(x + 3, y + h - 12, 12, 1);
    g.fillStyle = PAL.yellow;
    g.fillRect(x + 5, y + h - 14, 3, 2);
    // The bear prowls across the clearing and rears up with a red "!" before it charges
    const k = (t * 0.22) % 1;
    const rearing = k > 0.45 && k < 0.6;
    const bx = Math.round(x + w + 2 - Math.min(k, 0.45) * (w + 6) - Math.max(0, k - 0.6) * (w + 6));
    bearSilhouette(g, bx, y + h - 11, PAL.black, true);
    g.fillStyle = PAL.red;
    g.fillRect(bx + 2, y + h - 8, 1, 1); // eye
    if (rearing && Math.sin(t * 20) > -0.2) {
      g.fillRect(bx + 3, y + h - 19, 1, 3);
      g.fillRect(bx + 3, y + h - 15, 1, 1);
    }
    // Blinking crosshair
    if (Math.sin(t * 6) > -0.3) {
      g.fillStyle = PAL.cream;
      g.fillRect(x + w / 2 - 4, y + h / 2, 3, 1);
      g.fillRect(x + w / 2 + 2, y + h / 2, 3, 1);
      g.fillRect(x + w / 2, y + h / 2 - 4, 1, 3);
      g.fillRect(x + w / 2, y + h / 2 + 2, 1, 3);
    }

  },
    platformer(g, x, y, w, h, t) {
    // PIXEL CHIC: a little doll that changes outfits
    g.fillStyle = PAL.indigo;
    g.fillRect(x, y, w, h);
    g.fillStyle = PAL.night;
    for (let bx = 4; bx < w; bx += 8) g.fillRect(x + bx, y, 1, h - 3);
    g.fillStyle = PAL.violet;
    g.fillRect(x, y + h - 3, w, 3);

    const k = Math.floor(t / 1.4) % 4;
    const dress = [PAL.red, PAL.blue, PAL.yellow, PAL.teal][k];
    const trim = [PAL.cream, PAL.cream, PAL.orange, PAL.cream][k];
    const hair = [PAL.brown, PAL.black, PAL.red, PAL.violet][k];
    const skin = '#f0c39c';
    const bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
    const px = Math.round(x + w / 2) - 3;
    const top = y + h - 19 - bob;

    g.fillStyle = hair;                      // hair behind
    g.fillRect(px - 1, top + 1, 9, 8);
    g.fillStyle = skin;                      // head
    g.fillRect(px, top + 2, 7, 5);
    g.fillStyle = hair;                      // fringe
    g.fillRect(px - 1, top, 9, 3);
    if (t % 3 < 2.85) {                      // eyes (blink)
      g.fillStyle = PAL.black;
      g.fillRect(px + 1, top + 4, 1, 1);
      g.fillRect(px + 5, top + 4, 1, 1);
    }
      
    g.fillStyle = '#f28ab2';                 // blush
    g.fillRect(px, top + 5, 1, 1);
    g.fillRect(px + 6, top + 5, 1, 1);
    g.fillStyle = PAL.maroon;                // smile
    g.fillRect(px + 3, top + 6, 1, 1);

    g.fillStyle = skin;                      // arms
    g.fillRect(px, top + 8, 1, 3);
    g.fillRect(px + 6, top + 8, 1, 3);
    g.fillStyle = dress;                     // dress
    g.fillRect(px + 1, top + 7, 5, 4);
    g.fillRect(px - 1, top + 11, 9, 4);
    g.fillStyle = trim;
    g.fillRect(px + 1, top + 10, 5, 1);
    g.fillRect(px - 1, top + 14, 9, 1);
    g.fillStyle = PAL.black;                 // shoes
    g.fillRect(px + 1, top + 15, 2, 1);
    g.fillRect(px + 4, top + 15, 2, 1);

      // twinkling sparkles
    const spots = [[4, 5], [w - 6, 8], [6, h - 11], [w - 5, h - 13]];
    spots.forEach(([sx, sy], i) => {
      if (Math.sin(t * 5 + i * 1.7) > 0.2) {
        g.fillStyle = i % 2 ? PAL.cream : PAL.yellow;
        g.fillRect(x + sx, y + sy, 1, 1);
        g.fillRect(x + sx - 1, y + sy, 1, 1);
        g.fillRect(x + sx + 1, y + sy, 1, 1);
        g.fillRect(x + sx, y + sy - 1, 1, 1);
        g.fillRect(x + sx, y + sy + 1, 1, 1);
      }
    });
  },
  rpg(g, x, y, w, h, t) {
    for (let ty = 0; ty < h; ty += 6) {
      for (let tx = 0; tx < w; tx += 6) {
        g.fillStyle = ((tx + ty) / 6) & 1 ? PAL.forest : PAL.night;
        g.fillRect(x + tx, y + ty, 6, 6);
      }
    }
    // Hero and NPC
    g.fillStyle = PAL.orange;
    g.fillRect(x + 10, y + 6, 4, 2);
    g.fillStyle = PAL.cream;
    g.fillRect(x + 10, y + 8, 4, 5);
    g.fillStyle = PAL.violet;
    g.fillRect(x + 22, y + 6, 4, 7);
    // Dialogue box with blinking cursor
    g.fillStyle = PAL.black;
    g.fillRect(x + 1, y + h - 11, w - 2, 10);
    g.fillStyle = PAL.cream;
    g.fillRect(x + 3, y + h - 8, 12, 1);
    g.fillRect(x + 3, y + h - 5, 18, 1);
    if (Math.sin(t * 6) > 0) g.fillRect(x + w - 6, y + h - 5, 2, 2);
  },
};

function staticScreen(g, x, y, w, h) {
  for (let i = 0; i < 60; i++) {
    g.fillStyle = Math.random() > 0.5 ? PAL.grey : PAL.night;
    g.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 1);
  }
}
