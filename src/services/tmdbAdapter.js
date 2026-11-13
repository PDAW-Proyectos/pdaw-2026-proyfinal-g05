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
      fechaEstreno: p.release_date || null,
      calificacion: p.vote_average || 0,
      duracion: p.runtime || null,
      generos: Array.isArray(p.genres) ? p.genres.map(g => g.name || g) : [],
      idiomaOriginal: p.original_language || 'en',
      votosTotal: p.vote_count || 0,
      reparto: castList
    };
  }

  async obtenerPopulares(page = 1) {
    const respuesta = await this.#tmdbService.obtenerPopulares(page);
    const resultados = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);

    const GENEROS_TMDB = {
      28: 'Acción',
      12: 'Aventura',
      16: 'Animación',
      35: 'Comedia',
      80: 'Crimen',
      99: 'Documental',
      18: 'Drama',
      10751: 'Familia',
      14: 'Fantasía',
      36: 'Historia',
      27: 'Terror',
      10402: 'Música',
      9648: 'Misterio',
      10749: 'Romance',
      878: 'Ciencia Ficción',
      10770: 'Película de TV',
      53: 'Thriller',
      10752: 'Bélica',
      37: 'Western'
    };

    return resultados.map(p => ({
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
  }
}

module.exports = TmdbAdapter;
