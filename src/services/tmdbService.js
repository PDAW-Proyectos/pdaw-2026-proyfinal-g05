const { AppError, NotFoundError, ValidationError } = require('../utils/errors');

const GENEROS_IDS = {
  'accion': 28,
  'aventura': 12,
  'animacion': 16,
  'comedia': 35,
  'crimen': 80,
  'documental': 99,
  'drama': 18,
  'familia': 10751,
  'fantasia': 14,
  'historia': 36,
  'terror': 27,
  'musica': 10402,
  'misterio': 9648,
  'romance': 10749,
  'ciencia ficcion': 878,
  'pelicula de tv': 10770,
  'thriller': 53,
  'belica': 10752,
  'western': 37
};

function normalizarTextoGenero(str) {
  if (!str || typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

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

  async buscarPeliculas(query, page = 1, options = {}) {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new ValidationError('El término de búsqueda es obligatorio');
    }

    const cleanQuery = query.trim();
    const { anio } = options || {};
    const cleanAnio = anio && anio !== 'todos' ? String(anio).trim() : null;

    const cacheKey = `${cleanQuery.toLowerCase()}:${page}:${cleanAnio || ''}`;
    const cached = this.#cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < 120000)) {
      return cached.data;
    }

    let lastError;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const params = {
          query: cleanQuery,
          page
        };

        if (cleanAnio && cleanAnio !== 'clasicos' && /^\d{4}$/.test(cleanAnio)) {
          params.primary_release_year = cleanAnio;
        }

        const data = await this.#request('/search/movie', params);

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

  async obtenerPeliculaPorId(id, params = {}) {
    if (!id) {
      throw new ValidationError('El ID de la película es obligatorio');
    }
    return await this.#request(`/movie/${id}`, {
      append_to_response: 'credits',
      language: 'es-ES',
      ...params
    });
  }

  async obtenerPopulares(page = 1, options = {}) {
    const { anio, genero } = options || {};
    const cleanAnio = anio && anio !== 'todos' ? String(anio).trim() : null;
    const cleanGenero = genero && genero !== 'todos' ? String(genero).trim() : null;

    if (cleanAnio || cleanGenero) {
      const params = {
        sort_by: 'popularity.desc',
        page
      };

      if (cleanAnio) {
        if (cleanAnio === 'clasicos') {
          params['primary_release_date.lte'] = '2019-12-31';
        } else if (/^\d{4}$/.test(cleanAnio)) {
          params.primary_release_year = cleanAnio;
        }
      }

      if (cleanGenero) {
        const norm = normalizarTextoGenero(cleanGenero);
        const generoId = GENEROS_IDS[norm];
        if (generoId) {
          params.with_genres = generoId;
        }
      }

      const cacheKey = `discover:${page}:${cleanAnio || ''}:${cleanGenero || ''}`;
      const cached = this.#cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 120000)) {
        return cached.data;
      }

      const data = await this.#request('/discover/movie', params);
      this.#cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      return data;
    }

    return await this.#request('/movie/popular', { page });
  }

  async searchMovies(query, page = 1, options = {}) {
    return await this.buscarPeliculas(query, page, options);
  }

  async getMovieById(id) {
    return await this.obtenerPeliculaPorId(id);
  }

  async getPopular(page = 1, options = {}) {
    return await this.obtenerPopulares(page, options);
  }
}

module.exports = TmdbService;
