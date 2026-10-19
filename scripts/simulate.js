// Monte Carlo for the maths. Plays real rounds through the real engine with a fast seeded rng and prints what the config adds up to.
//
//   node scripts/simulate.js                       every mode, 400k rounds each
//   node scripts/simulate.js --mode stars --rounds 2000000
//   node scripts/simulate.js --buy free            average payout of a bought bonus, in x bet
//   node scripts/simulate.js --json                machine-readable, for the calibration scripts
import { costOf, MODES } from '../lib/engine/config.js';
import { fastRng } from '../lib/engine/rng.js';
import { playRound } from '../lib/engine/round.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

export function simulate({ mode = 'normal', rounds = 400000, seed = 1, buy = null, bet = 100 }) {
  const rng = fastRng(seed);
  const s = {
    mode,
    buy,
    rounds,
    win: 0,
    cost: 0,
    base: 0,
    free: 0,
    pond: 0,
    hits: 0,
    triggersFree: 0,
    triggersPond: 0,
    retriggers: 0,
    picks: 0,
    freeSpins: 0,
    capped: 0,
    max: 0,
    sq: 0,
    over: { 1: 0, 10: 0, 100: 0, 1000: 0 },
  };
  const t0 = Date.now();
  for (let n = 0; n < rounds; n++) {
    const r = playRound(rng, { mode, bet, buy, record: false });
    const w = r.win / bet;
    s.win += w;
    s.cost += buy ? 1 : costOf(mode);
    s.sq += w * w;
    if (w > s.max) s.max = w;
    if (r.capped) s.capped++;
    if (w > 0) s.hits++;
    for (const k of Object.keys(s.over)) if (w >= +k) s.over[k]++;
    let feat = 0;
    for (const f of r.features) {
      feat += f.total / bet;
      if (f.type === 'free') {
        s.triggersFree++;
        s.freeWin = (s.freeWin || 0) + f.total / bet;
        s.free += f.total / bet;
        s.freeSpins += f.played;
        if (f.played > f.startSpins) s.retriggers++;
      } else {
        s.triggersPond++;
        s.pond += f.total / bet;
      }
    }
    s.base += w - feat;
  }
  s.seconds = (Date.now() - t0) / 1000;
  s.rtp = s.win / s.cost;
  s.mean = s.win / rounds;
  s.sd = Math.sqrt(Math.max(0, s.sq / rounds - s.mean * s.mean));
  return s;
}

// A low-noise estimate of the return. Rounds that start a bonus are rare and their payouts are huge, so playing them inline makes
// the total jumpy. Instead: measure the base spin and the chance of each trigger on many cheap spins with the bonuses switched off,
// measure what each bonus pays on its own (a bought bonus), and combine them.
export function estimate({ mode = 'normal', baseSpins = 3000000, freeRounds = 200000, pondRounds = 600000, seed = 5, bet = 100 }) {
  const rng = fastRng(seed);
  let base = 0;
  let pFree = 0;
  let pPond = 0;
  let hits = 0;
  for (let n = 0; n < baseSpins; n++) {
    const r = playRound(rng, { mode, bet, features: false });
    base += r.win / bet;
    if (r.win > 0) hits++;
    if (r.lantern >= 3) pFree++;
    if (r.koi >= 3) pPond++;
  }
  base /= baseSpins;
  pFree /= baseSpins;
  pPond /= baseSpins;
  const free = simulate({ mode, rounds: freeRounds, seed: seed + 1, buy: 'free', bet });
  const pond = simulate({ mode, rounds: pondRounds, seed: seed + 2, buy: 'pond', bet });
  const cost = costOf(mode);
  const rtp = (base + pFree * free.mean + pPond * pond.mean) / cost;
  return {
    mode,
    cost,
    rtp,
    base,
    pFree,
    pPond,
    hit: hits / baseSpins,
    freeEv: free.mean,
    pondEv: pond.mean,
    freeSd: free.sd,
    pondSd: pond.sd,
    shares: { base: base / cost, free: (pFree * free.mean) / cost, pond: (pPond * pond.mean) / cost },
    buyFree: free.mean / 0.96,
    buyPond: pond.mean / 0.96,
    freeSpins: free.freeSpins / free.rounds,
    freeCapped: free.capped / free.rounds,
  };
}

const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;

function print(s) {
  const per = (x) => x / s.rounds;
  console.log(`\n== ${s.mode}${s.buy ? ` · buy ${s.buy}` : ''} · ${s.rounds.toLocaleString()} rounds in ${s.seconds.toFixed(1)}s`);
  if (s.buy) {
    console.log(
      `   average payout ${s.mean.toFixed(2)} x bet   (price at 96% = ${(s.mean / 0.96).toFixed(1)} x)   sd ${s.sd.toFixed(1)}   max ${s.max.toFixed(0)}   capped ${s.capped}`,
    );
    return;
  }
  console.log(`   RTP ${pct(s.rtp)}   (cost ${costOf(s.mode)} x bet)   sd ${s.sd.toFixed(2)}   max ${s.max.toFixed(0)}   capped ${s.capped}`);
  console.log(`   share of return   base ${pct((per(s.base) / s.cost) * s.rounds, 1)}   free ${pct(s.free / s.cost, 1)}   pond ${pct(s.pond / s.cost, 1)}`);
  console.log(
    `   hit rate ${pct(s.hits / s.rounds, 1)}   1 in ${(s.rounds / Math.max(1, s.triggersFree)).toFixed(0)} free   1 in ${(s.rounds / Math.max(1, s.triggersPond)).toFixed(0)} pond`,
  );
  console.log(
    `   avg free ${(s.free / Math.max(1, s.triggersFree)).toFixed(1)} x (${(s.freeSpins / Math.max(1, s.triggersFree)).toFixed(1)} spins, ${pct(s.retriggers / Math.max(1, s.triggersFree), 0)} retrigger)   avg pond ${(s.pond / Math.max(1, s.triggersPond)).toFixed(1)} x`,
  );
  console.log(
    `   wins >= 1x ${pct(s.over[1] / s.rounds, 1)}   >= 10x ${pct(s.over[10] / s.rounds, 2)}   >= 100x ${pct(s.over[100] / s.rounds, 3)}   >= 1000x ${pct(s.over[1000] / s.rounds, 4)}`,
  );
}

function printEstimate(e) {
  console.log(`\n== ${e.mode}  RTP ${pct(e.rtp)}   (cost ${e.cost} x bet, hit rate ${pct(e.hit, 1)})`);
  console.log(`   base ${pct(e.shares.base, 1)}   free ${pct(e.shares.free, 1)}   pond ${pct(e.shares.pond, 1)}`);
  console.log(
    `   free: 1 in ${(1 / e.pFree).toFixed(0)}, pays ${e.freeEv.toFixed(1)} x (sd ${e.freeSd.toFixed(0)}, ${e.freeSpins.toFixed(1)} spins, capped ${pct(e.freeCapped, 2)})  buy at ${e.buyFree.toFixed(1)} x`,
  );
  console.log(`   pond: 1 in ${(1 / e.pPond).toFixed(0)}, pays ${e.pondEv.toFixed(1)} x (sd ${e.pondSd.toFixed(0)})  buy at ${e.buyPond.toFixed(1)} x`);
}

if (process.argv[1] && process.argv[1].endsWith('simulate.js')) {
  const rounds = +arg('rounds', 400000);
  const seed = +arg('seed', 1);
  const buy = arg('buy', null);
  const modes = arg('mode', null) ? [arg('mode')] : MODES.map((m) => m.id);
  const json = arg('json', false);
  if (arg('estimate', false)) {
    const out = modes.map((mode) =>
      estimate({ mode, baseSpins: +arg('base', 3000000), freeRounds: +arg('free', 200000), pondRounds: +arg('pond', 600000), seed }),
    );
    if (json) console.log(JSON.stringify(out));
    else out.forEach(printEstimate);
    process.exit(0);
  }
  const all = modes.map((mode) => simulate({ mode, rounds, seed, buy: buy === true ? 'free' : buy }));
  if (json) console.log(JSON.stringify(all));
  else all.forEach(print);
}
