'use strict';
const express = require('express');
const authorize = require('../middleware/authorize.cjs');
const { validateBody, validateQuery, validateIdParam } = require('../middleware/validate.cjs');
const { KATEGORI, STATUS, ROLE } = require('../constants.cjs');

const pengaduanSchema = {
  judul: { required: true, min: 5, max: 100 },
  kategori: { required: true, enum: KATEGORI },
  deskripsi: { required: true, min: 10, max: 1000 },
};
const statusSchema = { status: { required: true, enum: STATUS } };
const listQuerySchema = { status: { enum: STATUS }, kategori: { enum: KATEGORI } };

// Urutan middleware pada tiap route: authenticate -> authorize(role) -> validasi -> controller.
module.exports = function pengaduanRoutes(controller, authenticate) {
  const router = express.Router();
  const { MAHASISWA, ADMIN } = ROLE;

  router.use(authenticate); // semua endpoint pengaduan wajib login

  router.get('/', authorize(MAHASISWA, ADMIN), validateQuery(listQuerySchema), controller.list);
  router.get('/:id', authorize(MAHASISWA, ADMIN), validateIdParam, controller.detail);
  router.post('/', authorize(MAHASISWA), validateBody(pengaduanSchema), controller.create);
  router.put('/:id', authorize(MAHASISWA), validateIdParam, validateBody(pengaduanSchema), controller.update);
  router.patch('/:id/status', authorize(ADMIN), validateIdParam, validateBody(statusSchema), controller.updateStatus);
  router.delete('/:id', authorize(MAHASISWA), validateIdParam, controller.remove);

  return router;
};
