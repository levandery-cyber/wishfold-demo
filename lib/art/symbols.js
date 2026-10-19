// The nine figures that pay in clusters, plus the pinwheel wild and the lucky star sticker.
// Each is a 100 x 100 svg, lit from the top left, with no text inside (labels are layered on in CSS).
import { INK, WHITE, circle, ellipse, figure, mirror, ngon, path, rotate, sheet } from './kit.js';

const pts = (s) =>
  s
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));

// ---------------------------------------------------------------- 0 boat
function boat() {
  const pal = { t: sheet(176, 72, 46), w: WHITE };
  return figure(pal, [
    ['t.hi', '50,8 10,62 50,62'],
    ['t.lo', '50,8 50,62 90,62'],
    ['t.md', '6,62 50,62 50,84 24,84'],
    ['t.dk', '50,62 94,62 76,84 50,84'],
    ['w.md', '6,62 50,62 50,68 9,68'],
    ['w.lo', '50,62 94,62 91,68 50,68'],
    ['t.hi', '50,8 62,4 50,20'],
  ]);
}

// ---------------------------------------------------------------- 1 plane
function plane() {
  const pal = { b: sheet(210, 90, 58), w: WHITE };
  const items = [
    ['b.hi', '50,4 8,70 47,62'],
    ['b.lo', '50,4 92,70 53,62'],
    ['b.md', '50,4 47,62 50,94'],
    ['b.dk', '50,4 53,62 50,94'],
    ['w.hi', '8,70 47,62 40,72'],
    ['w.md', '92,70 53,62 60,72'],
  ].map(([k, p]) => [k, rotate(pts(p), 50, 50, 28)]);
  return figure(pal, items);
}

// ---------------------------------------------------------------- 2 sakura
function sakura() {
  const pal = { p: sheet(338, 88, 70), m: sheet(332, 84, 44), y: sheet(46, 96, 60) };
  // A petal is a broad kite with a notch at the tip, cut into a lit half and a shaded half.
  const left = pts('50,50 33,34 31,14 43,9 50,19');
  const right = pts('50,50 50,19 57,9 69,14 67,34');
  const items = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 72;
    const lit = i === 0 || i === 4 || i === 1;
    items.push([lit ? 'p.hi' : 'p.md', rotate(left, 50, 50, a)]);
    items.push([lit ? 'p.md' : 'p.lo', rotate(right, 50, 50, a)]);
  }
  items.push(['m.md', ngon(50, 50, 13, 5, 0)]);
  items.push(['y.hi', ngon(50, 50, 8, 5, 36)]);
  items.push(circle(50, 50, 3.4, '#ffe27a'));
  return figure(pal, items);
}

// ---------------------------------------------------------------- 3 duckling
function duck() {
  const pal = { y: sheet(48, 98, 60), o: sheet(26, 96, 56), k: INK };
  return figure(pal, [
    ['y.hi', '50,8 18,20 6,52 20,86 50,94'],
    ['y.md', '50,8 82,20 94,52 80,86 50,94'],
    ['y.hi', '32,15 68,15 50,42'],
    ['y.lo', '20,86 50,94 80,86 50,72'],
    ['y.md', '44,11 47,0 50,11'],
    ['y.hi', '50,11 53,0 57,11'],
    ['o.hi', '37,52 63,52 50,60'],
    ['o.md', '37,52 63,52 50,72'],
    ['o.lo', '45,62 55,62 50,72'],
    circle(33, 44, 5.6, '#2a2038'),
    circle(67, 44, 5.6, '#2a2038'),
    circle(31.4, 42.2, 1.9, '#fff'),
    circle(65.4, 42.2, 1.9, '#fff'),
    ellipse(22, 58, 7, 4.5, '#ff8aa8', 'opacity=".55"'),
    ellipse(78, 58, 7, 4.5, '#ff8aa8', 'opacity=".55"'),
  ]);
}

// ---------------------------------------------------------------- 4 frog
function frog() {
  const pal = { g: sheet(104, 64, 50), k: INK, w: WHITE };
  return figure(pal, [
    ['g.hi', '50,34 14,38 3,58 14,84 50,90'],
    ['g.md', '50,34 86,38 97,58 86,84 50,90'],
    ['g.lo', '14,84 50,90 86,84 50,74'],
    ['g.hi', '30,40 70,40 50,60'],
    ['g.hi', ngon(27, 29, 17, 8, 22)],
    ['g.md', ngon(73, 29, 17, 8, 22)],
    ['w.md', ngon(27, 29, 11, 8, 22)],
    ['w.md', ngon(73, 29, 11, 8, 22)],
    circle(29, 31, 5.8, '#2a2038'),
    circle(71, 31, 5.8, '#2a2038'),
    circle(30.8, 29, 2, '#fff'),
    circle(72.8, 29, 2, '#fff'),
    path('M20 64 Q50 86 80 64', 'none', 'stroke="#2e6b2a" stroke-width="2.6" stroke-linecap="round"'),
    circle(44, 52, 1.8, '#2e6b2a'),
    circle(56, 52, 1.8, '#2e6b2a'),
    ellipse(17, 66, 6, 4, '#ff8aa8', 'opacity=".5"'),
    ellipse(83, 66, 6, 4, '#ff8aa8', 'opacity=".5"'),
  ]);
}

// ---------------------------------------------------------------- 5 butterfly
function butterfly() {
  const pal = { v: sheet(268, 78, 58), a: sheet(32, 96, 58), k: INK, y: sheet(48, 98, 62) };
  const left = [
    ['v.hi', '47,46 12,6 3,34'],
    ['v.md', '47,46 3,34 30,60'],
    ['a.md', '47,54 28,62 18,92'],
    ['a.lo', '47,54 18,92 46,82'],
    ['y.hi', '24,26 31,24 28,32'],
  ];
  return figure(pal, [
    ...left,
    ...mirror(left),
    circle(21, 31, 4, '#ffe27a'),
    circle(79, 31, 4, '#ffd34d'),
    circle(33, 77, 3.2, '#ffe27a'),
    circle(67, 77, 3.2, '#ffd34d'),
    ['k.md', '45,28 55,28 56,72 50,86 44,72'],
    ['k.hi', '45,28 50,28 50,86 44,72'],
    path('M48 28 Q42 14 34 10', 'none', 'stroke="#3b2f4d" stroke-width="1.8" stroke-linecap="round"'),
    path('M52 28 Q58 14 66 10', 'none', 'stroke="#3b2f4d" stroke-width="1.8" stroke-linecap="round"'),
    circle(34, 10, 2.6, '#3b2f4d'),
    circle(66, 10, 2.6, '#3b2f4d'),
  ]);
}

// ---------------------------------------------------------------- 6 kabuto (a folded samurai helmet)
function kabuto() {
  const pal = { r: sheet(2, 82, 52), g: sheet(44, 96, 56), k: INK };
  return figure(pal, [
    ['r.lo', '15,60 2,46 3,72'],
    ['r.dk', '85,60 98,46 97,72'],
    ['r.hi', '14,66 19,38 36,18 50,12 44,66'],
    ['r.md', '50,12 56,66 44,66'],
    ['r.lo', '50,12 64,18 81,38 86,66 56,66'],
    ['g.hi', '28,5 50,24 50,19 36,10'],
    ['g.md', '72,5 50,24 50,19 64,10'],
    ['g.hi', '8,64 50,64 50,73 14,73'],
    ['g.lo', '50,64 92,64 86,73 50,73'],
    ['r.md', '14,73 50,73 50,92 5,92'],
    ['r.dk', '50,73 86,73 95,92 50,92'],
    ['g.md', '11,80 50,80 50,82.5 10,82.5'],
    ['g.lo', '50,80 89,80 90,82.5 50,82.5'],
    circle(50, 42, 7.5, '#ffd34d'),
    circle(50, 42, 3.2, '#d8352a'),
  ]);
}

// ---------------------------------------------------------------- 7 fox
function fox() {
  const pal = { o: sheet(24, 94, 56), w: WHITE, k: INK };
  const left = [
    ['o.md', '9,4 41,31 4,47'],
    ['k.md', '16,15 35,30 10,39'],
    ['o.hi', '4,47 41,31 49,53 22,61'],
    ['w.hi', '4,47 22,61 11,72'],
    ['w.md', '22,61 49,53 49,96 11,72'],
  ];
  return figure(pal, [
    ...left,
    ...mirror(left),
    ['o.md', '41,31 59,31 50,53'],
    ['k.lo', '43,83 57,83 50,93'],
    ['k.md', '23,49 39,54 30,60'],
    ['k.md', '77,49 61,54 70,60'],
    circle(31, 55, 1.6, '#fff'),
    circle(69, 55, 1.6, '#fff'),
    ['k.hi', '4,47 12,52 5,58'],
    ['k.lo', '96,47 88,52 95,58'],
  ]);
}

// ---------------------------------------------------------------- 8 panda
function panda() {
  const pal = { w: WHITE, k: INK };
  const head = ngon(50, 56, 40, 10, 18);
  const fan = [];
  const tones = ['md', 'lo', 'lo', 'lo', 'lo', 'md', 'hi', 'hi', 'hi', 'md'];
  for (let i = 0; i < 10; i++) fan.push([`w.${tones[i]}`, [[50, 56], head[i], head[(i + 1) % 10]]]);
  return figure(pal, [
    ['k.md', ngon(22, 22, 15, 6, 0)],
    ['k.lo', ngon(78, 22, 15, 6, 0)],
    ['w.md', ngon(22, 22, 7, 6, 0)],
    ['w.lo', ngon(78, 22, 7, 6, 0)],
    ...fan,
    ['k.md', '17,52 32,42 45,53 37,68 24,63'],
    ['k.lo', '83,52 68,42 55,53 63,68 76,63'],
    circle(34, 54, 3.2, '#fff'),
    circle(66, 54, 3.2, '#fff'),
    circle(34.6, 54.4, 1.7, '#2a2038'),
    circle(65.4, 54.4, 1.7, '#2a2038'),
    ['k.lo', '44,66 56,66 50,73'],
    path('M42 77 Q46 82 50 77 Q54 82 58 77', 'none', 'stroke="#3b2f4d" stroke-width="2" stroke-linecap="round"'),
    ellipse(27, 72, 6, 4, '#ff8aa8', 'opacity=".5"'),
    ellipse(73, 72, 6, 4, '#ff8aa8', 'opacity=".5"'),
  ]);
}

// ---------------------------------------------------------------- wild: pinwheel
function pinwheel() {
  const cols = [sheet(4, 90, 56), sheet(48, 96, 58), sheet(176, 70, 46), sheet(322, 84, 62)];
  const items = [];
  const pal = {};
  cols.forEach((c, i) => (pal['c' + i] = c));
  for (let i = 0; i < 4; i++) {
    const a = i * 90;
    items.push([`c${i}.md`, rotate(pts('50,50 50,6 94,6'), 50, 50, a)]);
    items.push([`c${i}.hi`, rotate(pts('50,50 50,6 70,28'), 50, 50, a)]);
    items.push([`c${i}.lo`, rotate(pts('50,50 94,6 66,48'), 50, 50, a)]);
  }
  items.push(circle(50, 50, 7, '#ffd34d'));
  items.push(circle(48, 48, 3, '#fff6c8'));
  return figure(pal, items);
}

// ---------------------------------------------------------------- multiplier sticker: a puffy lucky star
export function starArt(hue = 335, shine = false) {
  const pal = { s: sheet(hue, 86, 58), w: WHITE };
  const tips = ngon(50, 52, 47, 5, 0);
  const valleys = ngon(50, 52, 24, 5, 36);
  const items = [];
  for (let i = 0; i < 5; i++) {
    const t = tips[i];
    const v = valleys[i];
    const pv = valleys[(i + 4) % 5];
    items.push([i === 0 || i === 4 ? 's.hi' : 's.md', [[50, 52], pv, t]]);
    items.push([i === 0 || i === 1 ? 's.md' : 's.lo', [[50, 52], t, v]]);
  }
  items.push(['w.hi', ngon(50, 52, 16, 5, 36)]);
  if (shine) {
    // the biggest stickers wear a little gold: a ring and four sparkles
    items.push(path('M50 4 L52.5 11 L60 13.5 L52.5 16 L50 23 L47.5 16 L40 13.5 L47.5 11 Z', '#fff6c8', 'opacity=".95"'));
    items.push(circle(88, 30, 3.2, '#fff6c8'), circle(12, 34, 2.6, '#fff6c8'));
  }
  return figure(pal, items);
}

export const SYMBOL_ART = { boat, plane, sakura, duck, frog, butterfly, kabuto, fox, panda, wild: pinwheel };
