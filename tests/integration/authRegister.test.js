const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const UsuarioService = require('../../src/services/usuarioService');

describe('POST /api/auth/register y GET /api/auth/me (Integration)', () => {
  let app;
  let mockUsuarios;
  let mockUsuarioRepository;
  let usuarioService;

  beforeEach(() => {
    mockUsuarios = [];

    mockUsuarioRepository = {
      leer: jest.fn().mockImplementation(async () => [...mockUsuarios]),
      guardar: jest.fn().mockImplementation(async (data) => {
        if (Array.isArray(data)) {
          mockUsuarios = [...data];
        } else {
          mockUsuarios.push(data && data.toJSON ? data.toJSON() : data);
        }
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

  test('registra un usuario correctamente con rol Espectador por defecto y auto-login con sesión', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Tyler Durden',
        email: 'tyler@soap.com',
        password: 'Password123'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBe('Tyler Durden');
    expect(res.body.email).toBe('tyler@soap.com');
    expect(res.body.rol).toBe('Espectador');
    expect(res.body.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/connect\.sid/);

    expect(mockUsuarios.length).toBe(1);
    expect(mockUsuarios[0].passwordHash).not.toBe('Password123');
    const esValido = await bcrypt.compare('Password123', mockUsuarios[0].passwordHash);
    expect(esValido).toBe(true);
  });

  test('retorna 409 Conflict si el email ya existe', async () => {
    mockUsuarios.push({
      id: 'usr-existente',
      nombre: 'Existente',
      email: 'tyler@soap.com',
      passwordHash: 'hash',
      rol: 'Espectador',
      watchlist: [],
      top4: [],
      fechaRegistro: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Otro Tyler',
        email: 'TYLER@SOAP.COM',
        password: 'Password123'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('El email ya está registrado');
  });

  test('evita escalado de privilegios rechazando la selección de roles', async () => {
    const resModerador = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Hacker',
        email: 'hacker@evil.com',
        password: 'Password123',
        rol: 'Moderador'
      });

    expect(resModerador.status).toBe(400);

    const resCritico = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Hacker',
        email: 'hacker2@evil.com',
        password: 'Password123',
        rol: 'Critico'
      });

    expect(resCritico.status).toBe(400);
  });

  test('retorna 400 si falta el nombre, email o contraseña inválida', async () => {
    const resSinNombre = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'Password123' });
    expect(resSinNombre.status).toBe(400);

    const resSinEmail = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', password: 'Password123' });
    expect(resSinEmail.status).toBe(400);

    const resPasswordCorta = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'a@b.com', password: '123' });
    expect(resPasswordCorta.status).toBe(400);

    const resSinMayuscula = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'a@b.com', password: 'password123' });
    expect(resSinMayuscula.status).toBe(400);
    expect(resSinMayuscula.body.error).toMatch(/mayúscula y un número/i);

    const resSinNumero = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Test', email: 'a@b.com', password: 'PasswordABC' });
    expect(resSinNumero.status).toBe(400);
    expect(resSinNumero.body.error).toMatch(/mayúscula y un número/i);

    const resNombreLargo = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'NombreMuyLargoQueSuperaVeinte',
        email: 'larguito@club.com',
        password: 'Password123'
      });
    expect(resNombreLargo.status).toBe(400);
    expect(resNombreLargo.body.error).toMatch(/20 caracteres/i);
  });

  test('retorna 400 si confirmPassword no coincide con password y 201 si coinciden', async () => {
    const resDistintas = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Lucas Safe',
        email: 'lucas@movieclub.com',
        password: 'Password123',
        confirmPassword: 'OtraPassword123'
      });

    expect(resDistintas.status).toBe(400);
    expect(resDistintas.body.error).toBe('Las contraseñas no coinciden');

    const resIguales = await request(app)
      .post('/api/auth/register')
      .send({
        nombre: 'Lucas Safe',
        email: 'lucas@movieclub.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });

    expect(resIguales.status).toBe(201);
    expect(resIguales.body.nombre).toBe('Lucas Safe');
    expect(resIguales.body.email).toBe('lucas@movieclub.com');
  });

  test('GET /api/auth/me retorna 401 si no hay sesión y 200 con sesión activa', async () => {
    const resSinSesion = await request(app).get('/api/auth/me');
    expect(resSinSesion.status).toBe(401);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({
        nombre: 'Marla Singer',
        email: 'marla@club.com',
        password: 'Password123'
      });

    const resConSesion = await agent.get('/api/auth/me');
    expect(resConSesion.status).toBe(200);
    expect(resConSesion.body.nombre).toBe('Marla Singer');
    expect(resConSesion.body.email).toBe('marla@club.com');
  });
});
