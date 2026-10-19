// Provably fair rounds.
//
//   commit = SHA-256(serverSeed)                                           published before you play
//   stream = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:round:${block}`), read 28 bits at a time (see engine/rng.js)
//
// A round (the base spin, every cascade, every free spin, the wish tags, the whole Koi Pond) consumes ONE stream in a fixed order and
// nothing else. So given the seeds, the nonce, the bet and the mode, anyone can replay it and must land on the same win.
// The server seed is generated in this browser, so this demonstrates the scheme; it cannot protect you from anybody.
import { fairRng } from './engine/rng.js';
import { playRound } from './engine/round.js';
import { sha256Hex } from './sha256.js';

export function randomSeed(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const commitOf = (serverSeed) => sha256Hex(serverSeed);

export function roundFor({ serverSeed, clientSeed, nonce, mode = 'normal', bet = 100, buy = null, record = false }) {
  return playRound(fairRng(serverSeed, clientSeed, nonce, 'round'), { mode, bet, buy, record });
}

// Re-derive a finished round from revealed seeds and say what it was.
export function verifyRound({ serverSeed, clientSeed, nonce, mode, bet, buy, commit }) {
  const round = roundFor({ serverSeed, clientSeed, nonce, mode, bet, buy, record: false });
  return {
    hashOk: commit ? commitOf(serverSeed) === commit : null,
    win: round.win,
    capped: round.capped,
    features: round.features.map((f) => f.type),
    round,
  };
}
