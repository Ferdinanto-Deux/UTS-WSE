'use strict';
// Error aplikasi yang membawa kode status HTTP. Pesannya aman ditampilkan ke client.
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.errors = errors;
  }
}
module.exports = {
  HttpError,
  badRequest: (msg, errors) => new HttpError(400, msg, errors),
  unauthorized: (msg) => new HttpError(401, msg),
  forbidden: (msg) => new HttpError(403, msg),
  notFound: (msg) => new HttpError(404, msg),
};
