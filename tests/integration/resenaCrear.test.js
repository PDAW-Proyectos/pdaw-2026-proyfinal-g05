const request = require('supertest');
const { createApp } = require('../../src/app');
const ResenaService = require('../../src/services/resenaService');

describe('POST /api/resenas (Integration) - T03.3', () => {
  let app;
  let mockResenaRepository;
  let resenaService;

  beforeEach(() => {
    mockResenaRepository = {
      guardar: jest.fn().mockImplementation(async (resena) => resena),
      leer: jest.fn().mockResolvedValue([])
    };

    resenaService = new ResenaService({ resenaRepository: mockResenaRepository });

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
      contieneSpoilers: false
    });
    expect(res.body.id).toBeDefined();
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
    expect(res.body).toEqual({ error: 'El encabezado x-user-id es obligatorio' });
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
