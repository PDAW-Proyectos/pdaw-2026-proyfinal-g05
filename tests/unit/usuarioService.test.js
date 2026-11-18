const bcrypt = require('bcryptjs');
const UsuarioService = require('../../src/services/usuarioService');
const { Usuario, Espectador } = require('../../src/models/Usuario');
const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../../src/utils/errors');

describe('UsuarioService - login', () => {
  let mockUsuarioRepository;
  let usuarioService;
  let passwordPlano;
  let passwordHash;
  let usuarioValidoData;

  beforeAll(async () => {
    passwordPlano = 'secret123';
    passwordHash = await bcrypt.hash(passwordPlano, 10);
  });

  beforeEach(() => {
    usuarioValidoData = {
      id: 'usr-1',
      nombre: 'Tyler Durden',
      email: 'tyler@teste.com',
      passwordHash: passwordHash,
      rol: 'Espectador',
      watchlist: ['peli-1'],
      top4: ['peli-1'],
      fechaRegistro: new Date().toISOString()
    };

    mockUsuarioRepository = {
      leer: jest.fn().mockResolvedValue([usuarioValidoData]),
      guardar: jest.fn().mockResolvedValue()
    };

    usuarioService = new UsuarioService({ usuarioRepository: mockUsuarioRepository });
  });

  test('falla si no se proporciona usuarioRepository en el constructor', () => {
    expect(() => new UsuarioService({})).toThrow('usuarioRepository es requerido');
  });

  test('lanza ValidationError si el email no es enviado o está vacío', async () => {
    await expect(usuarioService.login({ email: '', password: 'password' }))
      .rejects.toThrow(ValidationError);
    await expect(usuarioService.login({ password: 'password' }))
      .rejects.toThrow(ValidationError);
    await expect(usuarioService.login({ email: null, password: 'password' }))
      .rejects.toThrow(ValidationError);
  });

  test('lanza ValidationError si la contraseña no es enviada o está vacía', async () => {
    await expect(usuarioService.login({ email: 'tyler@teste.com', password: '' }))
      .rejects.toThrow(ValidationError);
    await expect(usuarioService.login({ email: 'tyler@teste.com' }))
      .rejects.toThrow(ValidationError);
    await expect(usuarioService.login({ email: 'tyler@teste.com', password: '   ' }))
      .rejects.toThrow(ValidationError);
  });

  test('lanza UnauthorizedError si el usuario no existe', async () => {
    mockUsuarioRepository.leer.mockResolvedValue([]);

    await expect(usuarioService.login({ email: 'inexistente@test.com', password: 'secret123' }))
      .rejects.toThrow(UnauthorizedError);
  });

  test('lanza UnauthorizedError si la contraseña no coincide', async () => {
    await expect(usuarioService.login({ email: 'tyler@teste.com', password: 'wrongpassword' }))
      .rejects.toThrow(UnauthorizedError);
  });

  test('autentica correctamente y retorna la instancia de Usuario con email insensible a mayúsculas', async () => {
    const usuario = await usuarioService.login({
      email: 'TYLER@TESTE.COM',
      password: passwordPlano
    });

    expect(usuario).toBeInstanceOf(Usuario);
    expect(usuario).toBeInstanceOf(Espectador);
    expect(usuario.id).toBe('usr-1');
    expect(usuario.nombre).toBe('Tyler Durden');
    expect(usuario.email).toBe('tyler@teste.com');
  });

  describe('obtenerWatchlist', () => {
    test('devuelve el listado de películas en la watchlist del usuario', async () => {
      const watchlist = await usuarioService.obtenerWatchlist('usr-1', {
        sessionUserId: 'usr-1'
      });

      expect(watchlist).toEqual(['peli-1']);
    });

    test('lanza ForbiddenError si sessionUserId no coincide con targetUserId', async () => {
      await expect(
        usuarioService.obtenerWatchlist('usr-1', {
          sessionUserId: 'usr-2'
        })
      ).rejects.toThrow(ForbiddenError);
    });

    test('lanza NotFoundError si el usuario no existe', async () => {
      mockUsuarioRepository.leer.mockResolvedValue([]);
      await expect(
        usuarioService.obtenerWatchlist('usr-999', {
          sessionUserId: 'usr-999'
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('actualizarWatchlist', () => {
    test('agrega una película a la watchlist y guarda el usuario', async () => {
      const actualizado = await usuarioService.actualizarWatchlist('usr-1', {
        sessionUserId: 'usr-1',
        peliculaId: '550'
      });

      expect(actualizado.watchlist).toContain('550');
      expect(actualizado.watchlist).toContain('peli-1');
      expect(mockUsuarioRepository.guardar).toHaveBeenCalledTimes(1);
    });

    test('quita una película de la watchlist cuando ya existe (modo toggle) o con accion quitar', async () => {
      const actualizado = await usuarioService.actualizarWatchlist('usr-1', {
        sessionUserId: 'usr-1',
        peliculaId: 'peli-1'
      });

      expect(actualizado.watchlist).not.toContain('peli-1');
      expect(mockUsuarioRepository.guardar).toHaveBeenCalledTimes(1);
    });

    test('lanza ForbiddenError si sessionUserId no coincide con targetUserId', async () => {
      await expect(
        usuarioService.actualizarWatchlist('usr-1', {
          sessionUserId: 'usr-2',
          peliculaId: '550'
        })
      ).rejects.toThrow(ForbiddenError);
    });

    test('lanza ValidationError si no se envía peliculaId', async () => {
      await expect(
        usuarioService.actualizarWatchlist('usr-1', {
          sessionUserId: 'usr-1',
          peliculaId: ''
        })
      ).rejects.toThrow(ValidationError);
    });

    test('lanza NotFoundError si el usuario no existe', async () => {
      mockUsuarioRepository.leer.mockResolvedValue([]);
      await expect(
        usuarioService.actualizarWatchlist('usr-999', {
          sessionUserId: 'usr-999',
          peliculaId: '550'
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
