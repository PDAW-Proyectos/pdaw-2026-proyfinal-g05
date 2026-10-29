const request = require('supertest');
const { createApp } = require('../../src/app');
const PeliculasController = require('../../src/controllers/PeliculasController');
const createPeliculasRoutes = require('../../src/routes/peliculasRoutes');
const { createContainer } = require('../../src/container');

describe('GET /api/peliculas/buscar (Integration)', () => {
  let app;
  let mockTmdbService;

  beforeEach(() => {
    mockTmdbService = {
      buscarPeliculas: jest.fn()
    };

    const peliculasController = new PeliculasController({ tmdbService: mockTmdbService });
    const peliculasRoutes = createPeliculasRoutes({ peliculasController });

    app = createApp({
      config: {
        sessionSecret: 'test_secret',
        env: 'test'
      },
      services: {
        usuarioService: {
          buscarPorEmail: jest.fn(),
          buscarPorId: jest.fn()
        },
        peliculasRoutes
      }
    });
  });

  test('retorna 400 si no se incluye parámetro q', async () => {
    const res = await request(app).get('/api/peliculas/buscar');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'El parámetro de búsqueda (q) es obligatorio' });
  });

  test('retorna 200 con listado de películas estandarizadas', async () => {
    mockTmdbService.buscarPeliculas.mockResolvedValue({
      results: [
        {
          id: 550,
          title: 'Fight Club',
          overview: 'Un oficinista insomne...',
          poster_path: '/poster.jpg',
          release_date: '1999-10-15',
          vote_average: 8.4
        }
      ]
    });

    const res = await request(app).get('/api/peliculas/buscar?q=fight');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 550,
        titulo: 'Fight Club',
        sinopsis: 'Un oficinista insomne...',
        posterPath: '/poster.jpg',
        fechaEstreno: '1999-10-15',
        calificacion: 8.4
      }
    ]);
  });

  test('contenedor registra peliculasController y peliculasRoutes', () => {
    const container = createContainer({
      config: {
        tmdbApiKey: 'dummy_key',
        tmdbBaseUrl: 'https://api.themoviedb.org/3',
        data: {
          usuariosFile: '/tmp/test_usuarios.json',
          resenasFile: '/tmp/test_resenas.json'
        }
      }
    });

    expect(container.services.peliculasController).toBeDefined();
    expect(container.services.peliculasRoutes).toBeDefined();
  });
});
