// Paper confetti on a canvas: little rectangles that tumble and flutter. One class serves the board (small bursts when tiles
// leave) and the whole stage (a shower for big wins). The loop only runs while something is alive.

export const PAPER = ['#ff4b3e', '#ffbf1f', '#6fcf4d', '#19b5b0', '#46a8ff', '#8c5cff', '#ff7eb3', '#fff6e4'];

export class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];
    this.raf = 0;
    this.last = 0;
    this.dpr = 1;
    this.reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
  }

  add(p) {
    this.items.push(p);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }
  }

  // A burst from a point. Positions are CSS pixels relative to the canvas.
  burst({ x, y, count = 16, colors = PAPER, power = 7, spread = Math.PI * 2, angle = -Math.PI / 2, gravity = 0.32, size = 9, life = 70 }) {
    const n = this.reduce ? Math.ceil(count / 4) : count;
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = power * (0.4 + Math.random() * 0.8);
      this.add({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        flip: Math.random() * 6.28,
        vf: 0.15 + Math.random() * 0.25,
        w: size * (0.6 + Math.random() * 0.9),
        h: size * (0.35 + Math.random() * 0.45),
        color: colors[(Math.random() * colors.length) | 0],
        g: gravity,
        life,
        age: 0,
      });
    }
  }

  // A long shower from the top edge.
  rain({ count = 120, colors = PAPER, size = 11, duration = 140 }) {
    const n = this.reduce ? Math.ceil(count / 5) : count;
    for (let i = 0; i < n; i++) {
      this.add({
        x: Math.random() * this.w,
        y: -20 - Math.random() * this.h * 0.5,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 1.5 + Math.random() * 3.5,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.18,
        flip: Math.random() * 6.28,
        vf: 0.08 + Math.random() * 0.16,
        w: size * (0.7 + Math.random() * 0.9),
        h: size * (0.4 + Math.random() * 0.5),
        color: colors[(Math.random() * colors.length) | 0],
        g: 0.045,
        life: duration + Math.random() * 60,
        age: 0,
      });
    }
  }

  tick(now) {
    const dt = Math.min(2.5, (now - this.last) / 16.67);
    this.last = now;
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(dpr, dpr);
    const alive = [];
    for (const p of this.items) {
      p.age += dt;
      p.vy += p.g * dt;
      p.vx *= 0.992;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      if (p.age < p.life && p.y < this.h + 40) {
        const fade = Math.min(1, (p.life - p.age) / 18);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        alive.push(p);
      }
    }
    this.items = alive;
    if (alive.length) this.raf = requestAnimationFrame((t) => this.tick(t));
    else {
      this.raf = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.items = [];
  }
}
