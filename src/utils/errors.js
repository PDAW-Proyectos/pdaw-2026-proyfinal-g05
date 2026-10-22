class AppError extends Error {
  #statusCode;

  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.#statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  get statusCode() {
    return this.#statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(message, 400);
  }
}

class BusinessRuleError extends AppError {
  constructor(message = 'Regla de negocio no cumplida') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflicto con el recurso actual') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  BusinessRuleError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
