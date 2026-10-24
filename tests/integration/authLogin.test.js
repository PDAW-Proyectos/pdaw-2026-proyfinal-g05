const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const UsuarioService = require('../../src/services/usuarioService');

describe('POST /api/auth/login (Integration)', () => {
  let app;
  let mockUsuarioRepository;
  let passwordPlano;
  let passwordHash;
  let mockUsuarioData;

  beforeAll(async () => {
    passwordPlano = 'marla1234';
    passwordHash = await bcrypt.hash(passwordPlano, 10);
  });

  beforeEach(() => {
    mockUsuarioData = {
      id: 'usr-2',
      nombre: 'Marla Singer',
      email: 'marla@teste.com',
      passwordHash: passwordHash,
      rol: 'Espectador',
      watchlist: ['550'],
      top4: ['550'],
      fechaRegistro: '2026-10-23T12:00:00.000Z'
    };

    mockUsuarioRepository = {
      leer: jest.fn().mockResolvedValue([mockUsuarioData]),
      guardar: jest.fn().mockResolvedValue()
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

  test('retorna 400 si faltan email o password', async () => {
    const resSinPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marla@teste.com' });

    expect(resSinPassword.status).toBe(400);
    expect(resSinPassword.body).toHaveProperty('error');

    const resSinEmail = await request(app)
      .post('/api/auth/login')
      .send({ password: 'any' });

    expect(resSinEmail.status).toBe(400);
    expect(resSinEmail.body).toHaveProperty('error');
  });

  test('retorna 401 si el usuario no existe', async () => {
    mockUsuarioRepository.leer.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@teste.com', password: passwordPlano });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  test('retorna 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marla@teste.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  test('retorna 200 y el objeto del usuario sin passwordHash al validar credenciales', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marla@teste.com', password: passwordPlano });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'usr-2',
      nombre: 'Marla Singer',
      email: 'marla@teste.com',
      rol: 'Espectador',
      watchlist: ['550'],
      top4: ['550'],
      fechaRegistro: '2026-10-23T12:00:00.000Z'
    });
    expect(res.body.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/connect\.sid/);
  });
});
