class PeliculasController {
  #adapter;

  constructor({ tmdbAdapter, tmdbService } = {}) {
    this.#adapter = tmdbAdapter || tmdbService;
  }

  async buscar(req, res, next) {
    try {
      const query = req.query.q;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: 'El parámetro de búsqueda (q) es obligatorio' });
      }

      const respuesta = await this.#adapter.buscarPeliculas(query);
      const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

      const peliculas = resultados.map(p => ({
        id: p.id,
        titulo: p.titulo !== undefined ? p.titulo : p.title,
        sinopsis: (p.sinopsis !== undefined ? p.sinopsis : p.overview) || '',
        posterPath: (p.posterPath !== undefined ? p.posterPath : p.poster_path) || null,
        fechaEstreno: (p.fechaEstreno !== undefined ? p.fechaEstreno : p.release_date) || null,
        calificacion: (p.calificacion !== undefined ? p.calificacion : p.vote_average) || 0
      }));

      return res.status(200).json(peliculas);
    } catch (error) {
      next(error);
    }
  }

  async populares(req, res, next) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const fn =
        typeof this.#adapter?.obtenerPopulares === 'function'
          ? this.#adapter.obtenerPopulares.bind(this.#adapter)
          : typeof this.#adapter?.getPopular === 'function'
            ? this.#adapter.getPopular.bind(this.#adapter)
            : null;

      if (!fn) {
        return res.status(200).json([]);
      }

      const respuesta = await fn(page);
      const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

      const peliculas = resultados.map(p => ({
        id: String(p.id),
        titulo: p.titulo !== undefined ? p.titulo : p.title,
        sinopsis: (p.sinopsis !== undefined ? p.sinopsis : p.overview) || '',
        posterPath: (p.posterPath !== undefined ? p.posterPath : p.poster_path) || null,
        fechaEstreno: (p.fechaEstreno !== undefined ? p.fechaEstreno : p.release_date) || null,
        calificacion: (p.calificacion !== undefined ? p.calificacion : p.vote_average) || 0,
        generos: p.generos || []
      }));

      return res.status(200).json(peliculas);
    } catch (error) {
      next(error);
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params || {};
      if (!id || typeof id !== 'string' || !/^\d+$/.test(id.trim())) {
        return res.status(400).json({ error: 'El id de la película debe ser numérico válido' });
      }

      const fn =
        typeof this.#adapter?.obtenerPeliculaPorId === 'function'
          ? this.#adapter.obtenerPeliculaPorId.bind(this.#adapter)
          : typeof this.#adapter?.getMovieById === 'function'
            ? this.#adapter.getMovieById.bind(this.#adapter)
            : null;

      if (!fn) {
        return res.status(404).json({ error: 'Película no encontrada' });
      }

      const p = await fn(id.trim());
      if (!p) {
        return res.status(404).json({ error: 'Película no encontrada' });
      }

      const pelicula = {
        id: String(p.id),
        titulo: p.titulo !== undefined ? p.titulo : (p.title || 'Película'),
        tituloOriginal: p.tituloOriginal || p.original_title || p.titulo || p.title || '',
        tagline: p.tagline || '',
        sinopsis: (p.sinopsis !== undefined ? p.sinopsis : p.overview) || '',
        posterPath: (p.posterPath !== undefined ? p.posterPath : p.poster_path) || null,
        fechaEstreno: (p.fechaEstreno !== undefined ? p.fechaEstreno : p.release_date) || null,
        calificacion: (p.calificacion !== undefined ? p.calificacion : p.vote_average) || 0,
        duracion: p.runtime || p.duracion || null,
        generos: Array.isArray(p.genres) ? p.genres.map(g => g.name || g) : (p.generos || []),
        idiomaOriginal: p.original_language || p.idiomaOriginal || 'en',
        votosTotal: p.vote_count || p.votosTotal || 0,
        reparto: Array.isArray(p.reparto)
          ? p.reparto
          : (Array.isArray(p.credits?.cast)
              ? p.credits.cast.slice(0, 5).map(c => ({ nombre: c.name, personaje: c.character || '' }))
              : [])
      };

      return res.status(200).json(pelicula);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PeliculasController;
