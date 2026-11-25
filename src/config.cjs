'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Pembaca .env sederhana (tanpa dependensi). Variabel yang sudah ada di environment tidak ditimpa.
function loadDotEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const nodeEnv = process.env.NODE_ENV || 'development';
let tokenSecret = process.env.TOKEN_SECRET;
if (!tokenSecret || tokenSecret.length < 32) {
  if (nodeEnv === 'production') {
    throw new Error('TOKEN_SECRET wajib diisi (minimal 32 karakter) pada mode production');
  }
  // Mode pengembangan: rahasia acak per proses. Token lama otomatis tidak berlaku setelah restart.
  tokenSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[config] TOKEN_SECRET belum diatur/terlalu pendek, memakai kunci acak sementara.');
}

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  tokenSecret,
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS) || 3600,
};
