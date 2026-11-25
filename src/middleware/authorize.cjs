'use strict';
const { forbidden } = require('../utils/httpError.cjs');

// OTORISASI (berbasis role): pengguna sudah terautentikasi, tetapi apakah rolenya boleh?
// Pemeriksaan kepemilikan data dilakukan di layer service.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw forbidden('Role Anda tidak memiliki izin untuk operasi ini');
    }
    next();
  };
}
module.exports = authorize;
