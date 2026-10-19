// Two big characters that sit beside the board. Unlike the tile art these are drawn inline (not through <img>) so CSS can move
// their parts: ears twitch, eyes blink, wings beat. Parts are wrapped in groups with a class.
import { INK, WHITE, circle, facet, mirror, sheet } from './kit.js';

const g = (cls, inner) => `<g class="${cls}">${inner}</g>`;
const poly = (pal, items) => items.map((it) => (typeof it === 'string' ? it : facet(pal, it))).join('');

export function foxMascot() {
  const pal = { o: sheet(24, 94, 56), w: WHITE, k: INK };
  const earL = [
    ['o.md', '9,4 41,31 4,47'],
    ['k.md', '16,15 35,30 10,39'],
  ];
  const faceL = [
    ['o.hi', '4,47 41,31 49,53 22,61'],
    ['w.hi', '4,47 22,61 11,72'],
    ['w.md', '22,61 49,53 49,96 11,72'],
  ];
  return [
    // chest and shoulders: the fox leans over the edge of the frame
    poly(pal, [
      ['o.md', '-6,128 6,92 30,84 50,118 70,84 94,92 106,128'],
      ['w.hi', '30,84 50,96 70,84 50,118'],
      ['w.md', '30,84 50,118 38,128 14,128 20,100'],
      ['w.lo', '70,84 50,118 62,128 86,128 80,100'],
    ]),
    g('fox-ear-l', poly(pal, earL)),
    g('fox-ear-r', poly(pal, mirror(earL))),
    poly(pal, [
      ...faceL,
      ...mirror(faceL),
      ['o.md', '41,31 59,31 50,53'],
      ['k.lo', '43,83 57,83 50,93'],
      ['k.hi', '4,47 12,52 5,58'],
      ['k.lo', '96,47 88,52 95,58'],
    ]),
    g(
      'fox-eyes',
      poly(pal, [
        ['k.md', '23,49 39,54 30,60'],
        ['k.md', '77,49 61,54 70,60'],
      ]) +
        circle(31, 55, 1.6, '#fff') +
        circle(69, 55, 1.6, '#fff'),
    ),
  ].join('');
}

export function craneMascot() {
  const pal = { w: WHITE, k: INK, r: sheet(4, 86, 54) };
  return [
    g('crane-wing-far', poly(pal, [['w.dk', '52,50 50,8 80,34']])),
    poly(pal, [
      ['w.lo', '24,64 6,40 16,62'],
      ['w.hi', '24,64 6,40 30,58'],
      ['w.hi', '22,66 48,52 50,66'],
      ['w.md', '48,52 72,62 50,66'],
      ['w.lo', '22,66 50,66 50,80'],
      ['w.dk', '50,66 72,62 50,80'],
      ['w.md', '62,58 84,24 90,31'],
      ['w.lo', '62,58 90,31 74,63'],
      ['w.hi', '82,27 88,16 95,23 90,31'],
      ['r.md', '88,16 95,23 91,25'],
      ['k.lo', '93,23 100,26 92,29'],
    ]),
    g(
      'crane-wing-near',
      poly(pal, [
        ['w.hi', '44,54 30,6 62,40'],
        ['w.md', '44,54 62,40 67,56'],
        ['k.md', '30,6 37,22 26,21'],
      ]),
    ),
  ].join('');
}
