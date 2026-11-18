const TmdbService = require('./tmdbService');
const { GENEROS_TMDB } = TmdbService;

class TmdbAdapter {
  #tmdbService;

  constructor(options = {}) {
    this.#tmdbService = options.tmdbService || new TmdbService(options);
  }

  async buscarPeliculas(query, page = 1, options = {}) {
    const respuesta = await this.#tmdbService.buscarPeliculas(query, page, options);
    const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

    const peliculas = resultados.map(p => ({
      id: String(p.id),
      titulo: p.title,
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0,
      ...(Array.isArray(p.genre_ids) || Array.isArray(p.genres)
        ? {
            generos: Array.isArray(p.genres)
              ? p.genres.map(g => g.name || g)
              : p.genre_ids.map(id => GENEROS_TMDB[id]).filter(Boolean)
          }
        : {})
    }));

    if (respuesta && typeof respuesta === 'object' && !Array.isArray(respuesta)) {
      peliculas.totalPages = Number(respuesta.total_pages) || 1;
      peliculas.totalResults = Number(respuesta.total_results) || peliculas.length;
      peliculas.page = Number(respuesta.page) || Number(page) || 1;
    }

    return peliculas;
  }

  async obtenerPeliculaPorId(id) {
    const p = await this.#tmdbService.obtenerPeliculaPorId(id);

    const castList = Array.isArray(p.credits?.cast)
      ? p.credits.cast.slice(0, 5).map(c => ({
          nombre: c.name,
          personaje: c.character || ''
        }))
      : [];

    return {
      id: String(p.id),
      titulo: p.title,
      tituloOriginal: p.original_title || p.title,
      tagline: p.tagline || '',
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      backdropPath: p.backdrop_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0,
      duracion: p.runtime || null,
      generos: Array.isArray(p.genres) ? p.genres.map(g => g.name || g) : [],
      idiomaOriginal: p.original_language || 'en',
      votosTotal: p.vote_count || 0,
      reparto: castList
    };
  }

  async obtenerPopulares(page = 1, options = {}) {
    const respuesta = await this.#tmdbService.obtenerPopulares(page, options);
    const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

    const peliculas = resultados.map(p => ({
      id: String(p.id),
      titulo: p.title,
      sinopsis: p.overview || '',
      posterPath: p.poster_path || null,
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0,
      generos: Array.isArray(p.genres)
        ? p.genres.map(g => g.name || g)
        : (Array.isArray(p.genre_ids) ? p.genre_ids.map(id => GENEROS_TMDB[id]).filter(Boolean) : [])
    }));

    if (respuesta && typeof respuesta === 'object' && !Array.isArray(respuesta)) {
      peliculas.totalPages = Number(respuesta.total_pages) || 1;
      peliculas.totalResults = Number(respuesta.total_results) || peliculas.length;
      peliculas.page = Number(respuesta.page) || Number(page) || 1;
    }

    return peliculas;
  }
}

module.exports = TmdbAdapter;
