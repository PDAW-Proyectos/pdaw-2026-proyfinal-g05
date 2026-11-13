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

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params || {};
      if (!id || typeof id !== 'string' || !/^\d+$/.test(id.trim())) {
        return res.status(400).json({ error: 'El id de la película debe ser numérico válido' });
      }

      const pelicula = await this.#adapter.obtenerPeliculaPorId(id.trim());
      if (!pelicula) {
        return res.status(404).json({ error: 'Película no encontrada' });
      }

      return res.status(200).json(pelicula);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PeliculasController;
