'use strict';
const crypto = require('crypto');
const { unauthorized } = require('./httpError.cjs');

// Bearer token berformat JWT (HS256): base64url(header).base64url(payload).base64url(signature)
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function signature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

/** Membuat token unik per pengguna dengan waktu kedaluwarsa (exp) dan id token (jti). */
function sign(claims, secret, ttlSeconds, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000);
  const payload = { ...claims, iat, exp: iat + ttlSeconds, jti: crypto.randomUUID() };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signature(`${HEADER}.${body}`, secret).toString('base64url');
  return `${HEADER}.${body}.${sig}`;
}

/** Memeriksa token di server: struktur, algoritma, tanda tangan, lalu masa berlaku. */
function verify(token, secret, nowMs = Date.now()) {
  const invalid = () => unauthorized('Token tidak valid');
  const parts = String(token).split('.');
  if (parts.length !== 3) throw invalid();
  const [h, b, s] = parts;
  // Algoritma dikunci ke HS256 (menolak "none" dan algoritma lain).
  if (h !== HEADER) throw invalid();
  const expected = signature(`${h}.${b}`, secret);
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw invalid();
  let payload;
  try { payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')); } catch { throw invalid(); }
  if (typeof payload.exp !== 'number' || typeof payload.sub !== 'string') throw invalid();
  if (payload.exp <= Math.floor(nowMs / 1000)) throw unauthorized('Token sudah kedaluwarsa');
  return payload;
}

module.exports = { sign, verify };
