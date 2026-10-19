// Money is integer cents everywhere. These helpers only format.

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function money(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${whole}.${String(abs % 100).padStart(2, '0')}`;
}

// 1,234,500 cents -> "12.3k": for tight spaces such as the history list.
export function compact(cents) {
  const v = Math.abs(cents) / 100;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}k`;
  return money(cents);
}

// A multiple of the bet: 3 -> "3x", 12.5 -> "12.5x", 1234 -> "1,234x".
export function times(x) {
  if (x >= 100) return `${Math.round(x).toLocaleString('en-US')}x`;
  if (x >= 10) return `${x.toFixed(1).replace(/\.0$/, '')}x`;
  return `${x.toFixed(2).replace(/\.?0+$/, '')}x`;
}

export const percent = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

export function ago(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
