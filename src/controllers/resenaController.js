class ResenaController {
  #resenaService;

  constructor({ resenaService } = {}) {
    this.#resenaService = resenaService;
  }

  async crear(req, res, next) {
    try {
      const userId =
        (req.session && req.session.userId) ||
        (typeof req.header === 'function' ? req.header('x-user-id') : null) ||
        (req.headers && (req.headers['x-user-id'] || req.headers['X-User-Id']));

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res
          .status(400)
          .json({ error: 'Necesitás iniciar sesión para publicar una reseña' });
      }

      const {
        puntuacion,
        texto,
        peliculaId,
        idPelicula,
        contieneSpoilers,
        vistaPreviamente,
        esFavorita,
        fechaVisionado,
      } = req.body || {};

      if (
        puntuacion === undefined ||
        puntuacion === null ||
        typeof puntuacion === 'boolean' ||
        (typeof puntuacion === 'string' && puntuacion.trim() === '')
      ) {
        return res.status(400).json({
          error: 'La puntuación es obligatoria y debe ser un número entre 0.5 y 5',
        });
      }

      const numPuntuacion = Number(puntuacion);
      if (
        Number.isNaN(numPuntuacion) ||
        numPuntuacion < 0.5 ||
        numPuntuacion > 5 ||
        !Number.isInteger(numPuntuacion * 2)
      ) {
        return res.status(400).json({
          error: 'La puntuación debe ser un número entre 0.5 y 5 en pasos de 0.5',
        });
      }

      const resenaData = {
        autorId: userId.trim(),
        peliculaId: peliculaId || idPelicula,
        puntuacion: numPuntuacion,
        texto,
        contieneSpoilers: Boolean(contieneSpoilers),
        ...(vistaPreviamente !== undefined
          ? { vistaPreviamente: Boolean(vistaPreviamente) }
          : {}),
        ...(fechaVisionado !== undefined ? { fechaVisionado } : {}),
        ...(esFavorita !== undefined
          ? { esFavorita: Boolean(esFavorita) }
          : {}),
      };

      if (
        this.#resenaService &&
        typeof this.#resenaService.crear === 'function'
      ) {
        const resenaCreada = await this.#resenaService.crear(resenaData);

        if (resenaCreada && resenaCreada.id) {
          res.setHeader('Location', `/api/resenas/${resenaCreada.id}`);
        }

        const respuesta =
          resenaCreada && typeof resenaCreada.paraExponer === 'function'
            ? resenaCreada.paraExponer()
            : resenaCreada && typeof resenaCreada.toJSON === 'function'
              ? resenaCreada.toJSON()
              : resenaCreada;

        return res.status(201).json(respuesta);
      }

      return res.status(201).json(resenaData);
    } catch (error) {
      next(error);
    }
  }

  create(req, res, next) {
    return this.crear(req, res, next);
  }

  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const userId =
        (req.session && req.session.userId) ||
        (typeof req.header === 'function' ? req.header('x-user-id') : null) ||
        (req.headers && (req.headers['x-user-id'] || req.headers['X-User-Id']));

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res
          .status(401)
          .json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const {
        puntuacion,
        texto,
        contieneSpoilers,
        vistaPreviamente,
        esFavorita,
        fechaVisionado,
      } = req.body || {};

      const resenaActualizada = await this.#resenaService.actualizar(id, {
        autorId: userId.trim(),
        puntuacion,
        texto,
        contieneSpoilers,
        ...(vistaPreviamente !== undefined
          ? { vistaPreviamente: Boolean(vistaPreviamente) }
          : {}),
        ...(fechaVisionado !== undefined ? { fechaVisionado } : {}),
        ...(esFavorita !== undefined
          ? { esFavorita: Boolean(esFavorita) }
          : {}),
      });

      const respuesta =
        resenaActualizada && typeof resenaActualizada.paraExponer === 'function'
          ? resenaActualizada.paraExponer()
          : resenaActualizada && typeof resenaActualizada.toJSON === 'function'
            ? resenaActualizada.toJSON()
            : resenaActualizada;

      return res.status(200).json(respuesta);
    } catch (error) {
      next(error);
    }
  }

  patch(req, res, next) {
    return this.actualizar(req, res, next);
  }

  async listar(req, res, next) {
    try {
      const { peliculaId, limite } = req.query || {};
      if (
        this.#resenaService &&
        typeof this.#resenaService.listar === 'function'
      ) {
        const resenas = await this.#resenaService.listar({
          peliculaId,
          limite: limite ? Number(limite) : 10,
        });
        return res.status(200).json(resenas);
      }
      return res.status(200).json([]);
    } catch (error) {
      next(error);
    }
  }

  list(req, res, next) {
    return this.listar(req, res, next);
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params || {};
      if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({ error: 'El id de la reseña es obligatorio' });
      }

      if (this.#resenaService && typeof this.#resenaService.obtenerDetalle === 'function') {
        const detalle = await this.#resenaService.obtenerDetalle(id.trim());
        return res.status(200).json(detalle);
      }

      if (this.#resenaService && typeof this.#resenaService.obtenerPorId === 'function') {
        const resena = await this.#resenaService.obtenerPorId(id.trim());
        if (!resena) {
          return res.status(404).json({ error: 'Reseña no encontrada' });
        }
        const respuesta =
          typeof resena.paraExponer === 'function'
            ? resena.paraExponer()
            : typeof resena.toJSON === 'function'
              ? resena.toJSON()
              : resena;
        return res.status(200).json(respuesta);
      }

      return res.status(404).json({ error: 'Reseña no encontrada' });
    } catch (error) {
      next(error);
    }
  }

  getById(req, res, next) {
    return this.obtenerPorId(req, res, next);
  }
}

module.exports = ResenaController;

