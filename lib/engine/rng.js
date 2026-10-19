// Two sources of randomness behind one tiny interface: { next(): float in [0,1), int(n): integer in [0,n) }.
//
// fairRng  reads the provably fair stream:  HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${domain}:${block}`),
//          seven hex digits (28 bits) at a time, and rejects the tail of the range so int(n) has no modulo bias.
// fastRng  is a seeded mulberry32 for the simulator, which needs millions of rounds per second and no proof.
import { hmacSha256Hex } from '../sha256.js';

const CHUNK = 7;
const RANGE = 16 ** CHUNK; // 2^28

export function fairRng(serverSeed, clientSeed, nonce, domain = 'spin') {
  let block = 0;
  let buf = [];
  let at = 0;
  const raw = () => {
    if (at >= buf.length) {
      const hex = hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${domain}:${block++}`);
      buf = [];
      for (let k = 0; k + CHUNK <= hex.length; k += CHUNK) buf.push(parseInt(hex.slice(k, k + CHUNK), 16));
      at = 0;
    }
    return buf[at++];
  };
  return {
    next: () => raw() / RANGE,
    int(n) {
      const limit = RANGE - (RANGE % n);
      for (;;) {
        const v = raw();
        if (v < limit) return v % n;
      }
    },
  };
}

export function fastRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n) };
}

// Pick an index from a cumulative-weight table (see config.js `table`).
export function pickFrom(rng, t) {
  const r = rng.int(t.total);
  const c = t.cum;
  for (let i = 0; i < c.length; i++) if (r < c[i]) return i;
  return c.length - 1;
}
