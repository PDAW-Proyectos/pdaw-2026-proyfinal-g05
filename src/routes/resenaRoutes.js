const express = require('express');
const ResenaController = require('../controllers/resenaController');

function createResenaRoutes({ resenaService, resenaController } = {}) {
  const router = express.Router();
  const controller =
    resenaController || new ResenaController({ resenaService });

  router.get('/', (req, res, next) => controller.listar(req, res, next));
  router.get('/:id', (req, res, next) => controller.obtenerPorId(req, res, next));
  router.post('/', (req, res, next) => controller.crear(req, res, next));
  router.patch('/:id', (req, res, next) => controller.actualizar(req, res, next));

  return router;
}

module.exports = createResenaRoutes;
