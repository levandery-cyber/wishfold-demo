// The wallet and the rules around a round. Framework free: injectable storage and rng so tests can drive it.
// Money is integer cents. A round is decided the moment it starts and its win is only credited when `settle` is called, but the win
// is also parked in `pending` (and saved) so a reload in the middle of an animation can never lose it.
import { MODES, costOf } from './engine/config.js';
import { commitOf, randomSeed, roundFor } from './fair.js';
import { clamp } from './format.js';
import { priceOf } from './rtp.js';

export const KEY = 'wishfold:v1';
export const BETS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]; // cents
export const START_BALANCE = 1000000;
export const TOP_UP = 500000;
const HISTORY_MAX = 80;

const blankStats = () => ({ rounds: 0, wagered: 0, won: 0, best: 0, bestMult: 0, free: 0, pond: 0, spins: 0 });

function fresh(rand = randomSeed) {
  return {
    v: 1,
    balance: START_BALANCE,
    betIdx: 2,
    mode: 'normal',
    sound: true,
    music: false,
    turbo: false,
    clientSeed: `wish-${rand(3)}`,
    serverSeed: rand(16),
    prevSeed: null,
    nonce: 0,
    stats: blankStats(),
    history: [],
    pending: null,
  };
}

export class Game {
  constructor({ storage = null, now = () => Date.now(), rand = randomSeed } = {}) {
    this.storage = storage;
    this.now = now;
    this.rand = rand;
    this.d = fresh(rand);
    this.subs = new Set();
    this.listeners = {};
    this.snap = this.#snapshot();
  }

  // ------------------------------------------------------------------ plumbing
  subscribe = (fn) => {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  };
  getSnapshot = () => this.snap;

  on(type, fn) {
    (this.listeners[type] ||= new Set()).add(fn);
    return () => this.listeners[type].delete(fn);
  }
  #fire(type, payload) {
    this.listeners[type]?.forEach((fn) => fn(payload));
  }
  toast(text, tone = 'info') {
    this.#fire('toast', { text, tone, id: Math.random().toString(36).slice(2) });
  }

  #snapshot() {
    const d = this.d;
    const bet = BETS[d.betIdx];
    const ready = this.ready === true;
    // Before the save has loaded the seeds are random, and random text would not match the server's render.
    return {
      ready,
      balance: d.balance,
      bet,
      betIdx: d.betIdx,
      mode: d.mode,
      cost: bet * costOf(d.mode),
      sound: d.sound,
      music: d.music,
      turbo: d.turbo,
      clientSeed: ready ? d.clientSeed : '',
      commit: ready ? commitOf(d.serverSeed) : '',
      prevSeed: d.prevSeed,
      prevCommit: d.prevSeed ? commitOf(d.prevSeed) : null,
      nonce: d.nonce,
      stats: d.stats,
      history: d.history,
      broke: d.balance < BETS[0],
    };
  }
  #emit() {
    this.snap = this.#snapshot();
    this.subs.forEach((fn) => fn());
  }
  #save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(KEY, JSON.stringify(this.d));
    } catch {
      /* storage can be full or blocked; the game still works, it just will not remember */
    }
  }

  // ------------------------------------------------------------------ lifecycle
  init() {
    if (this.storage) {
      try {
        const raw = this.storage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d && d.v === 1) this.d = { ...fresh(this.rand), ...d, stats: { ...blankStats(), ...d.stats } };
        }
      } catch {
        /* a corrupt save is treated as no save */
      }
    }
    this.d.betIdx = clamp(this.d.betIdx | 0, 0, BETS.length - 1);
    if (!MODES.some((m) => m.id === this.d.mode)) this.d.mode = 'normal';
    this.ready = true;
    // A round that was decided but never settled (the tab was closed mid-animation): pay it now.
    const p = this.d.pending;
    if (p) {
      this.d.pending = null;
      this.d.balance += p.win;
      this.#book({ nonce: p.nonce, mode: p.mode, bet: p.bet, cost: p.cost, win: p.win, buy: p.buy, kinds: p.kinds || [], c: p.c, cs: p.cs });
      if (p.win > 0) this.toast('Your last win was credited.', 'good');
    }
    this.#save();
    this.#emit();
  }

  // ------------------------------------------------------------------ settings
  setBet(i) {
    this.d.betIdx = clamp(i, 0, BETS.length - 1);
    this.#save();
    this.#emit();
  }
  bump(dir) {
    this.setBet(this.d.betIdx + dir);
  }
  setMode(id) {
    if (!MODES.some((m) => m.id === id)) return;
    this.d.mode = id;
    this.#save();
    this.#emit();
  }
  setSound(on) {
    this.d.sound = on;
    this.#save();
    this.#emit();
  }
  setMusic(on) {
    this.d.music = on;
    this.#save();
    this.#emit();
  }
  setTurbo(on) {
    this.d.turbo = on;
    this.#save();
    this.#emit();
  }

  // ------------------------------------------------------------------ money
  priceFor(kind) {
    return BETS[this.d.betIdx] * priceOf(this.d.mode, kind);
  }
  canAfford(buy = null) {
    return this.d.balance >= (buy ? this.priceFor(buy) : BETS[this.d.betIdx] * costOf(this.d.mode));
  }

  // Decide a round now. Returns { round, cost } or { error }.
  begin({ buy = null } = {}) {
    const d = this.d;
    const bet = BETS[d.betIdx];
    const cost = buy ? this.priceFor(buy) : bet * costOf(d.mode);
    if (d.balance < cost) return { error: 'funds' };
    d.balance -= cost;
    d.nonce += 1;
    const round = roundFor({ serverSeed: d.serverSeed, clientSeed: d.clientSeed, nonce: d.nonce, mode: d.mode, bet, buy, record: true });
    round.cost = cost;
    round.nonce = d.nonce;
    round.kinds = round.features.map((f) => f.type);
    d.pending = { win: round.win, cost, mode: d.mode, bet, buy, nonce: d.nonce, kinds: round.kinds, c: commitOf(d.serverSeed).slice(0, 12), cs: d.clientSeed };
    this.#save();
    this.#emit();
    return { round, cost };
  }

  settle(round) {
    const d = this.d;
    if (!d.pending || d.pending.nonce !== round.nonce) return 0;
    const p = d.pending;
    d.pending = null;
    d.balance += round.win;
    this.#book({
      nonce: round.nonce,
      mode: round.mode,
      bet: round.bet,
      cost: round.cost,
      win: round.win,
      buy: round.buy,
      kinds: round.kinds,
      c: p.c,
      cs: p.cs,
    });
    this.#save();
    this.#emit();
    return round.win;
  }

  #book({ nonce, mode, bet, cost, win, buy, kinds, c, cs }) {
    const d = this.d;
    const s = d.stats;
    s.rounds += 1;
    s.wagered += cost;
    s.won += win;
    if (win > s.best) s.best = win;
    const mult = win / bet;
    if (mult > s.bestMult) s.bestMult = mult;
    if (kinds.includes('free')) s.free += 1;
    if (kinds.includes('pond')) s.pond += 1;
    d.history.unshift({ n: nonce, t: this.now(), mode, bet, cost, win, buy, kinds, c, cs });
    if (d.history.length > HISTORY_MAX) d.history.length = HISTORY_MAX;
  }

  topUp() {
    this.d.balance += TOP_UP;
    this.#save();
    this.#emit();
    this.toast('Added 5,000.00 demo coins.', 'good');
  }

  // ------------------------------------------------------------------ fairness
  setClientSeed(text) {
    this.d.clientSeed = String(text).slice(0, 40) || this.d.clientSeed;
    this.#save();
    this.#emit();
  }
  // Reveal the current server seed and start a new one. Nonces start over.
  rotateSeed() {
    this.d.prevSeed = this.d.serverSeed;
    this.d.serverSeed = this.rand(16);
    this.d.nonce = 0;
    this.#save();
    this.#emit();
  }

  resetDemo() {
    const keep = { sound: this.d.sound, music: this.d.music, turbo: this.d.turbo };
    this.d = { ...fresh(this.rand), ...keep };
    this.#save();
    this.#emit();
  }
}
