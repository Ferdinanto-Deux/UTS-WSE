'use strict';
const { verifyPassword, hashPasswordSync } = require('../utils/password.cjs');
const { sign, verify } = require('../utils/token.cjs');
const { unauthorized } = require('../utils/httpError.cjs');

// Hash tiruan: dipakai agar waktu respons sama baik username ada maupun tidak (anti user enumeration).
const DUMMY_HASH = hashPasswordSync('dummy-password-untuk-timing');

const publicUser = ({ id, username, nama, role }) => ({ id, username, nama, role });

class AuthService {
  constructor(userRepo, { tokenSecret, tokenTtlSeconds }) {
    this.userRepo = userRepo;
    this.secret = tokenSecret;
    this.ttl = tokenTtlSeconds;
  }

  async login(username, password) {
    const user = this.userRepo.findByUsername(username);
    const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Username atau password salah'); // pesan sama untuk kedua kasus
    const token = sign({ sub: user.id, role: user.role }, this.secret, this.ttl);
    return { token, tokenType: 'Bearer', expiresIn: this.ttl, user: publicUser(user) };
  }

  /** Dipakai middleware authenticate: token sah -> kembalikan pengguna dari data server. */
  authenticateToken(token) {
    const payload = verify(token, this.secret);
    const user = this.userRepo.findById(payload.sub);
    if (!user) throw unauthorized('Token tidak valid');
    return publicUser(user); // role diambil dari data server, bukan dari klaim token
  }
}
module.exports = AuthService;
