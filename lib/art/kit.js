// Tiny toolkit for drawing paper figures as SVG strings.
//
// A figure is a list of facets. Each facet is a flat polygon cut from one colour of paper and lit from the top left:
// `hi` catches the light, `md` is the sheet itself, `lo` and `dk` lean away. Highlights drift warm and shadows drift cool,
// which is what makes flat vector paper look folded instead of merely coloured.

export const f1 = (n) => Math.round(n * 10) / 10;

// Move hue `h` towards `target` by at most `amt` degrees (shortest way round the wheel).
function drift(h, target, amt) {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.max(-amt, Math.min(amt, d)) + 360) % 360;
}

export const hsl = (h, s, l, a = 1) => (a < 1 ? `hsl(${f1(h)} ${f1(s)}% ${f1(l)}% / ${a})` : `hsl(${f1(h)} ${f1(s)}% ${f1(l)}%)`);

// One sheet of coloured paper in four lights. `l` is the lightness of the plain sheet.
export function sheet(h, s = 74, l = 54) {
  return {
    hi: hsl(drift(h, 55, 14), Math.max(0, s - 8), Math.min(97, l + 15)),
    md: hsl(h, s, l),
    lo: hsl(drift(h, 285, 12), Math.min(100, s + 2), Math.max(4, l - 13)),
    dk: hsl(drift(h, 285, 22), Math.min(100, s + 4), Math.max(3, l - 26)),
  };
}

// Neutrals share the same four-light shape.
export const WHITE = { hi: '#ffffff', md: '#fbf3e6', lo: '#e6d9ca', dk: '#c9b8a8' };
export const INK = { hi: '#5b4d6e', md: '#3b2f4d', lo: '#2a2038', dk: '#1a1325' };

const polyPoints = (pts) => (Array.isArray(pts) ? pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ') : pts);

// ['o.hi', '12,4 40,32 6,44'] -> polygon. Palettes are looked up by the part before the dot.
export function facet(pal, spec) {
  const [key, pts] = spec;
  const [p, tone] = key.split('.');
  const fill = pal[p][tone];
  // A hairline stroke of the same colour closes the anti-aliasing seams between neighbouring facets.
  return `<polygon points="${polyPoints(pts)}" fill="${fill}" stroke="${fill}" stroke-width=".7" stroke-linejoin="round"/>`;
}

// Mirror a list of facets across x = 50, flipping the light so the right side sits one step darker.
const DARKER = { hi: 'md', md: 'lo', lo: 'dk', dk: 'dk' };
export function mirror(specs, { shade = true } = {}) {
  return specs.map(([key, pts]) => {
    const [p, tone] = key.split('.');
    const list =
      typeof pts === 'string'
        ? pts
            .trim()
            .split(/\s+/)
            .map((s) => s.split(',').map(Number))
        : pts;
    const flipped = list.map(([x, y]) => [100 - x, y]);
    return [`${p}.${shade ? DARKER[tone] : tone}`, flipped];
  });
}

export const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}" ${extra}/>`;
export const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${fill}" ${extra}/>`;
export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const line = (x1, y1, x2, y2, stroke, w = 1.2, extra = '') =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

// A regular polygon, handy for faceted discs. `turn` rotates it in degrees.
export function ngon(cx, cy, r, n, turn = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((turn + (360 / n) * i - 90) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export const rotate = (pts, cx, cy, deg) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
};

// Wrap parts in an svg. `shadow` adds the soft contact shadow a paper figure casts on its card.
export function svg(parts, { view = '0 0 100 100' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}">${parts.join('')}</svg>`;
}

// Build an svg from facets, loose shapes (already strings) and a palette map.
export function figure(pal, items, opts) {
  const parts = items.map((it) => (typeof it === 'string' ? it : facet(pal, it)));
  return svg(parts, opts);
}
