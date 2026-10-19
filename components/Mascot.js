'use client';

import { craneMascot, foxMascot } from '@/lib/art/mascots';

const ART = {
  fox: { svg: foxMascot, view: '-8 0 116 130' },
  crane: { svg: craneMascot, view: '0 0 100 100' },
};

// A character beside the board. `cheer` changes every time something good happens, which restarts a little jump.
export default function Mascot({ kind, cheer = 0 }) {
  const a = ART[kind];
  return (
    <svg
      key={cheer}
      className={`mascot mascot--${kind} ${cheer ? 'is-cheer' : ''}`}
      viewBox={a.view}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: a.svg() }}
    />
  );
}
