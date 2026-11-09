const ResenaService = require('../../src/services/resenaService');
const Resena = require('../../src/models/Resena');
const { Critico, Espectador, Moderador } = require('../../src/models/Usuario');
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

    test('asigna flag destacada: true si el autor es un Critico (Polimorfismo T03.4)', async () => {
      const mockUsuarioRepo = {
        findById: jest.fn().mockResolvedValue(
          new Critico({
            id: 'Chamus12',
            nombre: 'Branco Chamusco',
            email: 'bchamu@movieclub.com',
            passwordHash: 'hash',
            medioDePrensa: 'Clarin Cinema Productions'
          })
        )
      };

      const serviceConUsuarios = new ResenaService({
        resenaRepository: mockRepository,
        usuarioRepository: mockUsuarioRepo
      });

      const resena = await serviceConUsuarios.crear({
        autorId: 'Chamus12',
        peliculaId: '550',
        puntuacion: 5,
        texto: 'Una película brillante y transgresora.'
      });

      expect(resena.destacada).toBe(true);
      expect(resena.esDestacada).toBe(true);
      expect(resena.toJSON().destacada).toBe(true);
      expect(resena.paraExponer().destacada).toBe(true);
    });

    test('asigna flag destacada: true si el autor es un Moderador (Polimorfismo T03.4)', async () => {
      const mockUsuarioRepo = {
        findById: jest.fn().mockResolvedValue(
          new Moderador({
            id: 'lucassafe',
            nombre: 'Lucas Safe',
            email: 'lucassafe@movieclub.com',
            passwordHash: 'hash'
          })
        )
      };

      const serviceConUsuarios = new ResenaService({
        resenaRepository: mockRepository,
        usuarioRepository: mockUsuarioRepo
      });

      const resena = await serviceConUsuarios.crear({
        autorId: 'lucassafe',
        peliculaId: '550',
        puntuacion: 5,
        texto: 'Reseña oficial del club de moderación.'
      });

      expect(resena.destacada).toBe(true);
      expect(resena.esDestacada).toBe(true);
      expect(resena.toJSON().destacada).toBe(true);
      expect(resena.paraExponer().destacada).toBe(true);
    });

    test('asigna flag destacada: false si el autor es un Espectador (Polimorfismo T03.4)', async () => {
      const mockUsuarioRepo = {
        findById: jest.fn().mockResolvedValue(
          new Espectador({
            id: 'espectador-1',
            nombre: 'Juan Perez',
            email: 'juan@test.com',
            passwordHash: 'hash'
          })
        )
      };

      const serviceConUsuarios = new ResenaService({
        resenaRepository: mockRepository,
        usuarioRepository: mockUsuarioRepo
      });

      const resena = await serviceConUsuarios.crear({
        autorId: 'espectador-1',
        peliculaId: '550',
        puntuacion: 4,
        texto: 'Me gustó mucho la película de principio a fin.'
      });

      expect(resena.destacada).toBe(false);
      expect(resena.esDestacada).toBe(false);
      expect(resena.toJSON().destacada).toBe(false);
    });

    test('guarda vistaPreviamente, fechaVisionado en ISO 8601 UTC, esFavorita y sincroniza favoritas del Usuario', async () => {
      const usuarioInstancia = new Espectador({
        id: 'espectador-fav',
        nombre: 'Maria',
        email: 'maria@test.com',
        passwordHash: 'hash'
      });

      const mockUsuarioRepo = {
        findById: jest.fn().mockResolvedValue(usuarioInstancia),
        guardar: jest.fn().mockResolvedValue(usuarioInstancia)
      };

      const serviceConUsuarios = new ResenaService({
        resenaRepository: mockRepository,
        usuarioRepository: mockUsuarioRepo
      });

      const resena = await serviceConUsuarios.crear({
        autorId: 'espectador-fav',
        peliculaId: '550',
        puntuacion: 4.5,
        texto: 'Una de mis películas favoritas absolutas.',
        contieneSpoilers: true,
        vistaPreviamente: true,
        fechaVisionado: '2026-10-15',
        esFavorita: true
      });

      expect(resena.vistaPreviamente).toBe(true);
      expect(resena.esFavorita).toBe(true);
      expect(resena.favorita).toBe(true);
      expect(resena.fechaVisionado).toBe('2026-10-15T00:00:00.000Z');
      expect(usuarioInstancia.esFavorita('550')).toBe(true);
      expect(usuarioInstancia.favoritas).toEqual(['550']);
      expect(mockUsuarioRepo.guardar).toHaveBeenCalledWith(usuarioInstancia);
    });

    test('lanza ValidationError si fechaVisionado es una fecha futura', async () => {
      await expect(
        service.crear({
          autorId: 'usr-456',
          peliculaId: '550',
          puntuacion: 4,
          texto: 'Intentando registrar una fecha del futuro lejano.',
          fechaVisionado: '2099-12-31'
        })
      ).rejects.toThrow(ValidationError);

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
