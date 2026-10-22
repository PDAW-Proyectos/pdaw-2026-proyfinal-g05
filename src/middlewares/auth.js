const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    const currentRole = req.userRole || req.session.userRole || (req.user && req.user.rol);
    if (currentRole !== role) {
      throw new ForbiddenError('Acceso denegado: permisos insuficientes para realizar esta acción');
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
