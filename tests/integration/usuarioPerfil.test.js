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
});

