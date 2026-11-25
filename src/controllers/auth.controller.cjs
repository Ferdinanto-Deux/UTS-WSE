'use strict';
const { success } = require('../utils/response.cjs');

// Controller tipis: ambil input tervalidasi -> panggil service -> bentuk respons HTTP.
class AuthController {
  constructor(authService) { this.authService = authService; }

  login = async (req, res) => {
    const { username, password } = req.validated.body;
    const result = await this.authService.login(username, password);
    return success(res, 200, 'Login berhasil', result);
  };
}
module.exports = AuthController;
