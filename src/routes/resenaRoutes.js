const express = require('express');
const ResenaController = require('../controllers/resenaController');

function createResenaRoutes({ resenaService, resenaController } = {}) {
  const router = express.Router();
  const controller =
    resenaController || new ResenaController({ resenaService });

  router.post('/', (req, res, next) => controller.crear(req, res, next));

  return router;
}

module.exports = createResenaRoutes;
