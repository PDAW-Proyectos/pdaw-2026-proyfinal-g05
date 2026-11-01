const TmdbService = require('../../src/services/tmdbService');
const { createContainer } = require('../../src/container');
const { NotFoundError, ValidationError, AppError } = require('../../src/utils/errors');

describe('TmdbService (Unit)', () => {
  const dummyConfig = {
    tmdbApiKey: 'test_api_key_123',
    tmdbBaseUrl: 'https://api.themoviedb.org/3'
  };

  test('lanza un error si no se proporciona tmdbApiKey', () => {
    const originalEnv = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;

    expect(() => new TmdbService({ config: {} })).toThrow('tmdbApiKey es requerida');

    process.env.TMDB_API_KEY = originalEnv;
  });

  test('se instancia correctamente con config proporcionada', () => {
    const service = new TmdbService({ config: dummyConfig });
    expect(service.apiKey).toBe('test_api_key_123');
    expect(service.baseUrl).toBe('https://api.themoviedb.org/3');
    expect(service.cache).toBeInstanceOf(Map);
  });

  test('buscarPeliculas lanza ValidationError si el query está vacío', async () => {
    const service = new TmdbService({ config: dummyConfig });
    await expect(service.buscarPeliculas('')).rejects.toThrow(ValidationError);
    await expect(service.buscarPeliculas('   ')).rejects.toThrow('El término de búsqueda es obligatorio');
  });

  test('buscarPeliculas realiza la petición con api_key, query y page correctos', async () => {
    const mockData = { results: [{ id: 550, title: 'Fight Club' }] };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData)
    });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    const res = await service.buscarPeliculas('Fight Club', 2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('api_key=test_api_key_123');
    expect(calledUrl).toContain('query=Fight+Club');
    expect(calledUrl).toContain('page=2');
    expect(res).toEqual(mockData);
  });

  test('buscarPeliculas utiliza caché en memoria con TTL de 2 minutos', async () => {
    const mockData = { results: [{ id: 550, title: 'Fight Club' }] };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData)
    });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    const res1 = await service.buscarPeliculas('Fight Club');
    const res2 = await service.buscarPeliculas('Fight Club');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120001);

    const res3 = await service.buscarPeliculas('Fight Club');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res3).toEqual(mockData);

    nowSpy.mockRestore();
  });

  test('buscarPeliculas reintenta hasta 3 veces ante error de red y lanza AppError 502', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch,
      baseDelay: 1
    });

    await expect(service.buscarPeliculas('Matrix')).rejects.toThrow(AppError);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    try {
      await service.buscarPeliculas('Matrix');
    } catch (err) {
      expect(err.statusCode).toBe(502);
      expect(err.status).toBe(502);
    }
  });

  test('buscarPeliculas reintenta ante respuestas transitorias 429, 500, 502, 503, 504', async () => {
    const transientStatuses = [429, 500, 502, 503, 504];

    for (const status of transientStatuses) {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status,
        json: jest.fn().mockResolvedValue({ status_message: `Error ${status}` })
      });

      const service = new TmdbService({
        config: dummyConfig,
        fetchFn: mockFetch,
        baseDelay: 1
      });

      await expect(service.buscarPeliculas(`Movie ${status}`)).rejects.toThrow(AppError);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }
  });

  test('buscarPeliculas no reintenta ante errores permanentes como 404 o 400', async () => {
    const mockFetch404 = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ status_message: 'Not found' })
    });

    const service404 = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch404,
      baseDelay: 1
    });

    await expect(service404.buscarPeliculas('NonExistent')).rejects.toThrow(NotFoundError);
    expect(mockFetch404).toHaveBeenCalledTimes(1);

    const mockFetch400 = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ status_message: 'Bad Request' })
    });

    const service400 = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch400,
      baseDelay: 1
    });

    await expect(service400.buscarPeliculas('BadQuery')).rejects.toThrow(AppError);
    expect(mockFetch400).toHaveBeenCalledTimes(1);
  });

  test('buscarPeliculas no reintenta si ocurre un timeout por AbortSignal', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';

    const mockFetch = jest.fn().mockRejectedValue(timeoutErr);

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch,
      baseDelay: 1
    });

    await expect(service.buscarPeliculas('TimeoutMovie')).rejects.toThrow(AppError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('buscarPeliculas se recupera exitosamente si el error transitorio cesa en el segundo intento', async () => {
    const mockData = { results: [{ id: 100, title: 'Inception' }] };
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: jest.fn().mockResolvedValue({ status_message: 'Service Unavailable' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockData)
      });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch,
      baseDelay: 1
    });

    const res = await service.buscarPeliculas('Inception');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res).toEqual(mockData);
  });

  test('obtenerPeliculaPorId lanza ValidationError si falta el id', async () => {
    const service = new TmdbService({ config: dummyConfig });
    await expect(service.obtenerPeliculaPorId()).rejects.toThrow(ValidationError);
  });

  test('obtenerPeliculaPorId devuelve los detalles de la película', async () => {
    const mockMovie = { id: 550, title: 'Fight Club' };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockMovie)
    });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    const res = await service.obtenerPeliculaPorId(550);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/movie/550');
    expect(calledUrl).toContain('api_key=test_api_key_123');
    expect(res).toEqual(mockMovie);
  });

  test('obtenerPopulares devuelve el listado de películas populares', async () => {
    const mockPopular = { results: [{ id: 1, title: 'Popular Movie' }] };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockPopular)
    });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    const res = await service.obtenerPopulares();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('/movie/popular');
    expect(calledUrl).toContain('api_key=test_api_key_123');
    expect(res).toEqual(mockPopular);
  });

  test('lanza NotFoundError si TMDB responde 404', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ status_message: 'The resource you requested could not be found.' })
    });

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    await expect(service.obtenerPeliculaPorId(9999999)).rejects.toThrow(NotFoundError);
  });

  test('lanza AppError si la conexión de red falla', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    const service = new TmdbService({
      config: dummyConfig,
      fetchFn: mockFetch
    });

    await expect(service.buscarPeliculas('Matrix')).rejects.toThrow(AppError);
  });

  test('createContainer registra tmdbService correctamente en el contenedor', () => {
    const container = createContainer({
      config: {
        ...dummyConfig,
        data: {
          usuariosFile: '/tmp/test_usuarios.json',
          resenasFile: '/tmp/test_resenas.json'
        }
      }
    });

    expect(container.services.tmdbService).toBeDefined();
    expect(container.services.tmdbService).toBeInstanceOf(TmdbService);
  });
});
