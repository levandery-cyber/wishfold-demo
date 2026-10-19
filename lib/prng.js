// Small deterministic PRNG for everything that is decoration: art, reel filler, simulated players.
// Never used for a game result; those come from lib/fair.js.

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (text) => mulberry32(hashString(text));

export const between = (rng, a, b) => a + rng() * (b - a);
export const int = (rng, a, b) => Math.floor(between(rng, a, b + 1));
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Weighted pick; weights may be any non-negative numbers.
export function weighted(rng, list, weightOf) {
  let total = 0;
  for (const x of list) total += weightOf(x);
  let r = rng() * total;
  for (const x of list) {
    r -= weightOf(x);
    if (r < 0) return x;
  }
  return list[list.length - 1];
}
