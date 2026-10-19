import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, webcrypto } from 'node:crypto';
import { fairRng, fastRng } from '../lib/engine/rng.js';
import { commitOf, randomSeed, roundFor, verifyRound } from '../lib/fair.js';
import { hmacBlockAsync, sha256Async } from '../lib/fairAsync.js';
import { hmacSha256Hex, sha256Hex } from '../lib/sha256.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

test('the hand-written SHA-256 and HMAC agree with node:crypto', () => {
  const samples = ['', 'abc', 'wishfold', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(200), 'ünïcödé ✦'];
  for (const s of samples) assert.equal(sha256Hex(s), createHash('sha256').update(s).digest('hex'), JSON.stringify(s.slice(0, 12)));
  for (const [k, m] of [
    ['key', 'message'],
    ['k'.repeat(80), 'long key'],
    ['', ''],
    ['seed', 'client:1:round:0'],
  ]) {
    assert.equal(hmacSha256Hex(k, m), createHmac('sha256', k).update(m).digest('hex'));
  }
});

test('the browser-style crypto.subtle twin agrees with the synchronous one', async () => {
  assert.equal(await sha256Async('seed'), sha256Hex('seed'));
  for (let block = 0; block < 4; block++) {
    assert.equal(await hmacBlockAsync('abc123', 'me', 7, block), hmacSha256Hex('abc123', `me:7:round:${block}`));
  }
});

test('the fair stream is a pure function of seed, client seed and nonce', () => {
  const a = fairRng('s', 'c', 1);
  const b = fairRng('s', 'c', 1);
  const run = (r) => Array.from({ length: 40 }, () => r.int(1000));
  assert.deepEqual(run(a), run(b));
  assert.notDeepEqual(run(fairRng('s', 'c', 1)), run(fairRng('s', 'c', 2)));
  assert.notDeepEqual(run(fairRng('s', 'c', 1)), run(fairRng('s', 'd', 1)));
  assert.notDeepEqual(run(fairRng('s', 'c', 1)), run(fairRng('t', 'c', 1)));
});

test('int(n) is unbiased and float draws stay in [0, 1)', () => {
  const r = fairRng('unbiased', 'test', 1);
  const n = 7;
  const counts = new Array(n).fill(0);
  const draws = 70000;
  for (let i = 0; i < draws; i++) counts[r.int(n)]++;
  const want = draws / n;
  for (const c of counts) assert.ok(Math.abs(c - want) < 6 * Math.sqrt(want), `${counts}`);
  for (let i = 0; i < 2000; i++) {
    const x = r.next();
    assert.ok(x >= 0 && x < 1);
  }
  const f = fastRng(1);
  for (let i = 0; i < 2000; i++) {
    const x = f.next();
    assert.ok(x >= 0 && x < 1);
  }
});

test('a round can be replayed from its seeds and lands on the same win', () => {
  const serverSeed = randomSeed();
  const commit = commitOf(serverSeed);
  assert.match(serverSeed, /^[0-9a-f]{32}$/);
  for (let nonce = 1; nonce <= 80; nonce++) {
    for (const mode of ['normal', 'luck', 'stars', 'wings']) {
      const played = roundFor({ serverSeed, clientSeed: 'player', nonce, mode, bet: 200, record: true });
      const v = verifyRound({ serverSeed, clientSeed: 'player', nonce, mode, bet: 200, buy: null, commit });
      assert.equal(v.hashOk, true);
      assert.equal(v.win, played.win);
      assert.deepEqual(
        v.features,
        played.features.map((f) => f.type),
      );
    }
  }
  assert.equal(verifyRound({ serverSeed: 'another', clientSeed: 'player', nonce: 1, mode: 'normal', bet: 100, buy: null, commit }).hashOk, false);
});

test('bought bonuses replay too', () => {
  const serverSeed = 'f00dcafe00112233445566778899aabb';
  for (const buy of ['free', 'pond']) {
    const a = roundFor({ serverSeed, clientSeed: 'x', nonce: 9, mode: 'stars', bet: 100, buy, record: true });
    const b = roundFor({ serverSeed, clientSeed: 'x', nonce: 9, mode: 'stars', bet: 100, buy, record: false });
    assert.equal(a.win, b.win);
  }
});

test('a known round stays known (a regression anchor for the whole engine)', () => {
  // If this changes, either the engine or the stream changed, and every old round would verify differently.
  const r = roundFor({ serverSeed: 'f00dcafe00112233445566778899aabb', clientSeed: 'test', nonce: 55, mode: 'normal', bet: 100 });
  assert.equal(r.win, 36280);
  assert.deepEqual(
    r.features.map((f) => f.type),
    ['free'],
  );
});
