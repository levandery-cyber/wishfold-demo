// Everything a designer would tune lives here: the symbols, what they pay, how often they land.
// The engine never hard-codes a number; `npm run sim` measures what these numbers add up to (see lib/rtp.js).

export const W = 7;
export const H = 7;
export const N = W * H;
export const MIN_CLUSTER = 5;
export const MAX_CASCADES = 60;
export const MAX_WIN = 5000; // x bet, for a whole round (spin plus any bonus it starts)
export const MAX_FREE_SPINS = 200;

// ------------------------------------------------------------------ symbols
export const SYM = { BOAT: 0, PLANE: 1, SAKURA: 2, DUCK: 3, FROG: 4, BUTTERFLY: 5, KABUTO: 6, FOX: 7, PANDA: 8, WILD: 9, LANTERN: 10, KOI: 11, CRANE: 12 };
export const NSYM = 13;
export const REGULAR = 9; // ids below this pay in clusters

export const TIERS = [
  { key: 'kraft', name: 'Kraft', note: 'Brown packing paper' },
  { key: 'washi', name: 'Washi', note: 'Soft rice paper' },
  { key: 'gilt', name: 'Gilt', note: 'Gold foil' },
  { key: 'holo', name: 'Holo', note: 'Rainbow foil' },
];

export const SYMBOLS = [
  { id: 'boat', name: 'Paper Boat', tier: 0 },
  { id: 'plane', name: 'Paper Plane', tier: 0 },
  { id: 'sakura', name: 'Sakura', tier: 0 },
  { id: 'duck', name: 'Duckling', tier: 1 },
  { id: 'frog', name: 'Frog', tier: 1 },
  { id: 'butterfly', name: 'Butterfly', tier: 2 },
  { id: 'kabuto', name: 'Kabuto', tier: 2 },
  { id: 'fox', name: 'Fox', tier: 3 },
  { id: 'panda', name: 'Panda', tier: 3 },
  { id: 'wild', name: 'Pinwheel', tier: -1 },
  { id: 'lantern', name: 'Lantern', tier: -1 },
  { id: 'koi', name: 'Koi', tier: -1 },
  { id: 'crane', name: 'Crane', tier: -1 },
];

// ------------------------------------------------------------------ pays (x bet) by cluster size
export const SIZE_FROM = [5, 6, 7, 8, 9, 10, 12, 15, 20];
export const SIZE_LABEL = ['5', '6', '7', '8', '9', '10-11', '12-14', '15-19', '20+'];
export function bucketOf(size) {
  for (let i = SIZE_FROM.length - 1; i >= 0; i--) if (size >= SIZE_FROM[i]) return i;
  return -1;
}

export const PAYS = [
  [0.5, 0.8, 1.2, 1.8, 2.6, 4, 8, 20, 60], // kraft
  [0.7, 1.1, 1.7, 2.6, 3.8, 6, 12, 30, 90], // washi
  [1, 1.6, 2.4, 3.6, 5.2, 8, 16, 40, 120], // gilt
  [1.6, 2.4, 3.6, 5.2, 7.6, 12, 24, 60, 180], // holo
];

// ------------------------------------------------------------------ multiplier stickers
export const STAR_VALUES = [2, 3, 4, 5, 8, 10, 15, 25, 50, 100];
const STAR_WEIGHTS = [4000, 2600, 1400, 900, 500, 300, 160, 90, 35, 15];

// ------------------------------------------------------------------ bonus rules
export const FREE = { spins: 10, retrigger: 5, meter: 10, scatters: 3 };
export const POND = { respins: 3, scatters: 3 };

// Wish Tags: the five-card pick that opens whenever the crane string is full. Three cards are turned over.
export const PICKS = [
  { id: 'spins', weight: 28, label: '+5 free spins' },
  { id: 'plus', weight: 30, label: '+2 on every star' },
  { id: 'double', weight: 17, label: 'Double every star' },
  { id: 'wilds', weight: 25, label: '3-5 pinwheels next spin' },
];

// Koi Pond tokens: a landed koi is worth some multiple of the bet.
export const KOI_KINDS = [
  { id: 'small', name: 'Orange koi', values: [1, 2, 3, 4, 5], weights: [34, 26, 18, 12, 10] },
  { id: 'big', name: 'Kohaku koi', values: [8, 10, 12, 15, 20, 25], weights: [30, 24, 18, 14, 9, 5] },
  { id: 'monster', name: 'Golden koi', values: [30, 40, 50, 75, 100, 200], weights: [30, 24, 20, 14, 8, 4] },
];

// ------------------------------------------------------------------ the three wishes (Super modes)
export const MODES = [
  { id: 'normal', name: 'Classic', cost: 1, blurb: 'The plain sheet. No extras.' },
  { id: 'luck', name: 'Wish of Luck', cost: 2, blurb: 'Lanterns and koi land far more often.' },
  { id: 'stars', name: 'Wish of Stars', cost: 2, blurb: 'Lucky stars appear everywhere, and they are bigger.' },
  { id: 'wings', name: 'Wish of Wings', cost: 2, blurb: 'More pinwheels, and the crane drops them more often.' },
];

// Base weights per cell, in tenths so the specials can be tuned finely. The nine figures are skewed towards the cheap ones
// so small clusters are common. The order is the symbol ids: figures, wild, lantern, koi, crane.
export const WEIGHTS = {
  base: [1500, 1500, 1500, 1180, 1180, 900, 900, 680, 680, 220, 58, 52, 0],
  free: [1500, 1500, 1500, 1180, 1180, 900, 900, 680, 680, 220, 22, 0, 240],
};

// Per-mode knobs. `symMul` scales symbol weights by id; `star` is the chance that a new tile lands on a star position.
export const TUNE = {
  normal: { symMul: {}, star: 0.02, starFree: 0.018, starBoost: 1, drop: 0.045, dropFree: 0.03, pond: 0.0192, sun: 0.012 },
  luck: { symMul: { 10: 1.525, 11: 1.525 }, star: 0.02, starFree: 0.018, starBoost: 1, drop: 0.045, dropFree: 0.03, pond: 0.0192, sun: 0.012 },
  stars: { symMul: {}, star: 0.091, starFree: 0.0404, starBoost: 1.9, drop: 0.045, dropFree: 0.03, pond: 0.0192, sun: 0.012 },
  wings: { symMul: { 9: 2.31 }, star: 0.02, starFree: 0.018, starBoost: 1, drop: 0.104, dropFree: 0.0693, pond: 0.0192, sun: 0.012 },
};

// Which koi kind lands, in tenths of a percent.
export const KOI_KIND_WEIGHTS = [780, 180, 32];

function table(weights) {
  const cum = new Int32Array(weights.length);
  let t = 0;
  for (let i = 0; i < weights.length; i++) {
    t += Math.round(weights[i]);
    cum[i] = t;
  }
  return { cum, total: t };
}

const machines = {};
export const resetMachines = () => Object.keys(machines).forEach((k) => delete machines[k]);

// Precomputed tables for one mode. Both contexts share the shape: { sym, starChance, dropChance }.
export function machineFor(mode = 'normal') {
  if (machines[mode]) return machines[mode];
  const t = TUNE[mode] || TUNE.normal;
  const mul = (list) => list.map((w, i) => w * (t.symMul[i] || 1));
  const starW = STAR_WEIGHTS.map((w, i) => (i >= 4 ? w * t.starBoost : w));
  const m = {
    mode,
    base: { sym: table(mul(WEIGHTS.base)), starChance: t.star, dropChance: t.drop },
    free: { sym: table(mul(WEIGHTS.free)), starChance: t.starFree, dropChance: t.dropFree },
    star: table(starW),
    pick: table(PICKS.map((p) => p.weight)),
    koiKind: table(KOI_KIND_WEIGHTS),
    koiVals: KOI_KINDS.map((k) => table(k.weights)),
    pondChance: t.pond,
    sunChance: t.sun,
  };
  machines[mode] = m;
  return m;
}

export const costOf = (mode) => (MODES.find((m) => m.id === mode) || MODES[0]).cost;
