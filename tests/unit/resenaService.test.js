const ResenaService = require('../../src/services/resenaService');
const Resena = require('../../src/models/Resena');
const { ValidationError } = require('../../src/utils/errors');

describe('ResenaService (Unit) - T03.3', () => {
  let mockRepository;
  let service;

  beforeEach(() => {
    mockRepository = {
      guardar: jest.fn().mockResolvedValue(true),
      leer: jest.fn().mockResolvedValue([])
    };
    service = new ResenaService({ resenaRepository: mockRepository });
  });

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

