const express = require('express');
const AuthController = require('../controllers/authController');

function createAuthRoutes({ usuarioService } = {}) {
  const router = express.Router();
  const authController = new AuthController({ usuarioService });

  router.post('/login', (req, res, next) => authController.login(req, res, next));
  router.post('/logout', (req, res, next) => authController.logout(req, res, next));

  return router;
}

module.exports = createAuthRoutes;
