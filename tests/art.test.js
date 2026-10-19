import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_NAMES, CRANE_HUES, STAR_HUES, renderArt, starBucket } from '../lib/art/index.js';
import { symArt } from '../lib/art/names.js';
import { SYMBOLS } from '../lib/engine/config.js';

test('every picture renders as a well-formed svg with no stray numbers', () => {
  assert.equal(new Set(ART_NAMES).size, ART_NAMES.length, 'duplicate art names');
  assert.ok(ART_NAMES.length > 40);
  for (const name of ART_NAMES) {
    const svg = renderArt(name);
    assert.ok(svg && svg.startsWith('<svg') && svg.endsWith('</svg>'), name);
    assert.ok(!/NaN|undefined|Infinity|\[object/.test(svg), `${name} has a bad value`);
    assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length, `${name} has unbalanced groups`);
    assert.equal((svg.match(/<defs>/g) || []).length, (svg.match(/<\/defs>/g) || []).length, `${name} has unbalanced defs`);
    assert.ok(svg.length < 90000, `${name} is ${svg.length} bytes`);
    assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  }
  assert.equal(renderArt('nope.svg'), null);
});

test('art is deterministic', () => {
  for (const name of ['scene-dawn.svg', 'sym-fox.svg', 'star-3.svg', 'koi-ogon.svg']) assert.equal(renderArt(name), renderArt(name));
});

test('every symbol the board can show has a picture', () => {
  SYMBOLS.forEach((_, s) => assert.ok(ART_NAMES.includes(`${symArt(s)}.svg`), `symbol ${s} -> ${symArt(s)}`));
  for (let i = 0; i < STAR_HUES.length; i++) assert.ok(ART_NAMES.includes(`star-${i}.svg`));
  for (let i = 0; i < CRANE_HUES.length; i++) assert.ok(ART_NAMES.includes(`crane-${i}.svg`));
});

test('sticker colour grows with the multiplier and every size has one', () => {
  let last = 0;
  for (const v of [2, 3, 4, 5, 8, 10, 15, 25, 50, 100, 400, 1000]) {
    const b = starBucket(v);
    assert.ok(b >= last, `${v}x`);
    assert.ok(b < STAR_HUES.length, `${v}x has no colour`);
    last = b;
  }
  assert.equal(starBucket(2), 0);
  assert.equal(starBucket(1000), STAR_HUES.length - 1);
});
