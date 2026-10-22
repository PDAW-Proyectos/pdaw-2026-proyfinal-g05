const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud contiene un formato JSON inválido' });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  return res.status(500).json({ error: 'Ocurrió un error interno en el servidor' });
}

module.exports = errorHandler;
