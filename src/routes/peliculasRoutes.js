const { Router } = require('express');

const createPeliculasRoutes = ({ peliculasController }) => {
  const router = Router();

  router.get('/buscar', (req, res, next) => peliculasController.buscar(req, res, next));
  router.get('/populares', (req, res, next) => peliculasController.populares(req, res, next));
  router.get('/:id', (req, res, next) => peliculasController.obtenerPorId(req, res, next));

  return router;
};

module.exports = createPeliculasRoutes;
