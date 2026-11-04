const TmdbService = require('./tmdbService');

class TmdbAdapter {
  #tmdbService;

  constructor(options = {}) {
    this.#tmdbService = options.tmdbService || new TmdbService(options);
  }

  async buscarPeliculas(query, page = 1) {
    const respuesta = await this.#tmdbService.buscarPeliculas(query, page);
    const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

    return resultados.map(p => ({
      id: String(p.id),
      titulo: p.title,
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0
    }));
  }

  async obtenerPeliculaPorId(id) {
    const p = await this.#tmdbService.obtenerPeliculaPorId(id);

    return {
      id: String(p.id),
      titulo: p.title,
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0
    };
  }

  async obtenerPopulares(page = 1) {
    const respuesta = await this.#tmdbService.obtenerPopulares(page);
    const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

    return resultados.map(p => ({
      id: String(p.id),
      titulo: p.title,
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0
    }));
  }
}

module.exports = TmdbAdapter;
