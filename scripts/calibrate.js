// Finds the one knob per wish that brings its return to the target, by bisection on the low-noise estimate.
//
//   node scripts/calibrate.js               all three wishes
//   node scripts/calibrate.js stars         one wish
//
// It only prints values; paste the winners into the TUNE table in lib/engine/config.js, then run `npm run sim -- --estimate`
// with big sample sizes to confirm.
import { TUNE, resetMachines } from '../lib/engine/config.js';
import { estimate } from './simulate.js';

const TARGET = 0.965;
const N = TUNE.normal;

const knobs = {
  // More lanterns and koi, nothing else.
  luck: { range: [1.38, 1.62], apply: (k) => (TUNE.luck.symMul = { 10: k, 11: k }), show: (k) => `symMul {10: ${k.toFixed(3)}, 11: ${k.toFixed(3)}}` },
  // Stars land more often; free spins get a gentler share of the increase because they compound.
  stars: {
    range: [3.8, 5.4],
    apply: (k) => {
      TUNE.stars.star = N.star * k;
      TUNE.stars.starFree = N.starFree * (1 + (k - 1) * 0.35);
    },
    show: (k) => `star ${(N.star * k).toFixed(4)}, starFree ${(N.starFree * (1 + (k - 1) * 0.35)).toFixed(4)}`,
  },
  // More pinwheels, and the crane drops them more often.
  wings: {
    range: [1.9, 2.7],
    apply: (k) => {
      TUNE.wings.symMul = { 9: k };
      TUNE.wings.drop = N.drop * k;
      TUNE.wings.dropFree = N.dropFree * k;
    },
    show: (k) => `symMul {9: ${k.toFixed(3)}}, drop ${(N.drop * k).toFixed(4)}, dropFree ${(N.dropFree * k).toFixed(4)}`,
  },
};

const only = process.argv[2];
for (const mode of Object.keys(knobs)) {
  if (only && only !== mode) continue;
  const knob = knobs[mode];
  let [lo, hi] = knob.range;
  let last = null;
  for (let it = 0; it < 8; it++) {
    const k = (lo + hi) / 2;
    knob.apply(k);
    resetMachines();
    const e = estimate({ mode, baseSpins: 3000000, freeRounds: 150000, pondRounds: 400000, seed: 100 + it });
    last = { k, e };
    console.log(`${mode}  k=${k.toFixed(3)}  RTP ${(e.rtp * 100).toFixed(2)}%`);
    if (e.rtp < TARGET) lo = k;
    else hi = k;
  }
  console.log(`>> ${mode}: ${knob.show(last.k)}   (RTP ${(last.e.rtp * 100).toFixed(2)}%)\n`);
}
