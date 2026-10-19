'use client';

import { useState } from 'react';
import { FREE, KOI_KINDS, MAX_WIN, MODES, PAYS, POND, SIZE_LABEL, STAR_VALUES, SYMBOLS, TIERS } from '@/lib/engine/config';
import { ago, money, percent, times } from '@/lib/format';
import { BETS } from '@/lib/game';
import { BUY, FREQ, RTP } from '@/lib/rtp';
import { sfx } from '@/lib/audio';
import { IconClose } from './Icons';

const TITLES = { wish: 'Make a wish', buy: 'Buy a bonus', auto: 'Autoplay', info: 'How to play', menu: 'Menu' };
const TIER_CLASS = ['kraft', 'kraft', 'kraft', 'washi', 'washi', 'gilt', 'gilt', 'holo', 'holo'];

export function Dialog({ name, close, game, s, onBuy, onAuto }) {
  return (
    <div className="veil veil--dialog" onClick={close}>
      <section className={`dlg dlg--${name}`} role="dialog" aria-label={TITLES[name]} onClick={(e) => e.stopPropagation()}>
        <header className="dlg__head">
          <h2>{TITLES[name]}</h2>
          <button className="round" aria-label="Close" onClick={close} autoFocus>
            <IconClose />
          </button>
        </header>
        <div className="dlg__body">
          {name === 'wish' && <WishPicker game={game} s={s} close={close} />}
          {name === 'buy' && <Buy game={game} s={s} onBuy={onBuy} />}
          {name === 'auto' && <Auto onAuto={onAuto} />}
          {name === 'info' && <Info />}
          {name === 'menu' && <Menu game={game} s={s} close={close} />}
        </div>
      </section>
    </div>
  );
}

// A small paper tile with a figure on it, for lists.
export function Mini({ sym, tier, art }) {
  const cls = tier ?? TIER_CLASS[sym];
  const file = art || (sym <= 9 ? `sym-${SYMBOLS[sym].id}` : SYMBOLS[sym].id);
  return (
    <span className={`mini tile--${cls}`}>
      <i className="tile__card" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="tile__img" src={`/art/${file}.svg`} alt="" draggable="false" />
    </span>
  );
}

// ------------------------------------------------------------------------------------------------ wishes
const WISH_ART = { normal: ['sym-boat', 'washi'], luck: ['lantern', 'lantern'], stars: ['star-3', 'washi'], wings: ['crane', 'crane'] };

function WishPicker({ game, s, close }) {
  return (
    <>
      <p className="dlg__lead">
        A wish changes the sheet for every spin you play, and for any bonus you buy. Each wish is tuned to pay back the same share of what you spend.
      </p>
      <div className="wishgrid">
        {MODES.map((m) => {
          const [art, tier] = WISH_ART[m.id];
          return (
            <button
              key={m.id}
              className={`wishcard ${s.mode === m.id ? 'is-on' : ''}`}
              onClick={() => {
                sfx.click();
                game.setMode(m.id);
                close();
              }}
            >
              <Mini art={art} tier={tier} />
              <span className="wishcard__t">
                <b>{m.name}</b>
                <span>{m.blurb}</span>
                <em>{m.cost === 1 ? `Costs the bet: ${money(BETS[s.betIdx])}` : `Costs ${m.cost} bets: ${money(BETS[s.betIdx] * m.cost)} a spin`}</em>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------ buying a bonus
function Buy({ game, s, onBuy }) {
  const mode = MODES.find((m) => m.id === s.mode);
  const items = [
    {
      kind: 'free',
      art: 'lantern',
      tier: 'lantern',
      title: 'Lantern Night',
      text: `${FREE.spins} free spins. Stars stay, cranes fill the wish string, tags make wishes come true.`,
    },
    {
      kind: 'pond',
      art: 'koi',
      tier: 'koi',
      title: 'Koi Pond',
      text: `${POND.respins} respins. Every koi that lands locks in and resets the respins. Koi are worth coins.`,
    },
  ];
  return (
    <>
      <p className="dlg__lead">
        Skip the base spin and start a bonus now.{' '}
        {mode.id !== 'normal' ? `${mode.name} is on, so the bonus plays with it.` : 'Pick a wish first to change how the bonus plays.'}
      </p>
      <div className="buygrid">
        {items.map((it) => {
          const price = game.priceFor(it.kind);
          const can = s.balance >= price;
          return (
            <div key={it.kind} className="buycard">
              <Mini art={it.art} tier={it.tier} />
              <h3>{it.title}</h3>
              <p>{it.text}</p>
              <button className="btn btn--go" disabled={!can} onClick={() => onBuy(it.kind)}>
                {can ? `Buy for ${money(price)}` : 'Not enough coins'}
              </button>
              <small>{BUY[s.mode][it.kind]}x your bet. Pays back about 96% on average.</small>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------ autoplay
function Auto({ onAuto }) {
  return (
    <>
      <p className="dlg__lead">Spins on its own and stops when the balance cannot cover a spin. Tap the stop button to end it earlier.</p>
      <div className="autogrid">
        {[10, 25, 50, 100, Infinity].map((n) => (
          <button key={n} className="btn" onClick={() => onAuto(n)}>
            {n === Infinity ? 'Until I stop it' : `${n} spins`}
          </button>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------ how to play
const TABS = ['Play', 'Pays', 'Bonuses', 'Wishes', 'Rules'];

function Info() {
  const [tab, setTab] = useState(0);
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((t, i) => (
          <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? 'is-on' : ''} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>
      <div className="info">
        {tab === 0 && <InfoPlay />}
        {tab === 1 && <InfoPays />}
        {tab === 2 && <InfoBonus />}
        {tab === 3 && <InfoWishes />}
        {tab === 4 && <InfoRules />}
      </div>
    </>
  );
}

function Row({ left, children }) {
  return (
    <div className="irow">
      <div className="irow__l">{left}</div>
      <div className="irow__r">{children}</div>
    </div>
  );
}

function InfoPlay() {
  return (
    <>
      <Row left={<Mini sym={7} />}>
        <h3>Match five or more</h3>
        <p>Figures win when five or more of the same kind touch edge to edge. Corners do not connect. Bigger groups pay more.</p>
      </Row>
      <Row left={<Mini sym={6} />}>
        <h3>Cascades</h3>
        <p>A winning group folds away, everything above falls straight down and new figures arrive. Every new group pays, until nothing does.</p>
      </Row>
      <Row left={<Mini art="star-3" tier="washi" />}>
        <h3>Lucky stars</h3>
        <p>
          Stars stick to a spot on the board. When a tile standing on a star wins, the star adds its number to that win. Stars in one group add together (
          {STAR_VALUES[0]}x + {STAR_VALUES[1]}x = {STAR_VALUES[0] + STAR_VALUES[1]}x). In the base game a star is used up once it pays. In free spins it stays.
        </p>
      </Row>
      <Row left={<Mini sym={9} tier="wild" />}>
        <h3>Pinwheel</h3>
        <p>
          Stands in for any figure, but not for lanterns, koi or cranes. Now and then a paper crane glides over the board and leaves two to four pinwheels
          (Crane Drop).
        </p>
      </Row>
      <Row left={<Mini sym={10} tier="lantern" />}>
        <h3>Lanterns and koi</h3>
        <p>
          Three or more lanterns anywhere light Lantern Night. Three or more koi open the Koi Pond. They never pay on their own and stay on the board until the
          spin ends.
        </p>
      </Row>
    </>
  );
}

function InfoPays() {
  return (
    <>
      <p className="dlg__lead">Pays are multiples of your bet for one group, before any stars.</p>
      {TIERS.map((t, ti) => (
        <div key={t.key} className="paytier">
          <div className="paytier__h">
            <b>{t.name}</b>
            <span>{t.note}</span>
          </div>
          <div className="paytier__figs">{SYMBOLS.map((sy, i) => (sy.tier === ti ? <Mini key={sy.id} sym={i} /> : null))}</div>
          <table className="paytable">
            <thead>
              <tr>
                <th>Group of</th>
                {SIZE_LABEL.map((l) => (
                  <th key={l}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Pays</th>
                {PAYS[ti].map((p, i) => (
                  <td key={i}>{times(p)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function InfoBonus() {
  const lo = (k) => Math.min(...k.values);
  const hi = (k) => Math.max(...k.values);
  return (
    <>
      <Row left={<Mini sym={10} tier="lantern" />}>
        <h3>Lantern Night: free spins</h3>
        <p>
          {FREE.spins} free spins. Stars you land stay on the board for the whole round, and three more lanterns add {FREE.retrigger} spins, as many times as
          they come.
        </p>
      </Row>
      <Row left={<Mini sym={12} tier="crane" />}>
        <h3>The wish string</h3>
        <p>
          Cranes that land in free spins fly to the wish string. When {FREE.meter} are strung, five wish tags appear: turn over three. They can add{' '}
          {FREE.retrigger} spins, add 2 to every star, double every star, or call a crane to leave 3 to 5 pinwheels on the next spin.
        </p>
      </Row>
      <Row left={<Mini sym={11} tier="koi" />}>
        <h3>Koi Pond: respins</h3>
        <p>
          {POND.respins} respins. Koi that land lock in place and the respins start over. The bonus ends when the respins run out. Orange koi are worth{' '}
          {lo(KOI_KINDS[0])} to {hi(KOI_KINDS[0])} bets, kohaku koi {lo(KOI_KINDS[1])} to {hi(KOI_KINDS[1])}, and golden koi {lo(KOI_KINDS[2])} to{' '}
          {hi(KOI_KINDS[2])}. The rare moon koi lands worth everything already in the pond.
        </p>
      </Row>
      <Row left={<Mini art="coin" tier="gilt" />}>
        <h3>Maximum win</h3>
        <p>A round, with every bonus it starts, pays at most {MAX_WIN.toLocaleString('en-US')}x the bet. When it gets there, the round ends and is paid.</p>
      </Row>
    </>
  );
}

function InfoWishes() {
  return (
    <>
      <p className="dlg__lead">
        Pick a wish before you spin. All three cost two bets a spin and pay back the same share as the classic sheet, but each one changes what you see.
      </p>
      {MODES.slice(1).map((m) => (
        <Row key={m.id} left={<Mini art={WISH_ART[m.id][0]} tier={WISH_ART[m.id][1]} />}>
          <h3>{m.name}</h3>
          <p>{m.blurb}</p>
          <p className="muted">
            Volatility: {RTP[m.id].vol}. Free spins {BUY[m.id].free}x, Koi Pond {BUY[m.id].pond}x to buy.
          </p>
        </Row>
      ))}
    </>
  );
}

function InfoRules() {
  return (
    <>
      <table className="paytable rules">
        <thead>
          <tr>
            <th>Sheet</th>
            <th>Cost a spin</th>
            <th>Pays back</th>
            <th>Volatility</th>
          </tr>
        </thead>
        <tbody>
          {MODES.map((m) => (
            <tr key={m.id}>
              <th>{m.name}</th>
              <td>
                {m.cost} bet{m.cost > 1 ? 's' : ''}
              </td>
              <td>{percent(RTP[m.id].rtp)}</td>
              <td>{RTP[m.id].vol}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Those return figures are measured by playing the real game millions of times (see the README), not promised. Lantern Night starts about once in{' '}
        {FREQ.free} spins and the Koi Pond about once in {FREQ.pond}. Bought bonuses pay back about 96%. The most a round can pay is{' '}
        {MAX_WIN.toLocaleString('en-US')}x the bet.
      </p>
      <p>
        Everything here is a demo. The coins are virtual and cannot be bought, won or withdrawn. Every round comes from a provably fair stream: open{' '}
        <a href="/fairness">Fairness</a> to check any of yours.
      </p>
    </>
  );
}

// ------------------------------------------------------------------------------------------------ menu
function Switch({ on, onChange, label, hint }) {
  return (
    <button className="switch" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="switch__t">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <i className={on ? 'is-on' : ''}>
        <u />
      </i>
    </button>
  );
}

function Menu({ game, s, close }) {
  const [sure, setSure] = useState(false);
  const st = s.stats;
  return (
    <>
      <Switch on={s.sound} onChange={(v) => game.setSound(v)} label="Sound" hint="Paper, bells and splashes" />
      <Switch on={s.music} onChange={(v) => game.setMusic(v)} label="Ambient music" hint="A few soft notes in the background. Needs sound on." />
      <Switch on={s.turbo} onChange={(v) => game.setTurbo(v)} label="Turbo" hint="Faster animations (also the T key)" />

      <div className="menu__row">
        <button className="btn" onClick={() => game.topUp()}>
          Add 5,000.00 demo coins
        </button>
        <a className="btn btn--ghost" href="/fairness" onClick={close}>
          Fairness and seeds
        </a>
      </div>

      <h3 className="menu__h">Your session</h3>
      <div className="statgrid">
        <div>
          <b>{st.rounds}</b>
          <span>rounds</span>
        </div>
        <div>
          <b>{money(st.wagered)}</b>
          <span>spent</span>
        </div>
        <div>
          <b>{money(st.won)}</b>
          <span>won</span>
        </div>
        <div>
          <b>{money(st.best)}</b>
          <span>best win ({times(st.bestMult)})</span>
        </div>
        <div>
          <b>{st.free}</b>
          <span>Lantern Nights</span>
        </div>
        <div>
          <b>{st.pond}</b>
          <span>Koi Ponds</span>
        </div>
      </div>

      <h3 className="menu__h">Recent rounds</h3>
      {s.history.length === 0 ? (
        <p className="muted">Nothing yet. Spin to fill this in.</p>
      ) : (
        <ul className="history">
          {s.history.slice(0, 14).map((h) => (
            <li key={`${h.n}-${h.t}`}>
              <span className="history__n">#{h.n}</span>
              <span className="history__m">
                {h.buy ? `Bought ${h.buy === 'free' ? 'free spins' : 'pond'}` : MODES.find((m) => m.id === h.mode)?.name}
                {h.kinds?.length > 0 && !h.buy ? ` + ${h.kinds.map((k) => (k === 'free' ? 'free spins' : 'pond')).join(', ')}` : ''}
              </span>
              <span className="history__b">{money(h.cost)}</span>
              <span className={`history__w ${h.win > 0 ? 'win' : ''}`}>{h.win > 0 ? `+${money(h.win)}` : '0.00'}</span>
              <span className="history__t">{ago(Date.now() - h.t)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="menu__row menu__row--end">
        {sure ? (
          <>
            <span className="muted">Wipes coins, stats and seeds.</span>
            <button
              className="btn btn--bad"
              onClick={() => {
                game.resetDemo();
                setSure(false);
                close();
              }}
            >
              Yes, reset
            </button>
            <button className="btn btn--ghost" onClick={() => setSure(false)}>
              Keep playing
            </button>
          </>
        ) : (
          <button className="btn btn--ghost" onClick={() => setSure(true)}>
            Reset demo
          </button>
        )}
      </div>
    </>
  );
}
