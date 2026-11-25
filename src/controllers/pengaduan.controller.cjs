'use strict';
const { success } = require('../utils/response.cjs');

class PengaduanController {
  constructor(service) { this.service = service; }

  list = (req, res) => {
    const data = this.service.list(req.user, req.validated.query);
    return success(res, 200, 'Daftar pengaduan berhasil diambil', data);
  };

  detail = (req, res) => {
    const data = this.service.get(req.user, req.validated.id);
    return success(res, 200, 'Detail pengaduan berhasil diambil', data);
  };

  create = (req, res) => {
    const data = this.service.create(req.user, req.validated.body);
    return success(res, 201, 'Pengaduan berhasil dibuat', data);
  };

  update = (req, res) => {
    const data = this.service.update(req.user, req.validated.id, req.validated.body);
    return success(res, 200, 'Pengaduan berhasil diubah', data);
  };

  updateStatus = (req, res) => {
    const data = this.service.changeStatus(req.user, req.validated.id, req.validated.body.status);
    return success(res, 200, 'Status pengaduan berhasil diperbarui', data);
  };

  remove = (req, res) => {
    this.service.remove(req.user, req.validated.id);
    return success(res, 200, 'Pengaduan berhasil dihapus', { id: req.validated.id });
  };
}
module.exports = PengaduanController;
