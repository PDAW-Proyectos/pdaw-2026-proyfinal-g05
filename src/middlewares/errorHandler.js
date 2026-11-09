const { AppError } = require('../utils/errors');
const { defaultLogger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const logger = defaultLogger;
  const requestId = req?.id || (typeof req?.get === 'function' ? req.get('X-Request-Id') : null) || null;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const detail = 'El cuerpo de la solicitud contiene un formato JSON inválido';
    logger.warn('Error de sintaxis JSON en el cuerpo', { requestId, err });
    return res.status(400).json({ error: detail });
  }

  const isProblemJson = typeof req?.get === 'function' && Boolean(req.get('accept')?.includes('application/problem+json'));

  if (err instanceof AppError) {
    const status = err.statusCode || err.status || 500;
    const detail = err.message || 'Error en la solicitud';

    if (status >= 500) {
      logger.error(detail, { requestId, err });
    } else {
      logger.warn(detail, { requestId, status });
    }

    const payload = { error: detail };

    if (isProblemJson) {
      payload.title = err.title || (status < 500 ? 'Error del cliente' : 'Error interno');
      payload.status = status;
      payload.detail = detail;
      payload.instance = req?.originalUrl || req?.url;
      payload.requestId = requestId;
      if (err.details) {
        payload.errores = err.details;
      }
    }

    return res.status(status).json(payload);
  }

  const detail500 = 'Ocurrió un error interno en el servidor';
  logger.error('Error interno no controlado', { requestId, err });

  const payload500 = { error: detail500 };

  if (isProblemJson) {
    payload500.title = 'Error interno del servidor';
    payload500.status = 500;
    payload500.detail = detail500;
    payload500.instance = req?.originalUrl || req?.url;
    payload500.requestId = requestId;
  }

  return res.status(500).json(payload500);
}

module.exports = errorHandler;
