'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BoardView } from '@/lib/board';
import { sfx } from '@/lib/audio';
import { idleBoard } from '@/lib/engine/idle';
import { fastRng } from '@/lib/engine/rng';
import { money } from '@/lib/format';
import { Presenter } from '@/lib/presenter';
import Hud from './Hud';
import Mascot from './Mascot';
import { IconInfo, IconMenu, IconSound } from './Icons';
import Overlays from './Overlays';
import Stage from './Stage';
import { useGame } from './Providers';

const TURBO = 2.3;
const SKIP = 5;

export default function Game() {
  const [game, s] = useGame();
  const boardEl = useRef(null);
  const viewRef = useRef(null);
  const meterRef = useRef(null);
  const busy = useRef(false);
  const skip = useRef(false);
  const autoRef = useRef(0);
  const settingsRef = useRef(s);
  settingsRef.current = s;

  const [phase, setPhase] = useState('idle');
  const [scene, setScene] = useState('dawn');
  const [mode, setMode] = useState('base');
  const [win, setWin] = useState(0);
  const [free, setFree] = useState(null);
  const [pond, setPond] = useState(null);
  const [auto, setAutoState] = useState(0);
  const [overlay, setOverlay] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [cheer, setCheer] = useState(0);
  const [said, setSaid] = useState('');
  const lastWin = useRef(0);

  const setAuto = (n) => {
    autoRef.current = n;
    setAutoState(n);
  };

  // ------------------------------------------------------------------ the board
  useEffect(() => {
    if (!s.ready || !boardEl.current) return undefined;
    const view = new BoardView(boardEl.current, { fmt: money, bet: s.bet });
    viewRef.current = view;
    const first = idleBoard(fastRng(Date.now() & 0xffffff));
    view.show(first, null);
    // the opening sheet is thrown in, so the first thing you see is paper landing
    const intro = setTimeout(() => view.deal(first, null), 350);
    return () => {
      clearTimeout(intro);
      view.destroy();
      viewRef.current = null;
    };
    // the board is built once the save has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ready]);

  useEffect(() => {
    viewRef.current?.setBet(s.bet);
    if (!busy.current) viewRef.current?.setSpeed(s.turbo ? TURBO : 1);
  }, [s.bet, s.turbo]);

  useEffect(() => {
    sfx.setMuted(!s.sound);
  }, [s.sound]);

  // the music follows the scene: lower and slower at night, water drops in the pond
  useEffect(() => {
    sfx.setMusic(s.music && s.sound, mode === 'free' ? 'free' : mode === 'pond' ? 'pond' : 'base');
  }, [s.music, s.sound, mode]);

  // browsers keep audio locked until the first touch
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // the mascots jump whenever the win grows
  useEffect(() => {
    if (win > lastWin.current) setCheer((c) => c + 1);
    lastWin.current = win;
  }, [win]);

  useEffect(
    () =>
      game.on('toast', (t) => {
        setToasts((l) => [...l.slice(-2), t]);
        setTimeout(() => setToasts((l) => l.filter((x) => x.id !== t.id)), 3200);
      }),
    [game],
  );

  // ------------------------------------------------------------------ the surface the presenter talks to
  const ui = useRef(null);
  ui.current = {
    setWin,
    idle: () => idleBoard(fastRng(Date.now() & 0xffffff)),
    setFree,
    setPond,
    setScene,
    setMode,
    meterEl: () => meterRef.current,
    fast: () => skip.current,
    banner: (opts) =>
      new Promise((done) =>
        setOverlay({ type: 'banner', id: Math.random(), ...opts, done: () => (setOverlay(null), done()), quick: skip.current || settingsRef.current.turbo }),
      ),
    pick: (pick) =>
      new Promise((done) =>
        setOverlay({ type: 'pick', id: Math.random(), pick, done: () => (setOverlay(null), done()), auto: autoRef.current > 0 || settingsRef.current.turbo }),
      ),
    bigWin: (info) =>
      new Promise((done) =>
        setOverlay({ type: 'big', id: Math.random(), ...info, done: () => (setOverlay(null), done()), quick: skip.current || autoRef.current > 0 }),
      ),
  };

  // ------------------------------------------------------------------ one round
  const run = useCallback(
    async (opts = {}) => {
      const view = viewRef.current;
      if (!view || busy.current) return false;
      sfx.unlock();
      const res = game.begin(opts);
      if (res.error) {
        sfx.error();
        game.toast('Not enough coins for that. Lower the bet or add coins in the menu.', 'bad');
        return false;
      }
      busy.current = true;
      skip.current = false;
      setPhase('busy');
      setOverlay(null);
      view.setBet(res.round.bet);
      view.setSpeed(settingsRef.current.turbo ? TURBO : 1);
      const presenter = new Presenter({
        board: view,
        ui: {
          setWin: (v) => ui.current.setWin(v),
          setFree: (v) => ui.current.setFree(v),
          setPond: (v) => ui.current.setPond(v),
          setScene: (v) => ui.current.setScene(v),
          setMode: (v) => ui.current.setMode(v),
          meterEl: () => ui.current.meterEl(),
          fast: () => ui.current.fast(),
          idle: () => ui.current.idle(),
          banner: (o) => ui.current.banner(o),
          pick: (p) => ui.current.pick(p),
          bigWin: (i) => ui.current.bigWin(i),
        },
      });
      try {
        await presenter.playRound(res.round);
      } catch (e) {
        console.error(e);
      } finally {
        game.settle(res.round);
        setSaid(res.round.win > 0 ? `You won ${money(res.round.win)}.` : 'No win this round.');
        busy.current = false;
        skip.current = false;
        view.setSpeed(settingsRef.current.turbo ? TURBO : 1);
        setPhase('idle');
        setScene('dawn');
        setMode('base');
        setFree(null);
        setPond(null);
      }
      return res.round;
    },
    [game],
  );

  const spin = useCallback(async () => {
    if (busy.current) {
      // while a round plays, the button speeds it up
      skip.current = true;
      viewRef.current?.setSpeed(SKIP);
      return;
    }
    const round = await run();
    if (!round) return;
    // autoplay
    while (autoRef.current > 0 && !busy.current) {
      await new Promise((r) => setTimeout(r, 520));
      if (autoRef.current <= 0) break;
      if (autoRef.current !== Infinity) setAuto(autoRef.current - 1);
      if (autoRef.current === 0) break;
      const r = await run();
      if (!r) {
        setAuto(0);
        break;
      }
    }
  }, [run]);

  const buy = useCallback(
    async (kind) => {
      setOverlay(null);
      await run({ buy: kind });
    },
    [run],
  );

  // ------------------------------------------------------------------ keys
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (e.target instanceof HTMLElement && e.target.closest('button, a')) return;
        e.preventDefault();
        if (!overlay) spin();
      } else if (e.key === 't' || e.key === 'T') game.setTurbo(!settingsRef.current.turbo);
      else if (e.key === 'Escape') setOverlay((o) => (o && o.type === 'dialog' ? null : o));
      else if (!busy.current && !overlay && (e.key === '+' || e.key === '=' || e.key === 'ArrowUp')) game.bump(1);
      else if (!busy.current && !overlay && (e.key === '-' || e.key === 'ArrowDown')) game.bump(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, overlay, spin]);

  const openDialog = (name) => {
    sfx.click();
    setOverlay({ type: 'dialog', name });
  };

  return (
    <Stage
      scene={scene}
      mode={mode}
      overlays={
        <>
          <Overlays
            overlay={overlay}
            close={() => setOverlay(null)}
            game={game}
            s={s}
            onBuy={buy}
            onAuto={(n) => {
              setOverlay(null);
              setAuto(n);
              spin();
            }}
          />

          <p className="fine">Demo only. The coins are virtual: nothing to win, buy or withdraw.</p>
          <div className="sr" aria-live="polite">
            {said}
          </div>
          <div className="toasts" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={`toast toast--${t.tone}`}>
                {t.text}
              </div>
            ))}
          </div>
        </>
      }
    >
      <div className="logo" aria-hidden="true">
        <h1 className="logo__word" aria-label="Wishfold">
          {'Wishfold'.split('').map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo__crane" src="/art/crane.svg" alt="" />
      </div>

      <div className="corner">
        <button className="round" onClick={() => game.setSound(!s.sound)} aria-label={s.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={s.sound}>
          <IconSound off={!s.sound} />
        </button>
        <button className="round" onClick={() => openDialog('info')} aria-label="How to play">
          <IconInfo />
        </button>
        <button className="round" onClick={() => openDialog('menu')} aria-label="Menu">
          <IconMenu />
        </button>
      </div>

      <Side free={free} pond={pond} meterRef={meterRef} cheer={cheer} />

      <main className="boardwrap" onClick={() => busy.current && spin()}>
        <div className="frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="board" ref={boardEl} role="img" aria-label="The 7 by 7 board" />
      </main>

      <Hud
        s={s}
        onTopUp={() => game.topUp()}
        phase={phase}
        win={win}
        auto={auto}
        locked={!s.ready || !!overlay}
        onSpin={spin}
        onBet={(d) => (sfx.click(), game.bump(d))}
        onOpen={openDialog}
        onTurbo={() => (sfx.click(), game.setTurbo(!s.turbo))}
        onStopAuto={() => setAuto(0)}
      />
    </Stage>
  );
}

// The two columns beside the board: during free spins the crane string and the spin counter; in the pond the respin counter.
function Side({ free, pond, meterRef, cheer }) {
  return (
    <>
      <aside className="side side--l">
        <div className={`wishstring ${free ? 'is-on' : ''}`} ref={meterRef}>
          <span className="wishstring__l">Wish string</span>
          <div className="wishstring__cranes">
            {Array.from({ length: 10 }, (_, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} className={free && i < (free.meter || 0) ? 'lit' : ''} src={`/art/crane-${i}.svg`} alt="" draggable="false" />
            ))}
          </div>
          <span className="wishstring__n">{free ? `${free.meter || 0} / 10` : '0 / 10'}</span>
        </div>
        <Mascot kind="crane" cheer={cheer} />
      </aside>
      <aside className="side side--r">
        {free && (
          <div className="badge" style={{ top: 0 }}>
            <span className="badge__l">Free spins left</span>
            <span className="badge__v">{free.left}</span>
          </div>
        )}
        {pond && (
          <div className="badge" style={{ top: 0 }}>
            <span className="badge__l">Respins left</span>
            <span className="badge__v">{pond.left}</span>
          </div>
        )}
        {pond && (
          <div className="badge" style={{ top: 'calc(var(--t) * 1.5)' }}>
            <span className="badge__l">{pond.count} koi</span>
            <span className="badge__v" style={{ fontSize: 'calc(var(--t) * 0.42)' }}>
              {money(pond.sum || 0)}
            </span>
          </div>
        )}
        <Mascot kind="fox" cheer={cheer} />
      </aside>
    </>
  );
}
