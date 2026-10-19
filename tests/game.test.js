import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES, costOf } from '../lib/engine/config.js';
import { BETS, Game, KEY, START_BALANCE, TOP_UP } from '../lib/game.js';
import { BUY, priceOf } from '../lib/rtp.js';

class Mem {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
}

const seeded = () => {
  let n = 0;
  return (bytes = 16) => `seed${String(++n).padStart(2, '0')}`.padEnd(bytes * 2, '0');
};

function make(storage = new Mem()) {
  const g = new Game({ storage, rand: seeded(), now: () => 1_000_000 });
  g.init();
  return { g, storage };
}

test('a new game starts with demo coins, a one-credit bet and a committed seed', () => {
  const { g } = make();
  const s = g.getSnapshot();
  assert.equal(s.ready, true);
  assert.equal(s.balance, START_BALANCE);
  assert.equal(s.bet, 100);
  assert.equal(s.mode, 'normal');
  assert.equal(s.nonce, 0);
  assert.match(s.commit, /^[0-9a-f]{64}$/);
});

test('before the save loads the snapshot holds nothing random', () => {
  const a = new Game({ storage: null });
  const b = new Game({ storage: null });
  assert.equal(a.getSnapshot().commit, '');
  assert.deepEqual(a.getSnapshot(), b.getSnapshot());
});

test('a round costs the bet (or two bets under a wish) and pays only when it is settled', () => {
  for (const m of MODES) {
    const { g } = make();
    g.setMode(m.id);
    const before = g.getSnapshot().balance;
    const { round, cost } = g.begin();
    assert.equal(cost, 100 * costOf(m.id));
    assert.equal(g.getSnapshot().balance, before - cost, 'the cost is taken up front');
    assert.equal(g.getSnapshot().nonce, 1);
    assert.equal(g.settle(round), round.win);
    assert.equal(g.getSnapshot().balance, before - cost + round.win);
    assert.equal(g.settle(round), 0, 'a round can only be settled once');
    assert.equal(g.getSnapshot().stats.rounds, 1);
  }
});

test('buying a bonus costs the posted price for the current wish', () => {
  for (const mode of ['normal', 'stars']) {
    const { g } = make();
    g.setMode(mode);
    for (const kind of ['free', 'pond']) {
      const price = 100 * priceOf(mode, kind);
      assert.equal(g.priceFor(kind), price);
      const before = g.getSnapshot().balance;
      const { round, cost } = g.begin({ buy: kind });
      assert.equal(cost, price);
      assert.equal(round.base, null);
      assert.equal(round.features[0].type, kind);
      g.settle(round);
      assert.equal(g.getSnapshot().balance, before - price + round.win);
    }
  }
  assert.ok(BUY.normal.free > 0);
});

test('you cannot start a round you cannot pay for', () => {
  const { g } = make();
  g.d.balance = 50;
  g.setBet(2);
  assert.equal(g.canAfford(), false);
  assert.deepEqual(g.begin(), { error: 'funds' });
  assert.equal(g.getSnapshot().balance, 50);
  assert.equal(g.getSnapshot().nonce, 0);
  assert.equal(g.getSnapshot().broke, false);
  g.d.balance = 10;
  g.setBet(2); // any change refreshes the snapshot
  assert.equal(g.getSnapshot().broke, true);
  g.topUp();
  assert.equal(g.getSnapshot().balance, 10 + TOP_UP);
});

test('the bet stays inside the ladder', () => {
  const { g } = make();
  g.setBet(-4);
  assert.equal(g.getSnapshot().bet, BETS[0]);
  g.setBet(99);
  assert.equal(g.getSnapshot().bet, BETS[BETS.length - 1]);
  g.setBet(0);
  g.bump(-1);
  assert.equal(g.getSnapshot().betIdx, 0);
});

test('a round that was decided but never settled is paid when the game loads again', () => {
  const { g, storage } = make();
  let round;
  for (let i = 0; i < 400; i++) {
    const r = g.begin().round;
    if (r.win > 0) {
      round = r;
      break;
    }
    g.settle(r);
  }
  assert.ok(round, 'expected a winning round');
  const balanceAtStart = g.getSnapshot().balance; // the cost is already gone
  const g2 = new Game({ storage, rand: seeded() });
  g2.init(); // the tab was closed mid-animation, then reopened
  assert.equal(g2.getSnapshot().balance, balanceAtStart + round.win);
  assert.equal(g2.getSnapshot().history[0].win, round.win);
  const g3 = new Game({ storage, rand: seeded() });
  g3.init();
  assert.equal(g3.getSnapshot().balance, balanceAtStart + round.win, 'recovered only once');
});

test('history keeps the newest rounds and remembers which seed they were played under', () => {
  const { g } = make();
  const commit = g.getSnapshot().commit.slice(0, 12);
  for (let i = 0; i < 100; i++) {
    const r = g.begin().round;
    g.settle(r);
  }
  const h = g.getSnapshot().history;
  assert.equal(h.length, 80);
  assert.equal(h[0].n, 100);
  assert.equal(h[0].c, commit);
  assert.equal(h[0].cs, g.getSnapshot().clientSeed);
});

test('rotating the seed reveals the old one and restarts the nonce', () => {
  const { g } = make();
  const first = g.getSnapshot().commit;
  g.settle(g.begin().round);
  g.rotateSeed();
  const s = g.getSnapshot();
  assert.equal(s.prevCommit, first, 'the revealed seed hashes to what was committed');
  assert.notEqual(s.commit, first);
  assert.equal(s.nonce, 0);
});

test('settings persist and a corrupt save is ignored', () => {
  const { g, storage } = make();
  g.setBet(5);
  g.setMode('luck');
  g.setSound(false);
  g.setTurbo(true);
  const g2 = new Game({ storage, rand: seeded() });
  g2.init();
  const s = g2.getSnapshot();
  assert.equal(s.betIdx, 5);
  assert.equal(s.mode, 'luck');
  assert.equal(s.sound, false);
  assert.equal(s.turbo, true);
  storage.setItem(KEY, '{not json');
  const g3 = new Game({ storage, rand: seeded() });
  g3.init();
  assert.equal(g3.getSnapshot().balance, START_BALANCE);
});

test('reset wipes the wallet but keeps the sound and turbo choices', () => {
  const { g } = make();
  g.setSound(false);
  g.settle(g.begin().round);
  g.resetDemo();
  const s = g.getSnapshot();
  assert.equal(s.balance, START_BALANCE);
  assert.equal(s.stats.rounds, 0);
  assert.equal(s.sound, false);
});
