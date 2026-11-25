'use strict';
// Format respons sukses yang konsisten: { status, message, data }
function success(res, httpStatus, message, data) {
  return res.status(httpStatus).json({ status: 'success', message, data });
}
module.exports = { success };
