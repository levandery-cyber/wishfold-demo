// Every picture the game uses, by file name. `app/art/[name]/route.js` serves them; nothing is stored as a file.
import { SCENES } from './scenes.js';
import { coinArt, craneArt, koiArt, lanternArt } from './specials.js';
import { SYMBOL_ART, starArt } from './symbols.js';

import { CRANE_HUES, STAR_HUES } from './names.js';
export { CRANE_HUES, STAR_HUES, artUrl, starBucket } from './names.js';

const table = {};
for (const [id, fn] of Object.entries(SYMBOL_ART)) table[`sym-${id}`] = fn;
table.lantern = lanternArt;
table.koi = () => koiArt('kohaku');
for (const k of ['orange', 'kohaku', 'ogon', 'moon']) table[`koi-${k}`] = () => koiArt(k);
table.crane = () => craneArt(null);
CRANE_HUES.forEach((h, i) => (table[`crane-${i}`] = () => craneArt(h)));
STAR_HUES.forEach((h, i) => (table[`star-${i}`] = () => starArt(h, i >= 7)));
table.coin = coinArt;
for (const [id, fn] of Object.entries(SCENES)) table[`scene-${id}`] = fn;

export const ART_NAMES = Object.keys(table).map((n) => `${n}.svg`);

export function renderArt(file) {
  const fn = table[file.replace(/\.svg$/, '')];
  return fn ? fn() : null;
}
