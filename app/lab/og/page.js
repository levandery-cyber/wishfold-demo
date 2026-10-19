'use client';

import { useEffect, useRef } from 'react';
import Mascot from '@/components/Mascot';
import Stage from '@/components/Stage';
import { BoardView } from '@/lib/board';
import { money } from '@/lib/format';

// The board for the share image: a big fox group, some stars, a lantern and a pinwheel.
const G = [
  [0, 2, 3, 1, 4, 5, 0],
  [4, 7, 7, 7, 2, 1, 6],
  [1, 7, 9, 7, 3, 0, 4],
  [2, 5, 7, 7, 8, 4, 5],
  [3, 0, 1, 2, 8, 8, 1],
  [5, 6, 10, 3, 8, 0, 2],
  [0, 4, 6, 1, 3, 7, 12],
].flat();
const STARS = { 9: 3, 12: 2, 24: 0, 31: 5, 36: 10, 29: 25, 17: 2 };
const WIN = [8, 9, 10, 15, 16, 17, 23, 24, 22, 29].filter((i) => [7, 9].includes(G[i]));

export default function OgLab() {
  const el = useRef(null);
  useEffect(() => {
    const view = new BoardView(el.current, { fmt: money });
    const mat = new Int16Array(49);
    Object.entries(STARS).forEach(([i, v]) => (mat[i] = v));
    mat[9] = 2;
    mat[24] = 5;
    mat[12] = 0;
    view.show(Int8Array.from(G), mat);
    const cells = G.map((s, i) => [s, i])
      .filter(([s, i]) => (s === 7 || s === 9) && [8, 9, 10, 15, 16, 17, 23, 22, 24].includes(i))
      .map(([, i]) => i);
    const t = setTimeout(() => view.showWins([{ cells, pay: 3640, mult: 7 }], { fast: true }), 400);
    return () => {
      clearTimeout(t);
      view.destroy();
    };
  }, []);
  return (
    <Stage fixed={{ t: 57 }} scene="dawn">
      <div className="logo" aria-hidden="true">
        <h1 className="logo__word">Wishfold</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo__crane" src="/art/crane.svg" alt="" />
      </div>
      <aside className="side side--l">
        <Mascot kind="crane" />
      </aside>
      <aside className="side side--r">
        <Mascot kind="fox" />
      </aside>
      <main className="boardwrap">
        <div className="frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="board" ref={el} />
      </main>
      <div
        className="badge"
        style={{ left: '50%', bottom: 'calc(var(--t) * 0.28)', top: 'auto', minWidth: 'calc(var(--t) * 7.6)', transform: 'translateX(-50%) rotate(-1deg)' }}
      >
        <span className="badge__v" style={{ fontSize: 'calc(var(--t) * 0.5)', color: 'var(--ink)' }}>
          Fold a wish, win a lot
        </span>
      </div>
    </Stage>
  );
}
