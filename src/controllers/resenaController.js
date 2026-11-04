class ResenaController {
  #resenaService;

  constructor({ resenaService } = {}) {
    this.#resenaService = resenaService;
  }

  async crear(req, res, next) {
    try {
      const userId =
        (typeof req.header === 'function' ? req.header('x-user-id') : null) ||
        (req.headers && (req.headers['x-user-id'] || req.headers['X-User-Id']));

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res
          .status(400)
          .json({ error: 'El encabezado x-user-id es obligatorio' });
      }

      const { puntuacion, texto, peliculaId, idPelicula, contieneSpoilers } =
        req.body || {};

      if (
        puntuacion === undefined ||
        puntuacion === null ||
        typeof puntuacion === 'boolean' ||
        (typeof puntuacion === 'string' && puntuacion.trim() === '')
      ) {
        return res.status(400).json({
          error: 'La puntuación es obligatoria y debe ser un número entre 1 y 5',
        });
      }

      const numPuntuacion = Number(puntuacion);
      if (
        Number.isNaN(numPuntuacion) ||
        numPuntuacion < 1 ||
        numPuntuacion > 5
      ) {
        return res.status(400).json({
          error: 'La puntuación debe ser un número entre 1 y 5',
        });
      }

      const resenaData = {
        autorId: userId.trim(),
        peliculaId: peliculaId || idPelicula,
        puntuacion: numPuntuacion,
        texto,
        contieneSpoilers: Boolean(contieneSpoilers),
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
}

module.exports = ResenaController;

