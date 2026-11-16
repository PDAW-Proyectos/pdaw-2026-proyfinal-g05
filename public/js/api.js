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

function mostrarCartelSesionExpirada(mensajePersonalizado) {
  if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') {
    return;
  }

  if (document.getElementById('cartel-sesion-expirada-overlay')) {
    return;
  }

  const modalExistente = document.getElementById('modal-sesion-expirada');
  if (modalExistente && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const instancia = bootstrap.Modal.getOrCreateInstance(modalExistente);
    instancia.show();
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'cartel-sesion-expirada-overlay';
  backdrop.style.position = 'fixed';
  backdrop.style.inset = '0';
  backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  backdrop.style.zIndex = '99999';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.padding = '1.5rem';

  const tarjeta = document.createElement('div');
  tarjeta.setAttribute('role', 'alertdialog');
  tarjeta.setAttribute('aria-modal', 'true');
  tarjeta.setAttribute('aria-labelledby', 'cartel-sesion-titulo');
  tarjeta.setAttribute('aria-describedby', 'cartel-sesion-desc');
  tarjeta.style.background = '#151b22';
  tarjeta.style.border = '1px solid rgba(255, 255, 255, 0.12)';
  tarjeta.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.75)';
  tarjeta.style.borderRadius = '8px';
  tarjeta.style.maxWidth = '460px';
  tarjeta.style.width = '100%';
  tarjeta.style.padding = '1.75rem';
  tarjeta.style.color = '#ffffff';

  const cabecera = document.createElement('div');
  cabecera.style.display = 'flex';
  cabecera.style.alignItems = 'center';
  cabecera.style.gap = '0.75rem';
  cabecera.style.marginBottom = '1rem';

  const icono = document.createElement('i');
  icono.className = 'bi bi-shield-lock-fill';
  icono.style.color = '#FF6699';
  icono.style.fontSize = '1.75rem';
  icono.setAttribute('aria-hidden', 'true');

  const titulo = document.createElement('h3');
  titulo.id = 'cartel-sesion-titulo';
  titulo.style.fontFamily = "'Anton', sans-serif";
  titulo.style.textTransform = 'uppercase';
  titulo.style.letterSpacing = '1px';
  titulo.style.margin = '0';
  titulo.style.fontSize = '1.35rem';
  titulo.textContent = 'Tu sesión ha expirado';

  cabecera.appendChild(icono);
  cabecera.appendChild(titulo);

  const descripcion = document.createElement('p');
  descripcion.id = 'cartel-sesion-desc';
  descripcion.style.color = '#cbd5e1';
  descripcion.style.fontSize = '0.95rem';
  descripcion.style.lineHeight = '1.5';
  descripcion.style.marginBottom = '1.5rem';
  descripcion.textContent = (mensajePersonalizado && !mensajePersonalizado.startsWith('Error HTTP'))
    ? mensajePersonalizado
    : 'Por motivos de seguridad, tu sesión finalizó o no está activa. Iniciá sesión nuevamente para poder realizar esta acción.';

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'stretch';

  const btnLogin = document.createElement('a');
  btnLogin.href = '/login.html';
  btnLogin.className = 'btn btn-pink w-100 py-2.5 fw-bold text-uppercase text-center text-decoration-none';
  btnLogin.textContent = 'Iniciar Sesión';

  footer.appendChild(btnLogin);

  tarjeta.appendChild(cabecera);
  tarjeta.appendChild(descripcion);
  tarjeta.appendChild(footer);
  backdrop.appendChild(tarjeta);

  document.body.appendChild(backdrop);
  btnLogin.focus();
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

    if (response.status === 401) {
      const rutaActual = (typeof window !== 'undefined' && window.location && typeof window.location.pathname === 'string')
        ? window.location.pathname
        : '';
      if (!rutaActual.includes('login.html') && !rutaActual.includes('registro.html')) {
        if (typeof API !== 'undefined' && typeof API.limpiarSesion === 'function') {
          API.limpiarSesion();
        }
        if (typeof mostrarCartelSesionExpirada === 'function') {
          mostrarCartelSesionExpirada(mensaje);
        }
      }
    }

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

  async buscarPeliculas(query, { signal } = {}) {
    const termino = encodeURIComponent(String(query || '').trim());
    const response = await apiFetch(`/api/peliculas/buscar?q=${termino}`, {
      method: 'GET',
      signal
    });
    return await response.json();
  },

  async register({ nombre, email, password } = {}, { signal } = {}) {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { nombre, email, password },
      signal
    });

    const data = await response.json();
    const usuario = data.usuario || data.user || data;
    this.guardarSesion(usuario);
    return data;
  },

  async login({ email, password } = {}, { signal } = {}) {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      signal
    });

    const data = await response.json();
    const usuario = data.usuario || data.user || data;
    this.guardarSesion(usuario);
    return data;
  },

  async logout({ signal } = {}) {
    try {
      const response = await apiFetch('/api/auth/logout', {
        method: 'POST',
        signal
      });
      return response;
    } finally {
      this.limpiarSesion();
    }
  },

  mostrarCartelSesionExpirada
};

if (typeof window !== 'undefined') {
  window.API = API;
  window.apiFetch = apiFetch;
  window.mostrarCartelSesionExpirada = mostrarCartelSesionExpirada;
}

function iniciarVerificadorSesion() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const rutaActual = window.location && typeof window.location.pathname === 'string'
    ? window.location.pathname
    : '';
  if (rutaActual.includes('login.html') || rutaActual.includes('registro.html')) {
    return;
  }

  async function verificarSesionActiva() {
    const userId = API.getUserId();
    if (!userId) return;

    try {
      const resp = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });

      if (resp.status === 401) {
        API.limpiarSesion();
        mostrarCartelSesionExpirada();
      }
    } catch (_) { }
  }

  verificarSesionActiva();
  setInterval(verificarSesionActiva, 3000);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarVerificadorSesion);
  } else {
    iniciarVerificadorSesion();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

