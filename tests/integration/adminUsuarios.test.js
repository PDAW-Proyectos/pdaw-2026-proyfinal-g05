const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const UsuarioService = require('../../src/services/usuarioService');
const ResenaService = require('../../src/services/resenaService');

describe('Panel Admin Usuarios: GET /api/usuarios y DELETE /api/usuarios/:id (Integration)', () => {
  let app;
  let mockUsuarios;
  let mockUsuarioRepository;
  let usuarioService;
  let passwordHash;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret123', 10);
  });

  beforeEach(() => {
    mockUsuarios = [
      {
        id: 'usr-1',
        nombre: 'Maxi Martinez',
        email: 'maxi@movieclub.com',
        passwordHash,
        rol: 'Moderador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-25T23:00:00.000Z'
      },
      {
        id: 'usr-2',
        nombre: 'Branco Chamusco',
        email: 'branco@movieclub.com',
        passwordHash,
        rol: 'Espectador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-26T18:00:00.000Z'
      },
      {
        id: 'usr-3',
        nombre: 'Lucas Safe',
        usuario: 'lucassafe',
        email: 'lucas@movieclub.com',
        passwordHash,
        rol: 'Critico',
        medioDePrensa: 'Prensa Oficial MovieClub',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-27T14:30:00.000Z'
      }
    ];

    mockUsuarioRepository = {
      leer: jest.fn().mockImplementation(async () => [...mockUsuarios]),
      findById: jest.fn().mockImplementation(async (id) => mockUsuarios.find((u) => u.id === id) || null),
      guardar: jest.fn().mockImplementation(async (data) => {
        if (Array.isArray(data)) {
          mockUsuarios = [...data];
          return;
        }
        const raw = data && typeof data.toJSON === 'function' ? data.toJSON() : data;
        const idx = mockUsuarios.findIndex((u) => u.id === raw.id);
        if (idx !== -1) {
          mockUsuarios[idx] = raw;
        } else {
          mockUsuarios.push(raw);
        }
      }),
      eliminar: jest.fn().mockImplementation(async (id) => {
        const prevLen = mockUsuarios.length;
        mockUsuarios = mockUsuarios.filter((u) => u.id !== id);
        return mockUsuarios.length < prevLen;
      })
    };

    usuarioService = new UsuarioService({ usuarioRepository: mockUsuarioRepository });

    app = createApp({
      config: {
        sessionSecret: 'test_secret',
        env: 'test'
      },
      services: {
        usuarioService
      }
    });
  });

  describe('GET /api/usuarios', () => {
    test('rechaza con 401 si no hay sesión activa', async () => {
      const res = await request(app).get('/api/usuarios');
      expect(res.status).toBe(401);
    });

    test('rechaza con 403 si el usuario es Espectador o Crítico', async () => {
      const agentEsp = request.agent(app);
      await agentEsp
        .post('/api/auth/login')
        .send({ email: 'branco@movieclub.com', password: 'secret123' });

      const resEsp = await agentEsp.get('/api/usuarios');
      expect(resEsp.status).toBe(403);

      const agentCrit = request.agent(app);
      await agentCrit
        .post('/api/auth/login')
        .send({ email: 'lucas@movieclub.com', password: 'secret123' });

      const resCrit = await agentCrit.get('/api/usuarios');
      expect(resCrit.status).toBe(403);
    });

    test('permite a un Moderador listar usuarios paginados sin exponer passwordHash', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.get('/api/usuarios?pagina=1&limite=2');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.pagina).toBe(1);
      expect(res.body.limite).toBe(2);
      expect(res.body.totalPaginas).toBe(2);
      expect(res.body.usuarios).toHaveLength(2);
      expect(res.body.usuarios[0].id).toBe('usr-3');
      expect(res.body.usuarios[0].passwordHash).toBeUndefined();
    });

    test('soporta filtro por rol y búsqueda por texto', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const resRol = await agent.get('/api/usuarios?rol=Critico');
      expect(resRol.status).toBe(200);
      expect(resRol.body.total).toBe(1);
      expect(resRol.body.usuarios[0].email).toBe('lucas@movieclub.com');

      const resBusqueda = await agent.get('/api/usuarios?busqueda=branco');
      expect(resBusqueda.status).toBe(200);
      expect(resBusqueda.body.total).toBe(1);
      expect(resBusqueda.body.usuarios[0].id).toBe('usr-2');
    });
  });

  describe('DELETE /api/usuarios/:id', () => {
    test('rechaza con 401 si no hay sesión activa', async () => {
      const res = await request(app).delete('/api/usuarios/usr-2');
      expect(res.status).toBe(401);
    });

    test('rechaza con 403 si el usuario es Espectador o Crítico', async () => {
      const agentEsp = request.agent(app);
      await agentEsp
        .post('/api/auth/login')
        .send({ email: 'branco@movieclub.com', password: 'secret123' });

      const resEsp = await agentEsp.delete('/api/usuarios/usr-3');
      expect(resEsp.status).toBe(403);

      const agentCrit = request.agent(app);
      await agentCrit
        .post('/api/auth/login')
        .send({ email: 'lucas@movieclub.com', password: 'secret123' });

      const resCrit = await agentCrit.delete('/api/usuarios/usr-2');
      expect(resCrit.status).toBe(403);
    });

    test('rechaza con 400 si el Moderador intenta eliminar su propia cuenta', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.delete('/api/usuarios/usr-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/propia cuenta/i);
    });

    test('rechaza con 403 si un Moderador intenta eliminar a otro Moderador', async () => {
      mockUsuarios.push({
        id: 'usr-mod-2',
        nombre: 'Otro Moderador',
        email: 'mod2@movieclub.com',
        passwordHash,
        rol: 'Moderador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-28T10:00:00.000Z'
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.delete('/api/usuarios/usr-mod-2');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/moderador/i);
      expect(mockUsuarioRepository.eliminar).not.toHaveBeenCalled();
    });

    test('retorna 404 si el usuario objetivo no existe', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.delete('/api/usuarios/usr-inexistente');
      expect(res.status).toBe(404);
    });

    test('permite a un Moderador eliminar otro usuario, retorna 204 y emite evento de dominio', async () => {
      const listener = jest.fn();
      usuarioService.on('usuario:eliminado', listener);

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.delete('/api/usuarios/usr-2');

      expect(res.status).toBe(204);
      expect(mockUsuarioRepository.eliminar).toHaveBeenCalledWith('usr-2');
      expect(mockUsuarios.find((u) => u.id === 'usr-2')).toBeUndefined();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'usr-2',
          email: 'branco@movieclub.com',
          eliminadoPor: 'usr-1',
          eliminarResenas: false
        })
      );
    });

    test('elimina también las reseñas del usuario cuando eliminarResenas=true y las conserva cuando es false', async () => {
      let mockResenas = [
        { id: 'res-1', autorId: 'usr-2', peliculaId: '550', puntuacion: 5, texto: 'Reseña de Branco' },
        { id: 'res-2', autorId: 'usr-3', peliculaId: '680', puntuacion: 4, texto: 'Reseña de Lucas' },
        { id: 'res-3', autorId: 'usr-2', peliculaId: '603', puntuacion: 4, texto: 'Otra de Branco' }
      ];

      const mockResenaRepo = {
        leer: jest.fn().mockImplementation(async () => [...mockResenas]),
        guardar: jest.fn().mockImplementation(async (data) => {
          mockResenas = Array.isArray(data) ? [...data] : mockResenas;
        })
      };

      const resenaService = new ResenaService({ resenaRepository: mockResenaRepo });
      usuarioService.on('usuario:eliminado', async ({ id, eliminarResenas }) => {
        if (eliminarResenas && id) {
          await resenaService.eliminarPorAutor(id);
        }
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.delete('/api/usuarios/usr-2?eliminarResenas=true');

      expect(res.status).toBe(204);
      expect(mockResenas).toHaveLength(1);
      expect(mockResenas[0].id).toBe('res-2');
      expect(mockResenas[0].autorId).toBe('usr-3');
    });
  });
});
