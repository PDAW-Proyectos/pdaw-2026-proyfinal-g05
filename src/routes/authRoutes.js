const express = require('express');
const AuthController = require('../controllers/authController');

function createAuthRoutes({ usuarioService } = {}) {
  const router = express.Router();
  if (!usuarioService) {
    return router;
  }
  const authController = new AuthController({ usuarioService });

  router.post('/register', (req, res, next) => authController.register(req, res, next));
  router.post('/login', (req, res, next) => authController.login(req, res, next));
  router.post('/logout', (req, res, next) => authController.logout(req, res, next));
  router.get('/me', (req, res, next) => authController.me(req, res, next));

  return router;
}

module.exports = createAuthRoutes;
