const { randomUUID } = require('crypto');
const { defaultLogger } = require('../utils/logger');

function requestContext(logger = defaultLogger) {
  return (req, res, next) => {
    req.id = (typeof req.get === 'function' ? req.get('X-Request-Id') : null) || req.headers?.['x-request-id'] || randomUUID();
    if (typeof res.set === 'function') {
      res.set('X-Request-Id', req.id);
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('X-Request-Id', req.id);
    }
    const start = Date.now();
    res.on('finish', () => {
      logger.info('solicitud', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}

module.exports = requestContext;
