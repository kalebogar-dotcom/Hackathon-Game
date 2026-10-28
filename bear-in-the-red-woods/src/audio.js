// Retro sound effects synthesized with Web Audio (no sound files).
// Each sound is a list of voices: { type, f: [startHz, endHz], d: seconds, v: volume, t: delay }.
// type is an oscillator type or 'noise' (f sweeps a lowpass filter).
const note = (f, t, d = 0.1, type = 'square', v = 0.12) => ({ type, f: [f, f], d, v, t });

const SOUNDS = {
  select: [{ type: 'square', f: [523, 1046], d: 0.09, v: 0.14 }],
  pause: [note(880, 0, 0.07), note(440, 0.07, 0.1)],
  pistol: [{ type: 'noise', f: [6000, 400], d: 0.12, v: 0.3 }, { type: 'square', f: [900, 120], d: 0.07, v: 0.12 }],
  shotgun: [{ type: 'noise', f: [3000, 80], d: 0.35, v: 0.45 }, { type: 'square', f: [220, 40], d: 0.18, v: 0.18 }],
  smg: [{ type: 'noise', f: [7000, 900], d: 0.06, v: 0.22 }, { type: 'square', f: [1200, 300], d: 0.04, v: 0.06 }],
  hit: [{ type: 'square', f: [300, 80], d: 0.08, v: 0.12 }],
  bearHit: [{ type: 'square', f: [140, 60], d: 0.1, v: 0.14 }],
  zdie: [{ type: 'sawtooth', f: [220, 40], d: 0.35, v: 0.16 }, { type: 'noise', f: [900, 100], d: 0.25, v: 0.15 }],
  groan: [{ type: 'sawtooth', f: [110, 70], d: 0.5, v: 0.07 }, { type: 'triangle', f: [140, 90], d: 0.5, v: 0.06, t: 0.05 }],
  hurt: [{ type: 'sawtooth', f: [180, 50], d: 0.28, v: 0.22 }],
  buy: [note(659, 0, 0.06), note(880, 0.06, 0.06), note(1319, 0.12, 0.18)],
  equip: [note(660, 0, 0.04, 'square', 0.08), note(990, 0.05, 0.05, 'square', 0.08)],
  deny: [note(160, 0, 0.12), note(120, 0.12, 0.18)],
  wave: [note(220, 0, 0.18, 'sawtooth', 0.12), note(165, 0.2, 0.18, 'sawtooth', 0.12), note(110, 0.4, 0.4, 'sawtooth', 0.12)],
  clear: [note(523, 0, 0.08, 'triangle', 0.16), note(659, 0.08, 0.08, 'triangle', 0.16), note(784, 0.16, 0.2, 'triangle', 0.16)],
  roar: [{ type: 'sawtooth', f: [95, 50], d: 0.9, v: 0.25 }, { type: 'noise', f: [700, 120], d: 0.9, v: 0.25 }, { type: 'square', f: [70, 45], d: 0.9, v: 0.1 }],
  charge: [{ type: 'noise', f: [400, 60], d: 0.5, v: 0.35 }, { type: 'square', f: [60, 40], d: 0.5, v: 0.15 }],
  thud: [{ type: 'noise', f: [500, 40], d: 0.4, v: 0.4 }, { type: 'sine', f: [80, 30], d: 0.4, v: 0.3 }],
  bearDie: [{ type: 'sawtooth', f: [120, 30], d: 1.2, v: 0.25 }, { type: 'noise', f: [1200, 60], d: 1.0, v: 0.3 }],
  win: [note(523, 0), note(659, 0.1), note(784, 0.2), note(1046, 0.3, 0.35)],
  lose: [note(392, 0, 0.15, 'triangle', 0.18), note(311, 0.15, 0.15, 'triangle', 0.18), note(262, 0.3, 0.15, 'triangle', 0.18), note(196, 0.45, 0.45, 'triangle', 0.18)],
};

export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));

export function createAudio({ muted: startMuted = false } = {}) {
  let ctx = null, master = null, noise = null;
  let muted = startMuted;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function voice(spec, t0) {
    const t = t0 + (spec.t || 0), end = t + spec.d;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(spec.v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    let src;
    if (spec.type === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(spec.f[0], t);
      filter.frequency.exponentialRampToValueAtTime(spec.f[1], end);
      src.connect(filter).connect(gain);
    } else {
      src = ctx.createOscillator();
      src.type = spec.type;
      src.frequency.setValueAtTime(spec.f[0], t);
      src.frequency.exponentialRampToValueAtTime(spec.f[1], end);
      src.connect(gain);
    }
    gain.connect(master);
    src.start(t);
    src.stop(end + 0.02);
  }

  return {
    play(name) {
      const spec = SOUNDS[name];
      if (!spec) { console.warn(`[audio] unknown sound "${name}"`); return; }
      if (muted || !ensure()) return;
      const t0 = ctx.currentTime + 0.005;
      for (const v of spec) voice(v, t0);
    },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
