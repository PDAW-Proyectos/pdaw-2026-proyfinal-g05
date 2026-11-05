const PeliculasController = require('../../src/controllers/PeliculasController');

describe('PeliculasController (Unit)', () => {
  let mockTmdbAdapter;
  let controller;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockTmdbAdapter = {
      buscarPeliculas: jest.fn()
    };

    controller = new PeliculasController({ tmdbAdapter: mockTmdbAdapter });

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
    expect(mockTmdbAdapter.buscarPeliculas).not.toHaveBeenCalled();
  });

  test('retorna 400 si el parámetro q es un string vacío o solo espacios', async () => {
    req.query.q = '   ';
    await controller.buscar(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'El parámetro de búsqueda (q) es obligatorio' });
    expect(mockTmdbAdapter.buscarPeliculas).not.toHaveBeenCalled();
  });

  test('retorna 200 con películas mapeadas correctamente a formato estandarizado', async () => {
    req.query.q = 'Matrix';
    const mockPeliculas = [
      {
        id: '603',
        titulo: 'The Matrix',
        sinopsis: 'Un hacker aprende la verdad sobre su realidad.',
        posterPath: '/matrix.jpg',
        fechaEstreno: '1999-03-30',
        calificacion: 8.7
      },
      {
        id: '604',
        titulo: 'The Matrix Reloaded',
        sinopsis: '',
        posterPath: null,
        fechaEstreno: null,
        calificacion: 0
      }
    ];

    mockTmdbAdapter.buscarPeliculas.mockResolvedValue(mockPeliculas);

    await controller.buscar(req, res, next);

    expect(mockTmdbAdapter.buscarPeliculas).toHaveBeenCalledWith('Matrix');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPeliculas);
  });

  test('llama a next con error si el servicio tmdbService falla', async () => {
    req.query.q = 'Avatar';
    const errorSimulado = new Error('TMDB connection error');
    mockTmdbAdapter.buscarPeliculas.mockRejectedValue(errorSimulado);

    await controller.buscar(req, res, next);

    expect(next).toHaveBeenCalledWith(errorSimulado);
  });
});
