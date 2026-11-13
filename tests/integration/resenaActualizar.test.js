const request = require('supertest');
const { createApp } = require('../../src/app');
const ResenaService = require('../../src/services/resenaService');
const Resena = require('../../src/models/Resena');

describe('PATCH /api/resenas/:id (Integration) - T04.1', () => {
  let app;
  let mockResenaRepository;
  let resenaService;
  let resenaGuardada;

  beforeEach(() => {
    resenaGuardada = new Resena({
      id: 'resena-abc-123',
      peliculaId: '550',
      autorId: 'usr-autor-1',
      puntuacion: 3,
      texto: 'Reseña inicial con más de diez caracteres.',
      contieneSpoilers: false
    });

    mockResenaRepository = {
      findById: jest.fn().mockImplementation(async (id) => {
        if (id === 'resena-abc-123') return resenaGuardada;
        return null;
      }),
      guardar: jest.fn().mockImplementation(async (resena) => {
        resenaGuardada = resena;
        return resena;
      }),
      leer: jest.fn().mockResolvedValue([resenaGuardada])
    };

    resenaService = new ResenaService({ resenaRepository: mockResenaRepository });

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

  test('retorna 200 y los campos actualizados al ser el autor y enviar datos válidos', async () => {
    const agent = await iniciarSesion('usr-autor-1');
    const res = await agent
      .patch('/api/resenas/resena-abc-123')
      .send({
        puntuacion: 4.5,
        texto: 'Texto completamente modificado y con longitud suficiente.'
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('resena-abc-123');
    expect(res.body.puntuacion).toBe(4.5);
    expect(res.body.texto).toBe('Texto completamente modificado y con longitud suficiente.');
    expect(res.body.contieneSpoilers).toBe(false); // mantiene valor anterior no enviado
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('retorna 401 si no hay usuario autenticado (incluso si envían x-user-id)', async () => {
    const res = await request(app)
      .patch('/api/resenas/resena-abc-123')
      .send({ puntuacion: 4 });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Acceso no autorizado');

    const resHeaderFalso = await request(app)
      .patch('/api/resenas/resena-abc-123')
      .set('x-user-id', 'usr-autor-1')
      .send({ puntuacion: 4 });

    expect(resHeaderFalso.status).toBe(401);
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 403 Forbidden si el usuario autenticado no es el autor', async () => {
    const agent = await iniciarSesion('usr-usurpador');
    const res = await agent
      .patch('/api/resenas/resena-abc-123')
      .send({ puntuacion: 5 });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('No tienes permisos');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 404 Not Found si la reseña no existe', async () => {
    const agent = await iniciarSesion('usr-autor-1');
    const res = await agent
      .patch('/api/resenas/id-inexistente')
      .send({ puntuacion: 4 });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Reseña no encontrada');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 400 Bad Request si el body no contiene campos para actualizar', async () => {
    const agent = await iniciarSesion('usr-autor-1');
    const res = await agent
      .patch('/api/resenas/resena-abc-123')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 400 Bad Request si el nuevo texto no cumple la longitud mínima', async () => {
    const agent = await iniciarSesion('usr-autor-1');
    const res = await agent
      .patch('/api/resenas/resena-abc-123')
      .send({ texto: 'muy corta' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('entre 10 y 2000 caracteres');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });
});

