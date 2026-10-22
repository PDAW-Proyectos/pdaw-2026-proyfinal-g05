const express = require('express');

function createResenaRoutes({ resenaService } = {}) {
  const router = express.Router();
  return router;
}

module.exports = createResenaRoutes;
