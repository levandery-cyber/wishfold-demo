// The board, drawn and animated by hand. React renders the frame once; everything on the 7 x 7 grid is created here as plain DOM and
// moved with the Web Animations API, so a cascade can be written as a straight line of `await`s.
//
// Positions are CSS variables (--c, --r) in tile units, so a resize needs no work. An animation only ever offsets a tile from the
// place its variables already put it in.
import { Confetti, PAPER } from './confetti.js';
import { artUrl, starBucket, symArt } from './art/names.js';
import { H, N, SYM, W } from './engine/config.js';
import { sfx } from './audio.js';

const TIER_CLASS = ['kraft', 'kraft', 'kraft', 'washi', 'washi', 'gilt', 'gilt', 'holo', 'holo'];
const SPECIAL_CLASS = { 9: 'wild', 10: 'lantern', 11: 'koi', 12: 'crane' };
const TAGS = { 9: 'WILD', 10: 'FREE', 11: 'KOI', 12: 'WISH' };
const KOI_ART = ['koi-orange', 'koi-kohaku', 'koi-ogon', 'koi-moon'];

const rc = (i) => [Math.floor(i / W), i % W];
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

export function tokenText(cents) {
  const v = cents / 100;
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, '');
}

export class BoardView {
  constructor(el, { fmt, bet = 100 } = {}) {
    this.el = el;
    this.fmt = fmt || ((c) => String(c / 100));
    this.bet = bet;
    this.speed = 1;
    this.dead = false;
    this.tiles = new Array(N).fill(null);
    this.stars = new Array(N).fill(null);
    this.reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    el.textContent = '';
    this.layerTiles = this.#layer('layer layer--tiles');
    this.layerStars = this.#layer('layer layer--stars');
    this.layerFx = this.#layer('layer layer--fx');
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'board__confetti';
    this.layerFx.appendChild(this.canvas);
    this.confetti = new Confetti(this.canvas);
    this.ro = new ResizeObserver(() => this.confetti.resize());
    this.ro.observe(this.canvas);
  }

  #layer(cls) {
    const d = document.createElement('div');
    d.className = cls;
    this.el.appendChild(d);
    return d;
  }

  destroy() {
    this.dead = true;
    this.ro?.disconnect();
    this.confetti?.stop();
    this.el.textContent = '';
  }

  get t() {
    return this.el.clientWidth / W || 70;
  }

  setBet(bet) {
    this.bet = bet;
  }
  setSpeed(s) {
    this.speed = s;
  }
  wait(ms) {
    return this.dead ? Promise.resolve() : sleep(ms / this.speed);
  }

  // WAAPI with the speed factor baked in; resolves even if the animation is cancelled.
  anim(el, frames, opts = {}) {
    if (!el || this.dead) return Promise.resolve();
    const { duration = 300, delay = 0, easing = 'ease', fill = 'both' } = opts;
    const k = this.speed * (this.reduce ? 6 : 1); // people who ask for less motion get the same story, much faster
    const a = el.animate(frames, { duration: duration / k, delay: delay / k, easing, fill });
    return a.finished.catch(() => {});
  }

  // ------------------------------------------------------------------ building pieces
  makeTile(s, i) {
    const [r, c] = rc(i);
    const el = document.createElement('div');
    const cls = s < 9 ? TIER_CLASS[s] : SPECIAL_CLASS[s];
    el.className = `tile tile--${cls}`;
    el.style.setProperty('--c', c);
    el.style.setProperty('--r', r);
    el.dataset.s = s;
    el.innerHTML = `<i class="tile__card"></i><img class="tile__img" src="${artUrl(symArt(s))}" alt="" draggable="false">${TAGS[s] ? `<b class="tile__tag">${TAGS[s]}</b>` : ''}`;
    return el;
  }

  makeStar(i, v) {
    const [r, c] = rc(i);
    const el = document.createElement('div');
    el.className = 'star';
    el.style.setProperty('--c', c);
    el.style.setProperty('--r', r);
    el.dataset.v = v;
    if (v >= 100) el.dataset.big = '1';
    el.innerHTML = `<img src="${artUrl(`star-${starBucket(v)}`)}" alt="" draggable="false"><b>${v}x</b>`;
    return el;
  }

  makeToken(kind, value, i, rot) {
    const [r, c] = rc(i);
    const el = document.createElement('div');
    el.className = `tile tile--token k${kind}`;
    el.style.setProperty('--c', c);
    el.style.setProperty('--r', r);
    el.style.setProperty('--rot', `${rot}deg`);
    el.dataset.kind = kind;
    el.innerHTML = `<i class="tile__card"></i><img class="tile__img" src="${artUrl(KOI_ART[kind])}" alt="" draggable="false"><b class="token__v">${tokenText(value * this.bet)}</b>`;
    return el;
  }

  // ------------------------------------------------------------------ plain state
  clear() {
    this.layerTiles.textContent = '';
    this.layerStars.textContent = '';
    this.layerFx.querySelectorAll('.paytag, .flyer').forEach((n) => n.remove());
    this.tiles.fill(null);
    this.stars.fill(null);
    this.el.classList.remove('has-win');
  }

  // Show a board instantly, without any motion.
  show(g, mat) {
    this.clear();
    for (let i = 0; i < N; i++) {
      const el = this.makeTile(g[i], i);
      this.layerTiles.appendChild(el);
      this.tiles[i] = el;
    }
    this.syncStars(mat);
  }

  syncStars(mat) {
    for (let i = 0; i < N; i++) {
      const want = mat ? mat[i] : 0;
      const have = this.stars[i];
      if (want > 0 && (!have || +have.dataset.v !== want)) {
        have?.remove();
        const el = this.makeStar(i, want);
        this.layerStars.appendChild(el);
        this.stars[i] = el;
      } else if (!want && have) {
        have.remove();
        this.stars[i] = null;
      }
    }
  }

  // ------------------------------------------------------------------ the throw
  // Old tiles drop away, then a fresh sheet falls into place column by column.
  async deal(g, mat, { keepStars = false } = {}) {
    const t = this.t;
    const old = this.tiles.map((el, i) => [el, i]).filter(([el]) => el);
    if (old.length) {
      sfx.spin();
      const out = old.map(([el, i]) => {
        const [, c] = rc(i);
        return this.anim(
          el,
          [
            { transform: 'translateY(0)', opacity: 1 },
            { transform: `translateY(${t * (H + 1)}px) rotate(${(c % 2 ? 1 : -1) * 14}deg)`, opacity: 0 },
          ],
          {
            duration: 380,
            delay: c * 28 + Math.random() * 60,
            easing: 'cubic-bezier(.5,0,.9,.5)',
          },
        );
      });
      if (!keepStars) {
        this.stars.forEach((s) => s && this.anim(s, [{ opacity: 1 }, { opacity: 0, transform: 'rotate(9deg) scale(.4)' }], { duration: 220 }));
      }
      await Promise.all(out);
    } else sfx.spin();
    this.layerTiles.textContent = '';
    if (!keepStars) {
      this.layerStars.textContent = '';
      this.stars.fill(null);
    }
    this.tiles.fill(null);
    if (this.dead) return;

    const anims = [];
    for (let c = 0; c < W; c++) {
      for (let r = H - 1; r >= 0; r--) {
        const i = r * W + c;
        const el = this.makeTile(g[i], i);
        this.layerTiles.appendChild(el);
        this.tiles[i] = el;
        anims.push(this.#drop(el, r + 1.4, { delay: c * 62 + (H - 1 - r) * 26, sound: r === H - 1 ? c : -1 }));
      }
    }
    await Promise.all(anims);
    if (this.dead) return;
    await this.#starsIn(mat, keepStars);
  }

  // One tile falls `rows` cells, hits the floor and bounces a little.
  #drop(el, rows, { delay = 0, sound = -1 } = {}) {
    const t = this.t;
    const dist = rows * t;
    const dur = 250 + 85 * Math.sqrt(rows);
    if (sound >= 0) setTimeout(() => !this.dead && sfx.land(sound), (delay + dur * 0.72) / this.speed);
    return this.anim(
      el,
      [
        { transform: `translateY(${-dist}px)`, easing: 'cubic-bezier(.5,0,.9,.55)' },
        { transform: 'translateY(0)', offset: 0.74, easing: 'cubic-bezier(.2,.6,.4,1)' },
        { transform: `translateY(${-0.055 * t}px)`, offset: 0.88, easing: 'cubic-bezier(.6,0,.9,.5)' },
        { transform: 'translateY(0)' },
      ],
      { duration: dur, delay },
    );
  }

  async #starsIn(mat, keepStars) {
    const pops = [];
    for (let i = 0; i < N; i++) {
      const want = mat ? mat[i] : 0;
      if (want > 0 && !(keepStars && this.stars[i] && +this.stars[i].dataset.v === want)) {
        this.stars[i]?.remove();
        const el = this.makeStar(i, want);
        this.layerStars.appendChild(el);
        this.stars[i] = el;
        pops.push(this.popStar(el, pops.length * 40));
      }
    }
    if (pops.length) sfx.star();
    await Promise.all(pops);
  }

  popStar(el, delay = 0) {
    return this.anim(
      el,
      [
        { transform: 'rotate(-40deg) scale(0)', opacity: 0 },
        { transform: 'rotate(18deg) scale(1.35)', opacity: 1, offset: 0.55 },
        { transform: 'rotate(9deg) scale(1)', opacity: 1 },
      ],
      { duration: 420, delay, easing: 'cubic-bezier(.3,1.3,.5,1)' },
    );
  }

  // ------------------------------------------------------------------ crane drop
  // A paper crane glides over the board and leaves pinwheels where it passes.
  async wildDrop(cells) {
    const t = this.t;
    const fly = document.createElement('img');
    fly.className = 'flyer flyer--crane';
    fly.src = artUrl('crane');
    fly.alt = '';
    this.layerFx.appendChild(fly);
    const total = 1250;
    sfx.crane();
    const path = this.anim(
      fly,
      [
        { transform: `translate(${-1.8 * t}px, ${0.2 * t}px) rotate(-6deg)`, opacity: 0 },
        { transform: `translate(${0.2 * t}px, ${-0.1 * t}px) rotate(-4deg)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${3.2 * t}px, ${0.5 * t}px) rotate(2deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${6.4 * t}px, ${-0.1 * t}px) rotate(-3deg)`, opacity: 1, offset: 0.88 },
        { transform: `translate(${8.6 * t}px, ${-0.5 * t}px) rotate(-8deg)`, opacity: 0 },
      ],
      { duration: total, easing: 'linear' },
    );
    for (const i of cells) {
      const [, c] = rc(i);
      const at = ((c + 1.2) / 9.4) * total;
      setTimeout(() => !this.dead && this.convert(i, SYM.WILD), at / this.speed);
    }
    await path;
    fly.remove();
  }

  // Swap the figure on a tile for another one, with a pop.
  convert(i, s) {
    const old = this.tiles[i];
    if (!old) return;
    const el = this.makeTile(s, i);
    old.replaceWith(el);
    this.tiles[i] = el;
    this.anim(el, [{ transform: 'scale(.5) rotate(-30deg)' }, { transform: 'scale(1.2) rotate(8deg)', offset: 0.6 }, { transform: 'scale(1) rotate(0)' }], {
      duration: 380,
      easing: 'cubic-bezier(.3,1.3,.5,1)',
    });
    sfx.reveal(1);
    this.spark(i, ['#ffffff', '#ffe27a', '#8ec8ff']);
  }

  spark(i, colors = PAPER, count = 10) {
    const [r, c] = rc(i);
    const t = this.t;
    this.confetti.burst({ x: (c + 0.5) * t, y: (r + 0.5) * t, count, colors, power: 5, size: t * 0.1, life: 46 });
  }

  // ------------------------------------------------------------------ paying
  async showWins(clusters, { fast = false } = {}) {
    this.el.classList.add('has-win');
    const tags = [];
    const pulses = [];
    clusters.forEach((cl) => {
      let sx = 0;
      let sy = 0;
      for (const i of cl.cells) {
        const [r, c] = rc(i);
        sx += c + 0.5;
        sy += r + 0.5;
        const el = this.tiles[i];
        if (el) {
          el.classList.add('is-win');
          el.style.zIndex = 3;
          pulses.push(
            this.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.09)', offset: 0.4 }, { transform: 'scale(1)' }], {
              duration: 520,
              easing: 'ease-in-out',
            }),
          );
        }
        const st = this.stars[i];
        if (st)
          pulses.push(
            this.anim(
              st,
              [{ transform: 'rotate(9deg) scale(1)' }, { transform: 'rotate(-6deg) scale(1.5)', offset: 0.45 }, { transform: 'rotate(9deg) scale(1.15)' }],
              { duration: 560 },
            ),
          );
      }
      const tag = document.createElement('div');
      tag.className = 'paytag';
      // keep the label inside the board even when the group hugs an edge
      tag.style.setProperty('--x', Math.min(W - 1.0, Math.max(1.0, sx / cl.cells.length)).toFixed(2));
      tag.style.setProperty('--y', Math.min(H - 0.45, Math.max(0.45, sy / cl.cells.length)).toFixed(2));
      tag.innerHTML = `${this.fmt(cl.pay)}${cl.mult > 1 ? `<small>${cl.mult}x</small>` : ''}`;
      this.layerFx.appendChild(tag);
      tags.push(tag);
      this.anim(
        tag,
        [
          { transform: 'translate(-50%,-50%) rotate(-3deg) scale(0)', opacity: 0 },
          { transform: 'translate(-50%,-50%) rotate(-3deg) scale(1.15)', opacity: 1, offset: 0.6 },
          { transform: 'translate(-50%,-50%) rotate(-3deg) scale(1)' },
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(.3,1.3,.5,1)',
        },
      );
    });
    this._tags = tags;
    await Promise.all(pulses.slice(0, 1));
    await this.wait(fast ? 420 : 780);
  }

  // The cluster leaves: tiles fold up and fly apart as paper.
  async clearWins(cells, peel = []) {
    const t = this.t;
    const leaving = [];
    sfx.fold();
    for (const i of cells) {
      const el = this.tiles[i];
      if (!el) continue;
      const [r, c] = rc(i);
      leaving.push(
        this.anim(
          el,
          [
            { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            { transform: 'scale(1.14) rotate(-5deg)', opacity: 1, offset: 0.3 },
            { transform: `scale(.05) rotate(${(i % 2 ? 1 : -1) * 32}deg)`, opacity: 0 },
          ],
          {
            duration: 330,
            delay: (i % 5) * 14,
            easing: 'cubic-bezier(.4,0,.8,.6)',
          },
        ).then(() => el.remove()),
      );
      this.tiles[i] = null;
      const tier = +el.dataset.s;
      const pal =
        tier >= 7
          ? ['#ffd6f2', '#c8d7ff', '#c9fff0', '#fff4c2']
          : tier >= 5
            ? ['#ffd45e', '#f6c332', '#fff1a8']
            : tier >= 3
              ? ['#fffaf0', '#efd9b8', '#ffe27a']
              : ['#e8bd86', '#c68b4e', '#fff6e4'];
      this.confetti.burst({ x: (c + 0.5) * t, y: (r + 0.5) * t, count: 5, colors: pal, power: 5.5, size: t * 0.11, life: 50, gravity: 0.3 });
    }
    for (const { i } of peel) {
      const st = this.stars[i];
      if (!st) continue;
      this.stars[i] = null;
      leaving.push(
        this.anim(
          st,
          [
            { transform: 'rotate(9deg) scale(1.15)', opacity: 1 },
            { transform: `translateY(${-0.7 * t}px) rotate(50deg) scale(1.6)`, opacity: 0 },
          ],
          { duration: 520, easing: 'ease-out' },
        ).then(() => st.remove()),
      );
    }
    (this._tags || []).forEach((tag) =>
      this.anim(tag, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-90%) rotate(-3deg)' }], { duration: 300, delay: 140 }).then(() => tag.remove()),
    );
    this._tags = [];
    this.el.classList.remove('has-win');
    await Promise.all(leaving);
  }

  // Everything above a gap falls; fresh tiles arrive from over the top edge.
  async fall({ moves, fills, newStars }) {
    const next = new Array(N).fill(null);
    const moved = new Set(moves.map((m) => m[0]));
    for (let i = 0; i < N; i++) if (this.tiles[i] && !moved.has(i)) next[i] = this.tiles[i];
    const anims = [];
    for (const [from, to] of moves) {
      const el = this.tiles[from];
      next[to] = el;
      const rows = (to - from) / W;
      const [r] = rc(to);
      el.style.setProperty('--r', r);
      anims.push(this.#drop(el, rows, { delay: Math.random() * 40, sound: -1 }));
    }
    const perCol = new Array(W).fill(0);
    for (const f of fills) perCol[f.i % W]++;
    for (const f of fills) {
      const el = this.makeTile(f.sym, f.i);
      this.layerTiles.appendChild(el);
      next[f.i] = el;
      const [r, c] = rc(f.i);
      anims.push(this.#drop(el, perCol[c] + 0.4, { delay: 30 + (perCol[c] - 1 - r) * 22 + Math.random() * 30, sound: r === perCol[c] - 1 ? c : -1 }));
    }
    this.tiles = next;
    await Promise.all(anims);
    if (this.dead) return;
    const pops = [];
    for (const { i, v } of newStars || []) {
      this.stars[i]?.remove();
      const el = this.makeStar(i, v);
      this.layerStars.appendChild(el);
      this.stars[i] = el;
      pops.push(this.popStar(el, pops.length * 40));
    }
    if (pops.length) sfx.star();
    await Promise.all(pops);
  }

  // ------------------------------------------------------------------ stickers changed by the wish tags
  async changeStars(mat, { pulse = true } = {}) {
    const pops = [];
    for (let i = 0; i < N; i++) {
      const want = mat[i];
      const have = this.stars[i];
      if (want > 0 && (!have || +have.dataset.v !== want)) {
        have?.remove();
        const el = this.makeStar(i, want);
        this.layerStars.appendChild(el);
        this.stars[i] = el;
        pops.push(this.popStar(el, pops.length * 35));
      }
    }
    if (pops.length && pulse) sfx.star();
    await Promise.all(pops);
  }

  // ------------------------------------------------------------------ scatters and cranes
  async pulse(indices, { color = 'rgba(255,220,120,.9)' } = {}) {
    const pulses = [];
    for (const i of indices) {
      const el = this.tiles[i];
      if (!el) continue;
      el.style.zIndex = 3;
      pulses.push(
        this.anim(
          el,
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.16) rotate(-3deg)', offset: 0.3 },
            { transform: 'scale(1.06) rotate(2deg)', offset: 0.6 },
            { transform: 'scale(1.16) rotate(-3deg)', offset: 0.8 },
            { transform: 'scale(1)' },
          ],
          { duration: 900, easing: 'ease-in-out' },
        ),
      );
      this.spark(i, [color, '#fff', '#ffe27a'], 8);
    }
    await Promise.all(pulses);
    for (const i of indices) if (this.tiles[i]) this.tiles[i].style.zIndex = '';
  }

  rectOf(i) {
    return this.tiles[i]?.getBoundingClientRect() || null;
  }

  // The cranes on the board fly to the wish string.
  async flyCranes(indices, targetEl, onArrive) {
    const flights = [];
    const target = targetEl?.getBoundingClientRect();
    indices.forEach((i, k) => {
      const el = this.tiles[i];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const img = document.createElement('img');
      img.src = artUrl('crane');
      img.alt = '';
      Object.assign(img.style, {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width * 0.8}px`,
        height: `${r.height * 0.8}px`,
        zIndex: 40,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 4px rgba(40,10,70,.4))',
      });
      document.body.appendChild(img);
      const dx = target ? target.left + target.width / 2 - (r.left + r.width * 0.4) : 0;
      const dy = target ? target.top + target.height / 2 - (r.top + r.height * 0.4) : -200;
      this.anim(el, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.7)' }], { duration: 200 });
      this.tiles[i] = null;
      setTimeout(() => el.remove(), 260);
      sfx.crane();
      flights.push(
        this.anim(
          img,
          [
            { transform: 'translate(0,0) scale(1) rotate(0)' },
            { transform: `translate(${dx * 0.3}px, ${dy * 0.3 - 40}px) scale(1.25) rotate(-12deg)`, offset: 0.35 },
            { transform: `translate(${dx}px, ${dy}px) scale(.55) rotate(8deg)`, opacity: 0.9 },
          ],
          { duration: 760, delay: k * 110, easing: 'cubic-bezier(.4,0,.2,1)' },
        ).then(() => {
          img.remove();
          onArrive?.(k);
        }),
      );
    });
    await Promise.all(flights);
  }

  // ------------------------------------------------------------------ the koi pond
  pondEnter() {
    this.clear();
    this.el.dataset.pond = '1';
    for (let i = 0; i < N; i++) {
      const [r, c] = rc(i);
      const d = document.createElement('i');
      d.className = 'pcell';
      d.style.setProperty('--c', c);
      d.style.setProperty('--r', r);
      d.style.setProperty('--d', `${(Math.random() * 4).toFixed(2)}s`);
      this.layerTiles.appendChild(d);
    }
  }

  pondExit() {
    delete this.el.dataset.pond;
    this.clear();
  }

  // Put koi on the pond. `landed` is [{ i, kind, value }].
  async pondLand(landed, { instant = false } = {}) {
    const t = this.t;
    const anims = [];
    landed.forEach((k, n) => {
      this.tiles[k.i]?.remove();
      const rot = (k.i * 47 + k.kind * 23) % 360;
      const el = this.makeToken(k.kind, k.value, k.i, rot);
      this.layerTiles.appendChild(el);
      this.tiles[k.i] = el;
      if (instant) return;
      const delay = n * 170;
      setTimeout(() => !this.dead && sfx.plop(), delay / this.speed);
      anims.push(
        this.anim(
          el,
          [
            { transform: 'scale(0) rotate(-40deg)', opacity: 0 },
            { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.55 },
            { transform: 'scale(1) rotate(0)', opacity: 1 },
          ],
          { duration: 480, delay, easing: 'cubic-bezier(.3,1.3,.5,1)' },
        ),
      );
      const [r, c] = rc(k.i);
      setTimeout(
        () =>
          !this.dead &&
          this.confetti.burst({
            x: (c + 0.5) * t,
            y: (r + 0.5) * t,
            count: 8,
            colors: ['#d9fffb', '#8ef0d0', '#fff'],
            power: 4,
            size: t * 0.09,
            life: 40,
            gravity: 0.15,
          }),
        (delay + 200) / this.speed,
      );
    });
    await Promise.all(anims);
  }

  // The moon koi collects: every koi gives a nod.
  async pondNod() {
    const all = this.tiles.filter((el) => el && el.classList.contains('tile--token'));
    await Promise.all(
      all.map((el, k) =>
        this.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420, delay: k * 18 }),
      ),
    );
  }
}
