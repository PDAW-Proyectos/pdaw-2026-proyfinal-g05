'use strict';

(() => {
  class PanelAdminUI {
    #estadoCargando;
    #estadoNoAuth;
    #estadoDenegado;
    #contenido;
    #abortController = null;

    constructor() {
      this.#estadoCargando = document.getElementById('admin-estado-cargando');
      this.#estadoNoAuth = document.getElementById('admin-estado-no-auth');
      this.#estadoDenegado = document.getElementById('admin-estado-denegado');
      this.#contenido = document.getElementById('admin-contenido');
    }

    init() {
      this.verificarAcceso();
    }

    #mostrarEstado(estado) {
      if (this.#estadoCargando) {
        this.#estadoCargando.classList.toggle('d-none', estado !== 'cargando');
      }
      if (this.#estadoNoAuth) {
        this.#estadoNoAuth.classList.toggle('d-none', estado !== 'no-auth');
      }
      if (this.#estadoDenegado) {
        this.#estadoDenegado.classList.toggle('d-none', estado !== 'denegado');
      }
      if (this.#contenido) {
        this.#contenido.classList.toggle('d-none', estado !== 'autorizado');
      }
    }

    async verificarAcceso() {
      this.#mostrarEstado('cargando');

      if (this.#abortController) {
        this.#abortController.abort();
      }
      this.#abortController = new AbortController();

      try {
        const resp = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: this.#abortController.signal
        });

        if (resp.status === 401) {
          if (typeof window.API !== 'undefined' && typeof window.API.limpiarSesion === 'function') {
            window.API.limpiarSesion();
          }
          this.#mostrarEstado('no-auth');
          return;
        }

        if (!resp.ok) {
          this.#mostrarEstado('denegado');
          return;
        }

        const usuario = await resp.json();
        if (usuario && usuario.rol === 'Moderador') {
          this.#mostrarEstado('autorizado');
        } else {
          this.#mostrarEstado('denegado');
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        this.#mostrarEstado('no-auth');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const panelAdmin = new PanelAdminUI();
    panelAdmin.init();
  });
})();
