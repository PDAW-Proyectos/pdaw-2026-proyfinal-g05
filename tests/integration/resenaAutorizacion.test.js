const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApp } = require('../../src/app');
const ResenaService = require('../../src/services/resenaService');
const UsuarioService = require('../../src/services/usuarioService');
const JsonFileRepository = require('../../src/repositories/JsonFileRepository');
const Resena = require('../../src/models/Resena');

describe('Autorización de operaciones sobre Reseñas (T04.2 & T06.2)', () => {
  let app;
  let mockResenaRepository;
  let mockUsuarioRepository;
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

    const usuarios = [
      {
        id: 'usr-propietario-original',
        nombre: 'Autor Original',
        email: 'autor@test.com',
        passwordHash: 'hash',
        rol: 'Espectador',
      },
      {
        id: 'usr-moderador-1',
        nombre: 'Thomas Anderson',
        email: 'neo@test.com',
        passwordHash: 'hash',
        rol: 'Moderador',
      },
      {
        id: 'usr-critico-1',
        nombre: 'Critico Cine',
        email: 'critico@test.com',
        passwordHash: 'hash',
        rol: 'Critico',
        medioDePrensa: 'Revista Cine',
      },
    ];

    mockUsuarioRepository = {
      findById: jest.fn().mockImplementation(async (id) => {
        return usuarios.find((u) => u.id === id) || null;
      }),
      leer: jest.fn().mockResolvedValue(usuarios),
    };

    resenaService = new ResenaService({
      resenaRepository: mockResenaRepository,
      usuarioRepository: mockUsuarioRepository,
    });

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

    test('permite eliminar una reseña ajena (204) si el usuario autenticado en sesión es Moderador (T06.2)', async () => {
      const agent = await iniciarSesion('usr-moderador-1');
      const res = await agent
        .delete('/api/resenas/res-test-autor-99');

      expect(res.status).toBe(204);
      expect(mockUsuarioRepository.findById).toHaveBeenCalledWith('usr-moderador-1');
      expect(mockResenaRepository.eliminar).toHaveBeenCalledWith('res-test-autor-99');
    });

    test('rechaza con 403 Forbidden si el usuario autenticado es Critico (no Moderador) y no es el autor (T06.2)', async () => {
      const agent = await iniciarSesion('usr-critico-1');
      const res = await agent
        .delete('/api/resenas/res-test-autor-99');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('No tienes permisos para eliminar esta reseña');
      expect(mockResenaRepository.eliminar).not.toHaveBeenCalled();
    });
  });

  describe('Persistencia real con JsonFileRepository (usuarios.json y resenas.json) - T06.2', () => {
    let tempDir;
    let usuariosPath;
    let resenasPath;
    let appReal;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'movieclub-t062-'));
      usuariosPath = path.join(tempDir, 'usuarios.json');
      resenasPath = path.join(tempDir, 'resenas.json');

      const passwordHash = await bcrypt.hash('secret123', 10);
      await fs.writeFile(
        usuariosPath,
        JSON.stringify(
          [
            {
              id: 'usr-autor-real',
              nombre: 'Autor Real',
              email: 'autor.real@movieclub.com',
              passwordHash,
              rol: 'Espectador',
              watchlist: [],
              favoritas: [],
              top4: [],
              fechaRegistro: '2026-10-25T00:00:00.000Z',
            },
            {
              id: 'usr-mod-real',
              nombre: 'Moderador Real',
              email: 'mod.real@movieclub.com',
              passwordHash,
              rol: 'Moderador',
              watchlist: [],
              favoritas: [],
              top4: [],
              fechaRegistro: '2026-10-25T00:00:00.000Z',
            },
          ],
          null,
          2,
        ),
      );

      await fs.writeFile(
        resenasPath,
        JSON.stringify(
          [
            {
              id: 'res-real-1',
              peliculaId: '550',
              autorId: 'usr-autor-real',
              puntuacion: 2,
              texto: 'Reseña ofensiva publicada por un espectador.',
              contieneSpoilers: false,
              vistaPreviamente: false,
              esFavorita: false,
              esDestacada: false,
              fechaCreacion: '2026-11-10T10:00:00.000Z',
            },
          ],
          null,
          2,
        ),
      );

      const usuarioRepository = new JsonFileRepository(usuariosPath);
      const resenaRepository = new JsonFileRepository(resenasPath);
      const usuarioService = new UsuarioService({ usuarioRepository });
      const resenaServiceReal = new ResenaService({
        resenaRepository,
        usuarioRepository,
      });

      appReal = createApp({
        config: {
          sessionSecret: 'test_secret_real',
          env: 'test',
        },
        services: {
          usuarioService,
          resenaService: resenaServiceReal,
        },
      });
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    test('un Moderador autenticado por sesión elimina una reseña ajena de resenas.json', async () => {
      const agent = request.agent(appReal);
      const loginRes = await agent.post('/api/auth/login').send({
        email: 'mod.real@movieclub.com',
        password: 'secret123',
      });
      expect(loginRes.status).toBe(200);

      const deleteRes = await agent.delete('/api/resenas/res-real-1');
      expect(deleteRes.status).toBe(204);

      const contenidoRestante = JSON.parse(await fs.readFile(resenasPath, 'utf-8'));
      expect(contenidoRestante).toEqual([]);
    });
  });
});

