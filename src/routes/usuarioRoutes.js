const express = require('express');

function createUsuarioRoutes({ usuarioService } = {}) {
  const router = express.Router();
  return router;
}

module.exports = createUsuarioRoutes;
