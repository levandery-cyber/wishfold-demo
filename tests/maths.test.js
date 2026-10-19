// Statistical checks on the base game with fixed seeds, so they are exact every run. They guard the shape of the maths (how often
// things happen), not the exact return: that is what `npm run sim -- --estimate` measures with far more rounds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from '../lib/engine/config.js';
import { fastRng } from '../lib/engine/rng.js';
import { playRound } from '../lib/engine/round.js';

function base(mode, n = 150000, seed = 11) {
  const rng = fastRng(seed);
  let win = 0;
  let hits = 0;
  let lantern = 0;
  let koi = 0;
  for (let i = 0; i < n; i++) {
    const r = playRound(rng, { mode, bet: 100, features: false });
    win += r.win / 100;
    if (r.win > 0) hits++;
    if (r.lantern >= 3) lantern++;
    if (r.koi >= 3) koi++;
  }
  return { ev: win / n, hit: hits / n, lantern: lantern / n, koi: koi / n };
}

test('classic base game: about 30% of spins pay, lanterns and koi trigger rarely', () => {
  const b = base('normal');
  assert.ok(b.hit > 0.26 && b.hit < 0.34, `hit rate ${b.hit}`);
  assert.ok(b.ev > 0.4 && b.ev < 0.65, `base return ${b.ev}`);
  assert.ok(b.lantern > 1 / 480 && b.lantern < 1 / 220, `lantern 1 in ${(1 / b.lantern).toFixed(0)}`);
  assert.ok(b.koi > 1 / 650 && b.koi < 1 / 280, `koi 1 in ${(1 / b.koi).toFixed(0)}`);
});

test('each wish changes what it says it changes', () => {
  const normal = base('normal');
  const luck = base('luck');
  const stars = base('stars');
  const wings = base('wings');
  assert.ok(luck.lantern > normal.lantern * 2.2 && luck.koi > normal.koi * 2.2, 'luck triggers bonuses far more often');
  assert.ok(stars.ev > normal.ev * 1.4, `stars should lift the base game: ${stars.ev} vs ${normal.ev}`);
  assert.ok(wings.hit > normal.hit * 1.3, `wings should make wins more frequent: ${wings.hit} vs ${normal.hit}`);
  assert.ok(Math.abs(stars.lantern - normal.lantern) / normal.lantern < 0.25, 'stars do not touch the lanterns');
  assert.equal(MODES.length, 4);
});
