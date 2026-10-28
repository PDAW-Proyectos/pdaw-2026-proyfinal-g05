const API = require('../../public/js/api');

describe('T01.7 - apiFetch (Interceptor / función base)', () => {
  let originalFetch;
  let originalLocalStorage;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete mockStorage[key];
      }),
      clear: jest.fn(() => {
        mockStorage = {};
      })
    };

    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
    jest.clearAllMocks();
  });

  test('inyecta automáticamente el header x-user-id si existe un usuario en localStorage', async () => {
    global.localStorage.setItem('userId', 'usr-fight-club-123');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    });

    await API.fetch('/api/peliculas');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/peliculas');
    expect(config.headers).toHaveProperty('x-user-id', 'usr-fight-club-123');
    expect(config.credentials).toBe('same-origin');
  });

  test('no inyecta x-user-id si no hay sesión activa en localStorage', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    });

    await API.fetch('/api/peliculas');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, config] = global.fetch.mock.calls[0];
    expect(config.headers['x-user-id']).toBeUndefined();
  });

  test('respeta el header x-user-id si fue enviado explícitamente en options', async () => {
    global.localStorage.setItem('userId', 'usr-original');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' })
    });

    await API.fetch('/api/peliculas', {
      headers: {
        'x-user-id': 'usr-override'
      }
    });

    const [, config] = global.fetch.mock.calls[0];
    expect(config.headers['x-user-id']).toBe('usr-override');
  });

  test('serializa automáticamente el body a JSON y asigna Content-Type', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'res-1' })
    });

    await API.fetch('/api/resenas', {
      method: 'POST',
      body: { idPelicula: '550', puntuacion: 5 }
    });

    const [, config] = global.fetch.mock.calls[0];
    expect(config.method).toBe('POST');
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.body).toBe(JSON.stringify({ idPelicula: '550', puntuacion: 5 }));
  });

  test('soporta AbortSignal para cancelación de peticiones con AbortController', async () => {
    const controller = new AbortController();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => []
    });

    await API.fetch('/api/peliculas/buscar', {
      signal: controller.signal
    });

    const [, config] = global.fetch.mock.calls[0];
    expect(config.signal).toBe(controller.signal);
  });

  test('lanza un error legible con el mensaje devuelto por la API cuando response.ok es false', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      clone: () => ({
        json: async () => ({ error: 'Correo o contraseña incorrectos' })
      })
    });

    await expect(API.fetch('/api/auth/login', { method: 'POST' }))
      .rejects
      .toThrow('Correo o contraseña incorrectos');
  });
});
