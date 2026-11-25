'use strict';
// Pengujian fungsional & keamanan SIMADU API (node:test + fetch bawaan Node, tanpa dependensi tambahan).
// Jalankan: npm test   |   Simpan bukti respons: EVIDENCE=1 npm test  (menulis tests/evidence.json)
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const createApp = require('../app.cjs');
const { sign } = require('../src/utils/token.cjs');

const SECRET = 'rahasia-uji-minimal-32-karakter-xxxxxxxx';
let server; let base; const tokens = {}; const evidence = [];

async function call(label, expected, method, url, { token, body, raw, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (raw !== undefined) { payload = raw; } else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = h['Content-Type'] || 'application/json'; }
  const res = await fetch(base + url, { method, headers: h, body: payload });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (label) {
    const shown = JSON.parse(JSON.stringify(json), (k, v) => (k === 'token' && typeof v === 'string' ? v.slice(0, 24) + '...[dipotong]' : v));
    evidence.push({ no: label.no, skenario: label.name, expected, request: `${method} ${url}`, auth: token ? 'Bearer <token>' : (headers.Authorization ? headers.Authorization.slice(0, 20) + '...' : '-'), body: body !== undefined ? body : (raw !== undefined ? raw : null), status: res.status, response: shown });
  }
  return { status: res.status, json, headers: res.headers };
}
const login = async (u, p) => (await call(null, 0, 'POST', '/api/auth/login', { body: { username: u, password: p } })).json.data.token;
const snapshot = async () => (await call(null, 0, 'GET', '/api/pengaduan', { token: tokens.admin })).json.data;
const VALID = { judul: 'Proyektor ruang C101 rusak', kategori: 'Fasilitas', deskripsi: 'Proyektor tidak menyala sehingga perkuliahan terganggu.' };

before(async () => {
  server = createApp({ nodeEnv: 'test', tokenSecret: SECRET, tokenTtlSeconds: 3600 }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
  tokens.admin = await login('admin', 'Admin#2026');
  tokens.mhs1 = await login('mhs1', 'Mahasiswa1#');
  tokens.mhs2 = await login('mhs2', 'Mahasiswa2#');
});
after(() => {
  server.close();
  if (process.env.EVIDENCE) fs.writeFileSync(path.join(__dirname, 'evidence.json'), JSON.stringify(evidence, null, 2));
});

describe('12 skenario wajib UTS', () => {
  it('1. Login kredensial benar -> 200 + token', async () => {
    const r = await call({ no: 1, name: 'Login dengan kredensial benar' }, 200, 'POST', '/api/auth/login', { body: { username: 'mhs1', password: 'Mahasiswa1#' } });
    assert.equal(r.status, 200);
    assert.ok(r.json.data.token);
    assert.equal(r.json.data.user.role, 'mahasiswa');
    assert.equal(r.json.data.user.passwordHash, undefined);
  });
  it('2. Login password salah -> 401', async () => {
    const r = await call({ no: 2, name: 'Login dengan password salah' }, 401, 'POST', '/api/auth/login', { body: { username: 'mhs1', password: 'salah-banget' } });
    assert.equal(r.status, 401);
  });
  it('3. Tanpa token -> 401', async () => {
    const r = await call({ no: 3, name: 'Akses endpoint terlindungi tanpa token' }, 401, 'GET', '/api/pengaduan');
    assert.equal(r.status, 401);
    assert.equal(r.headers.get('www-authenticate'), 'Bearer');
  });
  it('4. Token tidak valid -> 401', async () => {
    const r = await call({ no: 4, name: 'Akses menggunakan token tidak valid' }, 401, 'GET', '/api/pengaduan', { token: 'token.palsu.abc' });
    assert.equal(r.status, 401);
  });
  it('5. Mahasiswa membuat pengaduan valid -> 201', async () => {
    const before = (await snapshot()).length;
    const r = await call({ no: 5, name: 'Mahasiswa membuat pengaduan valid' }, 201, 'POST', '/api/pengaduan', { token: tokens.mhs1, body: VALID });
    assert.equal(r.status, 201);
    assert.equal(r.json.data.mahasiswaId, '2411001'); // dari token
    assert.equal(r.json.data.status, 'diajukan');
    assert.ok(Number.isInteger(r.json.data.id));
    assert.ok(!Number.isNaN(Date.parse(r.json.data.createdAt)));
    assert.equal((await snapshot()).length, before + 1);
  });
  it('6. Mahasiswa membaca pengaduan sendiri -> 200', async () => {
    const r = await call({ no: 6, name: 'Mahasiswa membaca pengaduan sendiri' }, 200, 'GET', '/api/pengaduan/1', { token: tokens.mhs1 });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.mahasiswaId, '2411001');
  });
  it('7. Mahasiswa membaca pengaduan orang lain -> 403', async () => {
    const r = await call({ no: 7, name: 'Mahasiswa membaca pengaduan orang lain' }, 403, 'GET', '/api/pengaduan/3', { token: tokens.mhs1 });
    assert.equal(r.status, 403);
  });
  it('8. Mahasiswa mengubah status -> 403 dan status tidak berubah', async () => {
    const r = await call({ no: 8, name: 'Mahasiswa mengubah status pengaduan' }, 403, 'PATCH', '/api/pengaduan/1/status', { token: tokens.mhs1, body: { status: 'selesai' } });
    assert.equal(r.status, 403);
    assert.equal((await call(null, 0, 'GET', '/api/pengaduan/1', { token: tokens.mhs1 })).json.data.status, 'diajukan');
  });
  it('9. Admin melihat seluruh pengaduan -> 200', async () => {
    const r = await call({ no: 9, name: 'Admin melihat seluruh pengaduan' }, 200, 'GET', '/api/pengaduan', { token: tokens.admin });
    assert.equal(r.status, 200);
    assert.ok(new Set(r.json.data.map((p) => p.mahasiswaId)).size >= 2);
  });
  it('10. Admin memperbarui status -> 200', async () => {
    const r = await call({ no: 10, name: 'Admin memperbarui status pengaduan' }, 200, 'PATCH', '/api/pengaduan/3/status', { token: tokens.admin, body: { status: 'diproses' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.status, 'diproses');
    assert.equal(r.json.data.mahasiswaId, '2411002'); // pemilik tidak berubah
  });
  it('11. Buat pengaduan dengan field wajib kosong -> 400', async () => {
    const before = JSON.stringify(await snapshot());
    const r = await call({ no: 11, name: 'Membuat pengaduan dengan field wajib kosong' }, 400, 'POST', '/api/pengaduan', { token: tokens.mhs1, body: { judul: '', kategori: 'Fasilitas' } });
    assert.equal(r.status, 400);
    assert.ok(r.json.errors.length >= 2);
    assert.equal(JSON.stringify(await snapshot()), before); // data tidak berubah
  });
  it('12. ID tidak ditemukan -> 404', async () => {
    const r = await call({ no: 12, name: 'Mengakses ID pengaduan yang tidak ditemukan' }, 404, 'GET', '/api/pengaduan/9999', { token: tokens.admin });
    assert.equal(r.status, 404);
  });
});

describe('Skenario tambahan keamanan & validasi', () => {
  it('13. Token kedaluwarsa -> 401', async () => {
    const expired = sign({ sub: '2411001', role: 'mahasiswa' }, SECRET, -10);
    const r = await call({ no: 13, name: 'Token kedaluwarsa' }, 401, 'GET', '/api/pengaduan', { token: expired });
    assert.equal(r.status, 401);
    assert.match(r.json.message, /kedaluwarsa/);
  });
  it('14. Token dimanipulasi (role diubah) / alg none -> 401', async () => {
    const [h, , s] = tokens.mhs1.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'ADM001', role: 'admin', exp: 9999999999 })).toString('base64url');
    const r1 = await call({ no: 14, name: 'Token dimanipulasi (payload diubah, tanda tangan lama)' }, 401, 'GET', '/api/pengaduan', { token: `${h}.${forgedPayload}.${s}` });
    assert.equal(r1.status, 401);
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const r2 = await call(null, 401, 'GET', '/api/pengaduan', { token: `${none}.${forgedPayload}.` });
    assert.equal(r2.status, 401);
  });
  it('15. Mahasiswa hanya melihat daftar miliknya', async () => {
    const r = await call({ no: 15, name: 'Daftar pengaduan mahasiswa hanya milik sendiri' }, 200, 'GET', '/api/pengaduan', { token: tokens.mhs2 });
    assert.equal(r.status, 200);
    assert.ok(r.json.data.length > 0 && r.json.data.every((p) => p.mahasiswaId === '2411002'));
  });
  it('16. Mass assignment (id/mahasiswaId/status dari client) -> 400, tidak ada data dibuat', async () => {
    const before = JSON.stringify(await snapshot());
    const r = await call({ no: 16, name: 'Client memalsukan id, mahasiswaId, status saat POST' }, 400, 'POST', '/api/pengaduan', { token: tokens.mhs1, body: { ...VALID, id: 999, mahasiswaId: '2411002', status: 'selesai' } });
    assert.equal(r.status, 400);
    assert.equal(r.json.errors.length, 3);
    assert.equal(JSON.stringify(await snapshot()), before);
  });
  it('17. Mahasiswa mengubah pengaduan sendiri (diajukan) -> 200, pemilik tetap', async () => {
    const r = await call({ no: 17, name: 'Mahasiswa mengubah pengaduan sendiri berstatus diajukan' }, 200, 'PUT', '/api/pengaduan/1', { token: tokens.mhs1, body: { ...VALID, judul: 'AC ruang B201 mati total' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.judul, 'AC ruang B201 mati total');
    assert.equal(r.json.data.mahasiswaId, '2411001');
  });
  it('18. Mengubah pengaduan orang lain -> 403, data tidak berubah', async () => {
    const before = JSON.stringify((await call(null, 0, 'GET', '/api/pengaduan/3', { token: tokens.admin })).json.data);
    const r = await call({ no: 18, name: 'Mahasiswa mengubah pengaduan milik orang lain' }, 403, 'PUT', '/api/pengaduan/3', { token: tokens.mhs1, body: VALID });
    assert.equal(r.status, 403);
    assert.equal(JSON.stringify((await call(null, 0, 'GET', '/api/pengaduan/3', { token: tokens.admin })).json.data), before);
  });
  it('19. Ubah/hapus pengaduan berstatus diproses -> 403', async () => {
    const r1 = await call({ no: 19, name: 'Mengubah pengaduan yang sudah berstatus diproses' }, 403, 'PUT', '/api/pengaduan/2', { token: tokens.mhs1, body: VALID });
    assert.equal(r1.status, 403);
    const r2 = await call(null, 403, 'DELETE', '/api/pengaduan/2', { token: tokens.mhs1 });
    assert.equal(r2.status, 403);
    assert.equal((await call(null, 0, 'GET', '/api/pengaduan/2', { token: tokens.admin })).status, 200);
  });
  it('20. Admin membuat/mengubah/menghapus pengaduan -> 403', async () => {
    const r1 = await call({ no: 20, name: 'Admin mencoba membuat pengaduan' }, 403, 'POST', '/api/pengaduan', { token: tokens.admin, body: VALID });
    assert.equal(r1.status, 403);
    assert.equal((await call(null, 403, 'PUT', '/api/pengaduan/1', { token: tokens.admin, body: VALID })).status, 403);
    assert.equal((await call(null, 403, 'DELETE', '/api/pengaduan/1', { token: tokens.admin })).status, 403);
  });
  it('21. Mahasiswa menghapus pengaduan sendiri (diajukan) -> 200 lalu 404', async () => {
    const created = await call(null, 201, 'POST', '/api/pengaduan', { token: tokens.mhs1, body: VALID });
    const id = created.json.data.id;
    const r = await call({ no: 21, name: 'Mahasiswa menghapus pengaduan sendiri berstatus diajukan' }, 200, 'DELETE', `/api/pengaduan/${id}`, { token: tokens.mhs1 });
    assert.equal(r.status, 200);
    assert.equal((await call(null, 404, 'GET', `/api/pengaduan/${id}`, { token: tokens.mhs1 })).status, 404);
  });
  it('22. Menghapus pengaduan orang lain -> 403, data tetap ada', async () => {
    const r = await call({ no: 22, name: 'Mahasiswa menghapus pengaduan milik orang lain' }, 403, 'DELETE', '/api/pengaduan/3', { token: tokens.mhs1 });
    assert.equal(r.status, 403);
    assert.equal((await call(null, 200, 'GET', '/api/pengaduan/3', { token: tokens.admin })).status, 200);
  });
  it('23. JSON rusak -> 400', async () => {
    const r = await call({ no: 23, name: 'Body JSON rusak' }, 400, 'POST', '/api/pengaduan', { token: tokens.mhs1, raw: '{"judul": "abc"', headers: { 'Content-Type': 'application/json' } });
    assert.equal(r.status, 400);
    assert.equal(r.json.message, 'Format JSON pada body tidak valid');
  });
  it('24. ID bukan angka -> 400', async () => {
    const r = await call({ no: 24, name: 'ID pengaduan bukan bilangan bulat positif' }, 400, 'GET', '/api/pengaduan/abc', { token: tokens.admin });
    assert.equal(r.status, 400);
  });
  it('25. Status tidak valid -> 400, data tidak berubah', async () => {
    const before = JSON.stringify(await snapshot());
    const r = await call({ no: 25, name: 'Admin mengirim nilai status tidak valid' }, 400, 'PATCH', '/api/pengaduan/1/status', { token: tokens.admin, body: { status: 'ditolak' } });
    assert.equal(r.status, 400);
    assert.equal(JSON.stringify(await snapshot()), before);
  });
  it('26. Content-Type bukan JSON -> 400', async () => {
    const r = await call({ no: 26, name: 'Body dikirim sebagai text/plain' }, 400, 'POST', '/api/pengaduan', { token: tokens.mhs1, raw: 'judul=abc', headers: { 'Content-Type': 'text/plain' } });
    assert.equal(r.status, 400);
  });
  it('27. Endpoint tidak ada -> 404 JSON', async () => {
    const r = await call({ no: 27, name: 'Endpoint tidak dikenal' }, 404, 'GET', '/api/tidak-ada');
    assert.equal(r.status, 404);
    assert.equal(r.json.status, 'error');
  });
  it('28. Login: body kosong/field tidak diizinkan -> 400', async () => {
    const r1 = await call({ no: 28, name: 'Login tanpa password' }, 400, 'POST', '/api/auth/login', { body: { username: 'mhs1' } });
    assert.equal(r1.status, 400);
    const r2 = await call(null, 400, 'POST', '/api/auth/login', { body: { username: 'mhs1', password: 'x', role: 'admin' } });
    assert.equal(r2.status, 400);
  });
});

describe('Error handler 500 tanpa kebocoran informasi', () => {
  it('error tak terduga -> 500 generik', () => {
    const { errorHandler } = require('../src/middleware/errorHandler.cjs');
    let code; let out;
    const res = { headersSent: false, status(c) { code = c; return this; }, json(o) { out = o; return this; }, set() {} };
    const orig = console.error; console.error = () => {};
    errorHandler(new Error('connection string postgres://user:secret@db'), { method: 'GET', path: '/x' }, res, () => {});
    console.error = orig;
    assert.equal(code, 500);
    assert.deepEqual(out, { status: 'error', message: 'Terjadi kesalahan pada server' });
  });
});
