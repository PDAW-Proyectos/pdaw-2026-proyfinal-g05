const request = require('supertest');
const { createApp } = require('../../src/app');
const ResenaService = require('../../src/services/resenaService');
const Resena = require('../../src/models/Resena');

describe('Autorización de operaciones sobre Reseñas (T04.2)', () => {
  let app;
  let mockResenaRepository;
  let resenaService;
  let resenaGuardada;

  beforeEach(() => {
    resenaGuardada = new Resena({
      id: 'res-test-autor-99',
      peliculaId: '550',
      autorId: 'usr-propietario-original',
      puntuacion: 4,
      texto: 'Reseña de prueba para autorización con suficientes caracteres.',
      contieneSpoilers: false,
    });

    mockResenaRepository = {
      findById: jest.fn().mockImplementation(async (id) => {
        if (id === 'res-test-autor-99' && resenaGuardada) return resenaGuardada;
        return null;
      }),
      guardar: jest.fn().mockImplementation(async (resena) => {
        resenaGuardada = resena;
        return resena;
      }),
      eliminar: jest.fn().mockImplementation(async (id) => {
        if (id === 'res-test-autor-99') {
          resenaGuardada = null;
          return true;
        }
        return false;
      }),
      leer: jest.fn().mockImplementation(async () => {
        return resenaGuardada ? [resenaGuardada] : [];
      }),
    };

    resenaService = new ResenaService({ resenaRepository: mockResenaRepository });

    app = createApp({
      config: {
        sessionSecret: 'test_secret',
        env: 'test',
      },
      services: {
        usuarioService: {
          obtenerPorId: jest.fn(),
          login: jest.fn().mockImplementation(async ({ email }) => {
            const id = email.replace('@test.com', '');
            return { id, paraExponer: () => ({ id }) };
          }),
        },
        resenaService,
      },
    });
  });

  async function iniciarSesion(userId) {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({
      email: `${userId}@test.com`,
      password: 'password123',
    });
    return agent;
  }

  describe('PATCH /api/resenas/:id - Modificar reseña', () => {
    test('permite modificar la reseña si el userId de sesión coincide exactamente con el autorId guardado', async () => {
      const agent = await iniciarSesion('usr-propietario-original');
      const res = await agent
        .patch('/api/resenas/res-test-autor-99')
        .send({
          texto: 'Texto actualizado exclusivamente por el autor legítimo.',
          puntuacion: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('res-test-autor-99');
      expect(res.body.texto).toBe('Texto actualizado exclusivamente por el autor legítimo.');
      expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
    });

    test('rechaza con 403 Forbidden si el userId de sesión NO coincide con el autorId guardado', async () => {
      const agent = await iniciarSesion('usr-otro-usuario-diferente');
      const res = await agent
        .patch('/api/resenas/res-test-autor-99')
        .send({
          texto: 'Intento de modificar reseña ajena sin autorización.',
          puntuacion: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('No tienes permisos para modificar esta reseña');
      expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
    });

    test('rechaza con 401 si no hay sesión activa en la petición', async () => {
      const res = await request(app)
        .patch('/api/resenas/res-test-autor-99')
        .send({ puntuacion: 4.5 });

      expect(res.status).toBe(401);
      expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/resenas/:id - Eliminar reseña', () => {
    test('permite eliminar la reseña si el userId de sesión coincide exactamente con el autorId guardado', async () => {
      const agent = await iniciarSesion('usr-propietario-original');
      const res = await agent
        .delete('/api/resenas/res-test-autor-99');

      expect(res.status).toBe(204);
      expect(mockResenaRepository.eliminar).toHaveBeenCalledWith('res-test-autor-99');
    });

    test('rechaza con 403 Forbidden si el userId de sesión NO coincide con el autorId guardado', async () => {
      const agent = await iniciarSesion('usr-usurpador-o-infiltrado');
      const res = await agent
        .delete('/api/resenas/res-test-autor-99');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('No tienes permisos para eliminar esta reseña');
      expect(mockResenaRepository.eliminar).not.toHaveBeenCalled();
    });

    test('rechaza con 401 si no hay sesión activa al intentar borrar (incluso con header x-user-id)', async () => {
      const resSinSesion = await request(app)
        .delete('/api/resenas/res-test-autor-99');

      expect(resSinSesion.status).toBe(401);

      const resConHeaderFalso = await request(app)
        .delete('/api/resenas/res-test-autor-99')
        .set('x-user-id', 'usr-propietario-original');

      expect(resConHeaderFalso.status).toBe(401);
      expect(mockResenaRepository.eliminar).not.toHaveBeenCalled();
    });

    test('retorna 404 Not Found si la reseña a borrar no existe en el archivo', async () => {
      const agent = await iniciarSesion('usr-propietario-original');
      const res = await agent
        .delete('/api/resenas/res-inexistente');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Reseña no encontrada');
    });
  });
});

