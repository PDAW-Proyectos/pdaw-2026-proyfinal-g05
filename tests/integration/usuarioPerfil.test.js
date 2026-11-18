const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const UsuarioService = require('../../src/services/usuarioService');

describe('PATCH /api/usuarios/perfil (Integration)', () => {
  let app;
  let mockUsuarios;
  let mockUsuarioRepository;
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
        rol: 'Espectador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-25T23:00:00.000Z'
      },
      {
        id: 'usr-2',
        nombre: 'Tyler Durden',
        usuario: 'tyler_soap',
        email: 'tyler@movieclub.com',
        passwordHash,
        rol: 'Espectador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-26T20:00:00.000Z'
      },
      {
        id: 'usr-mod',
        nombre: 'Moderador Marla',
        email: 'marla@movieclub.com',
        passwordHash,
        rol: 'Moderador',
        watchlist: [],
        favoritas: [],
        top4: [],
        fechaRegistro: '2026-10-27T10:00:00.000Z'
      }
    ];

    mockUsuarioRepository = {
      leer: jest.fn().mockImplementation(async () => [...mockUsuarios]),
      findById: jest.fn().mockImplementation(async (id) => mockUsuarios.find((u) => u.id === id) || null),
      guardar: jest.fn().mockImplementation(async (data) => {
        const raw = data && typeof data.toJSON === 'function' ? data.toJSON() : data;
        const idx = mockUsuarios.findIndex((u) => u.id === raw.id);
        if (idx !== -1) {
          mockUsuarios[idx] = raw;
        } else {
          mockUsuarios.push(raw);
        }
      })
    };

    const usuarioService = new UsuarioService({ usuarioRepository: mockUsuarioRepository });

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

  test('rechaza con 401 si no hay sesión activa', async () => {
    const res = await request(app)
      .patch('/api/usuarios/perfil')
      .send({ nombre: 'Nuevo Nombre', usuario: 'nuevo_handle' });

    expect(res.status).toBe(401);
  });

  test('permite actualizar nombre y usuario (@) del usuario autenticado', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'maxi@movieclub.com', password: 'secret123' });

    const res = await agent
      .patch('/api/usuarios/perfil')
      .send({ nombre: 'Maxi El Cinéfilo', usuario: '@maxi.club' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Maxi El Cinéfilo');
    expect(res.body.usuario).toBe('maxi.club');
    expect(res.body.email).toBe('maxi@movieclub.com');
    expect(res.body.id).toBe('usr-1');
    expect(mockUsuarios[0].nombre).toBe('Maxi El Cinéfilo');
    expect(mockUsuarios[0].usuario).toBe('maxi.club');
  });

  test('rechaza con 400 si se intenta modificar el correo electrónico', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'maxi@movieclub.com', password: 'secret123' });

    const res = await agent
      .patch('/api/usuarios/perfil')
      .send({ nombre: 'Maxi', email: 'otro@movieclub.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo/i);
  });

  test('rechaza con 409 si el usuario (@) ya está en uso por otro miembro', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'maxi@movieclub.com', password: 'secret123' });

    const res = await agent
      .patch('/api/usuarios/perfil')
      .send({ nombre: 'Maxi', usuario: 'tyler_soap' });

    expect(res.status).toBe(409);
  });

  test('rechaza con 400 si el nombre tiene más de 20 caracteres', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'maxi@movieclub.com', password: 'secret123' });

    const res = await agent
      .patch('/api/usuarios/perfil')
      .send({ nombre: 'NombreDemasiadoLargoQueSupera20' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entre 2 y 20 caracteres/i);
  });

  test('rechaza con 400 si el usuario (@) tiene más de 28 caracteres', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'maxi@movieclub.com', password: 'secret123' });

    const res = await agent
      .patch('/api/usuarios/perfil')
      .send({ usuario: 'usuario_extremadamente_largo_que_supera_28' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entre 2 y 28 caracteres/i);
  });

  describe('GET /api/usuarios/:id/watchlist', () => {
    test('rechaza con 401 si no hay sesión activa', async () => {
      const res = await request(app).get('/api/usuarios/usr-1/watchlist');

      expect(res.status).toBe(401);
    });

    test('devuelve el listado completo de películas pendientes en la watchlist del usuario autenticado', async () => {
      mockUsuarios[0].watchlist = ['550', '680'];

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.get('/api/usuarios/usr-1/watchlist');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('usr-1');
      expect(res.body.watchlist).toEqual(['550', '680']);
    });

    test('rechaza con 403 si un usuario intenta consultar la watchlist de otro usuario', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent.get('/api/usuarios/usr-2/watchlist');

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/usuarios/:id/watchlist', () => {
    test('rechaza con 401 si no hay sesión activa', async () => {
      const res = await request(app)
        .patch('/api/usuarios/usr-1/watchlist')
        .send({ peliculaId: '550' });

      expect(res.status).toBe(401);
    });

    test('agrega una película a la watchlist del usuario autenticado y la persiste', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-1/watchlist')
        .send({ peliculaId: '550' });

      expect(res.status).toBe(200);
      expect(res.body.watchlist).toEqual(['550']);
      expect(mockUsuarios[0].watchlist).toEqual(['550']);
    });

    test('quita una película de la watchlist si ya estaba presente (toggle) o con accion quitar', async () => {
      mockUsuarios[0].watchlist = ['550', '680'];

      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-1/watchlist')
        .send({ peliculaId: '550', accion: 'quitar' });

      expect(res.status).toBe(200);
      expect(res.body.watchlist).toEqual(['680']);
      expect(mockUsuarios[0].watchlist).toEqual(['680']);
    });

    test('rechaza con 403 si un usuario intenta modificar la watchlist de otro usuario', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-2/watchlist')
        .send({ peliculaId: '550' });

      expect(res.status).toBe(403);
    });

    test('rechaza con 400 si no se envía peliculaId', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-1/watchlist')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/usuarios/:id/rol (Moderador)', () => {
    test('rechaza con 401 si no hay sesión activa', async () => {
      const res = await request(app)
        .patch('/api/usuarios/usr-1/rol')
        .send({ rol: 'Critico' });

      expect(res.status).toBe(401);
    });

    test('rechaza con 403 Forbidden si el usuario que llama no es Moderador', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'maxi@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-2/rol')
        .send({ rol: 'Critico' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/permisos insuficientes|moderadores/i);
    });

    test('permite a un Moderador cambiar el rol de un usuario a Crítico', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'marla@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-1/rol')
        .send({ rol: 'Critico' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('usr-1');
      expect(res.body.rol).toBe('Critico');
      expect(mockUsuarioRepository.guardar).toHaveBeenCalled();
    });

    test('permite a un Moderador quitar el rol de Crítico devolviéndolo a Espectador', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'marla@movieclub.com', password: 'secret123' });

      const res = await agent
        .patch('/api/usuarios/usr-1/rol')
        .send({ rol: 'Espectador' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('usr-1');
      expect(res.body.rol).toBe('Espectador');
      expect(mockUsuarioRepository.guardar).toHaveBeenCalled();
    });
  });
});

