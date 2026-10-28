// Placeholder machine that exercises the whole game contract (see TEAM.md).
// Copy this file to start a new minigame. Controls: arrows/WASD move, collect the dot,
// V = win now, L = lose now, Esc = pause (handled by the arcade, never by the game).
export function createGame(api) {
  const { W, H, palette: P, input, audio } = api;
  const player = { x: W / 2, y: H / 2 };
  const dot = { x: 40, y: 40 };
  let score = 0;
  let time = 0;
  let keydowns = 0; // proves api.listen() listeners are removed when the machine stops

  api.listen(window, 'keydown', () => keydowns++);

  function moveDot() {
    dot.x = 20 + Math.random() * (W - 40);
    dot.y = 24 + Math.random() * (H - 44);
  }

  return {
    update(dt) {
      time += dt;
      const speed = 90 * dt;
      if (input.isDown('ArrowLeft', 'KeyA')) player.x -= speed;
      if (input.isDown('ArrowRight', 'KeyD')) player.x += speed;
      if (input.isDown('ArrowUp', 'KeyW')) player.y -= speed;
      if (input.isDown('ArrowDown', 'KeyS')) player.y += speed;
      player.x = Math.max(4, Math.min(W - 4, player.x));
      player.y = Math.max(14, Math.min(H - 4, player.y));
      if (Math.abs(player.x - dot.x) < 6 && Math.abs(player.y - dot.y) < 6) {
        score += 10;
        audio.play('coin');
        moveDot();
      }
      if (input.mouse.pressed) audio.play('blip');
      if (input.wasPressed('KeyV')) api.finish({ won: true, score });
      if (input.wasPressed('KeyL')) api.finish({ won: false, score });
    },
    draw(g) {
      g.fillStyle = P.night;
      g.fillRect(0, 0, W, H);
      api.text(g, 'TEST MACHINE', 4, 3, P.yellow);
      api.text(g, `SCORE ${score}  TIME ${time.toFixed(1)}  KEYS ${keydowns}`, 4, 11, P.cream);
      api.text(g, 'V = WIN   L = LOSE   ESC = PAUSE', W / 2, H - 8, P.grey, { align: 'center' });
      g.fillStyle = P.yellow;
      g.fillRect(dot.x - 2, dot.y - 2, 4, 4);
      g.fillStyle = P.green;
      g.fillRect(player.x - 4, player.y - 4, 8, 8);
    },
    destroy() {},
  };
}
