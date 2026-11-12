const request = require('supertest');
const { createApp } = require('../../src/app');
const ResenaService = require('../../src/services/resenaService');
const { Critico, Moderador } = require('../../src/models/Usuario');

describe('POST /api/resenas (Integration) - T03.3 & T03.4', () => {
  let app;
  let mockResenaRepository;
  let mockUsuarioRepository;
  let resenaService;

  beforeEach(() => {
    mockResenaRepository = {
      guardar: jest.fn().mockImplementation(async (resena) => resena),
      leer: jest.fn().mockResolvedValue([])
    };

    mockUsuarioRepository = {
      findById: jest.fn().mockImplementation(async (id) => {
        if (id === 'Chamus12') {
          return new Critico({
            id: 'Chamus12',
            nombre: 'Branco Chamusco',
            email: 'bchamu@movieclub.com',
            passwordHash: 'hash',
            medioDePrensa: 'Clarin Cinema Productions'
          });
        }
        if (id === 'lucassafe') {
          return new Moderador({
            id: 'lucassafe',
            nombre: 'Lucas Safe',
            email: 'lucassafe@movieclub.com',
            passwordHash: 'hash'
          });
        }
        return null;
      }),
      guardar: jest.fn().mockImplementation(async (usuario) => usuario),
      leer: jest.fn().mockResolvedValue([])
    };

    resenaService = new ResenaService({
      resenaRepository: mockResenaRepository,
      usuarioRepository: mockUsuarioRepository
    });

    app = createApp({
      config: {
        sessionSecret: 'test_secret',
        env: 'test'
      },
      services: {
        usuarioService: {
          obtenerPorId: jest.fn(),
          login: jest.fn().mockImplementation(async ({ email }) => {
            const id = email.replace('@test.com', '');
            return { id, paraExponer: () => ({ id }) };
          })
        },
        resenaService
      }
    });
  });

  async function iniciarSesion(userId) {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      email: `${userId}@test.com`,
      password: 'password123'
    });
    return agent;
  }

  test('retorna 201 Created, header Location y la reseña creada al enviar datos válidos', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Una obra maestra indiscutible del cine moderno.',
      contieneSpoilers: false
    };

    const agent = await iniciarSesion('usr-test-123');
    const res = await agent
      .post('/api/resenas')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/api\/resenas\/[a-f0-9-]+$/i);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'usr-test-123',
      puntuacion: 5,
      texto: 'Una obra maestra indiscutible del cine moderno.',
      contieneSpoilers: false,
      esDestacada: false
    });
    expect(res.body.id).toBeDefined();
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('guarda la reseña con esDestacada: true si el usuario es un Critico (Polimorfismo T03.4)', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Análisis profesional: dirección magistral y guion implacable.',
      contieneSpoilers: false
    };

    const agent = await iniciarSesion('Chamus12');
    const res = await agent
      .post('/api/resenas')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'Chamus12',
      puntuacion: 5,
      esDestacada: true
    });
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('guarda la reseña con esDestacada: true si el usuario es un Moderador (Polimorfismo T03.4)', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Reseña aprobada con carácter oficial por moderación.',
      contieneSpoilers: false
    };

    const agent = await iniciarSesion('lucassafe');
    const res = await agent
      .post('/api/resenas')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'lucassafe',
      puntuacion: 5,
      esDestacada: true
    });
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('retorna 401 si no hay sesión activa (incluso si envían x-user-id)', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 4,
      texto: 'Una película excelente y muy entretenida.',
    };

    const resSinSesion = await request(app)
      .post('/api/resenas')
      .send(payload);

    expect(resSinSesion.status).toBe(401);
    expect(resSinSesion.body.error).toContain('Acceso no autorizado');

    const resConHeaderFalso = await request(app)
      .post('/api/resenas')
      .set('x-user-id', 'Chamus12')
      .send(payload);

    expect(resConHeaderFalso.status).toBe(401);
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 400 si la entidad Resena rechaza los datos por texto insuficiente', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 4,
      texto: 'Corta'
    };

    const agent = await iniciarSesion('usr-test-123');
    const res = await agent
      .post('/api/resenas')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('entre 10 y 2000 caracteres');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('acepta calificaciones en medias estrellas como 0.5 y 3.5', async () => {
    const agent = await iniciarSesion('usr-test-123');
    const resMedia = await agent
      .post('/api/resenas')
      .send({
        peliculaId: '550',
        puntuacion: 0.5,
        texto: 'No cumplió las expectativas, pero destaca la fotografía.',
        contieneSpoilers: false
      });

    expect(resMedia.status).toBe(201);
    expect(resMedia.body.puntuacion).toBe(0.5);

    const resTresYMedia = await agent
      .post('/api/resenas')
      .send({
        peliculaId: '550',
        puntuacion: 3.5,
        texto: 'Muy sólida propuesta narrativa con buen ritmo.',
        contieneSpoilers: true
      });

    expect(resTresYMedia.status).toBe(201);
    expect(resTresYMedia.body.puntuacion).toBe(3.5);
  });

  test('registra vistaPreviamente, fechaVisionado en ISO 8601 UTC, esFavorita y actualiza las favoritas del usuario', async () => {
    const agent = await iniciarSesion('Chamus12');
    const res = await agent
      .post('/api/resenas')
      .send({
        peliculaId: '550',
        puntuacion: 5,
        texto: 'Directo a mi lista de películas favoritas tras volver a verla.',
        contieneSpoilers: false,
        vistaPreviamente: true,
        fechaVisionado: '2026-10-20',
        esFavorita: true
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'Chamus12',
      vistaPreviamente: true,
      fechaVisionado: '2026-10-20T00:00:00.000Z',
      esFavorita: true
    });
    expect(mockUsuarioRepository.guardar).toHaveBeenCalledTimes(1);
    const usuarioGuardado = mockUsuarioRepository.guardar.mock.calls[0][0];
    expect(usuarioGuardado.favoritas).toContain('550');
  });

  test('retorna 400 si fechaVisionado es una fecha futura', async () => {
    const agent = await iniciarSesion('usr-test-123');
    const res = await agent
      .post('/api/resenas')
      .send({
        peliculaId: '550',
        puntuacion: 4,
        texto: 'Intentando publicar con una fecha en el futuro.',
        fechaVisionado: '2099-01-01'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('futura');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('GET /api/resenas retorna la lista de reseñas ordenadas por fecha con nombre de autor', async () => {
    mockResenaRepository.leer = jest.fn().mockResolvedValue([
      {
        id: 'res-1',
        peliculaId: '550',
        autorId: 'Chamus12',
        puntuacion: 5,
        texto: 'Excelente reseña de prueba.',
        fechaCreacion: '2026-11-08T20:00:00.000Z'
      }
    ]);

    const res = await request(app).get('/api/resenas?limite=5');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].nombreAutor).toBe('Branco Chamusco');
    expect(res.body[0].peliculaId).toBe('550');
  });

  test('GET /api/resenas/:id retorna la reseña enriquecida con autor y película', async () => {
    mockResenaRepository.findById = jest.fn().mockResolvedValue({
      id: 'res-detalle-1',
      peliculaId: '550',
      autorId: 'Chamus12',
      puntuacion: 5,
      texto: 'Detalle de reseña de Fight Club.',
      fechaCreacion: '2026-11-08T20:00:00.000Z',
      esFavorita: true,
      esDestacada: true
    });

    const res = await request(app).get('/api/resenas/res-detalle-1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('res-detalle-1');
    expect(res.body.nombreAutor).toBe('Branco Chamusco');
    expect(res.body.puntuacion).toBe(5);
  });

  test('GET /api/resenas/:id retorna 404 si la reseña no existe', async () => {
    mockResenaRepository.findById = jest.fn().mockResolvedValue(null);
    mockResenaRepository.leer = jest.fn().mockResolvedValue([]);

    const res = await request(app).get('/api/resenas/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrada');
  });
});
