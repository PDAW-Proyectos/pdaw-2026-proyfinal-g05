'use strict';

(() => {
  function formatearFecha(isoString) {
    if (!isoString) return '—';
    try {
      const fecha = new Date(isoString);
      if (Number.isNaN(fecha.getTime())) return '—';
      return fecha.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  function obtenerHandleUsuario(usuario) {
    if (!usuario) return '';
    const raw = String(usuario.usuario || usuario.id || '').trim().replace(/^@+/, '');
    return raw ? `@${raw}` : '';
  }

  class PanelAdminUI {
    #estadoCargando;
    #estadoNoAuth;
    #estadoDenegado;
    #contenido;

    #tabButtons;
    #tabUsuarios;
    #countUsuarios;
    #feedbackUsuarios;
    #inputBuscarUsuario;
    #filtroRol;

    #usuariosCargando;
    #usuariosError;
    #usuariosMensajeError;
    #usuariosVacio;
    #usuariosTablaWrap;
    #tbodyUsuarios;
    #paginacionUsuarios;
    #templateFilaUsuario;

    #modalConfirmarElem;
    #modalConfirmarInstance;
    #mensajeConfirmarEliminar;
    #checkEliminarResenas;
    #btnConfirmarEliminar;

    #usuarioActual = null;
    #usuarioAEliminar = null;
    #usuarios = [];
    #totalUsuarios = 0;
    #paginaActual = 1;
    #totalPaginas = 1;
    #porPagina = 10;
    #busqueda = '';
    #rolFiltro = 'todos';
    #debounceTimer = null;
    #abortController = null;
    #usuariosAbortController = null;
    #deleteAbortController = null;

    constructor() {
      this.#estadoCargando = document.getElementById('admin-estado-cargando');
      this.#estadoNoAuth = document.getElementById('admin-estado-no-auth');
      this.#estadoDenegado = document.getElementById('admin-estado-denegado');
      this.#contenido = document.getElementById('admin-contenido');

      this.#tabButtons = document.querySelectorAll('.admin-tab-btn');
      this.#tabUsuarios = document.getElementById('tab-usuarios');
      this.#countUsuarios = document.getElementById('admin-count-usuarios');
      this.#feedbackUsuarios = document.getElementById('admin-usuarios-feedback');
      this.#inputBuscarUsuario = document.getElementById('admin-buscar-usuario');
      this.#filtroRol = document.getElementById('admin-filtro-rol');

      this.#usuariosCargando = document.getElementById('admin-usuarios-cargando');
      this.#usuariosError = document.getElementById('admin-usuarios-error');
      this.#usuariosMensajeError = document.getElementById('admin-usuarios-mensaje-error');
      this.#usuariosVacio = document.getElementById('admin-usuarios-vacio');
      this.#usuariosTablaWrap = document.getElementById('admin-usuarios-tabla-wrap');
      this.#tbodyUsuarios = document.getElementById('admin-tbody-usuarios');
      this.#paginacionUsuarios = document.getElementById('admin-paginacion-usuarios');
      this.#templateFilaUsuario = document.getElementById('template-fila-usuario');

      this.#modalConfirmarElem = document.getElementById('modal-confirmar-eliminar-usuario');
      this.#mensajeConfirmarEliminar = document.getElementById('modal-confirmar-eliminar-usuario-mensaje');
      this.#checkEliminarResenas = document.getElementById('check-eliminar-resenas-usuario');
      this.#btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar-usuario');
    }

    init() {
      this.#configurarEventos();
      this.verificarAcceso();
    }

    #configurarEventos() {
      this.#tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab || 'usuarios';
          this.#cambiarTab(tab);
        });
      });

      if (this.#inputBuscarUsuario) {
        this.#inputBuscarUsuario.addEventListener('input', () => {
          clearTimeout(this.#debounceTimer);
          this.#debounceTimer = setTimeout(() => {
            this.#busqueda = String(this.#inputBuscarUsuario.value || '').trim();
            this.#paginaActual = 1;
            this.#cargarUsuarios();
          }, 300);
        });
      }

      if (this.#filtroRol) {
        this.#filtroRol.addEventListener('change', () => {
          this.#rolFiltro = this.#filtroRol.value || 'todos';
          this.#paginaActual = 1;
          this.#cargarUsuarios();
        });
      }

      if (this.#tbodyUsuarios) {
        this.#tbodyUsuarios.addEventListener('click', (e) => {
          const btnEliminar = e.target.closest('.btn-eliminar-usuario');
          if (!btnEliminar || btnEliminar.disabled) return;
          this.#abrirModalEliminarUsuario(btnEliminar);
        });
      }

      if (this.#paginacionUsuarios) {
        this.#paginacionUsuarios.addEventListener('click', (e) => {
          const boton = e.target.closest('button[data-pagina]');
          if (!boton || boton.disabled || boton.classList.contains('disabled')) return;

          const destino = Number(boton.dataset.pagina);
          if (destino && destino !== this.#paginaActual) {
            this.#paginaActual = destino;
            this.#cargarUsuarios();
          }
        });
      }

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.addEventListener('click', () => {
          this.#ejecutarEliminacionUsuario();
        });
      }
    }

    #cambiarTab(tab) {
      this.#tabButtons.forEach((btn) => {
        const activo = (btn.dataset.tab || 'usuarios') === tab;
        btn.classList.toggle('active', activo);
        btn.setAttribute('aria-selected', String(activo));
      });
      if (this.#tabUsuarios) {
        this.#tabUsuarios.classList.toggle('d-none', tab !== 'usuarios');
      }
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

    #mostrarEstadoUsuarios(estado, mensajeError = '') {
      if (this.#usuariosCargando) {
        this.#usuariosCargando.classList.toggle('d-none', estado !== 'cargando');
      }
      if (this.#usuariosError) {
        this.#usuariosError.classList.toggle('d-none', estado !== 'error');
      }
      if (this.#usuariosMensajeError && mensajeError) {
        this.#usuariosMensajeError.textContent = mensajeError;
      }
      if (this.#usuariosVacio) {
        this.#usuariosVacio.classList.toggle('d-none', estado !== 'vacio');
      }
      if (this.#usuariosTablaWrap) {
        this.#usuariosTablaWrap.classList.toggle('d-none', estado !== 'lista');
      }
      if (estado !== 'lista' && this.#paginacionUsuarios) {
        this.#paginacionUsuarios.textContent = '';
      }
    }

    #mostrarFeedback(tipo, mensaje) {
      if (!this.#feedbackUsuarios) return;
      this.#feedbackUsuarios.className = 'alert mb-3 py-2 px-3 rounded-0 border-0 small';
      if (tipo === 'exito') {
        this.#feedbackUsuarios.classList.add('alerta-fightclub-exito');
      } else {
        this.#feedbackUsuarios.classList.add('alerta-fightclub-error');
      }
      this.#feedbackUsuarios.textContent = mensaje;
      this.#feedbackUsuarios.classList.remove('d-none');
    }

    #ocultarFeedback() {
      if (!this.#feedbackUsuarios) return;
      this.#feedbackUsuarios.classList.add('d-none');
      this.#feedbackUsuarios.textContent = '';
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
          this.#usuarioActual = usuario;
          this.#mostrarEstado('autorizado');
          await this.#cargarUsuarios();
        } else {
          this.#mostrarEstado('denegado');
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        this.#mostrarEstado('no-auth');
      }
    }

    async #cargarUsuarios() {
      if (this.#usuariosAbortController) {
        this.#usuariosAbortController.abort();
      }
      this.#usuariosAbortController = new AbortController();

      this.#mostrarEstadoUsuarios('cargando');

      try {
        const params = new URLSearchParams();
        params.set('pagina', String(this.#paginaActual));
        params.set('limite', String(this.#porPagina));
        if (this.#busqueda) {
          params.set('busqueda', this.#busqueda);
        }
        if (this.#rolFiltro && this.#rolFiltro !== 'todos') {
          params.set('rol', this.#rolFiltro);
        }

        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const resp = await fetchFn(`/api/usuarios?${params.toString()}`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: this.#usuariosAbortController.signal
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(data.error || 'No se pudo cargar el listado de usuarios.');
        }

        this.#usuarios = Array.isArray(data.usuarios) ? data.usuarios : [];
        this.#totalUsuarios = Number(data.total) || 0;
        this.#paginaActual = Number(data.pagina) || 1;
        this.#totalPaginas = Number(data.totalPaginas) || 1;

        if (this.#countUsuarios) {
          this.#countUsuarios.textContent = String(this.#totalUsuarios);
        }

        if (this.#usuarios.length === 0) {
          this.#mostrarEstadoUsuarios('vacio');
          return;
        }

        this.#renderizarTablaUsuarios();
        this.#renderizarPaginacion();
        this.#mostrarEstadoUsuarios('lista');
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (err && err.status === 401) {
          this.#mostrarEstado('no-auth');
          return;
        }
        if (err && err.status === 403) {
          this.#mostrarEstado('denegado');
          return;
        }
        this.#mostrarEstadoUsuarios('error', err?.message || 'Error al cargar los usuarios del club.');
      }
    }

    #renderizarTablaUsuarios() {
      if (!this.#tbodyUsuarios || !this.#templateFilaUsuario) return;
      this.#tbodyUsuarios.textContent = '';

      const fragmento = document.createDocumentFragment();
      const miId = this.#usuarioActual?.id ? String(this.#usuarioActual.id) : '';

      this.#usuarios.forEach((u) => {
        const clone = this.#templateFilaUsuario.content.cloneNode(true);
        const esMismoUsuario = Boolean(miId && String(u.id) === miId);
        const rolTexto = String(u.rol || 'Espectador');
        const rolLower = rolTexto.toLowerCase();
        const esModerador = rolLower === 'moderador';
        const esCritico = rolLower === 'critico';

        const nombreElem = clone.querySelector('.admin-usuario-nombre');
        if (nombreElem) {
          nombreElem.textContent = u.nombre || 'Miembro';
          nombreElem.classList.toggle('text-pink', esModerador);
          nombreElem.classList.toggle('text-white', !esModerador);
        }

        const badgeYo = clone.querySelector('.admin-usuario-badge-yo');
        if (badgeYo) {
          badgeYo.classList.toggle('d-none', !esMismoUsuario);
        }

        const handleElem = clone.querySelector('.admin-usuario-handle');
        if (handleElem) {
          handleElem.textContent = obtenerHandleUsuario(u);
        }

        const emailElem = clone.querySelector('.admin-usuario-email');
        if (emailElem) {
          emailElem.textContent = u.email || '—';
        }

        const rolBadge = clone.querySelector('.admin-usuario-rol-badge');
        if (rolBadge) {
          rolBadge.textContent = rolTexto.toUpperCase();
          rolBadge.classList.toggle('border-pink', esModerador || esCritico);
          rolBadge.classList.toggle('text-pink', esModerador || esCritico);
          rolBadge.classList.toggle('border-secondary', !esModerador && !esCritico);
          rolBadge.classList.toggle('text-secondary', !esModerador && !esCritico);
        }

        const prensaElem = clone.querySelector('.admin-usuario-prensa');
        if (prensaElem) {
          if (esCritico && u.medioDePrensa) {
            prensaElem.textContent = u.medioDePrensa;
            prensaElem.classList.remove('d-none');
          } else {
            prensaElem.classList.add('d-none');
          }
        }

        const fechaElem = clone.querySelector('.admin-usuario-fecha');
        if (fechaElem) {
          fechaElem.textContent = formatearFecha(u.fechaRegistro);
        }

        const btnEliminar = clone.querySelector('.btn-eliminar-usuario');
        if (btnEliminar) {
          btnEliminar.dataset.userId = u.id || '';
          btnEliminar.dataset.userNombre = u.nombre || 'este usuario';
          btnEliminar.dataset.userEmail = u.email || '';
          if (esMismoUsuario || esModerador) {
            btnEliminar.disabled = true;
            btnEliminar.setAttribute(
              'title',
              esMismoUsuario ? 'No podés eliminar tu propia cuenta' : 'No podés eliminar a otro moderador'
            );
            btnEliminar.classList.add('opacity-50');
          }
        }

        fragmento.appendChild(clone);
      });

      this.#tbodyUsuarios.appendChild(fragmento);
    }

    #renderizarPaginacion() {
      if (!this.#paginacionUsuarios) return;
      this.#paginacionUsuarios.textContent = '';

      if (this.#totalPaginas <= 1) {
        return;
      }

      const fragmento = document.createDocumentFragment();

      const btnAnterior = document.createElement('button');
      btnAnterior.type = 'button';
      btnAnterior.className = 'btn btn-outline-custom btn-sm px-3 py-2';
      btnAnterior.textContent = 'Anterior';
      btnAnterior.dataset.pagina = String(this.#paginaActual - 1);
      if (this.#paginaActual <= 1) {
        btnAnterior.disabled = true;
        btnAnterior.classList.add('disabled');
      }
      fragmento.appendChild(btnAnterior);

      for (let i = 1; i <= this.#totalPaginas; i += 1) {
        const btnPag = document.createElement('button');
        btnPag.type = 'button';
        btnPag.className = i === this.#paginaActual
          ? 'btn btn-pink btn-sm px-3 py-2 active'
          : 'btn btn-outline-custom btn-sm px-3 py-2';
        btnPag.textContent = String(i);
        btnPag.dataset.pagina = String(i);
        if (i === this.#paginaActual) {
          btnPag.setAttribute('aria-current', 'page');
        }
        fragmento.appendChild(btnPag);
      }

      const btnSiguiente = document.createElement('button');
      btnSiguiente.type = 'button';
      btnSiguiente.className = 'btn btn-outline-custom btn-sm px-3 py-2';
      btnSiguiente.textContent = 'Siguiente';
      btnSiguiente.dataset.pagina = String(this.#paginaActual + 1);
      if (this.#paginaActual >= this.#totalPaginas) {
        btnSiguiente.disabled = true;
        btnSiguiente.classList.add('disabled');
      }
      fragmento.appendChild(btnSiguiente);

      this.#paginacionUsuarios.appendChild(fragmento);
    }

    #abrirModalEliminarUsuario(btnEliminar) {
      const id = btnEliminar.dataset.userId;
      if (!id) return;

      const nombre = btnEliminar.dataset.userNombre || 'este usuario';
      const email = btnEliminar.dataset.userEmail || '';

      this.#usuarioAEliminar = { id, nombre, email };
      this.#ocultarFeedback();

      if (this.#mensajeConfirmarEliminar) {
        this.#mensajeConfirmarEliminar.textContent = email
          ? `¿Confirmás que querés eliminar a ${nombre} (${email})?`
          : `¿Confirmás que querés eliminar a ${nombre}?`;
      }

      if (this.#checkEliminarResenas) {
        this.#checkEliminarResenas.checked = false;
      }

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.disabled = false;
        this.#btnConfirmarEliminar.textContent = 'Eliminar';
      }

      if (typeof bootstrap !== 'undefined' && bootstrap.Modal && this.#modalConfirmarElem) {
        if (!this.#modalConfirmarInstance) {
          this.#modalConfirmarInstance = bootstrap.Modal.getOrCreateInstance(this.#modalConfirmarElem);
        }
        this.#modalConfirmarInstance.show();
      }
    }

    async #ejecutarEliminacionUsuario() {
      const objetivo = this.#usuarioAEliminar;
      if (!objetivo || !objetivo.id) return;

      const eliminarResenas = Boolean(this.#checkEliminarResenas?.checked);

      if (this.#deleteAbortController) {
        this.#deleteAbortController.abort();
      }
      this.#deleteAbortController = new AbortController();

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.disabled = true;
        this.#btnConfirmarEliminar.textContent = 'Eliminando...';
      }

      try {
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const url = `/api/usuarios/${encodeURIComponent(objetivo.id)}?eliminarResenas=${eliminarResenas}`;
        const resp = await fetchFn(url, {
          method: 'DELETE',
          credentials: 'same-origin',
          signal: this.#deleteAbortController.signal
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || 'No se pudo eliminar al usuario.');
        }

        if (this.#modalConfirmarInstance) {
          this.#modalConfirmarInstance.hide();
        }

        if (this.#usuarios.length === 1 && this.#paginaActual > 1) {
          this.#paginaActual -= 1;
        }

        const msgExito = eliminarResenas
          ? `Usuario "${objetivo.nombre}" y sus reseñas eliminados correctamente.`
          : `Usuario "${objetivo.nombre}" eliminado correctamente.`;
        this.#mostrarFeedback('exito', msgExito);
        await this.#cargarUsuarios();
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (this.#modalConfirmarInstance) {
          this.#modalConfirmarInstance.hide();
        }
        this.#mostrarFeedback('error', err?.message || 'Error al eliminar el usuario.');
      } finally {
        this.#usuarioAEliminar = null;
        if (this.#btnConfirmarEliminar) {
          this.#btnConfirmarEliminar.disabled = false;
          this.#btnConfirmarEliminar.textContent = 'Eliminar';
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const panelAdmin = new PanelAdminUI();
    panelAdmin.init();
  });
})();
