// A small Web Audio synth: no sample files. The context is created after the first tap (browsers insist), and everything is
// silent while sound is off. Sounds are "paper and bells": soft noise bursts for tiles and folds, glassy sine pings for wins.

const LEVEL = 0.55;

let ctx = null;
let master = null;
let noise = null;
let send = null; // a gentle echo that the music (and a few bells) are routed through
let muted = false;
let gesture = false;

function ensure() {
  if (ctx || !gesture || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : LEVEL;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  // an echo: delay -> low-pass -> back into the delay, so each note leaves a soft tail
  send = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.34;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.4;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2400;
  send.connect(delay);
  delay.connect(damp);
  damp.connect(feedback);
  feedback.connect(delay);
  damp.connect(master);
  const len = ctx.sampleRate * 2;
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function tone({ f0, f1 = f0, type = 'sine', at = 0, dur = 0.2, gain = 0.15, attack = 0.006, wet = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(master);
  if (wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    amp.connect(w).connect(send);
  }
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function hiss({ at = 0, dur = 0.2, gain = 0.1, from = 1200, to = 1200, type = 'bandpass', q = 0.8 }) {
  const c = ensure();
  if (!c || muted) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const amp = c.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(amp).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// A pentatonic scale, so any run of cascade pings sounds pleasant.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
const note = (i) => SCALE[Math.min(SCALE.length - 1, Math.max(0, i))];

let lastLand = 0;

// ---------------------------------------------------------------------------------------------- ambient music
// Not a tune: a few soft notes from a pentatonic scale, dropped at random into an echo. Each scene has its own root and mood,
// so the night feels lower and slower, and the pond answers with small water drops.
const THEMES = {
  base: { root: 392, scale: [0, 2, 4, 7, 9], gap: [1.8, 3.8], len: 3.2, gain: 0.05 },
  free: { root: 329.63, scale: [0, 3, 5, 7, 10], gap: [1.3, 2.9], len: 3.6, gain: 0.055 },
  pond: { root: 440, scale: [0, 2, 4, 7, 9], gap: [1.0, 2.4], len: 1.6, gain: 0.05, drops: true },
};
let musicOn = false;
let theme = 'base';
let musicTimer = 0;
let lastDegree = 0;

function musicStep() {
  musicTimer = 0;
  if (!musicOn || !ctx) return;
  const th = THEMES[theme] || THEMES.base;
  // wander: mostly step to a neighbour in the scale, sometimes leap
  const move = Math.random() < 0.7 ? (Math.random() < 0.5 ? -1 : 1) : Math.round((Math.random() - 0.5) * 6);
  lastDegree = Math.max(-3, Math.min(th.scale.length + 2, lastDegree + move));
  const oct = Math.floor(lastDegree / th.scale.length);
  const f = th.root * 2 ** ((th.scale[((lastDegree % th.scale.length) + th.scale.length) % th.scale.length] + 12 * oct) / 12);
  tone({ f0: f, dur: th.len, gain: th.gain, attack: 0.04, type: 'sine', wet: 0.8 });
  if (Math.random() < 0.35) tone({ f0: f * 1.5, dur: th.len * 0.8, gain: th.gain * 0.5, attack: 0.05, type: 'triangle', at: 0.18, wet: 0.7 });
  if (th.drops && Math.random() < 0.6) tone({ f0: f * 2, f1: f * 1.4, dur: 0.25, gain: th.gain * 0.8, at: 0.4, wet: 0.9 });
  const [a, b] = th.gap;
  musicTimer = setTimeout(musicStep, (a + Math.random() * (b - a)) * 1000);
}

export const sfx = {
  unlock() {
    gesture = true;
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  },

  setMuted(m) {
    muted = m;
    if (!m) this.unlock();
    if (ctx) master.gain.setTargetAtTime(m ? 0 : LEVEL, ctx.currentTime, 0.03);
  },

  // Ambient music on or off; `name` picks the scene's mood ('base', 'free' or 'pond').
  setMusic(on, name = 'base') {
    theme = name;
    if (on === musicOn) return;
    musicOn = on;
    if (!on) {
      clearTimeout(musicTimer);
      musicTimer = 0;
      return;
    }
    this.unlock();
    if (!musicTimer) musicTimer = setTimeout(musicStep, 600);
  },

  // for the dev hook and tests: what the audio side is doing right now
  status() {
    return { context: ctx ? ctx.state : 'none', muted, music: musicOn, scheduled: musicTimer !== 0, theme };
  },

  click() {
    tone({ f0: 700, f1: 900, dur: 0.05, gain: 0.07, type: 'triangle' });
  },

  // The board is thrown: a rush of paper.
  spin() {
    hiss({ dur: 0.5, gain: 0.1, from: 600, to: 3200, q: 0.9 });
    tone({ f0: 180, f1: 90, dur: 0.18, gain: 0.12, type: 'triangle' });
  },

  // A tile lands. Many land at once, so they are rate limited and each has a slightly different pitch.
  land(k = 0) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now - lastLand < 28) return;
    lastLand = now;
    hiss({ dur: 0.07, gain: 0.08, from: 900 + k * 90, to: 500, type: 'lowpass', q: 0.5 });
  },

  // A cluster pays. `step` is the cascade number, so a chain climbs the scale.
  win(step = 0, size = 5) {
    const base = step * 1 + (size > 9 ? 2 : size > 6 ? 1 : 0);
    tone({ f0: note(base), dur: 0.34, gain: 0.14, type: 'sine' });
    tone({ f0: note(base + 2), dur: 0.3, at: 0.07, gain: 0.1, type: 'triangle' });
    tone({ f0: note(base + 4), dur: 0.28, at: 0.14, gain: 0.08, type: 'sine' });
    hiss({ at: 0.02, dur: 0.12, gain: 0.05, from: 6000, to: 9000, type: 'highpass' });
  },

  // A paper fold: tiles leaving the board.
  fold() {
    hiss({ dur: 0.16, gain: 0.07, from: 2500, to: 700, q: 1.2 });
  },

  star() {
    tone({ f0: 1568, dur: 0.18, gain: 0.1, type: 'triangle' });
    tone({ f0: 2093, dur: 0.22, at: 0.06, gain: 0.08, type: 'sine' });
  },

  scatter(n = 1) {
    tone({ f0: note(3 + n), dur: 0.5, gain: 0.14, type: 'sine' });
    tone({ f0: note(5 + n), dur: 0.5, at: 0.05, gain: 0.09, type: 'triangle' });
  },

  crane() {
    tone({ f0: 1174, f1: 1760, dur: 0.22, gain: 0.1, type: 'sine' });
  },

  // A bonus begins: a rising run and a low bell.
  feature() {
    [0, 2, 4, 5, 7, 9].forEach((s, i) => tone({ f0: note(s), dur: 0.5, at: i * 0.09, gain: 0.12, type: i % 2 ? 'sine' : 'triangle' }));
    tone({ f0: 130, f1: 65, dur: 1.0, gain: 0.22, at: 0.05 });
    hiss({ dur: 0.9, gain: 0.07, from: 500, to: 5000 });
  },

  tag() {
    tone({ f0: 880, f1: 1320, dur: 0.14, gain: 0.1, type: 'triangle' });
  },

  reveal(k = 0) {
    tone({ f0: note(2 + k), dur: 0.4, gain: 0.14 });
    tone({ f0: note(4 + k), dur: 0.4, at: 0.08, gain: 0.1, type: 'triangle' });
  },

  // Koi lands in the pond: a soft plop.
  plop() {
    tone({ f0: 420, f1: 180, dur: 0.16, gain: 0.16, type: 'sine' });
    hiss({ dur: 0.12, gain: 0.05, from: 1800, to: 600, q: 1 });
  },

  // Count-up tick for the win number.
  tick(p = 0) {
    tone({ f0: 1400 + p * 900, dur: 0.03, gain: 0.04, type: 'triangle' });
  },

  // Big wins: a fanfare that grows with the tier (0..4).
  big(tier = 0) {
    const run = [0, 2, 4, 7, 9, 10];
    const n = 3 + tier;
    for (let i = 0; i < n; i++) tone({ f0: note(run[i % run.length]), dur: 0.6, at: i * 0.1, gain: 0.15, type: i % 2 ? 'sine' : 'triangle' });
    tone({ f0: 110, f1: 55, dur: 0.9 + tier * 0.15, gain: 0.3 });
    if (tier >= 2)
      for (let i = 0; i < 10 + tier * 4; i++) tone({ f0: 1500 + Math.random() * 2400, dur: 0.07, at: 0.3 + Math.random() * 1.2, gain: 0.05, type: 'triangle' });
    hiss({ dur: 1.0, gain: 0.08, from: 400, to: 7000 });
  },

  error() {
    tone({ f0: 220, f1: 150, dur: 0.18, gain: 0.1, type: 'sawtooth' });
  },
};
