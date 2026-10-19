// What the maths adds up to. These numbers are MEASURED, not promised: `npm run sim -- --estimate` plays the real engine and prints
// them, and lib/engine/config.js is tuned until they land where they should. Rerun it after touching any weight or pay.
//
// buy:   price of a bought bonus, in x bet. It is the bonus's average payout divided by 0.96 and rounded to the nearest 5.
// rtp:   return to player for a normal round in that mode, as a fraction.
// every: how many spins on average between triggers.
export const RTP = {
  normal: { rtp: 0.965, vol: 'Medium' },
  luck: { rtp: 0.965, vol: 'Medium-high' },
  stars: { rtp: 0.965, vol: 'High' },
  wings: { rtp: 0.965, vol: 'Medium' },
};

export const BUY = {
  normal: { free: 100, pond: 95 },
  luck: { free: 100, pond: 95 },
  stars: { free: 115, pond: 95 },
  wings: { free: 105, pond: 95 },
};

export const FREQ = { free: 330, pond: 440 };

export const priceOf = (mode, kind) => (BUY[mode] || BUY.normal)[kind];
