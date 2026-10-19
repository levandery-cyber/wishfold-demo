import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE, KOI_KINDS, MAX_WIN, MODES, N, PAYS, PICKS, POND, REGULAR, SIZE_FROM, SYM, SYMBOLS, bucketOf, costOf, machineFor } from '../lib/engine/config.js';
import { EMPTY, NB, NBN, collapse, findClusters } from '../lib/engine/grid.js';
import { idleBoard } from '../lib/engine/idle.js';
import { fastRng, pickFrom } from '../lib/engine/rng.js';
import { playRound } from '../lib/engine/round.js';

const board = (rows) => Int8Array.from(rows.flat());
const B = SYM.BOAT;
const P = SYM.PLANE;
const S = SYM.SAKURA;
const D = SYM.DUCK;
const F = SYM.FROG;
const W = SYM.WILD;

test('the board is 7 x 7 and every neighbour list is orthogonal', () => {
  assert.equal(N, 49);
  assert.equal(NBN[0], 2); // corner
  assert.equal(NBN[3], 3); // edge
  assert.equal(NBN[24], 4); // middle
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < NBN[i]; k++) {
      const j = NB[i * 4 + k];
      const dr = Math.abs(Math.floor(i / 7) - Math.floor(j / 7));
      const dc = Math.abs((i % 7) - (j % 7));
      assert.equal(dr + dc, 1, `${i} -> ${j} is not a neighbour`);
    }
  }
});

test('a group needs five touching figures; corners do not connect', () => {
  const g = board([
    [B, B, B, B, P, F, D],
    [P, F, D, S, P, F, D],
    [F, D, S, P, F, D, S],
    [D, S, P, F, D, S, P],
    [S, P, F, D, S, P, F],
    [P, F, D, S, P, F, D],
    [F, D, S, P, F, D, S],
  ]);
  assert.equal(findClusters(g).length, 0, 'four in a row is not enough');
  g[4] = B; // the fifth boat, next to the four
  const hit = findClusters(g);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].sym, B);
  assert.deepEqual(hit[0].cells, [0, 1, 2, 3, 4]);

  // five boats joined only diagonally are not a group
  const d = board(Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => ((r * 3 + c * 5) % 3 === 0 ? P : S))));
  const diag = [0, 8, 16, 24, 32].map((i) => i);
  diag.forEach((i) => (d[i] = B));
  assert.equal(findClusters(d).filter((c) => c.sym === B).length, 0);
});

test('a pinwheel joins the group it touches, and can serve two figures at once', () => {
  const rows = Array.from({ length: 7 }, () => Array(7).fill(D));
  // a plain checker that pays nothing: ducks and frogs alternate
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) rows[r][c] = (r + c) % 2 ? D : F;
  const g = board(rows);
  assert.equal(findClusters(g).length, 0);
  // four boats in a row with a pinwheel at the end make five
  [0, 1, 2, 3].forEach((i) => (g[i] = B));
  g[4] = W;
  const one = findClusters(g).filter((c) => c.sym === B);
  assert.equal(one.length, 1);
  assert.equal(one[0].cells.length, 5);
  // a pinwheel between two groups of four joins them
  const h = board(Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => ((r + c) % 2 ? D : F))));
  [7, 8, 9, 10].forEach((i) => (h[i] = P));
  h[11] = W;
  [12, 13].forEach((i) => (h[i] = P));
  const joined = findClusters(h).filter((c) => c.sym === P);
  assert.equal(joined.length, 1);
  assert.equal(joined[0].cells.length, 7);
});

test('cells fall straight down and gaps collect at the top of each column', () => {
  const g = board(Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => r)));
  const removed = new Uint8Array(N);
  [1 * 7 + 2, 4 * 7 + 2, 5 * 7 + 2].forEach((i) => (removed[i] = 1)); // three cells out of column 2
  const moves = [];
  collapse(g, removed, moves);
  const col = [0, 1, 2, 3, 4, 5, 6].map((r) => g[r * 7 + 2]);
  assert.deepEqual(col, [EMPTY, EMPTY, EMPTY, 0, 2, 3, 6]);
  assert.ok(
    moves.every(([from, to]) => to > from && from % 7 === to % 7),
    'tiles only move down, never sideways',
  );
  assert.equal(g[3 * 7 + 0], 3, 'other columns are untouched');
});

test('pays grow with group size and with tier, and the buckets cover every size', () => {
  for (const row of PAYS) for (let i = 1; i < row.length; i++) assert.ok(row[i] > row[i - 1]);
  for (let t = 1; t < PAYS.length; t++) for (let i = 0; i < PAYS[t].length; i++) assert.ok(PAYS[t][i] > PAYS[t - 1][i]);
  assert.equal(bucketOf(4), -1);
  assert.equal(bucketOf(5), 0);
  assert.equal(bucketOf(11), 5);
  assert.equal(bucketOf(49), SIZE_FROM.length - 1);
  assert.equal(SYMBOLS.length, 13);
  assert.equal(REGULAR, 9);
});

test('the same random source always plays the same round, recorded or not', () => {
  for (const mode of MODES.map((m) => m.id)) {
    for (let seed = 1; seed <= 60; seed++) {
      const a = playRound(fastRng(seed), { mode, bet: 100, record: true });
      const b = playRound(fastRng(seed), { mode, bet: 100, record: false });
      const c = playRound(fastRng(seed), { mode, bet: 100, record: true });
      assert.equal(a.win, b.win, `${mode} seed ${seed}: recording must not change the result`);
      assert.equal(a.win, c.win, `${mode} seed ${seed}: replay differs`);
      assert.equal(a.cost, 100 * costOf(mode));
    }
  }
});

test('every recorded cascade adds up: group pays sum to the step, steps sum to the spin', () => {
  let checked = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const r = playRound(fastRng(seed), { mode: 'normal', bet: 100, record: true, features: false });
    if (!r.base) continue;
    let total = 0;
    for (const st of r.base.steps) {
      const sum = st.clusters.reduce((a, c) => a + c.pay, 0);
      assert.equal(st.win, sum, `seed ${seed}`);
      total += st.win;
      for (const c of st.clusters) {
        assert.ok(c.cells.length >= 5);
        assert.ok(c.mult >= 1);
        assert.ok(c.pay > 0);
      }
    }
    assert.equal(total, r.base.total);
    assert.equal(r.win, r.base.total);
    checked++;
  }
  assert.ok(checked > 250);
});

// Rebuild the sticker board from a recorded spin and check every claim the record makes about it.
function checkStars(sp, persist) {
  const mat = Int16Array.from(sp.mat0);
  let used = 0;
  for (const st of sp.steps) {
    for (const c of st.clusters) {
      const sum = c.cells.reduce((a, i) => a + mat[i], 0);
      assert.equal(c.mult, Math.max(1, sum), 'a group is multiplied by the stars under it, added together');
    }
    if (persist) assert.equal(st.peel.length, 0, 'free spins never peel stars');
    for (const { i, v } of st.peel) {
      assert.equal(mat[i], v, 'a peeled star was on the board');
      assert.ok(st.removed.includes(i), 'only stars under a winning tile are used');
      mat[i] = 0;
      used++;
    }
    if (!persist) for (const i of st.removed) assert.equal(mat[i], 0, 'every star under a winning tile is used up');
    for (const { i, v } of st.newStars) {
      assert.equal(mat[i], 0, 'a new star never lands on an old one');
      mat[i] = v;
    }
  }
  assert.deepEqual(Array.from(mat), Array.from(sp.matEnd), 'the record rebuilds the final stickers exactly');
  return used;
}

test('stars are used up in the base game and stay in free spins', () => {
  let base = 0;
  let free = 0;
  for (let seed = 1; seed <= 3000 && (base < 20 || free < 3); seed++) {
    const r = playRound(fastRng(seed), { mode: 'stars', bet: 100, record: true });
    if (r.base) base += checkStars(r.base, false);
    for (const f of r.features) {
      if (f.type !== 'free') continue;
      for (const sp of f.spins) checkStars(sp, true);
      free++;
    }
  }
  assert.ok(base >= 20, 'expected some stars to be used in the base game');
  assert.ok(free >= 3, 'expected some free spins');
});

test('a buy skips the base spin and pays out the whole bonus', () => {
  const f = playRound(fastRng(5), { mode: 'normal', bet: 100, buy: 'free', record: true });
  assert.equal(f.base, null);
  assert.equal(f.features.length, 1);
  assert.equal(f.features[0].type, 'free');
  assert.ok(f.features[0].played >= FREE.spins);
  assert.equal(f.win, Math.min(f.features[0].total, MAX_WIN * 100));
  const p = playRound(fastRng(5), { mode: 'normal', bet: 100, buy: 'pond', record: true });
  assert.equal(p.features[0].type, 'pond');
  assert.equal(p.features[0].start.length, POND.scatters);
});

test('free spins: spins played = start + retriggers + wish-tag spins, and the wish string only counts to ten', () => {
  let seen = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const r = playRound(fastRng(seed), { mode: 'normal', bet: 100, buy: 'free', record: true });
    const f = r.features[0];
    if (f.capped) continue;
    let extra = 0;
    let meter = 0;
    for (const sp of f.spins) {
      extra += sp.retrigger + sp.picks.reduce((a, p) => a + p.bonusSpins, 0);
      meter += sp.cranes;
      meter -= sp.picks.length * FREE.meter;
      assert.equal(sp.meterAfter, meter, `seed ${seed} spin ${sp.index}`);
      assert.ok(meter >= 0 && meter < FREE.meter, 'a full string always opens the tags');
      for (const p of sp.picks) {
        assert.equal(p.rewards.length, 3);
        assert.equal(p.decoys.length, 2);
        for (const x of [...p.rewards, ...p.decoys]) assert.ok(PICKS.some((k) => k.id === x));
      }
    }
    assert.equal(f.played, f.startSpins + extra, `seed ${seed}`);
    seen++;
  }
  assert.ok(seen > 300);
});

test('koi pond: respins reset when a koi lands, the pond ends on three misses, and the pay is the sum of the koi', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const r = playRound(fastRng(seed), { mode: 'normal', bet: 100, buy: 'pond', record: true });
    const f = r.features[0];
    let left = POND.respins;
    let sum = f.start.reduce((a, k) => a + k.value, 0);
    const taken = new Set(f.start.map((k) => k.i));
    for (const rs of f.respins) {
      assert.ok(left > 0, 'no respin after the last one');
      left = rs.landed.length ? POND.respins : left - 1;
      assert.equal(rs.left, left);
      for (const k of rs.landed) {
        assert.ok(!taken.has(k.i), 'a koi cannot land on a koi');
        taken.add(k.i);
        sum += k.value;
        assert.ok(k.kind >= 0 && k.kind <= 3);
        if (k.kind < 3) assert.ok(KOI_KINDS[k.kind].values.includes(k.value));
      }
    }
    assert.ok(left === 0 || taken.size === N);
    if (!f.capped) assert.equal(f.total, sum * 100);
    assert.equal(f.sum, sum);
  }
});

test('no round pays more than the maximum win', () => {
  let capped = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const r = playRound(fastRng(seed), { mode: 'wings', bet: 100, buy: 'free' });
    assert.ok(r.win <= MAX_WIN * 100);
    if (r.capped) {
      capped++;
      assert.equal(r.win, MAX_WIN * 100);
    }
  }
  assert.ok(capped > 0, 'the cap should be reachable in a bought wings bonus');
});

test('the idle board never pays and never shows a special', () => {
  const rng = fastRng(9);
  for (let i = 0; i < 100; i++) {
    const g = idleBoard(rng);
    assert.equal(findClusters(g).length, 0);
    assert.ok(g.every((s) => s >= 0 && s < REGULAR));
  }
});

test('weighted picks follow their weights', () => {
  const M = machineFor('normal');
  const rng = fastRng(3);
  const counts = new Array(13).fill(0);
  const n = 200000;
  for (let i = 0; i < n; i++) counts[pickFrom(rng, M.base.sym)]++;
  const total = M.base.sym.total;
  const prev = [
    M.base.sym.cum[0],
    ...Array.from(M.base.sym.cum)
      .slice(1)
      .map((c, i) => c - M.base.sym.cum[i]),
  ];
  prev.forEach((w, s) => {
    const want = (w / total) * n;
    assert.ok(Math.abs(counts[s] - want) < 6 * Math.sqrt(want + 1) + 5, `symbol ${s}: ${counts[s]} vs ${want.toFixed(0)}`);
  });
  assert.equal(counts[SYM.CRANE], 0, 'cranes never land in the base game');
  const free = machineFor('normal').free.sym;
  const koiWeight = free.cum[SYM.KOI] - free.cum[SYM.KOI - 1];
  assert.equal(koiWeight, 0, 'koi never land in free spins');
});
