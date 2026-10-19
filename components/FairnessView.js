'use client';

import { useEffect, useState } from 'react';
import { MODES } from '@/lib/engine/config';
import { commitOf, roundFor } from '@/lib/fair';
import { hmacBlockAsync, sha256Async } from '@/lib/fairAsync';
import { money, times } from '@/lib/format';
import { BETS } from '@/lib/game';
import { hmacSha256Hex, sha256Hex } from '@/lib/sha256';
import { IconBack } from './Icons';
import { useGame } from './Providers';

// A plain page, not the stage: this one scrolls.
export default function FairnessView() {
  const [game, s] = useGame();
  const [seedDraft, setSeedDraft] = useState('');
  useEffect(() => setSeedDraft(s.clientSeed), [s.clientSeed]);

  return (
    <div className="page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="page__scene" src="/art/scene-wish.svg" alt="" draggable="false" />
      <div className="page__sheet">
        <a className="page__back" href="/">
          <IconBack /> Back to the game
        </a>
        <h1 className="page__title">Fairness</h1>
        <p className="page__lead">
          Every round is worked out the moment you press spin, from three things you can see: a server seed that was locked in before you played, your own
          client seed, and a counter. Nothing else is read. This page lets you check any round of yours.
        </p>

        <section className="card">
          <h2>How a round is made</h2>
          <ol className="steps">
            <li>
              <b>Commit.</b> The game picks a random server seed and shows you its SHA-256 hash, <code>{'commit = SHA-256(serverSeed)'}</code>, before you play.
              It cannot change the seed afterwards without the hash changing.
            </li>
            <li>
              <b>Stream.</b> Random numbers come from <code>{'HMAC-SHA256(serverSeed, clientSeed:nonce:round:block)'}</code>, read 28 bits at a time. Numbers
              are rejected rather than squeezed, so there is no modulo bias.
            </li>
            <li>
              <b>One stream per round.</b> The base spin, every cascade, every free spin, the wish tags and the whole Koi Pond use that one stream in a fixed
              order. Nothing is decided later, and nothing is read twice.
            </li>
            <li>
              <b>Reveal.</b> Rotate the seed and the old one is shown. Paste it below with a round&apos;s nonce and the game replays that round and must land on
              the same win.
            </li>
          </ol>
          <p className="muted">
            One honest caveat: there is no server. Both seeds live in this browser, so this demonstrates the scheme and cannot protect anyone. With real money,
            the server seed would live on the operator&apos;s side.
          </p>
        </section>

        <section className="card">
          <h2>Your seeds</h2>
          <div className="kv">
            <span>Server seed hash (commit)</span>
            <code className="mono">{s.commit}</code>
          </div>
          <div className="kv">
            <span>Next nonce</span>
            <code className="mono">{s.nonce + 1}</code>
          </div>
          <label className="kv">
            <span>Client seed</span>
            <span className="inline">
              <input className="field" value={seedDraft} maxLength={40} onChange={(e) => setSeedDraft(e.target.value)} />
              <button className="btn btn--ghost" onClick={() => game.setClientSeed(seedDraft)} disabled={!seedDraft || seedDraft === s.clientSeed}>
                Save
              </button>
            </span>
          </label>
          <div className="row">
            <button className="btn" onClick={() => game.rotateSeed()}>
              Rotate seed and reveal the old one
            </button>
          </div>
          {s.prevSeed && (
            <div className="reveal">
              <div className="kv">
                <span>Revealed server seed</span>
                <code className="mono">{s.prevSeed}</code>
              </div>
              <div className="kv">
                <span>Its hash</span>
                <code className="mono">{s.prevCommit}</code>
              </div>
            </div>
          )}
        </section>

        <Verifier s={s} />
      </div>
    </div>
  );
}

const short = (x, n = 10) => (x && x.length > n ? `${x.slice(0, n)}…` : x);

function Verifier({ s }) {
  const [f, setF] = useState({ serverSeed: '', clientSeed: '', nonce: '1', mode: 'normal', betIdx: 2, buy: '' });
  const [out, setOut] = useState(null);
  const [mine, setMine] = useState(null);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));

  // rounds that were played under the revealed seed can be loaded in one tap
  const loadable = s.prevSeed ? s.history.filter((h) => h.c && h.c === s.prevCommit.slice(0, 12)) : [];

  const load = (h) => {
    setF({ serverSeed: s.prevSeed, clientSeed: h.cs, nonce: String(h.n), mode: h.mode, betIdx: Math.max(0, BETS.indexOf(h.bet)), buy: h.buy || '' });
    setMine(h);
    setOut(null);
  };

  const run = async () => {
    const nonce = Math.max(0, parseInt(f.nonce, 10) || 0);
    const args = { serverSeed: f.serverSeed.trim(), clientSeed: f.clientSeed, nonce, mode: f.mode, bet: BETS[f.betIdx], buy: f.buy || null };
    const round = roundFor({ ...args, record: true });
    // two independent implementations of the stream must agree
    const checks = [];
    for (let block = 0; block < 3; block++) {
      const a = hmacSha256Hex(args.serverSeed, `${args.clientSeed}:${nonce}:round:${block}`);
      const b = await hmacBlockAsync(args.serverSeed, args.clientSeed, nonce, block);
      checks.push(a === b);
    }
    const hashA = sha256Hex(args.serverSeed);
    const hashB = await sha256Async(args.serverSeed);
    const base = round.base;
    const free = round.features.find((x) => x.type === 'free');
    const pond = round.features.find((x) => x.type === 'pond');
    setOut({
      win: round.win,
      capped: round.capped,
      bet: args.bet,
      commit: hashA,
      same: hashA === hashB && checks.every(Boolean),
      lines: [
        base
          ? `Base spin: ${base.steps.length} cascade${base.steps.length === 1 ? '' : 's'}, ${base.steps.reduce((a, st) => a + st.clusters.length, 0)} winning groups, paid ${money(base.total)}`
          : 'No base spin (a bought bonus)',
        free ? `Lantern Night: ${free.played} spins, paid ${money(free.total)}` : null,
        pond ? `Koi Pond: ${pond.start.length + pond.respins.reduce((a, r) => a + r.landed.length, 0)} koi, paid ${money(pond.total)}` : null,
      ].filter(Boolean),
    });
  };

  const known = out && s.prevCommit && out.commit === s.prevCommit;
  return (
    <section className="card">
      <h2>Check a round</h2>
      {loadable.length > 0 && (
        <div className="row">
          <span className="muted">Rounds you played under the revealed seed:</span>
          <div className="chips">
            {loadable.slice(0, 12).map((h) => (
              <button key={`${h.n}-${h.t}`} className={`chip ${mine && mine.n === h.n ? 'is-on' : ''}`} onClick={() => load(h)}>
                #{h.n} · {h.win > 0 ? `+${money(h.win)}` : '0.00'}
              </button>
            ))}
          </div>
        </div>
      )}
      <label className="kv">
        <span>Server seed</span>
        <input
          className="field mono"
          value={f.serverSeed}
          onChange={(e) => set('serverSeed', e.target.value)}
          placeholder="the revealed seed"
          spellCheck={false}
        />
      </label>
      <label className="kv">
        <span>Client seed</span>
        <input className="field mono" value={f.clientSeed} onChange={(e) => set('clientSeed', e.target.value)} spellCheck={false} />
      </label>
      <div className="grid3">
        <label className="kv">
          <span>Nonce</span>
          <input className="field mono" inputMode="numeric" value={f.nonce} onChange={(e) => set('nonce', e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="kv">
          <span>Sheet</span>
          <select className="field" value={f.mode} onChange={(e) => set('mode', e.target.value)}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="kv">
          <span>Bet</span>
          <select className="field" value={f.betIdx} onChange={(e) => set('betIdx', +e.target.value)}>
            {BETS.map((b, i) => (
              <option key={b} value={i}>
                {money(b)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="kv">
        <span>Round type</span>
        <select className="field" value={f.buy} onChange={(e) => set('buy', e.target.value)}>
          <option value="">A normal spin</option>
          <option value="free">A bought Lantern Night</option>
          <option value="pond">A bought Koi Pond</option>
        </select>
      </label>
      <div className="row">
        <button className="btn btn--go" onClick={run} disabled={!f.serverSeed.trim() || !f.clientSeed}>
          Replay this round
        </button>
      </div>

      {out && (
        <div className="verdict">
          <div className="verdict__row">
            <span>Replayed win</span>
            <b>
              {money(out.win)} <small>({times(out.win / out.bet)})</small>
              {out.capped ? ' · max win' : ''}
            </b>
          </div>
          {mine && (
            <div className={`verdict__row ${mine.win === out.win ? 'ok' : 'bad'}`}>
              <span>Win you were paid</span>
              <b>
                {money(mine.win)} {mine.win === out.win ? '✓ same' : '✗ different'}
              </b>
            </div>
          )}
          {s.prevCommit && (
            <div className={`verdict__row ${known ? 'ok' : ''}`}>
              <span>Seed hash</span>
              <b>{known ? `✓ matches the commit shown before play (${short(out.commit, 14)})` : short(out.commit, 18)}</b>
            </div>
          )}
          <div className={`verdict__row ${out.same ? 'ok' : 'bad'}`}>
            <span>Second implementation (crypto.subtle)</span>
            <b>{out.same ? '✓ agrees on the hash and the first 3 stream blocks' : '✗ disagrees'}</b>
          </div>
          <ul className="verdict__list">
            {out.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export { commitOf };
