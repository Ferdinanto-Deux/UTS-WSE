'use strict';

// Penyimpanan array dalam memori. Setiap pembacaan mengembalikan salinan agar
// data internal tidak bisa diubah tanpa melalui method repository.
const clone = (o) => structuredClone(o);

class PengaduanRepository {
  constructor() {
    this.items = [
      { id: 1, mahasiswaId: '2411001', judul: 'AC ruang kelas B201 tidak berfungsi', kategori: 'Fasilitas',
        deskripsi: 'AC di ruang B201 mati sejak awal minggu sehingga kelas sangat panas.', status: 'diajukan', createdAt: '2026-11-02T01:15:00.000Z' },
      { id: 2, mahasiswaId: '2411001', judul: 'Wi-Fi kampus sering terputus', kategori: 'TI',
        deskripsi: 'Koneksi Wi-Fi di perpustakaan terputus setiap beberapa menit.', status: 'diproses', createdAt: '2026-11-03T03:30:00.000Z' },
      { id: 3, mahasiswaId: '2411002', judul: 'Jadwal kuliah bentrok di SIAKAD', kategori: 'Akademik',
        deskripsi: 'Dua mata kuliah wajib muncul pada jam yang sama di SIAKAD.', status: 'diajukan', createdAt: '2026-11-04T02:00:00.000Z' },
      { id: 4, mahasiswaId: '2411002', judul: 'Lampu parkiran fakultas mati', kategori: 'Fasilitas',
        deskripsi: 'Lampu area parkiran belakang mati sehingga gelap pada malam hari.', status: 'selesai', createdAt: '2026-10-28T12:45:00.000Z' },
    ];
    this.nextId = 5;
  }

  findAll({ mahasiswaId, status, kategori } = {}) {
    return this.items
      .filter((p) => (mahasiswaId ? p.mahasiswaId === mahasiswaId : true))
      .filter((p) => (status ? p.status === status : true))
      .filter((p) => (kategori ? p.kategori === kategori : true))
      .map(clone);
  }

  findById(id) {
    const p = this.items.find((x) => x.id === id);
    return p ? clone(p) : null;
  }

  create({ mahasiswaId, judul, kategori, deskripsi }) {
    const p = {
      id: this.nextId++, // ID dibuat server, bukan client
      mahasiswaId, judul, kategori, deskripsi,
      status: 'diajukan',
      createdAt: new Date().toISOString(),
    };
    this.items.push(p);
    return clone(p);
  }

  // Hanya field pada daftar putih yang dapat diubah; id, mahasiswaId, createdAt tidak pernah berubah.
  update(id, fields) {
    const p = this.items.find((x) => x.id === id);
    if (!p) return null;
    for (const key of ['judul', 'kategori', 'deskripsi', 'status']) {
      if (Object.hasOwn(fields, key)) p[key] = fields[key];
    }
    return clone(p);
  }

  remove(id) {
    const idx = this.items.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}
module.exports = PengaduanRepository;
