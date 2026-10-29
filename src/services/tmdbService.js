const { AppError, NotFoundError, ValidationError } = require('../utils/errors');

class TmdbService {
  #apiKey;
  #baseUrl;
  #fetchFn;

  constructor(options = {}) {
    const config = options?.config || options || {};
    this.#apiKey = config?.tmdbApiKey || process.env.TMDB_API_KEY;
    this.#baseUrl = config?.tmdbBaseUrl || process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
    this.#fetchFn = options?.fetchFn || globalThis.fetch;

    if (!this.#apiKey) {
      throw new Error('tmdbApiKey es requerida');
    }
  }

  get apiKey() {
    return this.#apiKey;
  }

  get baseUrl() {
    return this.#baseUrl;
  }

  async #request(endpoint, params = {}) {
    const cleanBaseUrl = this.#baseUrl.endsWith('/') ? this.#baseUrl.slice(0, -1) : this.#baseUrl;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${cleanBaseUrl}${cleanEndpoint}`);
    url.searchParams.set('api_key', this.#apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    let response;
    try {
      response = await this.#fetchFn(url.toString(), {
        headers: {
          'Accept': 'application/json'
        }
      });
    } catch (err) {
      throw new AppError(`Error al conectar con TMDB: ${err.message}`, 502);
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('Película o recurso no encontrado en TMDB');
      }
      let errorMsg = `Error en la API de TMDB (Status ${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData?.status_message) {
          errorMsg = errorData.status_message;
        }
      } catch {}
      throw new AppError(errorMsg, response.status >= 500 ? 502 : response.status);
    }

    return await response.json();
  }

  async buscarPeliculas(query, page = 1) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new ValidationError('El término de búsqueda es obligatorio');
    }
    return await this.#request('/search/movie', {
      query: query.trim(),
      page
    });
  }

  async obtenerPeliculaPorId(id) {
    if (!id) {
      throw new ValidationError('El ID de la película es obligatorio');
    }
    return await this.#request(`/movie/${id}`);
  }

  async obtenerPopulares(page = 1) {
    return await this.#request('/movie/popular', { page });
  }

  async searchMovies(query, page = 1) {
    return await this.buscarPeliculas(query, page);
  }

  async getMovieById(id) {
    return await this.obtenerPeliculaPorId(id);
  }

  async getPopular(page = 1) {
    return await this.obtenerPopulares(page);
  }
}

module.exports = TmdbService;

