// Plays a finished round on the screen. The engine has already decided everything; this only decides how long to look at it.
//
// `ui` is the small surface the React side provides:
//   setWin(cents)  setFree(fn|obj|null)  setPond(fn|obj|null)  setScene(name)  setMode('base'|'free'|'pond')
//   banner(opts) -> Promise    pick(pick) -> Promise    bigWin(info) -> Promise    meterEl() -> element    fast() -> boolean
import { FREE, POND } from './engine/config.js';
import { money } from './format.js';
import { sfx } from './audio.js';

export const BIG_TIERS = [
  { at: 10, name: 'Big win', rank: 0 },
  { at: 25, name: 'Mega win', rank: 1 },
  { at: 60, name: 'Super win', rank: 2 },
  { at: 150, name: 'Epic win', rank: 3 },
  { at: 1000, name: 'A wish come true', rank: 4 },
];

export const bigTier = (mult) => [...BIG_TIERS].reverse().find((t) => mult >= t.at) || null;

export class Presenter {
  constructor({ board, ui }) {
    this.board = board;
    this.ui = ui;
    this.running = 0;
  }

  addWin(cents) {
    this.running += cents;
    this.ui.setWin(this.running);
  }

  async playRound(round) {
    const { board, ui } = this;
    this.running = 0;
    ui.setWin(0);
    const free = round.features.find((f) => f.type === 'free');
    const pond = round.features.find((f) => f.type === 'pond');

    if (round.base) {
      await this.spin(round.base, { free: false });
      if (free) {
        await board.pulse(round.base.lanternIdx);
        await this.free(round, free);
      }
      if (pond) {
        await board.pulse(round.base.koiIdx);
        await this.pond(round, pond);
      }
    } else if (free) {
      await this.free(round, free, { bought: true });
    } else if (pond) {
      await this.pond(round, pond, { bought: true });
    }

    // a capped round pays less than the pieces add up to; the number on screen must match what was credited
    if (this.running !== round.win) {
      this.running = round.win;
      ui.setWin(round.win);
    }
    if (round.capped) {
      await ui.banner({ kind: 'max', title: 'Max win', big: money(round.win), sub: `${MAX_LABEL} the bet`, ms: 3200 });
    } else {
      const tier = bigTier(round.win / round.bet);
      if (tier) await ui.bigWin({ tier, amount: round.win, mult: round.win / round.bet });
    }
  }

  // One spin: the throw, then cascades until nothing pays.
  async spin(sp, { free }) {
    const { board } = this;
    await board.deal(sp.g0, sp.mat0, { keepStars: free });
    if (sp.wilds?.length) await board.wildDrop(sp.wilds);
    for (let k = 0; k < sp.steps.length; k++) {
      const step = sp.steps[k];
      const size = Math.max(...step.clusters.map((c) => c.cells.length));
      await board.showWins(step.clusters, { fast: free });
      sfx.win(k, size);
      this.addWin(step.win);
      await board.clearWins(step.removed, step.peel);
      if (sp.capped && k === sp.steps.length - 1) break;
      await board.fall(step);
    }
  }

  // ---------------------------------------------------------------------------------------------- free spins
  async free(round, f, { bought = false } = {}) {
    const { board, ui } = this;
    sfx.feature();
    ui.setScene('night');
    ui.setMode('free');
    await ui.banner({ kind: 'free', title: 'Lantern Night', big: String(f.startSpins), sub: bought ? 'free spins, bought' : 'free spins', ms: 2600 });
    ui.setFree({ left: f.startSpins, meter: 0, total: 0, index: 0 });
    let leftBefore = f.startSpins;
    let spinTotal = 0;
    for (const sp of f.spins) {
      ui.setFree((p) => ({ ...p, left: leftBefore, index: sp.index }));
      await this.spin(sp, { free: true });
      spinTotal += sp.total;
      ui.setFree((p) => ({ ...p, total: spinTotal }));
      if (sp.retrigger) {
        await board.pulse(sp.lanternIdx);
        sfx.scatter(2);
        await ui.banner({ kind: 'retrigger', title: 'More free spins', big: `+${sp.retrigger}`, sub: 'lanterns lit again', ms: 1700 });
      }
      if (sp.cranes > 0) await this.collect(sp);
      leftBefore = sp.left;
      ui.setFree((p) => ({ ...p, left: sp.left, meter: sp.meterAfter }));
      if (sp.left > 0 || sp !== f.spins[f.spins.length - 1]) await board.wait(260);
    }
    if (f.capped) await board.wait(200);
    const tier = bigTier(round.win / round.bet);
    if (!tier && !round.capped) await ui.banner({ kind: 'total', title: 'Free spins total', big: money(f.total), sub: `${f.played} spins`, ms: 2600 });
    ui.setFree(null);
    ui.setScene('dawn');
    ui.setMode('base');
    board.show(round.base ? round.base.gEnd : ui.idle(), null);
  }

  // Cranes fly to the wish string; a full string opens the wish tags.
  async collect(sp) {
    const { board, ui } = this;
    let shown = sp.meterBefore;
    await board.flyCranes(sp.craneIdx, ui.meterEl(), () => {
      shown = Math.min(FREE.meter, shown + 1);
      ui.setFree((p) => ({ ...p, meter: shown }));
    });
    let remaining = sp.meterBefore + sp.cranes;
    for (const pick of sp.picks) {
      remaining -= FREE.meter;
      ui.setFree((p) => ({ ...p, meter: FREE.meter }));
      await board.wait(350);
      sfx.feature();
      await ui.pick(pick);
      ui.setFree((p) => ({ ...p, meter: Math.min(FREE.meter - 1, Math.max(0, remaining)) }));
      await board.changeStars(pick.matAfter);
      await board.wait(300);
    }
  }

  // ---------------------------------------------------------------------------------------------- koi pond
  async pond(round, f, { bought = false } = {}) {
    const { board, ui } = this;
    sfx.feature();
    ui.setScene('pond');
    ui.setMode('pond');
    await ui.banner({ kind: 'pond', title: 'Koi Pond', big: String(POND.respins), sub: bought ? 'respins, bought' : 'respins', ms: 2400 });
    board.pondEnter();
    let sum = 0;
    let count = 0;
    const tally = (list) => {
      for (const k of list) {
        sum += k.value;
        count++;
      }
      ui.setPond((p) => ({ ...p, count, sum: sum * round.bet }));
    };
    ui.setPond({ left: POND.respins, count: 0, sum: 0 });
    await board.wait(400);
    await board.pondLand(f.start);
    tally(f.start);
    this.addWin(f.start.reduce((a, k) => a + k.value * round.bet, 0));
    for (const rs of f.respins) {
      await board.wait(520);
      if (rs.landed.length) {
        await board.pondLand(rs.landed);
        if (rs.landed.some((k) => k.kind === 3)) await board.pondNod();
        tally(rs.landed);
        this.addWin(rs.landed.reduce((a, k) => a + k.value * round.bet, 0));
      }
      ui.setPond((p) => ({ ...p, left: rs.left }));
    }
    await board.wait(500);
    const tier = bigTier(round.win / round.bet);
    if (!tier && !round.capped) await ui.banner({ kind: 'total', title: 'Koi Pond total', big: money(f.total), sub: `${count} koi`, ms: 2600 });
    board.pondExit();
    ui.setPond(null);
    ui.setScene('dawn');
    ui.setMode('base');
    board.show(round.base ? round.base.gEnd : ui.idle(), null);
  }
}

const MAX_LABEL = '5,000x';
