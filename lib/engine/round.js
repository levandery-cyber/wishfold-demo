// One paid round, start to finish, decided entirely up front from a random source.
//
//   base spin  ->  cascades  ->  (3+ lanterns) free spins  /  (3+ koi) Koi Pond
//
// The engine is pure: give it the same rng and it returns the same round. With `record` on it also returns every step the screen
// needs to play it back (boards, clusters, tiles that fell, tiles that arrived). With it off it skips all of that, which is what
// lets `npm run sim` play millions of rounds. Both modes draw random numbers in exactly the same order.
import {
  FREE,
  KOI_KINDS,
  MAX_CASCADES,
  MAX_FREE_SPINS,
  MAX_WIN,
  N,
  PAYS,
  PICKS,
  POND,
  REGULAR,
  STAR_VALUES,
  SYM,
  bucketOf,
  costOf,
  machineFor,
} from './config.js';
import { EMPTY, collapse, findClusters } from './grid.js';
import { pickFrom } from './rng.js';

const STAR_CAP = 1000;
const TIER_OF = [0, 0, 0, 1, 1, 2, 2, 3, 3];
const eligible = (s) => s >= 0 && (s < REGULAR || s === SYM.WILD);

function fillCell(rng, M, ctx, g, mat, i, fresh) {
  const s = pickFrom(rng, ctx.sym);
  g[i] = s;
  if (eligible(s) && mat[i] === 0 && rng.next() < ctx.starChance) {
    const v = STAR_VALUES[pickFrom(rng, M.star)];
    mat[i] = v;
    if (fresh) fresh.push({ i, v });
  }
}

// Up to `count` distinct cells, chosen at random. By default only cells holding a plain figure qualify.
function pickCells(rng, g, count, plainOnly = true) {
  const cand = [];
  for (let i = 0; i < N; i++) if (!plainOnly || (g[i] >= 0 && g[i] < REGULAR)) cand.push(i);
  const n = Math.min(count, cand.length);
  for (let k = 0; k < n; k++) {
    const j = k + rng.int(cand.length - k);
    const t = cand[k];
    cand[k] = cand[j];
    cand[j] = t;
  }
  return cand.slice(0, n);
}

// ---------------------------------------------------------------------------------------------------- one spin
// `st.mat` holds the lucky-star stickers. They belong to board positions, not to figures: tiles fall past them.
// In the base game a star that helped pay is peeled off; in free spins (`persist`) it stays until the round ends.
export function playSpin(rng, M, ctx, st, bet, room, rec, persist) {
  const g = new Int8Array(N);
  const mat = st.mat;
  for (let i = 0; i < N; i++) fillCell(rng, M, ctx, g, mat, i, null);

  const out = { total: 0, lantern: 0, koi: 0, cranes: 0, capped: false };
  if (rec) {
    out.g0 = Int8Array.from(g);
    out.mat0 = Int16Array.from(mat);
    out.steps = [];
    out.wilds = [];
  }

  // Crane Drop: a paper crane glides over and leaves pinwheels. Either the Wish Tags asked for it, or it happens by chance.
  let wilds = 0;
  if (st.wildsNext > 0) {
    wilds = st.wildsNext;
    st.wildsNext = 0;
  } else if (rng.next() < ctx.dropChance) wilds = 2 + rng.int(3);
  if (wilds > 0) {
    const at = pickCells(rng, g, wilds);
    for (const i of at) g[i] = SYM.WILD;
    if (rec) out.wilds = at.sort((a, b) => a - b);
  }

  const removed = new Uint8Array(N);
  let total = 0;
  for (let step = 0; step < MAX_CASCADES; step++) {
    const clusters = findClusters(g);
    if (clusters.length === 0) break;

    let stepWin = 0;
    removed.fill(0);
    for (const c of clusters) {
      let m = 0;
      for (const i of c.cells) m += mat[i];
      if (m === 0) m = 1;
      c.mult = m;
      c.pay = Math.round(PAYS[TIER_OF[c.sym]][bucketOf(c.cells.length)] * m * bet);
      stepWin += c.pay;
      for (const i of c.cells) removed[i] = 1;
    }
    if (total + stepWin >= room) {
      stepWin = Math.max(0, room - total);
      out.capped = true;
    }
    total += stepWin;

    const rs = rec ? { clusters, win: stepWin, removed: [], peel: [], moves: [], fills: [], newStars: [] } : null;
    if (rec) for (let i = 0; i < N; i++) if (removed[i]) rs.removed.push(i);
    if (out.capped) {
      if (rec) out.steps.push(rs);
      break;
    }

    if (!persist) {
      for (let i = 0; i < N; i++) {
        if (removed[i] && mat[i] > 0) {
          if (rec) rs.peel.push({ i, v: mat[i] });
          mat[i] = 0;
        }
      }
    }
    collapse(g, removed, rec ? rs.moves : null);
    for (let i = 0; i < N; i++) {
      if (g[i] === EMPTY) {
        fillCell(rng, M, ctx, g, mat, i, rec ? rs.newStars : null);
        if (rec) rs.fills.push({ i, sym: g[i] });
      }
    }
    if (rec) out.steps.push(rs);
  }

  const koiIdx = [];
  const lanternIdx = [];
  const craneIdx = [];
  for (let i = 0; i < N; i++) {
    const s = g[i];
    if (s === SYM.LANTERN) lanternIdx.push(i);
    else if (s === SYM.KOI) koiIdx.push(i);
    else if (s === SYM.CRANE) craneIdx.push(i);
  }
  out.total = total;
  out.lantern = lanternIdx.length;
  out.koi = koiIdx.length;
  out.cranes = craneIdx.length;
  out.koiIdx = koiIdx;
  if (rec) {
    out.lanternIdx = lanternIdx;
    out.craneIdx = craneIdx;
    out.gEnd = Int8Array.from(g);
    out.matEnd = Int16Array.from(mat);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- wish tags
// Five tags hang on the bamboo and three are turned over. The rewards are drawn now, in the order they will be revealed; the
// other two are only for show. Whatever was drawn is applied to the board before the next free spin.
function playPick(rng, M, st, rec) {
  const rewards = [];
  const decoys = [];
  for (let k = 0; k < 3; k++) rewards.push(PICKS[pickFrom(rng, M.pick)].id);
  for (let k = 0; k < 2; k++) decoys.push(PICKS[pickFrom(rng, M.pick)].id);
  const mat = st.mat;
  let bonusSpins = 0;
  const seeded = [];
  const hasStars = () => mat.some((v) => v > 0);
  // With no star on the board, "plus" and "double" plant fresh ones instead of doing nothing.
  const plant = (n) => {
    for (const i of pickCells(rng, new Int8Array(N), n, false)) {
      if (mat[i] === 0) {
        mat[i] = 2;
        seeded.push(i);
      }
    }
  };
  for (const r of rewards) {
    if (r === 'spins') {
      bonusSpins += FREE.retrigger;
    } else if (r === 'plus') {
      if (hasStars()) {
        for (let i = 0; i < N; i++) if (mat[i] > 0) mat[i] = Math.min(STAR_CAP, mat[i] + 2);
      } else plant(3);
    } else if (r === 'double') {
      if (hasStars()) {
        for (let i = 0; i < N; i++) if (mat[i] > 0) mat[i] = Math.min(STAR_CAP, mat[i] * 2);
      } else plant(4);
    } else if (r === 'wilds') {
      st.wildsNext += 3 + rng.int(3);
    }
  }
  const pick = { rewards, decoys, bonusSpins };
  if (rec) {
    pick.matAfter = Int16Array.from(mat);
    pick.wildsNext = st.wildsNext;
    pick.seeded = seeded;
  }
  return pick;
}

// ---------------------------------------------------------------------------------------------------- free spins
export function playFree(rng, M, bet, room, rec, startSpins = FREE.spins) {
  const st = { mat: new Int16Array(N), wildsNext: 0 };
  let left = startSpins;
  let meter = 0;
  let total = 0;
  let played = 0;
  let capped = false;
  const spins = rec ? [] : null;
  while (left > 0 && played < MAX_FREE_SPINS) {
    left--;
    played++;
    const sp = playSpin(rng, M, M.free, st, bet, room - total, rec, true);
    total += sp.total;
    let retrigger = 0;
    if (!sp.capped && sp.lantern >= FREE.scatters) {
      left += FREE.retrigger;
      retrigger = FREE.retrigger;
    }
    const meterBefore = meter;
    meter += sp.cranes;
    const picks = [];
    while (meter >= FREE.meter && !sp.capped) {
      meter -= FREE.meter;
      const p = playPick(rng, M, st, rec);
      left += p.bonusSpins;
      picks.push(p);
    }
    if (rec) spins.push({ ...sp, retrigger, meterBefore, meterAfter: meter, picks, left, index: played });
    if (sp.capped || total >= room) {
      capped = true;
      break;
    }
  }
  return { type: 'free', total, capped, spins, played, startSpins };
}

// ---------------------------------------------------------------------------------------------------- koi pond
// A koi is worth a multiple of the bet. The moon koi is the collector: it lands worth everything already in the pond.
function drawKoi(rng, M, sum) {
  if (sum > 0 && rng.next() < M.sunChance) return { kind: 3, value: sum };
  const kind = pickFrom(rng, M.koiKind);
  return { kind, value: KOI_KINDS[kind].values[pickFrom(rng, M.koiVals[kind])] };
}

export function playPond(rng, M, bet, room, rec, startCells) {
  const kind = new Int8Array(N).fill(-1);
  let sum = 0;
  let filled = 0;
  const start = [];
  for (const i of startCells) {
    const k = drawKoi(rng, M, 0);
    kind[i] = k.kind;
    sum += k.value;
    filled++;
    if (rec) start.push({ i, kind: k.kind, value: k.value });
  }
  let left = POND.respins;
  const respins = rec ? [] : null;
  while (left > 0 && filled < N) {
    const landed = [];
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (kind[i] === -1 && rng.next() < M.pondChance) {
        const k = drawKoi(rng, M, sum);
        kind[i] = k.kind;
        sum += k.value;
        filled++;
        n++;
        if (rec) landed.push({ i, kind: k.kind, value: k.value });
      }
    }
    left = n > 0 ? POND.respins : left - 1;
    if (rec) respins.push({ landed, left });
  }
  let total = Math.round(sum * bet);
  let capped = false;
  if (total >= room) {
    total = Math.max(0, room);
    capped = true;
  }
  return { type: 'pond', total, capped, start, respins, filled, sum };
}

// ---------------------------------------------------------------------------------------------------- a whole round
// `buy` skips the base spin: 'free' starts the free spins, 'pond' starts the Koi Pond on three random cells.
export function playRound(rng, { mode = 'normal', bet = 100, buy = null, record = false, features = true } = {}) {
  const M = machineFor(mode);
  const cap = MAX_WIN * bet;
  const round = { mode, bet, cost: costOf(mode) * bet, buy, win: 0, capped: false, base: null, features: [], lantern: 0, koi: 0 };
  let total = 0;
  const add = (f) => {
    round.features.push(f);
    total += f.total;
    if (f.capped) round.capped = true;
  };

  if (buy === 'free') {
    add(playFree(rng, M, bet, cap, record));
  } else if (buy === 'pond') {
    const cells = pickCells(rng, new Int8Array(N), POND.scatters, false).sort((a, b) => a - b);
    const f = playPond(rng, M, bet, cap, record, cells);
    f.startCells = cells;
    add(f);
  } else {
    const st = { mat: new Int16Array(N), wildsNext: 0 };
    const sp = playSpin(rng, M, M.base, st, bet, cap, record, false);
    if (record) round.base = sp;
    total += sp.total;
    round.capped = sp.capped;
    round.lantern = sp.lantern;
    round.koi = sp.koi;
    if (features && !sp.capped && sp.lantern >= FREE.scatters) add(playFree(rng, M, bet, cap - total, record));
    if (features && !round.capped && sp.koi >= POND.scatters) {
      const f = playPond(rng, M, bet, cap - total, record, sp.koiIdx);
      f.startCells = sp.koiIdx;
      add(f);
    }
  }
  round.win = Math.min(total, cap);
  return round;
}
