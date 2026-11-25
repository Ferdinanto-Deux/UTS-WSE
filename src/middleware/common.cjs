'use strict';

// Header keamanan dasar.
function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Cache-Control', 'no-store');
  next();
}

// Log permintaan: hanya method, path, status, durasi. Header Authorization & body TIDAK dicatat.
function requestLogger(enabled) {
  return (req, res, next) => {
    if (!enabled) return next();
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  };
}

module.exports = { securityHeaders, requestLogger };
