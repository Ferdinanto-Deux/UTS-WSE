'use strict';
const { forbidden, notFound } = require('../utils/httpError.cjs');
const { ROLE } = require('../constants.cjs');

// Layer service = aturan bisnis: kepemilikan data, status yang boleh diubah, dsb.
class PengaduanService {
  constructor(repo) { this.repo = repo; }

  list(actor, filters) {
    const f = { ...filters };
    if (actor.role === ROLE.MAHASISWA) f.mahasiswaId = actor.id; // mahasiswa dikunci ke data miliknya
    return this.repo.findAll(f);
  }

  get(actor, id) {
    const p = this.#getOrThrow(id);
    this.#assertCanView(actor, p);
    return p;
  }

  create(actor, input) {
    if (actor.role !== ROLE.MAHASISWA) throw forbidden('Hanya mahasiswa yang dapat membuat pengaduan');
    return this.repo.create({
      mahasiswaId: actor.id, // pemilik berasal dari hasil autentikasi, bukan dari body
      judul: input.judul, kategori: input.kategori, deskripsi: input.deskripsi,
    });
  }

  update(actor, id, input) {
    this.#assertMahasiswa(actor, 'mengubah');
    const p = this.#getOrThrow(id);
    this.#assertOwner(actor, p);
    this.#assertDiajukan(p, 'diubah');
    return this.repo.update(id, { judul: input.judul, kategori: input.kategori, deskripsi: input.deskripsi });
  }

  changeStatus(actor, id, status) {
    if (actor.role !== ROLE.ADMIN) throw forbidden('Hanya administrator yang dapat mengubah status pengaduan');
    this.#getOrThrow(id);
    return this.repo.update(id, { status });
  }

  remove(actor, id) {
    this.#assertMahasiswa(actor, 'menghapus');
    const p = this.#getOrThrow(id);
    this.#assertOwner(actor, p);
    this.#assertDiajukan(p, 'dihapus');
    this.repo.remove(id);
  }

  // ---- helper privat ----
  #getOrThrow(id) {
    const p = this.repo.findById(id);
    if (!p) throw notFound('Pengaduan tidak ditemukan');
    return p;
  }
  #assertCanView(actor, p) {
    if (actor.role === ROLE.ADMIN) return;
    if (p.mahasiswaId !== actor.id) throw forbidden('Anda tidak berhak mengakses pengaduan milik pengguna lain');
  }
  #assertMahasiswa(actor, verb) {
    if (actor.role !== ROLE.MAHASISWA) throw forbidden(`Administrator tidak dapat ${verb} pengaduan`);
  }
  #assertOwner(actor, p) {
    if (p.mahasiswaId !== actor.id) throw forbidden('Anda tidak berhak mengakses pengaduan milik pengguna lain');
  }
  #assertDiajukan(p, verb) {
    if (p.status !== 'diajukan') throw forbidden(`Pengaduan hanya dapat ${verb} selama berstatus "diajukan"`);
  }
}
module.exports = PengaduanService;
