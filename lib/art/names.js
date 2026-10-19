// Names and lookups the browser needs, without pulling the picture generators into the client bundle.
import { SYMBOLS } from '../engine/config.js';

export const artUrl = (name) => `/art/${name}.svg`;

// Sticker colour follows the size of the multiplier, so a glance tells you how big it is.
export const STAR_HUES = [335, 28, 48, 138, 188, 222, 268, 352, 44];
const STAR_TOP = [2, 4, 6, 9, 14, 24, 49, 99];
export const starBucket = (v) => {
  const i = STAR_TOP.findIndex((t) => v <= t);
  return i < 0 ? STAR_TOP.length : i;
};

// The ten cranes strung on the wish string, one colour each.
export const CRANE_HUES = [330, 28, 48, 138, 188, 222, 268, 352, 160, 300];

// Which picture a board symbol id uses.
export const symArt = (s) => (s <= 9 ? `sym-${SYMBOLS[s].id}` : SYMBOLS[s].id);
