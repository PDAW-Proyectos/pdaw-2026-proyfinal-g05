class PeliculasController {
  #tmdbService;

  constructor({ tmdbService }) {
    this.#tmdbService = tmdbService;
  }

  async buscar(req, res, next) {
    try {
      const query = req.query.q;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: 'El parámetro de búsqueda (q) es obligatorio' });
      }

      const respuesta = await this.#tmdbService.buscarPeliculas(query);
      const resultadosTMDB = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

      const peliculas = resultadosTMDB.map(p => ({
        id: p.id,
        titulo: p.title,
        sinopsis: p.overview || '',
        posterPath: p.poster_path || null,
        fechaEstreno: p.release_date || null,
        calificacion: p.vote_average || 0
      }));

      return res.status(200).json(peliculas);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PeliculasController;
