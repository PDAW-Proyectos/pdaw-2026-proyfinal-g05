'use strict';

function normalizarHeaders(headersInput = {}) {
  const result = {};
  if (typeof Headers !== 'undefined' && headersInput instanceof Headers) {
    headersInput.forEach((value, key) => {
      result[key] = value;
    });
  } else if (headersInput && typeof headersInput === 'object') {
    Object.assign(result, headersInput);
  }
  return result;
}

function tieneHeader(headersObj, headerName) {
  const target = headerName.toLowerCase();
  return Object.keys(headersObj).some((key) => key.toLowerCase() === target);
}

async function apiFetch(url, options = {}) {
  const {
    method = 'GET',
    headers: headersInput = {},
    body,
    signal,
    credentials = 'same-origin',
    ...restOptions
  } = options;

  const headers = normalizarHeaders(headersInput);

  const userId = API.getUserId();
  if (userId && !tieneHeader(headers, 'x-user-id')) {
    headers['x-user-id'] = userId;
  }

  let finalBody = body;
  if (body !== undefined && body !== null) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;
    const isSearchParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
    const isString = typeof body === 'string';

    if (!isFormData && !isBlob && !isSearchParams && !isString && typeof body === 'object') {
      finalBody = JSON.stringify(body);
      if (!tieneHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const fetchConfig = {
    method,
    headers,
    credentials,
    signal,
    ...restOptions
  };

  if (finalBody !== undefined) {
    fetchConfig.body = finalBody;
  }

  const response = await fetch(url, fetchConfig);

  if (!response.ok) {
    let mensaje = `Error HTTP ${response.status}`;
    try {
      const errorData = await response.clone().json();
      if (errorData && (errorData.error || errorData.message)) {
        mensaje = errorData.error || errorData.message;
      }
    } catch (_) { }

    const error = new Error(mensaje);
    error.status = response.status;
    error.response = response;
    throw error;
  }

  return response;
}

const API = {
  getUserId() {
    try {
      const userId = localStorage.getItem('userId');
      return userId !== null && userId !== '' ? userId : null;
    } catch (e) {
      return null;
    }
  },

  setUserId(userId) {
    if (userId === null || userId === undefined || String(userId).trim() === '') {
      throw new Error('ID de usuario inválido');
    }
    localStorage.setItem('userId', String(userId).trim());
  },

  clearUserId() {
    try {
      localStorage.removeItem('userId');
    } catch (e) { }
  },

  guardarSesion(usuario) {
    if (!usuario || typeof usuario !== 'object') {
      throw new Error('Datos de usuario inválidos');
    }
    this.setUserId(usuario.id);
    const nombre = usuario.nombre || usuario.nombreUsuario || usuario.name || '';
    localStorage.setItem('usuarioNombre', String(nombre).trim());
    localStorage.setItem('usuario', JSON.stringify(usuario));
  },

  limpiarSesion() {
    this.clearUserId();
    try {
      localStorage.removeItem('usuarioNombre');
      localStorage.removeItem('usuario');
    } catch (e) { }
  },

  getUsuario() {
    try {
      const data = localStorage.getItem('usuario');
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },

  fetch: apiFetch,
  apiFetch: apiFetch,

  async register({ nombre, email, password } = {}, { signal } = {}) {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { nombre, email, password },
      signal
    });

    const data = await response.json();
    const usuario = data.usuario || data
