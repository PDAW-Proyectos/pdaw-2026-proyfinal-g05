const { AppError, NotFoundError, ValidationError } = require('../utils/errors');

class TmdbService {
  #apiKey;
  #baseUrl;
  #fetchFn;
  #cache;
  #baseDelay;

  constructor(options = {}) {
    const config = options?.config || options || {};
    this.#apiKey = config?.tmdbApiKey || process.env.TMDB_API_KEY;
    this.#baseUrl = config?.tmdbBaseUrl || process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
    this.#fetchFn = options?.fetchFn || globalThis.fetch;
    this.#cache = new Map();
    this.#baseDelay = options?.baseDelay ?? (process.env.NODE_ENV === 'test' ? 10 : 1000);

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

  get cache() {
    return this.#cache;
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
        },
        signal: AbortSignal.timeout(5000)
      });
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const error = new AppError(`Error al conectar con TMDB: ${err.message}`, 502);
      error.isNetworkError = !isTimeout;
      error.isTimeout = isTimeout;
      error.status = 502;
      throw error;
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
      const error = new AppError(errorMsg, response.status >= 500 ? 502 : response.status);
      error.tmdbStatus = response.status;
      error.status = response.status >= 500 ? 502 : response.status;
      throw error;
    }

    return await response.json();
  }

  async buscarPeliculas(query, page = 1) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new ValidationError('El término de búsqueda es obligatorio');
    }

    const cleanQuery = query.trim();
    const cacheKey = `${cleanQuery.toLowerCase()}:${page}`;
    const cached = this.#cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < 120000)) {
      return cached.data;
    }

    let lastError;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.#request('/search/movie', {
          query: cleanQuery,
          page
        });

        this.#cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        return data;
      } catch (err) {
        lastError = err;

        const isRetryable =
          err.isNetworkError === true ||
          (typeof err.tmdbStatus === 'number' && [429, 500, 502, 503, 504].includes(err.tmdbStatus));

        if (!isRetryable || attempt === maxAttempts) {
          throw err;
        }

        const delay = this.#baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
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
