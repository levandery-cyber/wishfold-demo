// The 7 x 7 board: row-major, index = row * 7 + col, row 0 is the top. Gravity pulls towards row 6.
import { H, MIN_CLUSTER, N, REGULAR, SYM, W } from './config.js';

export const EMPTY = -1;

// Orthogonal neighbours only: the paper never connects across a corner.
export const NB = new Int8Array(N * 4);
export const NBN = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = Math.floor(i / W);
  const c = i % W;
  const list = [];
  if (r > 0) list.push(i - W);
  if (r < H - 1) list.push(i + W);
  if (c > 0) list.push(i - 1);
  if (c < W - 1) list.push(i + 1);
  NBN[i] = list.length;
  list.forEach((j, k) => (NB[i * 4 + k] = j));
}

const mark = new Int32Array(N);
let stamp = 0;
const stack = new Int8Array(N + 4);
const count = new Int32Array(REGULAR);

// Every group of 5 or more matching figures that touch edge to edge. A pinwheel counts as whichever figure it touches, so one
// pinwheel between two groups joins them, and a pinwheel can sit in two groups of different figures (and pays in both).
export function findClusters(g) {
  count.fill(0);
  let wild = 0;
  for (let i = 0; i < N; i++) {
    const s = g[i];
    if (s >= 0 && s < REGULAR) count[s]++;
    else if (s === SYM.WILD) wild++;
  }
  const out = [];
  for (let s = 0; s < REGULAR; s++) {
    if (count[s] === 0 || count[s] + wild < MIN_CLUSTER) continue;
    stamp++;
    for (let start = 0; start < N; start++) {
      if (g[start] !== s || mark[start] === stamp) continue;
      let sp = 0;
      stack[sp++] = start;
      mark[start] = stamp;
      const cells = [];
      while (sp > 0) {
        const i = stack[--sp];
        cells.push(i);
        const n = NBN[i];
        for (let k = 0; k < n; k++) {
          const j = NB[i * 4 + k];
          if (mark[j] === stamp) continue;
          const v = g[j];
          if (v === s || v === SYM.WILD) {
            mark[j] = stamp;
            stack[sp++] = j;
          }
        }
      }
      if (cells.length >= MIN_CLUSTER) {
        cells.sort((a, b) => a - b);
        out.push({ sym: s, cells });
      }
    }
  }
  return out;
}

// Remove the flagged cells and let everything above fall straight down. Empty cells end up at the top of each column.
// When `moves` is given, every tile that travelled is recorded as [from, to].
export function collapse(g, removed, moves) {
  for (let c = 0; c < W; c++) {
    let write = H - 1;
    for (let r = H - 1; r >= 0; r--) {
      const i = r * W + c;
      if (removed[i]) continue;
      const to = write * W + c;
      if (to !== i) {
        g[to] = g[i];
        if (moves) moves.push([i, to]);
      }
      write--;
    }
    for (let r = write; r >= 0; r--) g[r * W + c] = EMPTY;
  }
}
