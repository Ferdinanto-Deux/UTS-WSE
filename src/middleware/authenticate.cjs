'use strict';
const { unauthorized } = require('../utils/httpError.cjs');

// AUTENTIKASI: memastikan permintaan membawa Bearer token yang sah & belum kedaluwarsa.
// Hasilnya (req.user) dipakai layer berikutnya. Token TIDAK pernah dicatat ke log.
function authenticate(authService) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) throw unauthorized('Token autentikasi tidak ditemukan');
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) throw unauthorized('Format header Authorization harus "Bearer <token>"');
    req.user = authService.authenticateToken(match[1]); // melempar 401 bila tidak sah
    next();
  };
}
module.exports = authenticate;
