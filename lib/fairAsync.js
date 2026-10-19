// The same HMAC stream computed by the browser's own crypto.subtle: a second, independent implementation.
// The game uses lib/sha256.js (synchronous, hand written); /fairness checks the two agree on the first blocks of a round.

const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Async(text) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

export async function hmacBlockAsync(serverSeed, clientSeed, nonce, block, domain = 'round') {
  const key = await crypto.subtle.importKey('raw', enc.encode(serverSeed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${clientSeed}:${nonce}:${domain}:${block}`));
  return hex(sig);
}
