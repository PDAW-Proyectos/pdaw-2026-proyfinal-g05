const PeliculasController = require('../../src/controllers/PeliculasController');

describe('PeliculasController (Unit)', () => {
  let mockTmdbService;
  let controller;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockTmdbService = {
      buscarPeliculas: jest.fn()
    };

    controller = new PeliculasController({ tmdbService: mockTmdbService });

    req = {
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  test('retorna 400 si el parámetro q no está presente', async () => {
    await controller.buscar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'El parámetro de búsqueda (q) es obligatorio' });
    expect(mockTmdbService.buscarPeliculas).not.toHaveBeenCalled();
  });

  test('retorna 400 si el parámetro q es un string vacío o solo espacios', async () => {
    req.query.q = '   ';
    await controller.buscar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'El parámetro de búsqueda (q) es obligatorio' });
    expect(mockTmdbService.buscarPeliculas).not.toHaveBeenCalled();
  });

  test('retorna 200 con películas mapeadas correctamente a formato estandarizado', async () => {
    req.query.q = 'Matrix';
    const mockTMDBResponse = {
      results: [
        {
          id: 603,
          title: 'The Matrix',
          overview: 'Un hacker aprende la verdad sobre su realidad.',
          poster_path: '/matrix.jpg',
          release_date: '1999-03-30',
          vote_average: 8.7
        },
        {
          id: 604,
          title: 'The Matrix Reloaded',
          overview: null,
          poster_path: null,
          release_date: null,
          vote_average: null
        }
      ]
    };

    mockTmdbService.buscarPeliculas.mockResolvedValue(mockTMDBResponse);

    await controller.buscar(req, res, next);

    expect(mockTmdbService.buscarPeliculas).toHaveBeenCalledWith('Matrix');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 603,
        titulo: 'The Matrix',
        sinopsis: 'Un hacker aprende la verdad sobre su realidad.',
        posterPath: '/matrix.jpg',
        fechaEstreno: '1999-03-30',
        calificacion: 8.7
      },
      {
        id: 604,
        titulo: 'The Matrix Reloaded',
        sinopsis: '',
        posterPath: null,
        fechaEstreno: null,
        calificacion: 0
      }
    ]);
  });

  test('llama a next con error si el servicio tmdbService falla', async () => {
    req.query.q = 'Avatar';
    const errorSimulado = new Error('TMDB connection error');
    mockTmdbService.buscarPeliculas.mockRejectedValue(errorSimulado);

    await controller.buscar(req, res, next);

    expect(next).toHaveBeenCalledWith(errorSimulado);
  });
});
