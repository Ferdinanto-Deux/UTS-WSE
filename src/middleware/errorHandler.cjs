'use strict';
const { HttpError } = require('../utils/httpError.cjs');

function notFoundHandler(req, res) {
  res.status(404).json({ status: 'error', message: 'Endpoint tidak ditemukan' });
}

// Error handler terpusat (4 argumen). Semua error berakhir di sini dengan format yang sama.
// Detail internal (stack trace, pesan sistem) hanya dicatat di server, TIDAK dikirim ke client.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    if (err.status === 401) res.set('WWW-Authenticate', 'Bearer');
    const body = { status: 'error', message: err.message };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }
  // Error bawaan body parser Express (JSON rusak, body terlalu besar, dsb.)
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'Format JSON pada body tidak valid' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ status: 'error', message: 'Ukuran body terlalu besar' });
  }
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    return res.status(400).json({ status: 'error', message: 'Permintaan tidak dapat diproses' });
  }
  // Selain itu: kesalahan tak terduga -> 500 dengan pesan generik.
  console.error(`[error] ${req.method} ${req.path}:`, err && err.stack ? err.stack : err);
  return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan pada server' });
}

module.exports = { notFoundHandler, errorHandler };
