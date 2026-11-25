'use strict';
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('./src/config.cjs');
const openapi = require('./docs/openapi.json');

const UserRepository = require('./src/repositories/user.repository.cjs');
const PengaduanRepository = require('./src/repositories/pengaduan.repository.cjs');
const AuthService = require('./src/services/auth.service.cjs');
const PengaduanService = require('./src/services/pengaduan.service.cjs');
const AuthController = require('./src/controllers/auth.controller.cjs');
const PengaduanController = require('./src/controllers/pengaduan.controller.cjs');
const authRoutes = require('./src/routes/auth.routes.cjs');
const pengaduanRoutes = require('./src/routes/pengaduan.routes.cjs');
const authenticate = require('./src/middleware/authenticate.cjs');
const { securityHeaders, requestLogger } = require('./src/middleware/common.cjs');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler.cjs');

// Factory: setiap pemanggilan menghasilkan app + data baru (memudahkan pengujian terisolasi).
function createApp(options = {}) {
  const cfg = { ...config, ...options };
  const app = express();
  app.disable('x-powered-by');

  // Komposisi dependensi: repository -> service -> controller -> routes
  const userRepo = new UserRepository();
  const pengaduanRepo = new PengaduanRepository();
  const authService = new AuthService(userRepo, cfg);
  const pengaduanService = new PengaduanService(pengaduanRepo);

  app.use(securityHeaders);
  app.use(requestLogger(cfg.nodeEnv !== 'test'));
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => res.json({ status: 'success', message: 'SIMADU API berjalan' }));
  app.get('/openapi.json', (req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use('/api/auth', authRoutes(new AuthController(authService)));
  app.use('/api/pengaduan', pengaduanRoutes(new PengaduanController(pengaduanService), authenticate(authService)));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
module.exports = createApp;
