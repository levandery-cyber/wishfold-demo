// Backdrops: layered paper-cut landscapes. Each layer is a sheet of paper lying on the one behind it and casts a soft shadow up
// onto it, which is all it takes to make flat shapes read as depth. Everything is seeded, so a scene is identical on every load.
import { mulberry32 } from '../prng.js';
import { f1 } from './kit.js';

const W = 1600;
const H = 900;

const FILTER = `<filter id="sh" x="-5%" y="-20%" width="110%" height="140%"><feDropShadow dx="0" dy="-7" stdDeviation="8" flood-color="#241046" flood-opacity=".3"/></filter>
<filter id="sh2" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#241046" flood-opacity=".28"/></filter>`;

// A ridge: a few sines with random phases, smoothed with quadratic curves, closed along the bottom edge.
function ridge(rng, { y, amp, waves = 3, color, step = 40, fade = null }) {
  const comps = Array.from({ length: waves }, (_, i) => ({ f: (0.0026 + rng() * 0.004) * (i + 1), a: amp / (i + 1.2), p: rng() * 6.28 }));
  const pts = [];
  for (let x = -step; x <= W + step; x += step) {
    let v = y;
    for (const c of comps) v += Math.sin(x * c.f + c.p) * c.a;
    pts.push([x, v]);
  }
  let d = `M${f1(pts[0][0])} ${H + 20} L${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(mx)} ${f1(my)}`;
  }
  d += ` L${W + step} ${H + 20} Z`;
  return { d, pts, svg: `<path d="${d}" fill="${fade ? 'url(#' + fade + ')' : color}" filter="url(#sh)"/>` };
}

// An origami pine: three stacked triangles.
function pine(x, y, s, a, b) {
  const t = (cx, cy, w, h, fill) => `<polygon points="${f1(cx)},${f1(cy - h)} ${f1(cx - w / 2)},${f1(cy)} ${f1(cx + w / 2)},${f1(cy)}" fill="${fill}"/>`;
  return (
    `<rect x="${f1(x - s * 0.05)}" y="${f1(y - s * 0.12)}" width="${f1(s * 0.1)}" height="${f1(s * 0.14)}" fill="${b}"/>` +
    t(x, y - s * 0.08, s * 0.62, s * 0.4, a) +
    t(x, y - s * 0.32, s * 0.5, s * 0.36, a) +
    t(x, y - s * 0.55, s * 0.36, s * 0.34, a)
  );
}

const cloud = (x, y, s, fill = '#ffffff') =>
  `<g filter="url(#sh2)" fill="${fill}" opacity=".96"><circle cx="${x}" cy="${y}" r="${f1(s * 0.5)}"/><circle cx="${f1(x + s * 0.5)}" cy="${f1(y - s * 0.2)}" r="${f1(s * 0.62)}"/><circle cx="${f1(x + s * 1.1)}" cy="${y}" r="${f1(s * 0.48)}"/><rect x="${x}" y="${y}" width="${f1(s * 1.1)}" height="${f1(s * 0.5)}"/></g>`;

const disc = (cx, cy, r, fill, o = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${o}"/>`;

// A five-petal blossom, drawn as one ten-point polygon plus a centre.
function blossom(x, y, r, rot, fill, core) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * 0.52;
    p.push(`${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}`);
  }
  return `<polygon points="${p.join(' ')}" fill="${fill}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 0.2)}" fill="${core}"/>`;
}

// A flowering branch growing from (x, y) in direction `dir` degrees.
function branch(rng, x, y, dir, len, w, out, depth = 0) {
  const a = (dir * Math.PI) / 180;
  const bend = (rng() - 0.5) * 0.8;
  const x2 = x + Math.cos(a) * len;
  const y2 = y + Math.sin(a) * len;
  const cx = x + Math.cos(a + bend) * len * 0.55;
  const cy = y + Math.sin(a + bend) * len * 0.55;
  out.wood.push(
    `<path d="M${f1(x)} ${f1(y)} Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" stroke="#6a3d2a" stroke-width="${f1(w)}" stroke-linecap="round" fill="none"/>`,
  );
  if (depth >= 3 || len < 40) {
    for (let i = 0; i < 4; i++) out.blooms.push([x2 + (rng() - 0.5) * 50, y2 + (rng() - 0.5) * 50, 9 + rng() * 9, rng() * 72]);
    return;
  }
  const kids = depth === 0 ? 3 : 2;
  for (let k = 0; k < kids; k++) branch(rng, x2, y2, dir + (rng() - 0.5) * 90, len * (0.62 + rng() * 0.15), w * 0.66, out, depth + 1);
  for (let i = 0; i < 3; i++) out.blooms.push([(x + x2) / 2 + (rng() - 0.5) * 40, (y + y2) / 2 + (rng() - 0.5) * 40, 8 + rng() * 8, rng() * 72]);
}

function sakuraBranch(seed, x, y, dir, len, pal) {
  const rng = mulberry32(seed);
  const out = { wood: [], blooms: [] };
  branch(rng, x, y, dir, len, 16, out);
  const blooms = out.blooms.map(([bx, by, r, rot], i) => blossom(bx, by, r, rot, pal[i % pal.length], '#ffd34d')).join('');
  return `<g filter="url(#sh2)">${out.wood.join('')}${blooms}</g>`;
}

const frame = (inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${FILTER}${defs}</defs>${inner}</svg>`;

const lin = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rad = (id, stops) =>
  `<radialGradient id="${id}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;

// ------------------------------------------------------------------------------------------------ dawn: the base game
function dawn() {
  const rng = mulberry32(11);
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  // sun: concentric paper discs
  parts.push(disc(1180, 300, 270, '#fff0c9', 0.28), disc(1180, 300, 205, '#ffe9b0', 0.4), disc(1180, 300, 140, '#ffdf8f', 0.7), disc(1180, 300, 92, '#fff6d6'));
  parts.push(cloud(120, 210, 120), cloud(560, 130, 90), cloud(980, 520, 100, '#fff5ea'), cloud(1350, 120, 80));
  const layers = [
    { y: 560, amp: 46, c: '#c4ecd8' },
    { y: 640, amp: 52, c: '#93dcbc' },
    { y: 720, amp: 44, c: '#5fc7a3' },
    { y: 800, amp: 36, c: '#2fa88f' },
    { y: 870, amp: 22, c: '#1c8774' },
  ];
  layers.forEach((l, i) => {
    const r = ridge(rng, { y: l.y, amp: l.amp, color: l.c });
    parts.push(r.svg);
    if (i === 1 || i === 2) {
      const dark = i === 1 ? '#3bb58c' : '#1f8f78';
      for (let k = 0; k < 9; k++) {
        const px = 60 + k * 190 + rng() * 80;
        const near = r.pts.reduce((b, p) => (Math.abs(p[0] - px) < Math.abs(b[0] - px) ? p : b));
        parts.push(pine(px, near[1] + 8, 60 + rng() * 40 + i * 14, dark, '#8a5a3a'));
      }
    }
  });
  parts.push(sakuraBranch(5, -20, 60, 18, 330, ['#ff8fb8', '#ffb3cf', '#ff6fa6']));
  parts.push(sakuraBranch(9, W + 20, 40, 160, 300, ['#ffb3cf', '#ff8fb8', '#ffd0e1']));
  const defs = lin('sky', [
    [0, '#6fcbff'],
    [0.5, '#b9e6ff'],
    [0.82, '#ffe6c9'],
    [1, '#ffd3b0'],
  ]);
  return frame(parts.join(''), defs);
}

// ------------------------------------------------------------------------------------------------ night: free spins
function night() {
  const rng = mulberry32(23);
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  for (let i = 0; i < 70; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.62;
    const r = 1 + rng() * 2.4;
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#fff6d8" opacity="${f1(0.4 + rng() * 0.6)}"/>`);
  }
  parts.push(disc(330, 250, 230, '#fff0c9', 0.12), disc(330, 250, 170, '#fff0c9', 0.2), disc(330, 250, 112, '#fff6d6'));
  parts.push(disc(300, 228, 22, '#f1e3b4', 0.6), disc(360, 280, 14, '#f1e3b4', 0.5), disc(318, 300, 9, '#f1e3b4', 0.5));
  const layers = [
    { y: 600, amp: 46, c: '#6a46ad' },
    { y: 680, amp: 50, c: '#53399a' },
    { y: 760, amp: 40, c: '#3d2b82' },
    { y: 830, amp: 26, c: '#2a1f66' },
  ];
  layers.forEach((l, i) => {
    const r = ridge(rng, { y: l.y, amp: l.amp, color: l.c });
    parts.push(r.svg);
    if (i < 3) {
      for (let k = 0; k < 8; k++) {
        const px = 40 + k * 205 + rng() * 90;
        const near = r.pts.reduce((b, p) => (Math.abs(p[0] - px) < Math.abs(b[0] - px) ? p : b));
        parts.push(pine(px, near[1] + 8, 56 + rng() * 40 + i * 14, ['#4a3190', '#392a7d', '#2a2063'][i], '#1d1448'));
      }
    }
  });
  // hanging lanterns with a glow
  const cols = ['#ff4b3e', '#ff8a2a', '#ffc21f', '#ff5f7e'];
  for (let i = 0; i < 11; i++) {
    const x = 70 + i * 146 + (rng() - 0.5) * 50;
    const drop = 80 + rng() * 150;
    const r = 18 + rng() * 14;
    const c = cols[i % cols.length];
    parts.push(
      `<line x1="${f1(x)}" y1="-10" x2="${f1(x)}" y2="${f1(drop)}" stroke="#e9c26a" stroke-width="2" opacity=".8"/>`,
      `<circle cx="${f1(x)}" cy="${f1(drop + r)}" r="${f1(r * 3)}" fill="url(#glow)" opacity=".75"/>`,
      `<g filter="url(#sh2)"><ellipse cx="${f1(x)}" cy="${f1(drop + r)}" rx="${f1(r * 0.82)}" ry="${f1(r)}" fill="${c}"/><rect x="${f1(x - r * 0.4)}" y="${f1(drop - 2)}" width="${f1(r * 0.8)}" height="5" fill="#3b2a4d"/><rect x="${f1(x - r * 0.4)}" y="${f1(drop + r * 2 - 3)}" width="${f1(r * 0.8)}" height="5" fill="#3b2a4d"/></g>`,
    );
  }
  const defs =
    lin('sky', [
      [0, '#14113a'],
      [0.55, '#35267e'],
      [0.85, '#8a4cb8'],
      [1, '#ff8fb5'],
    ]) +
    rad('glow', [
      [0, '#ffd27a', 0.9],
      [1, '#ff8a2a', 0],
    ]);
  return frame(parts.join(''), defs);
}

// ------------------------------------------------------------------------------------------------ pond: the koi bonus, seen from above
function pond() {
  const rng = mulberry32(37);
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#water)"/>`);
  for (let i = 0; i < 16; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 70 + rng() * 170;
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#7be6e0" opacity="${f1(0.06 + rng() * 0.07)}"/>`);
  }
  for (let i = 0; i < 10; i++) {
    const x = rng() * W;
    const y = rng() * H;
    for (let k = 1; k <= 3; k++)
      parts.push(
        `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${k * 42}" ry="${k * 16}" fill="none" stroke="#d9fffb" stroke-opacity="${f1(0.28 - k * 0.07)}" stroke-width="3"/>`,
      );
  }
  const pad = (x, y, r, rot, g1, g2) => {
    const a0 = rot;
    const a1 = rot + 28;
    const p = (a) => `${f1(x + Math.cos((a * Math.PI) / 180) * r)} ${f1(y + Math.sin((a * Math.PI) / 180) * r)}`;
    return `<g filter="url(#sh2)"><path d="M${f1(x)} ${f1(y)} L${p(a1)} A${r} ${r} 0 1 1 ${p(a0)} Z" fill="${g1}"/><path d="M${f1(x)} ${f1(y)} L${p(a1 + 60)} A${r} ${r} 0 0 1 ${p(a1 + 150)} Z" fill="${g2}" opacity=".55"/></g>`;
  };
  const spots = [
    [90, 120],
    [250, 780],
    [1500, 140],
    [1380, 760],
    [60, 470],
    [1540, 470],
    [760, 60],
    [820, 850],
    [420, 70],
    [1180, 860],
  ];
  spots.forEach(([x, y], i) => parts.push(pad(x, y, 50 + (i % 3) * 14, rng() * 360, '#3dbb6e', '#7bdc8f')));
  [
    [160, 640],
    [1450, 600],
    [1500, 300],
    [120, 260],
  ].forEach(([x, y], i) => {
    for (let k = 0; k < 8; k++) {
      const a = k * 45 + i * 12;
      parts.push(
        `<polygon points="${f1(x)},${f1(y)} ${f1(x + Math.cos(((a - 16) * Math.PI) / 180) * 46)},${f1(y + Math.sin(((a - 16) * Math.PI) / 180) * 46)} ${f1(x + Math.cos((a * Math.PI) / 180) * 62)},${f1(y + Math.sin((a * Math.PI) / 180) * 62)} ${f1(x + Math.cos(((a + 16) * Math.PI) / 180) * 46)},${f1(y + Math.sin(((a + 16) * Math.PI) / 180) * 46)}" fill="${k % 2 ? '#ff9ec7' : '#ffc2dc'}"/>`,
      );
    }
    parts.push(`<circle cx="${x}" cy="${y}" r="13" fill="#ffd34d"/>`);
  });
  const defs = lin(
    'water',
    [
      [0, '#17b2b8'],
      [0.5, '#0e8fae'],
      [1, '#0a5c8c'],
    ],
    0.3,
    1,
  );
  return frame(parts.join(''), defs);
}

// ------------------------------------------------------------------------------------------------ wish: bamboo and paper tags at dusk
function wish() {
  const rng = mulberry32(51);
  const parts = [];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  parts.push(disc(800, 330, 300, '#fff0c9', 0.08), disc(800, 330, 210, '#fff0c9', 0.12), disc(800, 330, 120, '#fff6d6', 0.9));
  for (let i = 0; i < 40; i++)
    parts.push(`<circle cx="${f1(rng() * W)}" cy="${f1(rng() * 500)}" r="${f1(1 + rng() * 2)}" fill="#fff" opacity="${f1(0.3 + rng() * 0.6)}"/>`);
  const layers = [
    { y: 700, amp: 40, c: '#7a52b8' },
    { y: 790, amp: 36, c: '#5a3a98' },
    { y: 860, amp: 20, c: '#3a2a78' },
  ];
  layers.forEach((l) => parts.push(ridge(rng, { y: l.y, amp: l.amp, color: l.c }).svg));
  const stalk = (x, lean, w) => {
    let s = `<g filter="url(#sh2)">`;
    for (let y = 920, i = 0; y > -40; y -= 130, i++) {
      const x1 = x + lean * (920 - y) * 0.03;
      s += `<rect x="${f1(x1 - w / 2)}" y="${y - 130}" width="${w}" height="130" rx="6" fill="${i % 2 ? '#5fc46a' : '#4fb85e'}"/><rect x="${f1(x1 - w / 2 - 3)}" y="${y - 134}" width="${w + 6}" height="9" rx="4" fill="#3f9a4f"/>`;
    }
    return s + '</g>';
  };
  [60, 150, 1450, 1540].forEach((x, i) => parts.push(stalk(x, i < 2 ? 1 : -1, 26 - (i % 2) * 6)));
  const tag = ['#ff6f91', '#ffc75f', '#5ad1c9', '#a78bfa', '#ff9671'];
  for (let i = 0; i < 12; i++) {
    const x = i < 6 ? 50 + rng() * 260 : 1290 + rng() * 260;
    const y = 80 + rng() * 520;
    const hh = 90 + rng() * 60;
    parts.push(
      `<g filter="url(#sh2)"><line x1="${f1(x)}" y1="${f1(y - 30)}" x2="${f1(x)}" y2="${f1(y)}" stroke="#e9c26a" stroke-width="2"/><rect x="${f1(x - 15)}" y="${f1(y)}" width="30" height="${f1(hh)}" rx="3" fill="${tag[i % tag.length]}" transform="rotate(${f1((rng() - 0.5) * 14)} ${f1(x)} ${f1(y)})"/></g>`,
    );
  }
  const defs = lin('sky', [
    [0, '#26206b'],
    [0.55, '#6a3fa6'],
    [1, '#ff9fb7'],
  ]);
  return frame(parts.join(''), defs);
}

export const SCENES = { dawn, night, pond, wish };
