// Small inline icons. They take their colour from `currentColor`, so a button decides how they look.
const base = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IconSpin = (p) => (
  <svg {...base} {...p}>
    <path d="M37.5 19A15 15 0 0 0 11.5 15.5" />
    <path d="M10.5 29A15 15 0 0 0 36.5 32.5" />
    <path d="M40 8.5v13.5H26.5z" fill="currentColor" strokeWidth="2.5" />
    <path d="M8 39.5V26h13.5z" fill="currentColor" strokeWidth="2.5" />
  </svg>
);
export const IconPlus = (p) => (
  <svg {...base} strokeWidth="6" {...p}>
    <path d="M24 10v28M10 24h28" />
  </svg>
);
export const IconMinus = (p) => (
  <svg {...base} strokeWidth="6" {...p}>
    <path d="M10 24h28" />
  </svg>
);
export const IconTurbo = (p) => (
  <svg {...base} {...p}>
    <path d="M10 10l14 14-14 14" />
    <path d="M25 10l14 14-14 14" />
  </svg>
);
export const IconAuto = (p) => (
  <svg {...base} {...p}>
    <path d="M38 24a14 14 0 1 1-4.1-9.9" />
    <path d="M39 6v10H29z" fill="currentColor" strokeWidth="2.5" />
  </svg>
);
export const IconStop = (p) => (
  <svg {...base} {...p}>
    <rect x="12" y="12" width="24" height="24" rx="4" fill="currentColor" />
  </svg>
);
export const IconStar = (p) => (
  <svg {...base} strokeWidth="3" {...p}>
    <path d="M24 5l5.4 12.2L42 18.6l-9.4 8.6L35.3 41 24 34.4 12.7 41l2.7-13.8L6 18.6l12.6-1.4z" fill="currentColor" />
  </svg>
);
export const IconTag = (p) => (
  <svg {...base} strokeWidth="4" {...p}>
    <path d="M8 8h16l17 17-16 16L8 24z" />
    <circle cx="17" cy="17" r="3" fill="currentColor" />
  </svg>
);
export const IconInfo = (p) => (
  <svg {...base} strokeWidth="5" {...p}>
    <path d="M24 21v15" />
    <circle cx="24" cy="12.5" r="2.4" fill="currentColor" />
  </svg>
);
export const IconSound = ({ off, ...p }) => (
  <svg {...base} strokeWidth="4" {...p}>
    <path d="M7 19h8l10-8v26l-10-8H7z" fill="currentColor" />
    {off ? <path d="M32 18l10 12M42 18L32 30" /> : <path d="M32 16a11 11 0 0 1 0 16M37 10a19 19 0 0 1 0 28" />}
  </svg>
);
export const IconMenu = (p) => (
  <svg {...base} strokeWidth="5" {...p}>
    <path d="M9 14h30M9 24h30M9 34h30" />
  </svg>
);
export const IconClose = (p) => (
  <svg {...base} strokeWidth="6" {...p}>
    <path d="M12 12l24 24M36 12L12 36" />
  </svg>
);
export const IconHistory = (p) => (
  <svg {...base} {...p}>
    <path d="M24 12v12l8 5" />
    <path d="M7 24a17 17 0 1 0 5-12" />
    <path d="M7 8v9h9" />
  </svg>
);
export const IconShield = (p) => (
  <svg {...base} {...p}>
    <path d="M24 6l15 5v11c0 9-6 15-15 20C15 37 9 31 9 22V11z" />
    <path d="M17 24l5 5 9-10" />
  </svg>
);
export const IconBack = (p) => (
  <svg {...base} {...p}>
    <path d="M30 10L16 24l14 14" />
  </svg>
);
export const IconCoin = (p) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" {...p}>
    <path d="M24 3l15 6 6 15-6 15-15 6-15-6-6-15 6-15z" fill="#ffc21f" />
    <path d="M24 3l15 6 6 15H24z" fill="#ffd95a" />
    <path d="M24 24h21l-6 15-15 6z" fill="#e59a0b" />
    <rect x="17" y="17" width="14" height="14" rx="2" fill="#3b2a4d" />
    <rect x="20" y="20" width="8" height="8" fill="#ffc21f" />
  </svg>
);
