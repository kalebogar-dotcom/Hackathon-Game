// Shared keyboard + mouse state. Only this module adds DOM input listeners;
// games read state through api.input and never touch window/document directly.
const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace']);

export function createInput(canvas, W, H) {
  const held = new Set();
  const pressed = new Set();
  const lockListeners = [];
  const mouse = {
    x: 0, y: 0,          // position in game pixels (0..W, 0..H); frozen while pointer is locked
    dx: 0, dy: 0,        // raw movement this frame, only while pointer is locked
    down: false,         // left button held
    pressed: false,      // left button went down this frame
    released: false,     // left button went up this frame
    moved: false,        // cursor moved this frame (unlocked only)
  };
  let cursor = 'default';

  window.addEventListener('keydown', e => {
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (!e.repeat && !held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', reset);

  function trackPosition(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    if (x !== mouse.x || y !== mouse.y) mouse.moved = true;
    mouse.x = x;
    mouse.y = y;
  }

  canvas.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) {
      mouse.dx += e.movementX;
      mouse.dy += e.movementY;
    } else {
      trackPosition(e);
    }
  });
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    // Taps and synthetic clicks may arrive without a mousemove first.
    if (document.pointerLockElement !== canvas) trackPosition(e);
    canvas.focus();
    mouse.down = true;
    mouse.pressed = true;
  });
  window.addEventListener('mouseup', e => {
    if (e.button !== 0) return;
    mouse.down = false;
    mouse.released = true;
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    for (const fn of lockListeners) fn(locked);
  });
  document.addEventListener('pointerlockerror', () => console.warn('[input] pointer lock was refused (click the game to try again)'));

  function reset() {
    held.clear();
    pressed.clear();
    mouse.down = mouse.pressed = mouse.released = mouse.moved = false;
    mouse.dx = mouse.dy = 0;
  }

  return {
    mouse,
    /** True while any of the given KeyboardEvent.code values is held, e.g. isDown('KeyA', 'ArrowLeft'). */
    isDown: (...codes) => codes.some(c => held.has(c)),
    /** True only on the frame any of the given keys went down. */
    wasPressed: (...codes) => codes.some(c => pressed.has(c)),
    consume(code) { pressed.delete(code); },
    consumeMouse() { mouse.pressed = false; },
    get pointerLocked() { return document.pointerLockElement === canvas; },
    lockPointer() {
      if (document.pointerLockElement === canvas) return;
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch { /* refused; the game can ask again on the next click */ }
    },
    unlockPointer() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    onPointerLockChange(fn) { lockListeners.push(fn); },
    setCursor(c) {
      if (c !== cursor) canvas.style.cursor = cursor = c;
    },
    reset,
    /** Called once per frame by the main loop after update+draw. */
    endFrame() {
      pressed.clear();
      mouse.pressed = mouse.released = mouse.moved = false;
      mouse.dx = mouse.dy = 0;
    },
  };
}
