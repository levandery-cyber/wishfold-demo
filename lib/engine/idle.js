// A calm board to show before the first spin: plain figures only, nothing that would pay.
import { N, REGULAR, machineFor } from './config.js';
import { findClusters } from './grid.js';
import { pickFrom } from './rng.js';

export function idleBoard(rng) {
  const M = machineFor('normal');
  let g = new Int8Array(N);
  for (let tries = 0; tries < 400; tries++) {
    g = new Int8Array(N);
    for (let i = 0; i < N; i++) {
      let s;
      do s = pickFrom(rng, M.base.sym);
      while (s >= REGULAR);
      g[i] = s;
    }
    if (findClusters(g).length === 0) return g;
  }
  return g;
}
