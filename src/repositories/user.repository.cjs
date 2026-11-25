'use strict';
const { hashPasswordSync } = require('../utils/password.cjs');
const { ROLE } = require('../constants.cjs');

// Data uji awal: 1 administrator + 2 mahasiswa. Password di-hash saat server start;
// hanya hash yang disimpan di memori (lihat passwordHash).
const SEED = [
  { id: 'ADM001', username: 'admin', nama: 'Administrator SIMADU', role: ROLE.ADMIN, password: 'Admin#2026' },
  { id: '2411001', username: 'mhs1', nama: 'Aisyah Rahma', role: ROLE.MAHASISWA, password: 'Mahasiswa1#' },
  { id: '2411002', username: 'mhs2', nama: 'Budi Santoso', role: ROLE.MAHASISWA, password: 'Mahasiswa2#' },
];

class UserRepository {
  constructor() {
    this.users = SEED.map(({ password, ...u }) => ({ ...u, passwordHash: hashPasswordSync(password) }));
  }
  findByUsername(username) { return this.users.find((u) => u.username === username) || null; }
  findById(id) { return this.users.find((u) => u.id === id) || null; }
}
module.exports = UserRepository;
