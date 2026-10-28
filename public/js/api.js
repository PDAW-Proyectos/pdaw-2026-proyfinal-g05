'use strict';

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

  async login({ email, password } = {}) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      let mensaje = 'Error al iniciar sesión';
      try {
        const errorData = await response.json();
        if (errorData && (errorData.error || errorData.message)) {
          mensaje = errorData.error || errorData.message;
        }
      } catch (e) { }
      throw new Error(mensaje);
    }

    const data = await response.json();
    const usuario = data.usuario || data.user || data;
    this.guardarSesion(usuario);
    return data;
  },

  async register({ nombre, email, password } = {}) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nombre, email, password })
    });

    if (!response.ok) {
      let mensaje = 'Error al registrar la cuenta';
      try {
        const errorData = await response.json();
        if (errorData && (errorData.error || errorData.message)) {
          mensaje = errorData.error || errorData.message;
        }
      } catch (e) { }
      throw new Error(mensaje);
    }

    const data = await response.json();
    const usuario = data.usuario || data.user || data;
    this.guardarSesion(usuario);
    return data;
  },

  async logout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });
      return response;
    } finally {
      this.limpiarSesion();
    }
  }
};

if (typeof window !== 'undefined') {
  window.API = API;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
