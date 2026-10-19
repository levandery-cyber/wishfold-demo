// The figures that do something other than pay: lantern, koi, crane. Same sheet rules as symbols.js.
import { INK, WHITE, circle, figure, line, mirror, path, rotate, sheet } from './kit.js';

const pts = (s) =>
  s
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));

const halo = (id, c1, c2) =>
  `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c1}" stop-opacity=".95"/><stop offset=".55" stop-color="${c2}" stop-opacity=".35"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient></defs>`;

// ---------------------------------------------------------------- scatter A: a glowing paper lantern
export function lanternArt() {
  const pal = { r: sheet(2, 84, 54), g: sheet(44, 96, 56), k: INK };
  const left = [
    ['r.hi', '36,16 50,16 50,30 27,30'],
    ['r.hi', '27,30 50,30 50,48 19,48'],
    ['r.md', '19,48 50,48 50,66 23,66'],
    ['r.lo', '23,66 50,66 50,80 34,80'],
  ];
  return figure(pal, [
    halo('lg', '#fff0b0', '#ffb03a'),
    circle(50, 50, 49, 'url(#lg)'),
    path('M50 3 Q58 3 58 9 Q58 15 50 15', 'none', 'stroke="#e9b53a" stroke-width="2.2" stroke-linecap="round"'),
    ...left,
    ...mirror(left),
    line(27, 30, 73, 30, '#ffd34d', 1.8),
    line(19, 48, 81, 48, '#ffd34d', 1.8),
    line(23, 66, 77, 66, '#ffd34d', 1.8),
    ['k.hi', '36,8 50,8 50,16 36,16'],
    ['k.md', '50,8 64,8 64,16 50,16'],
    ['k.hi', '34,80 50,80 50,87 36,87'],
    ['k.md', '50,80 66,80 64,87 50,87'],
    circle(50, 49, 10, '#ffd34d'),
    circle(50, 49, 6.2, '#d8352a'),
    circle(48.4, 47.4, 2, '#ffe9a8'),
    line(50, 87, 50, 93, '#ffd34d', 2),
    ['g.hi', '45,92 50,92 50,99 44,99'],
    ['g.md', '50,92 55,92 56,99 50,99'],
  ]);
}

// ---------------------------------------------------------------- scatter B and the pond tokens: koi
// kind: 'kohaku' (white with red, the scatter), 'orange' (small), 'ogon' (gold, big), 'moon' (the collector)
export function koiArt(kind = 'kohaku') {
  const body = { kohaku: WHITE, orange: sheet(26, 96, 56), ogon: sheet(45, 98, 56), moon: sheet(212, 46, 80) }[kind];
  const fin = { kohaku: sheet(8, 80, 60), orange: sheet(22, 92, 62), ogon: sheet(42, 96, 62), moon: sheet(212, 40, 88) }[kind];
  const pal = { b: body, f: fin, r: sheet(6, 88, 52), w: WHITE, k: INK, g: sheet(44, 96, 58) };
  const items = [
    // tail
    ['f.hi', '19,50 1,28 11,46'],
    ['f.md', '19,50 11,46 3,51'],
    ['f.md', '19,50 3,51 11,56'],
    ['f.lo', '19,50 11,56 1,72'],
    // fins behind the body
    ['f.lo', '40,64 48,80 57,66'],
    // body
    ['b.hi', '14,50 30,36 56,30 80,36 93,50'],
    ['b.md', '14,50 93,50 80,63 56,69 30,65'],
    ['b.hi', '56,30 80,36 93,50 62,47'],
  ];
  if (kind === 'kohaku') {
    items.push(
      ['r.md', '32,38 56,31 61,43 46,50 33,47'],
      ['r.hi', '32,38 44,34 40,44'],
      ['r.lo', '66,34 79,38 77,49 67,47'],
      ['r.md', '19,47 31,41 31,54 19,53'],
    );
  } else if (kind === 'orange') {
    items.push(['w.md', '30,52 56,51 62,60 40,66'], ['w.lo', '56,51 80,52 74,62 62,60']);
  } else if (kind === 'ogon') {
    items.push(['b.hi', '24,42 50,34 46,43'], ['w.hi', '36,38 44,35 42,40']);
  } else {
    items.push(['g.md', '66,36 76,34 72,40 76,47 66,46 71,41']);
  }
  items.push(
    ['f.md', '36,34 50,17 63,31'],
    ['f.lo', '66,57 58,74 78,62'],
    circle(81, 43, 3.6, '#fff'),
    circle(81.7, 43.3, 2, '#2a2038'),
    path('M92 50 Q97 52 99 58', 'none', 'stroke="#3b2f4d" stroke-width="1.4" stroke-linecap="round"'),
    path('M92 48 Q97 45 98 39', 'none', 'stroke="#3b2f4d" stroke-width="1.4" stroke-linecap="round"'),
  );
  return figure(pal, items);
}

// ---------------------------------------------------------------- collect: a paper crane. `hue` colours the sheet; omit for white.
export function craneArt(hue = null) {
  const sh = hue === null ? WHITE : sheet(hue, 70, 78);
  const pal = { w: sh, k: INK, r: sheet(4, 86, 54), o: sheet(30, 94, 56) };
  return figure(pal, [
    // far wing, then tail, then body
    ['w.dk', '52,50 50,8 80,34'],
    ['w.lo', '24,64 6,40 16,62'],
    ['w.hi', '24,64 6,40 30,58'],
    ['w.hi', '22,66 48,52 50,66'],
    ['w.md', '48,52 72,62 50,66'],
    ['w.lo', '22,66 50,66 50,80'],
    ['w.dk', '50,66 72,62 50,80'],
    // neck and head
    ['w.md', '62,58 84,24 90,31'],
    ['w.lo', '62,58 90,31 74,63'],
    ['w.hi', '82,27 88,16 95,23 90,31'],
    ['r.md', '88,16 95,23 91,25'],
    ['k.lo', '93,23 100,26 92,29'],
    // near wing
    ['w.hi', '44,54 30,6 62,40'],
    ['w.md', '44,54 62,40 67,56'],
    ['k.md', '30,6 37,22 26,21'],
  ]);
}

// ---------------------------------------------------------------- tiny paper coin (square hole), used by the balance
export function coinArt() {
  const pal = { g: sheet(44, 96, 56), k: INK };
  return figure(pal, [
    ['g.hi', '50,4 82,18 96,50 82,82 50,96 18,82 4,50 18,18'],
    ['g.md', '50,4 82,18 96,50 82,82 50,96 50,50'],
    ['g.lo', '50,50 96,50 82,82 50,96'],
    ['g.hi', '50,12 74,24 86,50 50,50 14,50 26,24'],
    ['k.md', '36,36 64,36 64,64 36,64'],
    ['g.md', '40,40 60,40 60,60 40,60'],
  ]);
}

export const SPECIAL_ART = { lantern: lanternArt, koi: () => koiArt('kohaku'), crane: () => craneArt(null), coin: coinArt };
export const _unused = { rotate, pts };
