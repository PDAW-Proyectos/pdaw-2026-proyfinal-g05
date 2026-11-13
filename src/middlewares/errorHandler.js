const { AppError } = require('../utils/errors');
const { defaultLogger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const logger = defaultLogger;
  const requestId = req?.id || (typeof req?.get === 'function' ? req.get('X-Request-Id') : null) || null;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const detail = 'El cuerpo de la solicitud contiene un formato JSON inválido';
    logger.warn('Error de sintaxis JSON en el cuerpo', { requestId, err });
    return res.status(400).json({
      type: 'about:blank',
      title: 'Error en la solicitud',
      status: 400,
      detail,
      instance: req?.originalUrl || req?.url,
      requestId,
      error: detail
    });
  }

  if (err instanceof AppError) {
    const status = err.statusCode || err.status || 500;
    const detail = err.message || 'Error en la solicitud';

    if (status >= 500) {
      logger.error(detail, { requestId, err });
    } else {
      logger.warn(detail, { requestId, status });
    }

    const payload = {
      type: 'about:blank',
      title: err.title || (status < 500 ? 'Error en la solicitud' : 'Error interno'),
      status,
      detail,
      instance: req?.originalUrl || req?.url,
      requestId,
      error: detail,
      ...(err.details && { errores: err.details }),
    };

    return res.status(status).json(payload);
  }

  const detail500 = 'Ocurrió un error interno en el servidor';
  logger.error('Error interno no controlado', { requestId, err });

  return res.status(500).json({
    type: 'about:blank',
    title: 'Error interno',
    status: 500,
    detail: detail500,
    instance: req?.originalUrl || req?.url,
    requestId,
    error: detail500
  });
}

module.exports = errorHandler;
