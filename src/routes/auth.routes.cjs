'use strict';
const express = require('express');
const { validateBody } = require('../middleware/validate.cjs');

const loginSchema = {
  username: { required: true, max: 50 },
  password: { required: true, max: 100, noTrim: true },
};

module.exports = function authRoutes(controller) {
  const router = express.Router();
  router.post('/login', validateBody(loginSchema), controller.login);
  return router;
};
