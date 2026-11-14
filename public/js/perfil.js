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

  function renderizarIconosEstrellas(contenedor, puntuacion) {
    if (!contenedor) return;
    contenedor.textContent = '';

    const num = Math.max(0, Math.min(5, Number(puntuacion) || 0));
    const enteras = Math.floor(num);
    const media = (num - enteras) >= 0.5;
    const fragmento = document.createDocumentFragment();

    for (let i = 0; i < enteras; i += 1) {
      const icono = document.createElement('i');
      icono.className = 'bi bi-star-fill';
      icono.setAttribute('aria-hidden', 'true');
      fragmento.appendChild(icono);
    }

    if (media) {
      const iconoMedia = document.createElement('i');
      iconoMedia.className = 'bi bi-star-half';
      iconoMedia.setAttribute('aria-hidden', 'true');
      fragmento.appendChild(iconoMedia);
    }

    if (enteras === 0 && !media) {
      const iconoVacio = document.createElement('i');
      iconoVacio.className = 'bi bi-star';
      iconoVacio.setAttribute('aria-hidden', 'true');
      fragmento.appendChild(iconoVacio);
    }

    contenedor.classList.add('d-inline-flex', 'align-items-center', 'gap-1');
    contenedor.setAttribute('aria-label', `${num.toFixed(1)} de 5 estrellas`);
    contenedor.appendChild(fragmento);
  }

  function obtenerIniciales(nombre) {
    const limpio = String(nombre || '').trim();
    if (!limpio) return 'MC';
    const partes = limpio.split(/\s+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  function obtenerHandleRaw(usuario) {
    if (!usuario) return '';
    const raw = usuario.usuario || usuario.id || '';
    return String(raw).trim().replace(/^@+/, '');
  }

  function generarHandleUsuario(usuario) {
    const raw = obtenerHandleRaw(usuario);
    return raw ? `@${raw}` : '@miembro';
  }

  class PerfilUI {
    #estadoCargando;
    #estadoNoAuth;
    #estadoError;
    #mensajeError;
    #contenido;

    #avatarImg;
    #avatarIniciales;
    #nombreElem;
    #usuarioElem;
    #emailElem;
    #rolElem;
    #medioPrensaElem;
    #fechaRegistroElem;

    #seccionTitulo;
    #seccionSubtitulo;
    #vistaButtons;
    #tabCountResenas;
    #tabCountFavoritas;
    #tabCountWatchlist;

    #vistaResenas;
    #vistaFavoritas;
    #vistaWatchlist;

    #top4Bloque;
    #top4Grid;

    #filtrosContenedor;
    #btnFiltroTodas;
    #btnFiltroSpoilers;
    #btnFiltroTop4;
    #btnFiltroEstrellas;
    #iconoFiltroEstrellas;
    #labelFiltroEstrellas;
    #menuFiltroEstrellas;
    #selectOrdenResenas;

    #contenedorResenas;
    #resenasVacio;
    #resenasVacioTitulo;
    #resenasVacioTexto;
    #paginacionResenas;
    #templateResena;

    #favoritasCargando;
    #favoritasVacio;
    #contenedorFavoritas;
    #templateFavorita;

    #watchlistCargando;
    #watchlistVacio;
    #contenedorWatchlist;
    #templateWatchlist;
    #templateTop4;

    #modalEditarPerfilElem;
    #formEditarPerfil;
    #alertaEditarPerfil;
    #inputPerfilNombre;
    #inputPerfilUsuario;
    #inputPerfilEmail;
    #btnGuardarPerfil;

    #modalConfirmarEliminarElem;
    #modalConfirmarEliminarInstance;
    #btnConfirmarEliminar;
    #mensajeConfirmarEliminar;
    #resenaIdAEliminar = null;

    #usuario = null;
    #resenasUsuario = [];
    #peliculasCache = new Map();
    #vistaActual = 'resenas';
    #soloSpoilers = false;
    #soloTop4 = false;
    #estrellasFiltro = null;
    #ordenActual = 'desc';
    #paginaActual = 1;
    #porPagina = 6;
    #favoritasCargada = false;
    #watchlistCargada = false;
    #abortController = null;
    #favoritasAbortController = null;
    #watchlistAbortController = null;
    #deleteAbortController = null;
    #perfilUpdateAbortController = null;

    constructor() {
      this.#estadoCargando = document.getElementById('perfil-estado-cargando');
      this.#estadoNoAuth = document.getElementById('perfil-estado-no-auth');
      this.#estadoError = document.getElementById('perfil-estado-error');
      this.#mensajeError = document.getElementById('perfil-mensaje-error');
      this.#contenido = document.getElementById('perfil-contenido');

      this.#avatarImg = document.getElementById('perfil-avatar-img');
      this.#avatarIniciales = document.getElementById('perfil-avatar-iniciales');
      this.#nombreElem = document.getElementById('perfil-nombre');
      this.#usuarioElem = document.getElementById('perfil-usuario');
      this.#emailElem = document.getElementById('perfil-email');
      this.#rolElem = document.getElementById('perfil-rol');
      this.#medioPrensaElem = document.getElementById('perfil-medio-prensa');
      this.#fechaRegistroElem = document.getElementById('perfil-fecha-registro');

      this.#seccionTitulo = document.getElementById('perfil-seccion-titulo');
      this.#seccionSubtitulo = document.getElementById('perfil-seccion-subtitulo');
      this.#vistaButtons = document.querySelectorAll('.perfil-vista-btn');
      this.#tabCountResenas = document.getElementById('tab-count-resenas');
      this.#tabCountFavoritas = document.getElementById('tab-count-favoritas');
      this.#tabCountWatchlist = document.getElementById('tab-count-watchlist');

      this.#vistaResenas = document.getElementById('vista-resenas');
      this.#vistaFavoritas = document.getElementById('vista-favoritas');
      this.#vistaWatchlist = document.getElementById('vista-watchlist');

      this.#top4Bloque = document.getElementById('perfil-top4-bloque');
      this.#top4Grid = document.getElementById('perfil-top4-grid');

      this.#filtrosContenedor = document.getElementById('perfil-filtros-resenas');
      this.#btnFiltroTodas = document.getElementById('btn-filtro-todas');
      this.#btnFiltroSpoilers = document.getElementById('btn-filtro-spoilers');
      this.#btnFiltroTop4 = document.getElementById('btn-filtro-top4');
      this.#btnFiltroEstrellas = document.getElementById('btn-filtro-estrellas');
      this.#iconoFiltroEstrellas = document.getElementById('icono-filtro-estrellas');
      this.#labelFiltroEstrellas = document.getElementById('label-filtro-estrellas');
      this.#menuFiltroEstrellas = document.getElementById('menu-filtro-estrellas');
      this.#selectOrdenResenas = document.getElementById('select-orden-resenas');

      this.#contenedorResenas = document.getElementById('perfil-contenedor-resenas');
      this.#resenasVacio = document.getElementById('perfil-resenas-vacio');
      this.#resenasVacioTitulo = document.getElementById('perfil-resenas-vacio-titulo');
      this.#resenasVacioTexto = document.getElementById('perfil-resenas-vacio-texto');
      this.#paginacionResenas = document.getElementById('perfil-paginacion-resenas');
      this.#templateResena = document.getElementById('template-tarjeta-resena-perfil');

      this.#favoritasCargando = document.getElementById('favoritas-estado-cargando');
      this.#favoritasVacio = document.getElementById('favoritas-estado-vacio');
      this.#contenedorFavoritas = document.getElementById('perfil-contenedor-favoritas');
      this.#templateFavorita = document.getElementById('template-tarjeta-favorita');

      this.#watchlistCargando = document.getElementById('watchlist-estado-cargando');
      this.#watchlistVacio = document.getElementById('watchlist-estado-vacio');
      this.#contenedorWatchlist = document.getElementById('perfil-contenedor-watchlist');
      this.#templateWatchlist = document.getElementById('template-tarjeta-watchlist');
      this.#templateTop4 = document.getElementById('template-tarjeta-top4');

      this.#modalEditarPerfilElem = document.getElementById('modal-editar-perfil');
      this.#formEditarPerfil = document.getElementById('form-editar-perfil');
      this.#alertaEditarPerfil = document.getElementById('alerta-editar-perfil');
      this.#inputPerfilNombre = document.getElementById('input-perfil-nombre');
      this.#inputPerfilUsuario = document.getElementById('input-perfil-usuario');
      this.#inputPerfilEmail = document.getElementById('input-perfil-email');
      this.#btnGuardarPerfil = document.getElementById('btn-guardar-perfil');

      this.#modalConfirmarEliminarElem = document.getElementById('modal-confirmar-eliminar');
      this.#btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
      this.#mensajeConfirmarEliminar = document.getElementById('modal-confirmar-eliminar-mensaje');
    }

    init() {
      this.#configurarEventos();
      this.cargarPerfil();
    }

    #configurarEventos() {
      document.addEventListener('click', (e) => {
        const vistaBtn = e.target.closest('.perfil-vista-btn');
        if (vistaBtn) {
          const vista = vistaBtn.dataset.vista || 'resenas';
          this.#cambiarVista(vista);
        }
      });

      if (this.#filtrosContenedor) {
        this.#filtrosContenedor.addEventListener('click', (e) => {
          const btnTodas = e.target.closest('#btn-filtro-todas');
          if (btnTodas) {
            if (!this.#soloSpoilers && !this.#soloTop4 && this.#estrellasFiltro === null) return;
            this.#soloSpoilers = false;
            this.#soloTop4 = false;
            this.#estrellasFiltro = null;
            this.#paginaActual = 1;
            this.#actualizarEstadoVisualFiltros();
            this.#aplicarFiltroYRenderizar();
            return;
          }

          const btnSpoilers = e.target.closest('#btn-filtro-spoilers');
          if (btnSpoilers) {
            this.#soloSpoilers = !this.#soloSpoilers;
            this.#paginaActual = 1;
            this.#actualizarEstadoVisualFiltros();
            this.#aplicarFiltroYRenderizar();
            return;
          }

          const btnTop4 = e.target.closest('#btn-filtro-top4');
          if (btnTop4) {
            this.#soloTop4 = !this.#soloTop4;
            this.#paginaActual = 1;
            this.#actualizarEstadoVisualFiltros();
            this.#aplicarFiltroYRenderizar();
            return;
          }

          const itemEstrella = e.target.closest('#menu-filtro-estrellas [data-estrellas]');
          if (itemEstrella) {
            const val = itemEstrella.dataset.estrellas;
            const nuevoValor = val === 'todas' ? null : Number(val);
            this.#estrellasFiltro = Number.isNaN(nuevoValor) ? null : nuevoValor;
            this.#paginaActual = 1;
            this.#actualizarEstadoVisualFiltros();
            this.#aplicarFiltroYRenderizar();
          }
        });
      }

      if (this.#selectOrdenResenas) {
        this.#selectOrdenResenas.addEventListener('change', () => {
          this.#ordenActual = this.#selectOrdenResenas.value === 'asc' ? 'asc' : 'desc';
          this.#paginaActual = 1;
          this.#aplicarFiltroYRenderizar();
        });
      }

      if (this.#contenedorResenas) {
        this.#contenedorResenas.addEventListener('click', (e) => {
          const btnToggle = e.target.closest('.btn-toggle-spoiler');
          if (btnToggle) {
            const card = btnToggle.closest('.feed-resena-card');
            if (!card) return;
            const cuerpo = card.querySelector('.resena-texto-body');
            if (!cuerpo) return;
            const revelado = cuerpo.classList.toggle('revelado');
            btnToggle.textContent = revelado ? 'Ocultar spoilers.' : 'Mostrala sin filtros.';
            return;
          }

          const btnEditar = e.target.closest('.btn-editar-resena');
          if (btnEditar) {
            const resenaId = btnEditar.dataset.resenaId;
            const resena = this.#resenasUsuario.find((r) => String(r.id) === String(resenaId));
            if (resena && typeof window.abrirModalEdicionResena === 'function') {
              window.abrirModalEdicionResena(resena, (resenaActualizada) => {
                const idx = this.#resenasUsuario.findIndex((r) => String(r.id) === String(resenaActualizada.id));
                if (idx !== -1) {
                  this.#resenasUsuario[idx] = { ...this.#resenasUsuario[idx], ...resenaActualizada };
                  this.#actualizarContadores();
                  this.#renderizarTop4Dinamico();
                  this.#aplicarFiltroYRenderizar();
                  this.#favoritasCargada = false;
                  if (this.#vistaActual === 'favoritas') {
                    this.#cargarFavoritas();
                  }
                }
              });
            }
            return;
          }

          const btnEliminar = e.target.closest('.btn-eliminar-resena');
          if (btnEliminar) {
            this.#abrirModalEliminarResena(btnEliminar);
          }
        });
      }

      if (this.#paginacionResenas) {
        this.#paginacionResenas.addEventListener('click', (e) => {
          const boton = e.target.closest('button[data-pagina]');
          if (!boton || boton.classList.contains('disabled')) return;

          const paginaDestino = Number(boton.dataset.pagina);
          if (paginaDestino && paginaDestino !== this.#paginaActual) {
            this.#paginaActual = paginaDestino;
            this.#aplicarFiltroYRenderizar();
            if (this.#contenedorResenas) {
              window.scrollTo({ top: this.#contenedorResenas.offsetTop - 120, behavior: 'smooth' });
            }
          }
        });
      }

      if (this.#contenedorWatchlist) {
        this.#contenedorWatchlist.addEventListener('click', (e) => {
          const btnResenar = e.target.closest('.btn-resenar-watchlist');
          if (!btnResenar) return;

          const peliculaId = btnResenar.dataset.peliculaId || '';
          const titulo = btnResenar.dataset.titulo || '';
          const anio = btnResenar.dataset.anio || '';
          const poster = btnResenar.dataset.poster || '/img/logoMovieClub.png';

          if (peliculaId && typeof window.abrirModalResena === 'function') {
            window.abrirModalResena({
              id: peliculaId,
              titulo,
              anio,
              poster
            });
          }
        });
      }

      if (this.#modalEditarPerfilElem) {
        this.#modalEditarPerfilElem.addEventListener('show.bs.modal', () => {
          this.#precargarFormularioPerfil();
        });
        this.#modalEditarPerfilElem.addEventListener('hidden.bs.modal', () => {
          if (this.#perfilUpdateAbortController) {
            this.#perfilUpdateAbortController.abort();
            this.#perfilUpdateAbortController = null;
          }
          this.#ocultarAlertaEditarPerfil();
        });
      }

      if (this.#formEditarPerfil) {
        this.#formEditarPerfil.addEventListener('submit', (e) => {
          e.preventDefault();
          this.#guardarDatosPersonales();
        });
      }

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.addEventListener('click', () => {
          this.#ejecutarEliminacionResena();
        });
      }

      window.addEventListener('movieclub:resena-guardada', () => {
        if (this.#usuario) {
          this.#favoritasCargada = false;
          this.#watchlistCargada = false;
          this.cargarPerfil();
        }
      });
    }

    #actualizarEstadoVisualFiltros() {
      const sinFiltros = !this.#soloSpoilers && !this.#soloTop4 && this.#estrellasFiltro === null;

      if (this.#btnFiltroTodas) {
        this.#btnFiltroTodas.classList.toggle('active', sinFiltros);
      }

      if (this.#btnFiltroSpoilers) {
        this.#btnFiltroSpoilers.classList.toggle('active', this.#soloSpoilers);
      }

      if (this.#btnFiltroTop4) {
        this.#btnFiltroTop4.classList.toggle('active', this.#soloTop4);
      }

      if (this.#btnFiltroEstrellas) {
        this.#btnFiltroEstrellas.classList.toggle('active', this.#estrellasFiltro !== null);
      }

      if (this.#iconoFiltroEstrellas) {
        const esMedia = this.#estrellasFiltro === 0.5;
        this.#iconoFiltroEstrellas.className = esMedia
          ? 'bi bi-star-half me-1'
          : 'bi bi-star-fill me-1';
      }

      if (this.#labelFiltroEstrellas) {
        this.#labelFiltroEstrellas.textContent =
          this.#estrellasFiltro !== null
            ? this.#estrellasFiltro.toFixed(1)
            : 'Por estrellas';
      }

      if (this.#menuFiltroEstrellas) {
        this.#menuFiltroEstrellas.querySelectorAll('[data-estrellas]').forEach((item) => {
          const val = item.dataset.estrellas;
          const esActivo =
            this.#estrellasFiltro === null
              ? val === 'todas'
              : Number(val) === this.#estrellasFiltro;
          item.classList.toggle('active', esActivo);
        });
      }
    }

    #precargarFormularioPerfil() {
      const u = this.#usuario || {};
      this.#ocultarAlertaEditarPerfil();

      if (this.#inputPerfilNombre) {
        this.#inputPerfilNombre.value = u.nombre || '';
      }
      if (this.#inputPerfilUsuario) {
        this.#inputPerfilUsuario.value = obtenerHandleRaw(u);
      }
      if (this.#inputPerfilEmail) {
        this.#inputPerfilEmail.value = u.email || '';
      }
      if (this.#btnGuardarPerfil) {
        this.#btnGuardarPerfil.disabled = false;
        this.#btnGuardarPerfil.textContent = 'Guardar cambios';
      }
    }

    #mostrarAlertaEditarPerfil(tipo, mensaje) {
      if (!this.#alertaEditarPerfil) return;
      this.#alertaEditarPerfil.className = 'alert mb-3 py-2 px-3 rounded-0 border-0';
      if (tipo === 'exito') {
        this.#alertaEditarPerfil.classList.add('alerta-fightclub-exito');
      } else {
        this.#alertaEditarPerfil.classList.add('alerta-fightclub-error');
      }
      this.#alertaEditarPerfil.textContent = mensaje;
      this.#alertaEditarPerfil.classList.remove('d-none');
    }

    #ocultarAlertaEditarPerfil() {
      if (!this.#alertaEditarPerfil) return;
      this.#alertaEditarPerfil.classList.add('d-none');
      this.#alertaEditarPerfil.textContent = '';
    }

    async #guardarDatosPersonales() {
      if (!this.#formEditarPerfil) return;
      this.#ocultarAlertaEditarPerfil();

      const formData = new FormData(this.#formEditarPerfil);
      const nombre = String(formData.get('nombre') || '').trim();
      const usuario = String(formData.get('usuario') || '').trim().replace(/^@+/, '');

      if (nombre.length < 2 || nombre.length > 20) {
        this.#mostrarAlertaEditarPerfil('error', 'El nombre debe tener entre 2 y 20 caracteres.');
        if (this.#inputPerfilNombre) this.#inputPerfilNombre.focus();
        return;
      }

      if (!/^[a-zA-Z0-9._-]{2,28}$/.test(usuario)) {
        this.#mostrarAlertaEditarPerfil(
          'error',
          'El usuario (@) debe tener entre 2 y 28 caracteres (letras, números, punto, guion o guion bajo).'
        );
        if (this.#inputPerfilUsuario) this.#inputPerfilUsuario.focus();
        return;
      }

      const userNavName = document.getElementById('user-nav-name');
      const userNavItem = document.getElementById('user-nav-item');
      const prevNavName = userNavName ? userNavName.textContent : '';
      if (userNavName && nombre) {
        userNavName.textContent = nombre.toUpperCase();
      }
      if (userNavItem) {
        userNavItem.classList.remove('d-none');
      }
      try {
        localStorage.setItem('usuarioNombre', nombre);
      } catch (e) {}

      if (this.#perfilUpdateAbortController) {
        this.#perfilUpdateAbortController.abort();
      }
      this.#perfilUpdateAbortController = new AbortController();

      if (this.#btnGuardarPerfil) {
        this.#btnGuardarPerfil.disabled = true;
        this.#btnGuardarPerfil.textContent = 'Guardando...';
      }

      try {
        const resp = await fetch('/api/usuarios/perfil', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin',
          body: JSON.stringify({ nombre, usuario }),
          signal: this.#perfilUpdateAbortController.signal
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(data.error || 'No se pudieron actualizar tus datos personales.');
        }

        this.#usuario = data;
        if (typeof window.API !== 'undefined' && typeof window.API.guardarSesion === 'function') {
          window.API.guardarSesion(data);
        }

        const userNavName = document.getElementById('user-nav-name');
        if (userNavName && data.nombre) {
          userNavName.textContent = String(data.nombre).toUpperCase();
        }

        this.#renderizarSidebar();
        this.#mostrarAlertaEditarPerfil('exito', 'Datos personales actualizados correctamente.');

        setTimeout(() => {
          if (typeof bootstrap !== 'undefined' && bootstrap.Modal && this.#modalEditarPerfilElem) {
            const instancia = bootstrap.Modal.getInstance(this.#modalEditarPerfilElem);
            if (instancia) instancia.hide();
          }
        }, 900);
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (userNavName && prevNavName) {
          userNavName.textContent = prevNavName;
          try {
            if (this.#usuario?.nombre) {
              localStorage.setItem('usuarioNombre', String(this.#usuario.nombre));
            }
          } catch (e) {}
        }
        this.#mostrarAlertaEditarPerfil('error', err?.message || 'Error al actualizar los datos.');
      } finally {
        if (this.#btnGuardarPerfil) {
          this.#btnGuardarPerfil.disabled = false;
          this.#btnGuardarPerfil.textContent = 'Guardar cambios';
        }
      }
    }

    #abrirModalEliminarResena(btnEliminar) {
      const resenaId = btnEliminar.dataset.resenaId;
      if (!resenaId) return;

      this.#resenaIdAEliminar = resenaId;

      const tituloPelicula = btnEliminar.dataset.peliculaTitulo;
      if (this.#mensajeConfirmarEliminar) {
        if (tituloPelicula) {
          this.#mensajeConfirmarEliminar.textContent = `¿Confirmás que querés eliminar tu reseña de "${tituloPelicula}"?`;
        } else {
          this.#mensajeConfirmarEliminar.textContent = '¿Confirmás que querés eliminar esta reseña?';
        }
      }

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.disabled = false;
        this.#btnConfirmarEliminar.textContent = 'Eliminar';
      }

      if (typeof bootstrap !== 'undefined' && bootstrap.Modal && this.#modalConfirmarEliminarElem) {
        if (!this.#modalConfirmarEliminarInstance) {
          this.#modalConfirmarEliminarInstance = bootstrap.Modal.getOrCreateInstance(this.#modalConfirmarEliminarElem);
        }
        this.#modalConfirmarEliminarInstance.show();
      }
    }

    async #ejecutarEliminacionResena() {
      const resenaId = this.#resenaIdAEliminar;
      if (!resenaId) return;

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
        const resp = await fetchFn(`/api/resenas/${encodeURIComponent(resenaId)}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          signal: this.#deleteAbortController.signal
        });

        if (!resp.ok) {
          throw new Error('No se pudo eliminar la reseña.');
        }

        if (this.#modalConfirmarEliminarInstance) {
          this.#modalConfirmarEliminarInstance.hide();
        }

        this.#resenasUsuario = this.#resenasUsuario.filter((r) => String(r.id) !== String(resenaId));
        this.#actualizarContadores();
        this.#renderizarTop4Dinamico();
        this.#aplicarFiltroYRenderizar();
        this.#favoritasCargada = false;
        if (this.#vistaActual === 'favoritas') {
          this.#cargarFavoritas();
        }

        window.dispatchEvent(new CustomEvent('movieclub:resena-eliminada', { detail: { id: resenaId } }));
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (this.#btnConfirmarEliminar) {
          this.#btnConfirmarEliminar.disabled = false;
          this.#btnConfirmarEliminar.textContent = (err && (err.status === 401 || err.message?.includes('iniciar sesión')))
            ? 'Sesión expirada'
            : 'Error al eliminar';
        }
        if (err && (err.status === 401 || err.message?.includes('iniciar sesión'))) {
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 1200);
        }
      } finally {
        this.#resenaIdAEliminar = null;
      }
    }

    #obtenerTop4Dinamico() {
      const cincoEstrellas = this.#resenasUsuario
        .filter((r) => Number(r.puntuacion) === 5)
        .sort((a, b) => {
          const fechaB = new Date(b.fechaCreacion || b.fechaVisionado || 0).getTime();
          const fechaA = new Date(a.fechaCreacion || a.fechaVisionado || 0).getTime();
          return fechaB - fechaA;
        });

      const peliculasVistas = new Set();
      const top4 = [];

      for (const resena of cincoEstrellas) {
        const peliId = String(resena.peliculaId || resena.pelicula?.id || '');
        if (!peliId || peliculasVistas.has(peliId)) continue;
        peliculasVistas.add(peliId);
        top4.push(resena);
        if (top4.length === 4) break;
      }

      return top4;
    }

    #obtenerFavoritasIds() {
      const u = this.#usuario || {};
      const ids = [];
      const vistos = new Set();

      if (Array.isArray(u.favoritas)) {
        u.favoritas.forEach((id) => {
          const limpio = String(id || '').trim();
          if (limpio && !vistos.has(limpio)) {
            vistos.add(limpio);
            ids.push(limpio);
          }
        });
      }

      this.#resenasUsuario.forEach((r) => {
        if (r.esFavorita && r.peliculaId) {
          const limpio = String(r.peliculaId).trim();
          if (limpio && !vistos.has(limpio)) {
            vistos.add(limpio);
            ids.push(limpio);
          }
        }
      });

      return ids;
    }

    async cargarPerfil() {
      if (this.#abortController) {
        this.#abortController.abort();
      }
      this.#abortController = new AbortController();

      this.#mostrarCargando();

      try {
        const resUsuario = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'same-origin',
          signal: this.#abortController.signal
        });

        if (resUsuario.status === 401) {
          if (typeof window.API !== 'undefined' && typeof window.API.limpiarSesion === 'function') {
            window.API.limpiarSesion();
          } else {
            localStorage.removeItem('usuarioNombre');
            localStorage.removeItem('usuario');
          }
          const userNavItem = document.getElementById('user-nav-item');
          const userBoltItem = document.getElementById('user-bolt-item');
          const btnLoginNav = document.getElementById('btn-login-nav');
          if (userNavItem) userNavItem.classList.add('d-none');
          if (userBoltItem) userBoltItem.classList.add('d-none');
          if (btnLoginNav) btnLoginNav.classList.remove('d-none');

          this.#mostrarNoAutenticado();
          return;
        }

        if (!resUsuario.ok) {
          throw new Error('No se pudo obtener la información del perfil.');
        }

        const usuario = await resUsuario.json();
        this.#usuario = usuario;

        if (typeof window.API !== 'undefined' && typeof window.API.guardarSesion === 'function') {
          window.API.guardarSesion(usuario);
        }

        const userNavName = document.getElementById('user-nav-name');
        if (userNavName && usuario.nombre) {
          userNavName.textContent = String(usuario.nombre).toUpperCase();
        }

        const resResenas = await fetch(
          `/api/resenas?autorId=${encodeURIComponent(usuario.id)}&limite=100`,
          {
            method: 'GET',
            credentials: 'same-origin',
            signal: this.#abortController.signal
          }
        );

        if (!resResenas.ok) {
          throw new Error('No se pudieron cargar las reseñas del usuario.');
        }

        const resenas = await resResenas.json();
        const lista = Array.isArray(resenas) ? resenas : [];
        this.#resenasUsuario = lista.filter((r) => String(r.autorId) === String(usuario.id));

        this.#resenasUsuario.forEach((r) => {
          if (r.pelicula && r.pelicula.id) {
            this.#peliculasCache.set(String(r.pelicula.id), {
              id: String(r.pelicula.id),
              titulo: r.pelicula.titulo || 'Película',
              anio: r.pelicula.anio || '',
              poster: r.pelicula.poster || '/img/logoMovieClub.png',
              calificacion: r.pelicula.calificacion || null
            });
          }
        });

        this.#ocultarCargando();
        this.#renderizarSidebar();
        this.#actualizarContadores();
        this.#renderizarTop4Dinamico();
        this.#actualizarEstadoVisualFiltros();
        this.#aplicarFiltroYRenderizar();

        if (this.#vistaActual === 'favoritas' || !this.#favoritasCargada) {
          this.#cargarFavoritas();
        }
        if (this.#vistaActual === 'watchlist' || !this.#watchlistCargada) {
          this.#cargarWatchlist();
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        this.#mostrarError(err?.message || 'Error de conexión al cargar el perfil.');
      }
    }

    #renderizarSidebar() {
      const u = this.#usuario || {};

      if (this.#avatarImg && this.#avatarIniciales) {
        if (u.avatarUrl) {
          this.#avatarImg.src = u.avatarUrl;
          this.#avatarImg.alt = u.nombre || 'Foto de perfil';
          this.#avatarImg.classList.remove('d-none');
          this.#avatarIniciales.classList.add('d-none');
        } else {
          this.#avatarImg.classList.add('d-none');
          this.#avatarIniciales.classList.remove('d-none');
          this.#avatarIniciales.textContent = obtenerIniciales(u.nombre);
        }
      }

      if (this.#nombreElem) {
        this.#nombreElem.textContent = u.nombre || 'Miembro de MovieClub';
      }

      if (this.#usuarioElem) {
        this.#usuarioElem.textContent = generarHandleUsuario(u);
      }

      if (this.#emailElem) {
        this.#emailElem.textContent = u.email || '';
      }

      if (this.#rolElem) {
        this.#rolElem.textContent = String(u.rol || 'Espectador').toUpperCase();
      }

      if (this.#medioPrensaElem) {
        if (u.medioDePrensa) {
          this.#medioPrensaElem.textContent = u.medioDePrensa;
          this.#medioPrensaElem.classList.remove('d-none');
        } else {
          this.#medioPrensaElem.classList.add('d-none');
        }
      }

      if (this.#fechaRegistroElem) {
        this.#fechaRegistroElem.textContent = formatearFecha(u.fechaRegistro);
      }
    }

    #actualizarContadores() {
      const u = this.#usuario || {};
      const totalResenas = this.#resenasUsuario.length;
      const totalFavoritas = this.#obtenerFavoritasIds().length;
      const totalWatchlist = Array.isArray(u.watchlist) ? u.watchlist.length : 0;

      if (this.#tabCountResenas) this.#tabCountResenas.textContent = String(totalResenas);
      if (this.#tabCountFavoritas) this.#tabCountFavoritas.textContent = String(totalFavoritas);
      if (this.#tabCountWatchlist) this.#tabCountWatchlist.textContent = String(totalWatchlist);
    }

    #cambiarVista(vista) {
      if (vista === 'favoritas') {
        this.#vistaActual = 'favoritas';
      } else if (vista === 'watchlist') {
        this.#vistaActual = 'watchlist';
      } else {
        this.#vistaActual = 'resenas';
      }

      this.#vistaButtons.forEach((btn) => {
        const esActiva = btn.dataset.vista === this.#vistaActual;
        btn.classList.toggle('active', esActiva);
        btn.setAttribute('aria-selected', esActiva ? 'true' : 'false');
      });

      if (this.#vistaResenas) {
        this.#vistaResenas.classList.toggle('d-none', this.#vistaActual !== 'resenas');
      }
      if (this.#vistaFavoritas) {
        this.#vistaFavoritas.classList.toggle('d-none', this.#vistaActual !== 'favoritas');
      }
      if (this.#vistaWatchlist) {
        this.#vistaWatchlist.classList.toggle('d-none', this.#vistaActual !== 'watchlist');
      }

      if (this.#seccionTitulo) {
        const titulos = {
          resenas: 'MIS RESEÑAS',
          favoritas: 'PELÍCULAS FAVORITAS',
          watchlist: 'MI WATCHLIST'
        };
        this.#seccionTitulo.textContent = titulos[this.#vistaActual] || 'MIS RESEÑAS';
      }

      if (this.#seccionSubtitulo) {
        const subtitulos = {
          resenas: 'Tu archivo personal de críticas, puntuaciones y películas guardadas.',
          favoritas: 'Películas que marcaste como favoritas en MovieClub.',
          watchlist: 'Películas guardadas para ver próximamente y registrar tu crítica.'
        };
        this.#seccionSubtitulo.textContent = subtitulos[this.#vistaActual] || subtitulos.resenas;
      }

      if (this.#vistaActual === 'favoritas' && !this.#favoritasCargada) {
        this.#cargarFavoritas();
      }
      if (this.#vistaActual === 'watchlist' && !this.#watchlistCargada) {
        this.#cargarWatchlist();
      }
    }

    #filtrarYOrdenarResenas() {
      let resultado = [...this.#resenasUsuario];

      if (this.#soloSpoilers) {
        resultado = resultado.filter((r) => Boolean(r.contieneSpoilers));
      }

      if (this.#soloTop4) {
        const top4Ids = new Set(this.#obtenerTop4Dinamico().map((r) => String(r.id)));
        resultado = resultado.filter((r) => top4Ids.has(String(r.id)));
      }

      if (this.#estrellasFiltro !== null) {
        resultado = resultado.filter((r) => Number(r.puntuacion) === this.#estrellasFiltro);
      }

      resultado.sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion || a.fechaVisionado || 0).getTime();
        const fechaB = new Date(b.fechaCreacion || b.fechaVisionado || 0).getTime();
        return this.#ordenActual === 'asc' ? fechaA - fechaB : fechaB - fechaA;
      });

      return resultado;
    }

    #aplicarFiltroYRenderizar() {
      if (!this.#contenedorResenas || !this.#templateResena) return;

      const filtradas = this.#filtrarYOrdenarResenas();

      if (filtradas.length === 0) {
        this.#contenedorResenas.textContent = '';
        if (this.#paginacionResenas) this.#paginacionResenas.textContent = '';
        this.#mostrarVacioSegunFiltro();
        return;
      }

      if (this.#resenasVacio) this.#resenasVacio.classList.add('d-none');

      const totalPaginas = Math.ceil(filtradas.length / this.#porPagina);
      if (this.#paginaActual > totalPaginas) this.#paginaActual = totalPaginas;
      if (this.#paginaActual < 1) this.#paginaActual = 1;

      const inicio = (this.#paginaActual - 1) * this.#porPagina;
      const paginaResenas = filtradas.slice(inicio, inicio + this.#porPagina);

      this.#renderizarTarjetasResenas(paginaResenas);
      this.#renderizarPaginacion(totalPaginas);
    }

    #mostrarVacioSegunFiltro() {
      if (!this.#resenasVacio) return;
      this.#resenasVacio.classList.remove('d-none');

      let titulo = 'Todavía no escribiste ninguna reseña';
      let texto = 'Usá el botón + LOG de la barra superior para publicar tu primera crítica en el club.';

      if (this.#resenasUsuario.length > 0) {
        if (this.#soloTop4 && this.#obtenerTop4Dinamico().length === 0) {
          titulo = 'Tu Top 4 aún no tiene películas';
          texto = 'Calificá películas con 5 estrellas para que aparezcan en tu Top 4.';
        } else if (this.#soloTop4 || this.#soloSpoilers || this.#estrellasFiltro !== null) {
          titulo = 'Sin reseñas para los filtros seleccionados';
          texto = 'Probá quitando alguno de los filtros o volvé a Todas.';
        }
      }

      if (this.#resenasVacioTitulo) this.#resenasVacioTitulo.textContent = titulo;
      if (this.#resenasVacioTexto) this.#resenasVacioTexto.textContent = texto;
    }

    #renderizarTarjetasResenas(resenas) {
      this.#contenedorResenas.textContent = '';
      const fragmento = document.createDocumentFragment();
      const top4ResenaIds = new Set(this.#obtenerTop4Dinamico().map((r) => String(r.id)));

      resenas.forEach((resena) => {
        const clone = this.#templateResena.content.cloneNode(true);

        const fechaElem = clone.querySelector('.resena-fecha');
        if (fechaElem) {
          fechaElem.textContent = resena.fechaVisionado
            ? `Vista el ${formatearFecha(resena.fechaVisionado)}`
            : (resena.fechaCreacion ? `Publicada el ${formatearFecha(resena.fechaCreacion)}` : '');
        }

        const badgeTop4 = clone.querySelector('.resena-badge-top4');
        if (badgeTop4) {
          badgeTop4.classList.toggle('d-none', !top4ResenaIds.has(String(resena.id)));
        }

        const badgeDestacada = clone.querySelector('.resena-badge-destacada');
        if (badgeDestacada) {
          const esDestacada = Boolean(resena.esDestacada || resena.destacada);
          badgeDestacada.classList.toggle('d-none', !esDestacada);
        }

        const pelicula = resena.pelicula || {};
        const peliculaId = String(resena.peliculaId || pelicula.id || '');
        const tituloPeli = pelicula.titulo || `Película #${peliculaId}`;
        const anioPeli = pelicula.anio || '';
        const posterSrc = pelicula.poster || '/img/logoMovieClub.png';
        const urlDetalleResena = `/detalleResena.html?id=${encodeURIComponent(resena.id || '')}`;

        const posterLink = clone.querySelector('.resena-poster-link');
        if (posterLink) {
          posterLink.setAttribute('href', urlDetalleResena);
        }

        const posterImg = clone.querySelector('.resena-poster-img');
        if (posterImg) {
          posterImg.setAttribute('src', posterSrc);
          posterImg.setAttribute('alt', tituloPeli);
          posterImg.addEventListener('error', () => {
            posterImg.src = '/img/logoMovieClub.png';
          });
        }

        const tituloLink = clone.querySelector('.resena-titulo-link');
        if (tituloLink) {
          tituloLink.setAttribute('href', urlDetalleResena);
          tituloLink.textContent = tituloPeli;
        }

        const anioElem = clone.querySelector('.resena-anio');
        if (anioElem) {
          anioElem.textContent = anioPeli ? `(${anioPeli})` : '';
        }

        const estrellasElem = clone.querySelector('.resena-estrellas');
        if (estrellasElem) {
          renderizarIconosEstrellas(estrellasElem, resena.puntuacion);
        }

        const puntuacionNum = clone.querySelector('.resena-puntuacion-num');
        if (puntuacionNum) {
          puntuacionNum.textContent = Number(resena.puntuacion || 0).toFixed(1);
        }

        const iconoFavorita = clone.querySelector('.resena-icono-favorita');
        if (iconoFavorita) {
          iconoFavorita.classList.toggle('d-none', !resena.esFavorita);
        }

        const alertaSpoiler = clone.querySelector('.resena-alerta-spoiler');
        const cuerpoTexto = clone.querySelector('.resena-texto-body');
        if (resena.contieneSpoilers) {
          if (alertaSpoiler) alertaSpoiler.classList.remove('d-none');
          if (cuerpoTexto) cuerpoTexto.classList.add('spoiler-blureado');
        }

        if (cuerpoTexto) {
          cuerpoTexto.textContent = resena.texto ? `“${resena.texto}”` : '';
        }

        const btnEditar = clone.querySelector('.btn-editar-resena');
        if (btnEditar) {
          btnEditar.dataset.resenaId = resena.id || '';
        }

        const btnEliminar = clone.querySelector('.btn-eliminar-resena');
        if (btnEliminar) {
          btnEliminar.dataset.resenaId = resena.id || '';
          btnEliminar.dataset.peliculaTitulo = tituloPeli;
        }

        const linkDetalle = clone.querySelector('.resena-link-detalle');
        if (linkDetalle) {
          linkDetalle.setAttribute('href', urlDetalleResena);
        }

        fragmento.appendChild(clone);
      });

      this.#contenedorResenas.appendChild(fragmento);
    }

    #renderizarPaginacion(totalPaginas) {
      if (!this.#paginacionResenas) return;
      this.#paginacionResenas.textContent = '';

      if (totalPaginas <= 1) return;

      const fragmento = document.createDocumentFragment();

      const btnAnterior = document.createElement('button');
      btnAnterior.type = 'button';
      btnAnterior.className = 'btn btn-outline-custom btn-sm px-3 py-2';
      btnAnterior.textContent = 'Anterior';
      btnAnterior.dataset.pagina = String(this.#paginaActual - 1);
      if (this.#paginaActual === 1) {
        btnAnterior.classList.add('disabled');
        btnAnterior.setAttribute('aria-disabled', 'true');
      }
      fragmento.appendChild(btnAnterior);

      for (let p = 1; p <= totalPaginas; p += 1) {
        const btnPag = document.createElement('button');
        btnPag.type = 'button';
        btnPag.className = p === this.#paginaActual
          ? 'btn btn-pink btn-sm px-3 py-2 active'
          : 'btn btn-outline-custom btn-sm px-3 py-2';
        btnPag.textContent = String(p);
        btnPag.dataset.pagina = String(p);
        fragmento.appendChild(btnPag);
      }

      const btnSiguiente = document.createElement('button');
      btnSiguiente.type = 'button';
      btnSiguiente.className = 'btn btn-outline-custom btn-sm px-3 py-2';
      btnSiguiente.textContent = 'Siguiente';
      btnSiguiente.dataset.pagina = String(this.#paginaActual + 1);
      if (this.#paginaActual === totalPaginas) {
        btnSiguiente.classList.add('disabled');
        btnSiguiente.setAttribute('aria-disabled', 'true');
      }
      fragmento.appendChild(btnSiguiente);

      this.#paginacionResenas.appendChild(fragmento);
    }

    #renderizarTop4Dinamico() {
      if (!this.#top4Bloque || !this.#top4Grid || !this.#templateTop4) return;
      const top4Resenas = this.#obtenerTop4Dinamico();

      if (top4Resenas.length === 0) {
        this.#top4Bloque.classList.add('d-none');
        this.#top4Grid.textContent = '';
        return;
      }

      this.#top4Grid.textContent = '';
      const fragmento = document.createDocumentFragment();

      top4Resenas.forEach((resena, idx) => {
        const pelicula = resena.pelicula || {};
        const peliculaId = String(resena.peliculaId || pelicula.id || '');
        const tituloPeli = pelicula.titulo || `Película #${peliculaId}`;
        const anioPeli = pelicula.anio || '';
        const posterSrc = pelicula.poster || '/img/logoMovieClub.png';
        const urlDetalle = `/detalleResena.html?id=${encodeURIComponent(resena.id || '')}`;

        const clone = this.#templateTop4.content.cloneNode(true);
        const link = clone.querySelector('.top4-link');
        const pos = clone.querySelector('.top4-posicion');
        const img = clone.querySelector('.top4-poster');
        const titulo = clone.querySelector('.top4-titulo');
        const anio = clone.querySelector('.top4-anio');

        if (link) link.setAttribute('href', urlDetalle);
        if (pos) pos.textContent = `#${idx + 1}`;
        if (img) {
          img.src = posterSrc;
          img.alt = tituloPeli;
          img.addEventListener('error', () => {
            img.src = '/img/logoMovieClub.png';
          });
        }
        if (titulo) titulo.textContent = tituloPeli;
        if (anio) anio.textContent = anioPeli || '';

        fragmento.appendChild(clone);
      });

      this.#top4Grid.appendChild(fragmento);
      this.#top4Bloque.classList.remove('d-none');
    }

    async #resolverPelicula(item, signal) {
      if (item && typeof item === 'object' && item.id) {
        const normalizada = {
          id: String(item.id),
          titulo: item.titulo || item.title || `Película #${item.id}`,
          anio: item.anio || (item.fechaEstreno ? String(item.fechaEstreno).slice(0, 4) : ''),
          poster: item.poster || (item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : '/img/logoMovieClub.png'),
          calificacion: item.calificacion || null
        };
        this.#peliculasCache.set(normalizada.id, normalizada);
        return normalizada;
      }

      const id = String(item || '').trim();
      if (!id) return null;

      if (this.#peliculasCache.has(id)) {
        return this.#peliculasCache.get(id);
      }

      try {
        const resp = await fetch(`/api/peliculas/${encodeURIComponent(id)}`, {
          method: 'GET',
          credentials: 'same-origin',
          signal
        });

        if (resp.ok) {
          const data = await resp.json();
          const pelicula = {
            id: String(data.id || id),
            titulo: data.titulo || data.title || `Película #${id}`,
            anio: data.fechaEstreno ? String(data.fechaEstreno).slice(0, 4) : (data.anio || ''),
            poster: data.posterPath
              ? `https://image.tmdb.org/t/p/w500${data.posterPath}`
              : (data.poster || '/img/logoMovieClub.png'),
            calificacion: data.calificacion || null
          };
          this.#peliculasCache.set(id, pelicula);
          return pelicula;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          throw err;
        }
      }

      const fallback = {
        id,
        titulo: `Película #${id}`,
        anio: '',
        poster: '/img/logoMovieClub.png',
        calificacion: null
      };
      this.#peliculasCache.set(id, fallback);
      return fallback;
    }

    async #cargarFavoritas() {
      if (!this.#contenedorFavoritas || !this.#templateFavorita) return;

      const favoritasIds = this.#obtenerFavoritasIds();

      if (favoritasIds.length === 0) {
        if (this.#favoritasCargando) this.#favoritasCargando.classList.add('d-none');
        if (this.#favoritasVacio) this.#favoritasVacio.classList.remove('d-none');
        this.#contenedorFavoritas.textContent = '';
        this.#favoritasCargada = true;
        return;
      }

      if (this.#favoritasAbortController) {
        this.#favoritasAbortController.abort();
      }
      this.#favoritasAbortController = new AbortController();

      if (this.#favoritasVacio) this.#favoritasVacio.classList.add('d-none');
      if (this.#favoritasCargando) this.#favoritasCargando.classList.remove('d-none');
      this.#contenedorFavoritas.textContent = '';

      try {
        const peliculas = await Promise.all(
          favoritasIds.map((id) =>
            this.#resolverPelicula(id, this.#favoritasAbortController.signal)
          )
        );

        const fragmento = document.createDocumentFragment();

        peliculas.filter(Boolean).forEach((peli) => {
          const clone = this.#templateFavorita.content.cloneNode(true);
          const poster = clone.querySelector('.favorita-poster');
          const rating = clone.querySelector('.favorita-rating');
          const titulo = clone.querySelector('.favorita-titulo');
          const anio = clone.querySelector('.favorita-anio');

          if (poster) {
            poster.src = peli.poster;
            poster.alt = peli.titulo;
            poster.addEventListener('error', () => {
              poster.src = '/img/logoMovieClub.png';
            });
          }

          if (rating) {
            if (peli.calificacion) {
              rating.textContent = `★ ${Number(peli.calificacion).toFixed(1)}`;
              rating.classList.remove('d-none');
            } else {
              rating.classList.add('d-none');
            }
          }

          if (titulo) {
            titulo.textContent = peli.titulo;
          }

          if (anio) {
            anio.textContent = peli.anio || 'Sin año';
          }

          fragmento.appendChild(clone);
        });

        if (this.#favoritasCargando) this.#favoritasCargando.classList.add('d-none');
        this.#contenedorFavoritas.appendChild(fragmento);
        this.#favoritasCargada = true;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (this.#favoritasCargando) this.#favoritasCargando.classList.add('d-none');
      }
    }

    async #cargarWatchlist() {
      if (!this.#contenedorWatchlist || !this.#templateWatchlist) return;

      const watchlistRaw = Array.isArray(this.#usuario?.watchlist) ? this.#usuario.watchlist : [];

      if (watchlistRaw.length === 0) {
        if (this.#watchlistCargando) this.#watchlistCargando.classList.add('d-none');
        if (this.#watchlistVacio) this.#watchlistVacio.classList.remove('d-none');
        this.#contenedorWatchlist.textContent = '';
        this.#watchlistCargada = true;
        return;
      }

      if (this.#watchlistAbortController) {
        this.#watchlistAbortController.abort();
      }
      this.#watchlistAbortController = new AbortController();

      if (this.#watchlistVacio) this.#watchlistVacio.classList.add('d-none');
      if (this.#watchlistCargando) this.#watchlistCargando.classList.remove('d-none');
      this.#contenedorWatchlist.textContent = '';

      try {
        const peliculas = await Promise.all(
          watchlistRaw.map((item) =>
            this.#resolverPelicula(item, this.#watchlistAbortController.signal)
          )
        );

        const fragmento = document.createDocumentFragment();

        peliculas.filter(Boolean).forEach((peli) => {
          const clone = this.#templateWatchlist.content.cloneNode(true);
          const poster = clone.querySelector('.watchlist-poster');
          const rating = clone.querySelector('.watchlist-rating');
          const titulo = clone.querySelector('.watchlist-titulo');
          const anio = clone.querySelector('.watchlist-anio');
          const btnResenar = clone.querySelector('.btn-resenar-watchlist');

          if (poster) {
            poster.src = peli.poster;
            poster.alt = peli.titulo;
            poster.addEventListener('error', () => {
              poster.src = '/img/logoMovieClub.png';
            });
          }

          if (rating) {
            if (peli.calificacion) {
              rating.textContent = `★ ${Number(peli.calificacion).toFixed(1)}`;
              rating.classList.remove('d-none');
            } else {
              rating.classList.add('d-none');
            }
          }

          if (titulo) {
            titulo.textContent = peli.titulo;
          }

          if (anio) {
            anio.textContent = peli.anio || 'Sin año';
          }

          if (btnResenar) {
            btnResenar.dataset.peliculaId = peli.id;
            btnResenar.dataset.titulo = peli.titulo;
            btnResenar.dataset.anio = peli.anio || '';
            btnResenar.dataset.poster = peli.poster;
          }

          fragmento.appendChild(clone);
        });

        if (this.#watchlistCargando) this.#watchlistCargando.classList.add('d-none');
        this.#contenedorWatchlist.appendChild(fragmento);
        this.#watchlistCargada = true;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (this.#watchlistCargando) this.#watchlistCargando.classList.add('d-none');
      }
    }

    #mostrarCargando() {
      if (this.#estadoCargando) this.#estadoCargando.classList.remove('d-none');
      if (this.#estadoNoAuth) this.#estadoNoAuth.classList.add('d-none');
      if (this.#estadoError) this.#estadoError.classList.add('d-none');
      if (this.#contenido) this.#contenido.classList.add('d-none');
    }

    #ocultarCargando() {
      if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
      if (this.#contenido) this.#contenido.classList.remove('d-none');
    }

    #mostrarNoAutenticado() {
      if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
      if (this.#contenido) this.#contenido.classList.add('d-none');
      if (this.#estadoError) this.#estadoError.classList.add('d-none');
      if (this.#estadoNoAuth) this.#estadoNoAuth.classList.remove('d-none');
    }

    #mostrarError(mensaje) {
      if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
      if (this.#contenido) this.#contenido.classList.add('d-none');
      if (this.#estadoNoAuth) this.#estadoNoAuth.classList.add('d-none');
      if (this.#mensajeError) this.#mensajeError.textContent = mensaje;
      if (this.#estadoError) this.#estadoError.classList.remove('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const perfilUI = new PerfilUI();
    perfilUI.init();
  });
})();
