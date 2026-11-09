const ResenaService = require('../../src/services/resenaService');
const Resena = require('../../src/models/Resena');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../src/utils/errors');

describe('ResenaService (Unit) - T03.3 & T04.1', () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    mockRepository = {
      guardar: jest.fn().mockResolvedValue(true),
      leer: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null)
    };
    service = new ResenaService({ resenaRepository: mockRepository });
  });

  describe('crear()', () => {
    test('falla al inicializar sin un resenaRepository válido', () => {
      expect(() => new ResenaService()).toThrow('resenaRepository es requerido');
      expect(() => new ResenaService({})).toThrow('resenaRepository es requerido');
    });

    test('crea una instancia de Resena y la persiste en el repositorio', async () => {
      const datos = {
        autorId: 'usr-456',
        peliculaId: '550',
        puntuacion: 4.5,
        texto: 'Una película extraordinaria de principio a fin.',
        contieneSpoilers: true
      };

      const resultado = await service.crear(datos);

      expect(resultado).toBeInstanceOf(Resena);
      expect(resultado.autorId).toBe('usr-456');
      expect(resultado.peliculaId).toBe('550');
      expect(resultado.puntuacion).toBe(4.5);
      expect(resultado.texto).toBe('Una película extraordinaria de principio a fin.');
      expect(resultado.contieneSpoilers).toBe(true);
      expect(resultado.id).toBeDefined();

      expect(mockRepository.guardar).toHaveBeenCalledTimes(1);
      expect(mockRepository.guardar).toHaveBeenCalledWith(resultado);
    });

    test('lanza ValidationError si los datos no cumplen las reglas de la entidad Resena', async () => {
      const datosInvalidos = {
        autorId: 'usr-456',
        peliculaId: '550',
        puntuacion: 4.5,
        texto: 'Corto', // Menor a 10 caracteres
        contieneSpoilers: false
      };

      await expect(service.crear(datosInvalidos)).rejects.toThrow(ValidationError);
      expect(mockRepository.guardar).not.toHaveBeenCalled();
    });
  });

  describe('actualizar() - T04.1', () => {
    const resenaExistente = new Resena({
      id: 'resena-123',
      peliculaId: '550',
      autorId: 'usr-autor',
      puntuacion: 3,
      texto: 'Texto original de la reseña con más de diez caracteres.',
      contieneSpoilers: false
    });

    test('actualiza campos específicos y persiste la entidad', async () => {
      mockRepository.findById.mockResolvedValue(resenaExistente);

      const resultado = await service.actualizar('resena-123', {
        autorId: 'usr-autor',
        puntuacion: 5,
        texto: 'Texto actualizado con suficientes caracteres.',
        contieneSpoilers: true
      });

      expect(resultado.puntuacion).toBe(5);
      expect(resultado.texto).toBe('Texto actualizado con suficientes caracteres.');
      expect(resultado.contieneSpoilers).toBe(true);
      expect(mockRepository.guardar).toHaveBeenCalledWith(resultado);
    });

    test('lanza NotFoundError si la reseña no existe en el repositorio', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.actualizar('resena-inexistente', {
          autorId: 'usr-autor',
          puntuacion: 4
        })
      ).rejects.toThrow(NotFoundError);
    });

    test('lanza ForbiddenError si quien intenta actualizar no es el autor', async () => {
      mockRepository.findById.mockResolvedValue(resenaExistente);

      await expect(
        service.actualizar('resena-123', {
          autorId: 'usr-otro-usuario',
          puntuacion: 4
        })
      ).rejects.toThrow(ForbiddenError);
    });

    test('lanza ValidationError si no se envía ningún campo a actualizar', async () => {
      await expect(
        service.actualizar('resena-123', { autorId: 'usr-autor' })
      ).rejects.toThrow(ValidationError);
    });

    test('lanza ValidationError si la puntuación actualizada no es válida', async () => {
      mockRepository.findById.mockResolvedValue(resenaExistente);

      await expect(
        service.actualizar('resena-123', {
          autorId: 'usr-autor',
          puntuacion: 7
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
