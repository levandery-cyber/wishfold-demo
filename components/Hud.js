'use client';

import { MODES } from '@/lib/engine/config';
import { money } from '@/lib/format';
import { BETS } from '@/lib/game';
import { useCountUp } from './useCountUp';
import { IconAuto, IconCoin, IconMinus, IconPlus, IconSpin, IconStar, IconStop, IconTag, IconTurbo } from './Icons';

// Long numbers shrink a little so they always fit their card.
const fit = (text) => (text.length <= 8 ? 1 : text.length <= 10 ? 0.84 : text.length <= 12 ? 0.68 : 0.56);

function Stat({ label, tone, children }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__l">{label}</span>
      <span className="stat__v">{children}</span>
    </div>
  );
}

// Balance, bet, the big round button, the win, and the four tools.
export default function Hud({ s, phase, win, auto, onSpin, onBet, onOpen, onTurbo, onStopAuto, onTopUp, locked }) {
  const busy = phase !== 'idle';
  const shownWin = useCountUp(win, { ms: 520 });
  const mode = MODES.find((m) => m.id === s.mode) || MODES[0];
  const poor = !busy && s.balance < s.cost;
  return (
    <footer className="bar">
      <Stat label={poor ? 'Balance: not enough for a spin' : 'Balance'} tone="bal">
        <IconCoin className="coin" />
        <span className="num" style={{ '--fit': fit(money(s.balance)) }}>
          {money(s.balance)}
        </span>
        {poor && (
          <button className="topup" onClick={onTopUp}>
            Add coins
          </button>
        )}
      </Stat>

      <div className="bet">
        <span className="stat__l">Bet</span>
        <div className="bet__row">
          <button className="step" aria-label="Lower the bet" disabled={busy || s.betIdx === 0} onClick={() => onBet(-1)}>
            <IconMinus />
          </button>
          <output className="bet__v" aria-live="polite">
            {money(s.bet)}
          </output>
          <button className="step" aria-label="Raise the bet" disabled={busy || s.betIdx === BETS.length - 1} onClick={() => onBet(1)}>
            <IconPlus />
          </button>
        </div>
        {mode.cost > 1 && (
          <span className="bet__note" data-on="1">
            {`${mode.name}: ${money(s.cost)} a spin`}
          </span>
        )}
      </div>

      <button className={`spin ${busy ? 'is-busy' : ''} ${poor ? 'is-poor' : ''}`} onClick={onSpin} aria-label={busy ? 'Speed up' : 'Spin'} disabled={locked}>
        {busy ? <IconTurbo className="spin__i" /> : <IconSpin className="spin__i" />}
        <span className="sr">{busy ? 'Speed up' : 'Spin'}</span>
      </button>

      <Stat label="Win" tone="win">
        <span className={`num ${win > 0 ? 'has' : ''}`} style={{ '--fit': fit(money(win)) }}>
          {money(shownWin)}
        </span>
      </Stat>

      <div className="tools">
        <button className="tool tool--wish" onClick={() => onOpen('wish')} disabled={busy || locked}>
          <i>
            <IconStar />
          </i>
          <span>{mode.id === 'normal' ? 'Wish' : mode.name.replace('Wish of ', '')}</span>
        </button>
        <button className="tool tool--buy" onClick={() => onOpen('buy')} disabled={busy || locked}>
          <i>
            <IconTag />
          </i>
          <span>Buy</span>
        </button>
        <button
          className={`tool tool--auto ${auto ? 'is-on' : ''}`}
          onClick={() => (auto ? onStopAuto() : onOpen('auto'))}
          disabled={(busy && !auto) || locked}
        >
          <i>{auto ? <IconStop /> : <IconAuto />}</i>
          <span>{auto ? (auto === Infinity ? 'Stop' : `Stop ${auto}`) : 'Auto'}</span>
        </button>
        <button className={`tool tool--turbo ${s.turbo ? 'is-on' : ''}`} onClick={onTurbo} aria-pressed={s.turbo}>
          <i>
            <IconTurbo />
          </i>
          <span>Turbo</span>
        </button>
      </div>
    </footer>
  );
}
