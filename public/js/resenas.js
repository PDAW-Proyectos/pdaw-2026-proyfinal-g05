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

  function renderizarEstrellas(puntuacion) {
    const num = Number(puntuacion) || 0;
    const enteras = Math.floor(num);
    const media = (num % 1) >= 0.5;
    let resultado = '★'.repeat(enteras);
    if (media) resultado += '½';
    return resultado || '★';
  }

  class FeedResenasUI {
    #contenedor;
    #estadoCargando;
    #estadoError;
    #mensajeError;
    #estadoVacio;
    #paginacionContenedor;
    #template;
    #filtroBotones;
    #todasLasResenas = [];
    #filtroActual = 'todas';
    #paginaActual = 1;
    #porPagina = 6;
    #abortController = null;
    #deleteAbortController = null;
    #modalConfirmarEliminarElem;
    #modalConfirmarEliminarInstance;
    #btnConfirmarEliminar;
    #mensajeConfirmarEliminar;
    #resenaIdAEliminar = null;

    constructor() {
      this.#contenedor = document.getElementById('contenedor-resenas');
      this.#estadoCargando = document.getElementById('estado-cargando');
      this.#estadoError = document.getElementById('estado-error');
      this.#mensajeError = document.getElementById('mensaje-error');
      this.#estadoVacio = document.getElementById('estado-vacio');
      this.#paginacionContenedor = document.getElementById('paginacion-resenas');
      this.#template = document.getElementById('template-tarjeta-resena');
      this.#filtroBotones = document.querySelectorAll('.filter-chip-btn');
      this.#modalConfirmarEliminarElem = document.getElementById('modal-confirmar-eliminar');
      this.#btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
      this.#mensajeConfirmarEliminar = document.getElementById('modal-confirmar-eliminar-mensaje');
    }

    init() {
      if (!this.#contenedor || !this.#template) {
        return;
      }

      if (this.#btnConfirmarEliminar) {
        this.#btnConfirmarEliminar.addEventListener('click', () => {
          this.#ejecutarEliminacion();
        });
      }

      this.#configurarFiltros();
      this.#configurarDelegacionEventos();
      this.cargarResenas();
    }

    #configurarFiltros() {
      this.#filtroBotones.forEach((boton) => {
        boton.addEventListener('click', () => {
          const filtro = boton.dataset.filtro || 'todas';
          if (this.#filtroActual === filtro) return;

          this.#filtroBotones.forEach((b) => b.classList.remove('active'));
          boton.classList.add('active');

          this.#filtroActual = filtro;
          this.#paginaActual = 1;
          this.#aplicarFiltroYRenderizar();
        });
      });
    }

    #configurarDelegacionEventos() {
      this.#contenedor.addEventListener('click', (e) => {
        const btnEditar = e.target.closest('.btn-editar-resena');
        if (btnEditar) {
          const resenaId = btnEditar.dataset.resenaId;
          const resenaEncontrada = this.#todasLasResenas.find((r) => String(r.id) === String(resenaId));
          if (resenaEncontrada && typeof window.abrirModalEdicionResena === 'function') {
            window.abrirModalEdicionResena(resenaEncontrada, (resenaActualizada) => {
              const idx = this.#todasLasResenas.findIndex((r) => String(r.id) === String(resenaActualizada.id));
              if (idx !== -1) {
                this.#todasLasResenas[idx] = { ...this.#todasLasResenas[idx], ...resenaActualizada };
                this.#aplicarFiltroYRenderizar();
              }
            });
          }
          return;
        }

        const btnEliminar = e.target.closest('.btn-eliminar-resena');
        if (btnEliminar) {
          this.#abrirModalEliminar(btnEliminar);
          return;
        }

        const btnToggle = e.target.closest('.btn-toggle-spoiler');
        if (!btnToggle) return;

        const card = btnToggle.closest('.feed-resena-card');
        if (!card) return;

        const cuerpo = card.querySelector('.resena-texto-body');
        if (!cuerpo) return;

        const revelado = cuerpo.classList.toggle('revelado');
        btnToggle.textContent = revelado ? 'Ocultar spoilers.' : 'Mostrala sin filtros.';
      });

      if (this.#paginacionContenedor) {
        this.#paginacionContenedor.addEventListener('click', (e) => {
          const boton = e.target.closest('button[data-pagina]');
          if (!boton || boton.classList.contains('disabled')) return;

          const paginaDestino = Number(boton.dataset.pagina);
          if (paginaDestino && paginaDestino !== this.#paginaActual) {
            this.#paginaActual = paginaDestino;
            this.#aplicarFiltroYRenderizar();
            window.scrollTo({ top: this.#contenedor.offsetTop - 100, behavior: 'smooth' });
          }
        });
      }
    }

    #abrirModalEliminar(btnEliminar) {
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

    async #ejecutarEliminacion() {
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

        this.#todasLasResenas = this.#todasLasResenas.filter((r) => String(r.id) !== String(resenaId));
        this.#aplicarFiltroYRenderizar();
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

    async cargarResenas() {
      if (this.#abortController) {
        this.#abortController.abort();
      }
      this.#abortController = new AbortController();

      this.#mostrarCargando();

      try {
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn('/api/resenas?limite=50', {
          signal: this.#abortController.signal
        });

        if (!res.ok) {
          throw new Error('No se pudo obtener el feed de reseñas.');
        }

        const data = await res.json();
        this.#todasLasResenas = Array.isArray(data) ? data : [];
        this.#ocultarCargando();
        this.#aplicarFiltroYRenderizar();
      } catch (err) {
        if (err.name === 'AbortError') return;
        this.#mostrarError(err?.message || 'Error de conexión al cargar las reseñas.');
      }
    }

    #filtrarResenas() {
      switch (this.#filtroActual) {
        case 'destacadas':
          return this.#todasLasResenas.filter((r) => Boolean(r.esDestacada || r.destacada));
        case '5-estrellas':
          return this.#todasLasResenas.filter((r) => Number(r.puntuacion) === 5);
        case 'spoilers':
          return this.#todasLasResenas.filter((r) => Boolean(r.contieneSpoilers));
        case 'favoritas':
          return this.#todasLasResenas.filter((r) => Boolean(r.esFavorita));
        case 'todas':
        default:
          return this.#todasLasResenas;
      }
    }

    #aplicarFiltroYRenderizar() {
      const filtradas = this.#filtrarResenas();

      if (filtradas.length === 0) {
        this.#contenedor.textContent = '';
        if (this.#estadoVacio) this.#estadoVacio.classList.remove('d-none');
        if (this.#paginacionContenedor) this.#paginacionContenedor.textContent = '';
        return;
      }

      if (this.#estadoVacio) this.#estadoVacio.classList.add('d-none');

      const totalPaginas = Math.ceil(filtradas.length / this.#porPagina);
      if (this.#paginaActual > totalPaginas) {
        this.#paginaActual = totalPaginas;
      }
      if (this.#paginaActual < 1) {
        this.#paginaActual = 1;
      }

      const inicio = (this.#paginaActual - 1) * this.#porPagina;
      const paginaResenas = filtradas.slice(inicio, inicio + this.#porPagina);

      this.#renderizarTarjetas(paginaResenas);
      this.#renderizarPaginacion(totalPaginas);
    }

    #renderizarTarjetas(resenas) {
      this.#contenedor.textContent = '';
      const fragmento = document.createDocumentFragment();

      resenas.forEach((resena) => {
        const tarjeta = this.#crearTarjeta(resena);
        fragmento.appendChild(tarjeta);
      });

      this.#contenedor.appendChild(fragmento);
    }

    #crearTarjeta(resena) {
      const clone = this.#template.content.cloneNode(true);

      const autorNombre = clone.querySelector('.resena-autor-nombre');
      if (autorNombre) {
        autorNombre.textContent = resena.nombreAutor || 'Miembro de MovieClub';
      }

      const autorRol = clone.querySelector('.resena-autor-rol');
      if (autorRol) {
        autorRol.textContent = (resena.rolAutor || 'Espectador').toUpperCase();
      }

      const fechaElem = clone.querySelector('.resena-fecha');
      if (fechaElem) {
        const fechaTxt = resena.fechaVisionado
          ? `Visionado el ${formatearFecha(resena.fechaVisionado)}`
          : (resena.fechaCreacion ? formatearFecha(resena.fechaCreacion) : '');
        fechaElem.textContent = fechaTxt;
      }

      const contenedorDestacada = clone.querySelector('.resena-contenedor-destacada');
      if (contenedorDestacada) {
        const esDestacada = Boolean(resena.esDestacada || resena.destacada);
        if (!esDestacada) {
          contenedorDestacada.classList.add('d-none');
        }
      }

      const pelicula = resena.pelicula || {};
      const peliculaId = String(resena.peliculaId || pelicula.id || '');
      const tituloPeli = pelicula.titulo || `Película #${peliculaId}`;
      const anioPeli = pelicula.anio || '';
      const posterSrc = pelicula.poster || '/img/logoMovieClub.png';
      const urlDetallePeli = `/detallePelicula.html?id=${encodeURIComponent(peliculaId)}`;

      const posterLink = clone.querySelector('.resena-poster-link');
      if (posterLink) {
        posterLink.setAttribute('href', urlDetallePeli);
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
        tituloLink.setAttribute('href', urlDetallePeli);
        tituloLink.textContent = tituloPeli;
      }

      const anioElem = clone.querySelector('.resena-anio');
      if (anioElem) {
        anioElem.textContent = anioPeli;
      }

      const estrellasElem = clone.querySelector('.resena-estrellas');
      if (estrellasElem) {
        estrellasElem.textContent = renderizarEstrellas(resena.puntuacion);
      }

      const puntuacionNum = clone.querySelector('.resena-puntuacion-num');
      if (puntuacionNum) {
        puntuacionNum.textContent = Number(resena.puntuacion || 0).toFixed(1);
      }

      const iconoFavorita = clone.querySelector('.resena-icono-favorita');
      if (iconoFavorita) {
        if (resena.esFavorita) {
          iconoFavorita.classList.remove('d-none');
        } else {
          iconoFavorita.classList.add('d-none');
        }
      }

      const alertaSpoiler = clone.querySelector('.resena-alerta-spoiler');
      const cuerpoTexto = clone.querySelector('.resena-texto-body');

      if (resena.contieneSpoilers) {
        if (alertaSpoiler) alertaSpoiler.classList.remove('d-none');
        if (cuerpoTexto) cuerpoTexto.classList.add('spoiler-blureado');
      } else {
        if (alertaSpoiler) alertaSpoiler.classList.add('d-none');
        if (cuerpoTexto) cuerpoTexto.classList.remove('spoiler-blureado');
      }

      if (cuerpoTexto) {
        cuerpoTexto.textContent = resena.texto ? `“${resena.texto}”` : '';
      }

      const linkDetalle = clone.querySelector('.resena-link-detalle');
      if (linkDetalle) {
        const idResena = resena.id || '';
        linkDetalle.setAttribute('href', `/detalleResena.html?id=${encodeURIComponent(idResena)}`);
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

      const contenedorAccionesAutor = clone.querySelector('.resena-acciones-autor');
      if (contenedorAccionesAutor) {
        const usuarioActivo = (() => {
          try {
            let parsedUser = null;
            if (typeof window.API !== 'undefined' && typeof window.API.getUsuario === 'function') {
              parsedUser = window.API.getUsuario();
            }
            if (!parsedUser) {
              const rawUser = localStorage.getItem('usuario');
              if (rawUser) {
                parsedUser = JSON.parse(rawUser);
              }
            }
            let id = parsedUser?.id ? String(parsedUser.id) : null;
            if (!id && typeof window.API !== 'undefined' && typeof window.API.getUserId === 'function') {
              const apiId = window.API.getUserId();
              if (apiId) id = String(apiId);
            }
            if (!id) {
              const directId = localStorage.getItem('userId');
              if (directId) id = String(directId);
            }
            return {
              id,
              rol: parsedUser?.rol ? String(parsedUser.rol) : null
            };
          } catch {
            return { id: null, rol: null };
          }
        })();

        const esAutor = Boolean(
          usuarioActivo.id &&
          resena.autorId &&
          String(usuarioActivo.id) === String(resena.autorId)
        );
        const esModerador = Boolean(
          usuarioActivo.id &&
          String(usuarioActivo.rol || '').toLowerCase() === 'moderador'
        );

        if (esAutor || esModerador) {
          contenedorAccionesAutor.classList.remove('d-none');
          if (btnEditar) {
            btnEditar.classList.toggle('d-none', !esAutor);
          }
        } else {
          contenedorAccionesAutor.classList.add('d-none');
        }
      }

      return clone;
    }

    #renderizarPaginacion(totalPaginas) {
      if (!this.#paginacionContenedor) return;
      this.#paginacionContenedor.textContent = '';

      if (totalPaginas <= 1) {
        return;
      }

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
        btnPag.className = (p === this.#paginaActual)
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

      this.#paginacionContenedor.appendChild(fragmento);
    }

    #mostrarCargando() {
      if (this.#estadoCargando) this.#estadoCargando.classList.remove('d-none');
      if (this.#estadoError) this.#estadoError.classList.add('d-none');
      if (this.#estadoVacio) this.#estadoVacio.classList.add('d-none');
      if (this.#contenedor) this.#contenedor.textContent = '';
      if (this.#paginacionContenedor) this.#paginacionContenedor.textContent = '';
    }

    #ocultarCargando() {
      if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
    }

    #mostrarError(mensaje) {
      this.#ocultarCargando();
      if (this.#mensajeError) {
        this.#mensajeError.textContent = mensaje;
      }
      if (this.#estadoError) {
        this.#estadoError.classList.remove('d-none');
      }
      if (this.#contenedor) {
        this.#contenedor.textContent = '';
      }
      if (this.#paginacionContenedor) {
        this.#paginacionContenedor.textContent = '';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const feed = new FeedResenasUI();
    feed.init();
  });
})();

