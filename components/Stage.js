'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { artUrl } from '@/lib/art/names';

const SCENES = ['dawn', 'night', 'pond', 'wish'];

// The window, a painted scene behind it, and a rig whose size is a whole number of tiles. `--t` is recomputed whenever the
// window changes; every other length in the game is a multiple of it.
export default function Stage({ scene = 'dawn', mode = 'base', children, overlays, fixed = null }) {
  const ref = useRef(null);
  const [fit, setFit] = useState({ t: 70, layout: 'wide', ready: false });

  useLayoutEffect(() => {
    if (fixed) {
      setFit({ t: fixed.t, layout: fixed.layout || 'wide', ready: true });
      return undefined;
    }
    const calc = () => {
      const vv = window.visualViewport;
      const w = vv?.width || window.innerWidth;
      const h = vv?.height || window.innerHeight;
      const wide = w / h > 1.12;
      const t = wide ? Math.min(w / 13.5, h / 10.6) : Math.min(w / 8.1, h / 15.6);
      setFit({ t: Math.max(22, Math.floor(t * 10) / 10), layout: wide ? 'wide' : 'tall', ready: true });
    };
    calc();
    window.addEventListener('resize', calc);
    window.visualViewport?.addEventListener('resize', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.visualViewport?.removeEventListener('resize', calc);
    };
  }, [fixed]);

  // The scenes drift a few pixels against the pointer: just enough to feel like layers of paper.
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const move = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--px', ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        el.style.setProperty('--py', ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div
      ref={ref}
      className={`stage ${fixed ? 'stage--fixed' : ''}`}
      data-layout={fit.layout}
      data-ready={fit.ready ? 1 : 0}
      data-scene={scene}
      data-mode={mode}
      style={{ '--t': `${fit.t}px` }}
    >
      <div className="scene" aria-hidden="true">
        {SCENES.map((s) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s} className={s === scene ? 'on' : ''} src={artUrl(`scene-${s}`)} alt="" draggable="false" />
        ))}
      </div>
      <div className="rig">{children}</div>
      {overlays}
    </div>
  );
}
