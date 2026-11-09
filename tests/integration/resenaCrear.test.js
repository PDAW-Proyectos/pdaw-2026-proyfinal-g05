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
          obtenerPorId: jest.fn()
        },
        resenaService
      }
    });
  });

  test('retorna 201 Created, header Location y la reseña creada al enviar datos válidos', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Una obra maestra indiscutible del cine moderno.',
      contieneSpoilers: false
    };

    const res = await request(app)
      .post('/api/resenas')
      .set('x-user-id', 'usr-test-123')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/api\/resenas\/[a-f0-9-]+$/i);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'usr-test-123',
      puntuacion: 5,
      texto: 'Una obra maestra indiscutible del cine moderno.',
      contieneSpoilers: false,
      destacada: false
    });
    expect(res.body.id).toBeDefined();
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('guarda la reseña con destacada: true si el usuario es un Critico (Polimorfismo T03.4)', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Análisis profesional: dirección magistral y guion implacable.',
      contieneSpoilers: false
    };

    const res = await request(app)
      .post('/api/resenas')
      .set('x-user-id', 'Chamus12')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'Chamus12',
      puntuacion: 5,
      destacada: true,
      esDestacada: true
    });
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('guarda la reseña con destacada: true si el usuario es un Moderador (Polimorfismo T03.4)', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 5,
      texto: 'Reseña aprobada con carácter oficial por moderación.',
      contieneSpoilers: false
    };

    const res = await request(app)
      .post('/api/resenas')
      .set('x-user-id', 'lucassafe')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      peliculaId: '550',
      autorId: 'lucassafe',
      puntuacion: 5,
      destacada: true,
      esDestacada: true
    });
    expect(mockResenaRepository.guardar).toHaveBeenCalledTimes(1);
  });

  test('retorna 400 si falta el identificador de usuario', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 4,
      texto: 'Una película excelente y muy entretenida.',
    };

    const res = await request(app)
      .post('/api/resenas')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El encabezado x-user-id es obligatorio');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });

  test('retorna 400 si la entidad Resena rechaza los datos por texto insuficiente', async () => {
    const payload = {
      peliculaId: '550',
      puntuacion: 4,
      texto: 'Corta'
    };

    const res = await request(app)
      .post('/api/resenas')
      .set('x-user-id', 'usr-test-123')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('entre 10 y 2000 caracteres');
    expect(mockResenaRepository.guardar).not.toHaveBeenCalled();
  });
});
