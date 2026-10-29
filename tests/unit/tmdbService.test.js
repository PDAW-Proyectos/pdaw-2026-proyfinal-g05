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

