class PeliculasController {
  #tmdbAdapter;

  constructor({ tmdbAdapter }) {
    this.#tmdbAdapter = tmdbAdapter;
  }

  async buscar(req, res, next) {
    try {
      const query = req.query.q;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({ error: 'El parámetro de búsqueda (q) es obligatorio' });
      }

      const peliculas = await this.#tmdbAdapter.buscarPeliculas(query);

      return res.status(200).json(peliculas);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PeliculasController;
