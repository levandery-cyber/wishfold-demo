'use client';

import { useEffect, useRef, useState } from 'react';
import { Confetti } from '@/lib/confetti';
import { sfx } from '@/lib/audio';
import { money, times } from '@/lib/format';
import { bigTier } from '@/lib/presenter';
import { Dialog } from './Dialogs';
import { useCountUp } from './useCountUp';

const KIND_ART = { free: 'lantern', retrigger: 'lantern', pond: 'koi', total: 'crane', max: 'sym-fox' };

// Everything that sits on top of the board: banners, the wish tags, the big-win show and the dialogs.
export default function Overlays({ overlay, close, game, s, onBuy, onAuto }) {
  if (!overlay) return null;
  if (overlay.type === 'banner') return <Banner key={overlay.id} o={overlay} />;
  if (overlay.type === 'pick') return <Pick key={overlay.id} o={overlay} />;
  if (overlay.type === 'big') return <BigWin key={overlay.id} o={overlay} />;
  if (overlay.type === 'dialog') return <Dialog name={overlay.name} close={close} game={game} s={s} onBuy={onBuy} onAuto={onAuto} />;
  return null;
}

// ------------------------------------------------------------------------------------------------ banner
function Banner({ o }) {
  const ms = o.quick ? Math.max(700, o.ms * 0.35) : o.ms;
  const fired = useRef(false);
  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    o.done();
  };
  useEffect(() => {
    const t = setTimeout(finish, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`veil veil--${o.kind}`} onClick={finish} role="alertdialog" aria-label={o.title}>
      <div className={`sign sign--${o.kind}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sign__art" src={`/art/${KIND_ART[o.kind] || 'crane'}.svg`} alt="" draggable="false" />
        <h2 className="sign__title">{o.title}</h2>
        <div className="sign__big">{o.big}</div>
        <p className="sign__sub">{o.sub}</p>
        <button className="sign__go" onClick={finish} autoFocus>
          Continue
        </button>
        <i className="sign__bar" style={{ animationDuration: `${ms}ms` }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ wish tags
const REWARDS = {
  spins: { art: 'lantern', head: '+5', text: 'free spins' },
  plus: { art: 'star-2', head: '+2', text: 'on every star' },
  double: { art: 'star-5', head: '2x', text: 'every star doubles' },
  wilds: { art: 'sym-wild', head: '3-5', text: 'pinwheels next spin' },
};
const TAG_HUES = ['#ff6f91', '#ffc75f', '#5ad1c9', '#a78bfa', '#ff9671'];

function Pick({ o }) {
  const { rewards, decoys } = o.pick;
  const [shown, setShown] = useState([]); // indexes of tags turned over, in order
  const fired = useRef(false);
  // the five tags: the three prizes land on whichever tags are turned over first, the two decoys on the rest
  const done = shown.length >= 3;
  const faceOf = (tagIdx) => {
    const k = shown.indexOf(tagIdx);
    if (k >= 0) return rewards[k];
    if (done) return decoys[[0, 1, 2, 3, 4].filter((i) => !shown.includes(i)).indexOf(tagIdx)];
    return null;
  };
  const turn = (i) => {
    if (shown.includes(i) || done) return;
    sfx.tag();
    setShown((l) => [...l, i]);
  };
  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    o.done();
  };
  useEffect(() => {
    if (!o.auto) return undefined;
    const order = [2, 0, 4];
    const timers = order.map((tagIdx, k) => setTimeout(() => setShown((l) => (l.includes(tagIdx) ? l : [...l, tagIdx])), 700 + k * 650));
    const end = setTimeout(finish, 700 + 3 * 650 + 1500);
    return () => [...timers, end].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (shown.length) sfx.reveal(shown.length);
  }, [shown.length]);

  return (
    <div className="veil veil--pick" role="dialog" aria-label="Make a wish">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="veil__scene" src="/art/scene-wish.svg" alt="" draggable="false" />
      <div className="pick">
        <h2 className="pick__title">Make a wish</h2>
        <p className="pick__sub">
          {done ? 'Your wishes come true on the next spin.' : `Turn over ${3 - shown.length} more ${3 - shown.length === 1 ? 'tag' : 'tags'}.`}
        </p>
        <div className="pick__rod">
          {[0, 1, 2, 3, 4].map((i) => {
            const face = faceOf(i);
            const r = face ? REWARDS[face] : null;
            const mine = shown.includes(i);
            return (
              <button
                key={i}
                className={`wtag ${face ? 'is-open' : ''} ${face && !mine ? 'is-ghost' : ''}`}
                style={{ '--tag': TAG_HUES[i], '--sway': `${i * 0.35}s` }}
                onClick={() => turn(i)}
                aria-label={face ? REWARDS[face].text : 'Wish tag, face down'}
              >
                <i className="wtag__string" />
                <span className="wtag__card">
                  <span className="wtag__back">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/art/crane-${i}.svg`} alt="" draggable="false" />
                  </span>
                  <span className="wtag__face">
                    {r && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/art/${r.art}.svg`} alt="" draggable="false" />
                        <b>{r.head}</b>
                        <small>{r.text}</small>
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <button className="pick__go" disabled={!done} onClick={finish}>
          Continue
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ big win
function BigWin({ o }) {
  const { tier, amount, mult } = o;
  const canvas = useRef(null);
  const fired = useRef(false);
  const ms = Math.min(4200, 1500 + tier.rank * 700);
  const [count, setCount] = useState(0);
  const val = useCountUp(count, { ms: o.quick ? 500 : ms });

  const finish = () => {
    if (fired.current) return;
    fired.current = true;
    o.done();
  };
  useEffect(() => {
    sfx.big(tier.rank);
    setCount(amount);
    const c = canvas.current ? new Confetti(canvas.current) : null;
    const wave = () => c?.rain({ count: 60 + tier.rank * 40, duration: 150 });
    wave();
    const again = setInterval(wave, 900);
    const stop = setTimeout(() => clearInterval(again), 1800 + tier.rank * 900);
    const close = setTimeout(finish, o.quick ? 1800 : 4200 + tier.rank * 800);
    return () => {
      clearInterval(again);
      [stop, close].forEach(clearTimeout);
      c?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`veil veil--big rank-${tier.rank}`} onClick={finish} role="alertdialog" aria-label={tier.name}>
      <i className="rays" />
      <canvas ref={canvas} className="veil__confetti" />
      <div className="bigwin">
        <h2 className="bigwin__title">{tier.name}</h2>
        <div className="bigwin__amount">{money(val)}</div>
        <div className="bigwin__mult">{times(mult)} your bet</div>
      </div>
    </div>
  );
}

export { bigTier };
