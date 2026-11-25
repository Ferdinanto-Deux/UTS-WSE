'use strict';
const { badRequest } = require('../utils/httpError.cjs');

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Skema: { namaField: { required, min, max, enum } } -- semua field bertipe string.
function parse(input, schema) {
  const errors = [];
  const clean = {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(schema, key)) errors.push({ field: key, message: `Field '${key}' tidak diperbolehkan` });
  }
  for (const [field, rule] of Object.entries(schema)) {
    const value = input[field];
    if (value === undefined || value === null) {
      if (rule.required) errors.push({ field, message: 'Field wajib diisi' });
      continue;
    }
    if (typeof value !== 'string') { errors.push({ field, message: 'Harus berupa string' }); continue; }
    const text = value.trim();
    if (text === '') { errors.push({ field, message: 'Tidak boleh kosong' }); continue; }
    if (rule.min && text.length < rule.min) errors.push({ field, message: `Minimal ${rule.min} karakter` });
    else if (rule.max && text.length > rule.max) errors.push({ field, message: `Maksimal ${rule.max} karakter` });
    else if (rule.enum && !rule.enum.includes(text)) errors.push({ field, message: `Harus salah satu dari: ${rule.enum.join(', ')}` });
    else clean[field] = rule.noTrim ? value : text;
  }
  return { clean, errors };
}

function validateBody(schema) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) {
      throw badRequest('Body harus berupa objek JSON dengan header Content-Type: application/json');
    }
    const { clean, errors } = parse(req.body, schema);
    if (errors.length) throw badRequest('Validasi gagal', errors);
    req.validated = { ...req.validated, body: clean };
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { clean, errors } = parse(req.query || {}, schema);
    if (errors.length) throw badRequest('Validasi gagal', errors);
    req.validated = { ...req.validated, query: clean };
    next();
  };
}

function validateIdParam(req, res, next) {
  const raw = req.params.id;
  if (!/^[1-9]\d{0,9}$/.test(raw)) {
    throw badRequest('Validasi gagal', [{ field: 'id', message: 'ID harus berupa bilangan bulat positif' }]);
  }
  req.validated = { ...req.validated, id: Number(raw) };
  next();
}

module.exports = { validateBody, validateQuery, validateIdParam };
