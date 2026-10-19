'use client';

import { useEffect, useRef, useState } from 'react';

// A number that rolls up to its target. Going down (a reset) jumps straight there.
export function useCountUp(target, { ms = 650, onTick } = {}) {
  const [v, setV] = useState(target);
  const st = useRef({ v: target, raf: 0 });
  useEffect(() => {
    const s = st.current;
    cancelAnimationFrame(s.raf);
    const from = s.v;
    if (target === from) return undefined;
    if (target < from || ms <= 0) {
      s.v = target;
      setV(target);
      return undefined;
    }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      s.v = Math.round(from + (target - from) * e);
      setV(s.v);
      onTick?.(p);
      if (p < 1) s.raf = requestAnimationFrame(step);
    };
    s.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(s.raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return v;
}
