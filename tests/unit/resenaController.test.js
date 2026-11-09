const ResenaController = require('../../src/controllers/resenaController');

describe('ResenaController (Unit) - Validaciones T03.2', () => {
  let mockResenaService;
  let controller;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockResenaService = {
      crear: jest.fn(),
    };

    controller = new ResenaController({ resenaService: mockResenaService });

    req = {
      headers: {
        'x-user-id': 'usr-123',
      },
      body: {
        peliculaId: '550',
        puntuacion: 4,
        texto: 'Excelente película, muy recomendada.',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('Validación del encabezado x-user-id', () => {
    test('rechaza la solicitud con 400 si falta el encabezado x-user-id', async () => {
      delete req.headers['x-user-id'];

      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El encabezado x-user-id es obligatorio',
      });
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('rechaza la solicitud con 400 si el encabezado x-user-id es un string vacío o con espacios', async () => {
      req.headers['x-user-id'] = '   ';

      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El encabezado x-user-id es obligatorio',
      });
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('detecta el encabezado x-user-id mediante req.header() si está disponible', async () => {
      req.headers = {};
      req.header = jest.fn().mockReturnValue('usr-from-func');

      await controller.crear(req, res, next);

      expect(req.header).toHaveBeenCalledWith('x-user-id');
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Validación de la puntuación (estrictamente entre 0.5 y 5 en pasos de 0.5)', () => {
    test('rechaza con 400 si la puntuación no está presente', async () => {
      delete req.body.puntuacion;

      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La puntuación es obligatoria y debe ser un número entre 0.5 y 5',
      });
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('rechaza con 400 si la puntuación es null o boolean', async () => {
      req.body.puntuacion = null;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);

      req.body.puntuacion = true;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rechaza con 400 si la puntuación es menor a 0.5 o no es múltiplo de 0.5 (e.g. 0 o 0.3)', async () => {
      req.body.puntuacion = 0.3;
      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La puntuación debe ser un número entre 0.5 y 5 en pasos de 0.5',
      });

      req.body.puntuacion = 0;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('rechaza con 400 si la puntuación es mayor a 5 (e.g. 5.5 o 6)', async () => {
      req.body.puntuacion = 5.5;
      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La puntuación debe ser un número entre 0.5 y 5 en pasos de 0.5',
      });

      req.body.puntuacion = 6;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('rechaza con 400 si la puntuación no es numérica', async () => {
      req.body.puntuacion = 'no-es-numero';
      await controller.crear(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La puntuación debe ser un número entre 0.5 y 5 en pasos de 0.5',
      });
      expect(mockResenaService.crear).not.toHaveBeenCalled();
    });

    test('acepta puntuación válida en los límites 0.5 y 5 y valores intermedios en pasos de 0.5', async () => {
      req.body.puntuacion = 0.5;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.body.puntuacion = 2.5;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.body.puntuacion = 5;
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);

      req.body.puntuacion = '3.5';
      await controller.crear(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('Delegación al servicio y respuesta', () => {
    test('llama a resenaService.crear con los datos correspondientes', async () => {
      const resenaMock = {
        id: 'res-1',
        paraExponer: jest.fn().mockReturnValue({ id: 'res-1', puntuacion: 4 }),
      };
      mockResenaService.crear.mockResolvedValue(resenaMock);

      await controller.crear(req, res, next);

      expect(mockResenaService.crear).toHaveBeenCalledWith({
        autorId: 'usr-123',
        peliculaId: '550',
        puntuacion: 4,
        texto: 'Excelente película, muy recomendada.',
        contieneSpoilers: false,
      });
      expect(res.setHeader).toHaveBeenCalledWith('Location', '/api/resenas/res-1');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'res-1', puntuacion: 4 });
    });

    test('llama a next con error si ocurre un fallo no controlado', async () => {
      const errorInesperado = new Error('Database error');
      mockResenaService.crear.mockRejectedValue(errorInesperado);

      await controller.crear(req, res, next);

      expect(next).toHaveBeenCalledWith(errorInesperado);
    });
  });
});

