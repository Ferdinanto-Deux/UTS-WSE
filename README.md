# SIMADU API

REST API **Sistem Layanan Informasi dan Pengaduan Mahasiswa** — UTS Web Service Engineering 20261.
Dibangun dengan Node.js + Express 5, arsitektur berlapis (router → controller → service → repository), autentikasi Bearer Token, otorisasi berbasis role dan kepemilikan data, validasi input, serta dokumentasi OpenAPI/Swagger UI.

## Prasyarat
- Node.js **v20 atau lebih baru** (disarankan v22) dan npm
- Postman / VS Code REST Client (opsional, untuk pengujian manual)

## Instalasi
```bash
git clone <url-repository>
cd simadu-api
npm install
cp .env.example .env     # Windows: copy .env.example .env
```

## Konfigurasi (`.env`)
| Variabel | Fungsi | Contoh |
|---|---|---|
| `PORT` | Port server | `3000` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |
| `TOKEN_SECRET` | Kunci penandatangan token (min. 32 karakter, wajib di production) | hasil `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TOKEN_TTL_SECONDS` | Masa berlaku token (detik) | `3600` |

## Menjalankan
```bash
npm start        # server di http://localhost:3000
npm run dev      # mode watch (auto-restart)
npm test         # menjalankan 29 pengujian otomatis
```
- Swagger UI : http://localhost:3000/docs
- OpenAPI    : `docs/openapi.json` (juga di `/openapi.json`)
- Health     : http://localhost:3000/health

## Akun Uji (data awal)
| Role | username | password | id (identitas pemilik) |
|---|---|---|---|
| admin | `admin` | `Admin#2026` | `ADM001` |
| mahasiswa | `mhs1` | `Mahasiswa1#` | `2411001` |
| mahasiswa | `mhs2` | `Mahasiswa2#` | `2411002` |

Password disimpan sebagai hash **scrypt** + salt acak. Data pengaduan disimpan di memori (reset saat server restart); awalnya berisi 4 pengaduan (ID 1–2 milik mhs1, ID 3–4 milik mhs2).

## Autentikasi
1. `POST /api/auth/login` dengan `{ "username", "password" }` → menerima `data.token`.
2. Kirim di setiap permintaan: `Authorization: Bearer <token>`.
3. Token berformat JWT (HS256), unik per pengguna, kedaluwarsa sesuai `TOKEN_TTL_SECONDS`, diperiksa di server (tanda tangan, algoritma, exp).

Di Swagger UI: jalankan login → salin token → tombol **Authorize** → tempel token.

## Kontrak Endpoint
| Metode | Endpoint | Role | Sukses | Gagal |
|---|---|---|---|---|
| POST | `/api/auth/login` | publik | 200 | 400, 401 |
| GET | `/api/pengaduan` | mahasiswa (milik sendiri), admin (semua) | 200 | 400, 401 |
| GET | `/api/pengaduan/:id` | mahasiswa (pemilik), admin | 200 | 400, 401, 403, 404 |
| POST | `/api/pengaduan` | mahasiswa | 201 | 400, 401, 403 |
| PUT | `/api/pengaduan/:id` | mahasiswa pemilik, status `diajukan` | 200 | 400, 401, 403, 404 |
| PATCH | `/api/pengaduan/:id/status` | admin | 200 | 400, 401, 403, 404 |
| DELETE | `/api/pengaduan/:id` | mahasiswa pemilik, status `diajukan` | 200 | 400, 401, 403, 404 |

Query opsional pada `GET /api/pengaduan`: `?status=diajukan|diproses|selesai&kategori=Fasilitas|Akademik|TI`.

### Format respons
```json
{ "status": "success", "message": "Pengaduan berhasil dibuat", "data": { "id": 5, "mahasiswaId": "2411001", "judul": "...", "kategori": "Fasilitas", "deskripsi": "...", "status": "diajukan", "createdAt": "2026-11-24T08:00:00.000Z" } }
```
```json
{ "status": "error", "message": "Validasi gagal", "errors": [ { "field": "judul", "message": "Field wajib diisi" } ] }
```

### Matriks hak akses
| Operasi | Mahasiswa | Admin |
|---|---|---|
| Melihat pengaduan sendiri | ✓ | ✓ |
| Melihat semua pengaduan | × | ✓ |
| Membuat pengaduan | ✓ | × |
| Mengubah pengaduan sendiri (status `diajukan`) | ✓ | × |
| Menghapus pengaduan sendiri (status `diajukan`) | ✓ | × |
| Mengubah status pengaduan | × | ✓ |

### Respons kesalahan
| Kode | Arti | Contoh penyebab |
|---|---|---|
| 400 | Input tidak valid | field wajib kosong, field tidak diperbolehkan (`id`, `mahasiswaId`, `status` saat POST), JSON rusak, ID bukan angka |
| 401 | Belum terautentikasi | token tidak ada / salah / kedaluwarsa, login gagal |
| 403 | Terautentikasi tapi tidak berhak | role salah, bukan pemilik, status bukan `diajukan` |
| 404 | Tidak ditemukan | ID pengaduan atau endpoint tidak ada |
| 500 | Kesalahan server | pesan generik, detail hanya di log server |

## Struktur & Tanggung Jawab Layer
```
simadu-api/
├── src/
│   ├── routes/         Router: memetakan URL+metode ke rantai middleware → controller
│   ├── controllers/    Controller: ambil input tervalidasi, panggil service, bentuk respons HTTP
│   ├── services/       Service: aturan bisnis (kepemilikan, status yang boleh diubah, pembuatan token)
│   ├── repositories/   Repository: akses data (array memori); satu-satunya yang menyentuh penyimpanan
│   ├── middleware/     authenticate, authorize(role), validate, errorHandler, header keamanan, logger
│   └── utils/          hash password (scrypt), token (HMAC-SHA256), HttpError, format respons
├── docs/openapi.json   Kontrak OpenAPI 3.0
├── tests/              api.test.cjs (otomatis) & simadu.http (HTTP Client manual)
├── app.cjs             Perakitan aplikasi (dependency injection) & middleware global
└── server.cjs          Entry point (listen)
```
Urutan middleware tiap route: `authenticate → authorize(role) → validasi → controller → service (kepemilikan/status) → repository`.

## Pengujian
`npm test` menjalankan 29 pengujian (12 skenario wajib UTS + skenario keamanan tambahan: token kedaluwarsa, token dimanipulasi, mass assignment, bukti data tidak berubah setelah penolakan, dsb.). Untuk menyimpan bukti respons ke `tests/evidence.json`: `EVIDENCE=1 npm test`. Pengujian manual: `tests/simadu.http` atau Swagger UI.
