const express = require('express');
const UsuarioController = require('../controllers/usuarioController');
const { requireAuth } = require('../middlewares/auth');

function createUsuarioRoutes({ usuarioService, usuarioController } = {}) {
  const router = express.Router();
  if (!usuarioService && !usuarioController) {
    return router;
  }

  const controller = usuarioController || new UsuarioController({ usuarioService });

  router.patch('/perfil', requireAuth, (req, res, next) =>
    controller.actualizarPerfil(req, res, next)
  );

  return router;
}

module.exports = createUsuarioRoutes;
