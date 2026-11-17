'use strict';

(() => {
  function renderizarEstrellas(puntuacion) {
    const num = Number(puntuacion) || 0;
    const enteras = Math.floor(num);
    const media = (num % 1) >= 0.5;
    let resultado = '★'.repeat(enteras);
    if (media) resultado += '½';
    return resultado || '★';
  }

  function normalizarPeliculaApi(p, periodoDefault = 'todos') {
    const anioNum = p.fechaEstreno ? Number(p.fechaEstreno.slice(0, 4)) : 2024;
    const punt = p.calificacion ? Number((p.calificacion / 2).toFixed(1)) : 4.0;
    const posterUrl = p.posterPath
      ? (p.posterPath.startsWith('http') ? p.posterPath : `https://image.tmdb.org/t/p/w500${p.posterPath}`)
      : '/img/logoMovieClub.png';

    return {
      id: String(p.id),
      titulo: p.titulo || 'Película',
      anio: anioNum,
      generos: Array.isArray(p.generos) && p.generos.length ? p.generos : ['Cine'],
      puntuacion: punt,
      poster: posterUrl,
      periodo: periodoDefault
    };
  }

  class CatalogoPeliculasUI {
    #contenedor;
    #contador;
    #estadoVacio;
    #estadoCargando;
    #template;
    #inputBuscar;
    #filtroGenero;
    #filtroAnio;
    #tituloSeccion;
    #paginacionContenedor;
    #btnPaginaAnterior;
    #btnPaginaSiguiente;
    #indicadorPagina;
    #indicadorPaginaHeader;
    #modalRemoverElem;
    #modalRemoverInstance;
    #modalRemoverTitulo;
    #modalRemoverMensaje;
    #btnConfirmarRemover;
    #accionRemoverPendiente = null;
    #peliculas = [];
    #peliculasPool = [];
    #proximaPaginaAPI = 1;
    #apiFinResultados = false;
    #criterioActual = '';
    #idsVistos = new Set();
    #paginaActual = 1;
    #totalPaginas = 1;
    #tieneMasPaginas = true;
    #ultimoTextoBuscado = '';
    #debounceTimer = null;
    #abortController = null;

    constructor() {
      this.#contenedor = document.getElementById('grid-peliculas');
      this.#contador = document.getElementById('contador-peliculas');
      this.#estadoVacio = document.getElementById('estado-vacio-peliculas');
      this.#estadoCargando = document.getElementById('estado-cargando-peliculas');
      this.#template = document.getElementById('template-pelicula-card');
      this.#inputBuscar = document.getElementById('input-buscar-catalogo');
      this.#filtroGenero = document.getElementById('filtro-genero');
      this.#filtroAnio = document.getElementById('filtro-anio');
      this.#tituloSeccion = document.getElementById('titulo-seccion-peliculas');
      this.#paginacionContenedor = document.getElementById('paginacion-peliculas');
      this.#btnPaginaAnterior = document.getElementById('btn-pagina-anterior');
      this.#btnPaginaSiguiente = document.getElementById('btn-pagina-siguiente');
      this.#indicadorPagina = document.getElementById('indicador-pagina-actual');
      this.#indicadorPaginaHeader = document.getElementById('indicador-pagina-header');
      this.#modalRemoverElem = document.getElementById('modal-confirmar-remover-lista');
      this.#modalRemoverTitulo = document.getElementById('modalConfirmarRemoverTitulo');
      this.#modalRemoverMensaje = document.getElementById('modal-confirmar-remover-mensaje');
      this.#btnConfirmarRemover = document.getElementById('btn-confirmar-remover-lista');
    }

    async init() {
      if (!this.#contenedor || !this.#template) {
        return;
      }

      this.#configurarListeners();
      await this.#cargarPaginaAPI(1);
    }

    async #cargarPaginaAPI(pagina = 1, forzarReset = false) {
      const texto = (this.#inputBuscar?.value || '').trim();
      const genero = this.#filtroGenero?.value || 'todos';
      const anio = this.#filtroAnio?.value || 'todos';
      const esBusqueda = texto.length >= 2;

      const nuevoCriterio = `${esBusqueda ? texto.toLowerCase() : ''}|${genero}|${anio}`;

      if (forzarReset || nuevoCriterio !== this.#criterioActual) {
        this.#criterioActual = nuevoCriterio;
        this.#peliculasPool = [];
        this.#proximaPaginaAPI = 1;
        this.#apiFinResultados = false;
        this.#idsVistos = new Set();
      }

      this.#paginaActual = pagina;
      const PELIS_POR_PAGINA = 20;
      const indiceInicio = (pagina - 1) * PELIS_POR_PAGINA;
      const indiceFin = indiceInicio + PELIS_POR_PAGINA;

      if (this.#abortController) {
        this.#abortController.abort();
      }
      this.#abortController = new AbortController();

      try {
        if (this.#estadoCargando) this.#estadoCargando.classList.remove('d-none');
        if (this.#estadoVacio) this.#estadoVacio.classList.add('d-none');
        if (this.#paginacionContenedor) this.#paginacionContenedor.classList.add('d-none');
        this.#contenedor.textContent = '';

        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        let intentos = 0;
        const maxIntentos = 15;

        while (this.#peliculasPool.length < indiceFin && !this.#apiFinResultados && intentos < maxIntentos) {
          intentos++;
          const params = new URLSearchParams();
          params.set('page', String(this.#proximaPaginaAPI));
          if (anio !== 'todos') params.set('anio', anio);
          if (genero !== 'todos') params.set('genero', genero);

          let url;
          if (esBusqueda) {
            params.set('q', texto);
            url = `/api/peliculas/buscar?${params.toString()}`;
          } else {
            url = `/api/peliculas/populares?${params.toString()}`;
          }

          const res = await fetchFn(url, {
            signal: this.#abortController.signal
          });

          if (!res.ok) {
            this.#apiFinResultados = true;
            break;
          }

          const data = await res.json();
          const headerTotalPages = typeof res.headers?.get === 'function'
            ? Number(res.headers.get('X-Total-Pages'))
            : NaN;

          if (!Array.isArray(data) || data.length === 0) {
            this.#apiFinResultados = true;
            break;
          }

          const normalizadas = data.map((p) => normalizarPeliculaApi(p, esBusqueda ? 'todos' : 'semana'));

          for (const p of normalizadas) {
            const idStr = String(p.id);
            if (this.#idsVistos.has(idStr)) {
              continue;
            }

            if (texto && texto.length < 2 && !p.titulo.toLowerCase().includes(texto.toLowerCase())) {
              continue;
            }

            if (genero !== 'todos') {
              const tieneGenero = Array.isArray(p.generos) && p.generos.some((g) => g.toLowerCase() === genero.toLowerCase());
              if (!tieneGenero) continue;
            }

            if (anio !== 'todos') {
              if (anio === 'clasicos') {
                if (p.anio >= 2020) continue;
              } else if (Number(anio) !== p.anio) {
                continue;
              }
            }

            this.#idsVistos.add(idStr);
            this.#peliculasPool.push(p);
          }

          if (!Number.isNaN(headerTotalPages) && headerTotalPages > 0 && this.#proximaPaginaAPI >= headerTotalPages) {
            this.#apiFinResultados = true;
          } else if (data.length < 20) {
            this.#apiFinResultados = true;
          }

          this.#proximaPaginaAPI++;
        }

        const peliculasParaMostrar = this.#peliculasPool.slice(indiceInicio, indiceFin);
        this.#peliculas = peliculasParaMostrar;

        this.#tieneMasPaginas = this.#peliculasPool.length > indiceFin || (!this.#apiFinResultados && intentos < maxIntentos);
        this.#totalPaginas = Math.max(1, Math.ceil(this.#peliculasPool.length / PELIS_POR_PAGINA) + (this.#tieneMasPaginas ? 1 : 0));

        this.#renderizar(peliculasParaMostrar);
        this.#actualizarPaginacionUI();
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        this.#peliculas = [];
        this.#tieneMasPaginas = false;
        this.#renderizar([]);
        this.#actualizarPaginacionUI();
      } finally {
        if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
      }
    }

    #configurarListeners() {
      if (this.#inputBuscar) {
        this.#inputBuscar.addEventListener('input', () => {
          clearTimeout(this.#debounceTimer);
          this.#debounceTimer = setTimeout(() => {
            this.#manejarBusqueda();
          }, 400);
        });
      }

      if (this.#filtroGenero) {
        this.#filtroGenero.addEventListener('change', () => {
          this.#cargarPaginaAPI(1, true);
        });
      }

      if (this.#filtroAnio) {
        this.#filtroAnio.addEventListener('change', () => {
          this.#cargarPaginaAPI(1, true);
        });
      }

      if (this.#btnPaginaAnterior) {
        this.#btnPaginaAnterior.addEventListener('click', () => {
          if (this.#paginaActual > 1) {
            this.#cambiarPagina(this.#paginaActual - 1);
          }
        });
      }

      if (this.#btnPaginaSiguiente) {
        this.#btnPaginaSiguiente.addEventListener('click', () => {
          if (this.#tieneMasPaginas) {
            this.#cambiarPagina(this.#paginaActual + 1);
          }
        });
      }

      if (this.#contenedor) {
        this.#contenedor.addEventListener('click', (e) => {
          const btnFav = e.target.closest('.btn-card-favorita');
          if (btnFav) {
            e.preventDefault();
            e.stopPropagation();
            this.#manejarToggleFavorita(btnFav);
            return;
          }

          const btnWatch = e.target.closest('.btn-card-watchlist');
          if (btnWatch) {
            e.preventDefault();
            e.stopPropagation();
            this.#manejarToggleWatchlist(btnWatch);
          }
        });
      }

      if (this.#btnConfirmarRemover) {
        this.#btnConfirmarRemover.addEventListener('click', () => {
          this.#confirmarAccionRemover();
        });
      }
    }

    #abrirModalConfirmarRemover({ tipo, btn, peliculaId, titulo }) {
      this.#accionRemoverPendiente = { tipo, btn, peliculaId };

      if (this.#modalRemoverTitulo) {
        this.#modalRemoverTitulo.textContent =
          tipo === 'favorita' ? 'Quitar de Favoritas' : 'Quitar de Watchlist';
      }

      if (this.#modalRemoverMensaje) {
        const nombreLista = tipo === 'favorita' ? 'tus favoritas' : 'tu watchlist';
        this.#modalRemoverMensaje.textContent = titulo
          ? `¿Confirmás que querés quitar "${titulo}" de ${nombreLista}?`
          : `¿Confirmás que querés quitar esta película de ${nombreLista}?`;
      }

      if (this.#btnConfirmarRemover) {
        this.#btnConfirmarRemover.disabled = false;
        this.#btnConfirmarRemover.textContent = 'Quitar';
      }

      if (typeof bootstrap !== 'undefined' && bootstrap.Modal && this.#modalRemoverElem) {
        if (!this.#modalRemoverInstance) {
          this.#modalRemoverInstance = bootstrap.Modal.getOrCreateInstance(this.#modalRemoverElem);
        }
        this.#modalRemoverInstance.show();
      }
    }

    async #confirmarAccionRemover() {
      const pendiente = this.#accionRemoverPendiente;
      if (!pendiente) return;

      if (this.#btnConfirmarRemover) {
        this.#btnConfirmarRemover.disabled = true;
        this.#btnConfirmarRemover.textContent = 'Quitando...';
      }

      try {
        if (pendiente.tipo === 'favorita') {
          await this.#ejecutarCambioFavorita(pendiente.btn, pendiente.peliculaId, false);
        } else if (pendiente.tipo === 'watchlist') {
          await this.#ejecutarCambioWatchlist(pendiente.btn, pendiente.peliculaId, false);
        }

        if (this.#modalRemoverInstance) {
          this.#modalRemoverInstance.hide();
        }
      } finally {
        this.#accionRemoverPendiente = null;
        if (this.#btnConfirmarRemover) {
          this.#btnConfirmarRemover.disabled = false;
          this.#btnConfirmarRemover.textContent = 'Quitar';
        }
      }
    }

    #obtenerFavoritasUsuarioLocal() {
      try {
        const raw = localStorage.getItem('usuario');
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.favoritas)) {
          return new Set(parsed.favoritas.map((id) => String(id).trim()));
        }
      } catch {
      }
      return new Set();
    }

    #obtenerWatchlistUsuarioLocal() {
      try {
        const raw = localStorage.getItem('usuario');
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.watchlist)) {
          return new Set(parsed.watchlist.map((id) => String(id).trim()));
        }
      } catch {
      }
      return new Set();
    }

    #actualizarEstadoVisualBotonFav(btnFav, esFavorita) {
      if (!btnFav) return;
      btnFav.classList.toggle('activo', esFavorita);
      btnFav.setAttribute('aria-pressed', String(esFavorita));
      btnFav.setAttribute('title', esFavorita ? 'Quitar de favoritas' : 'Sumar a favoritas');
      const icono = btnFav.querySelector('.icono-card-fav');
      if (icono) {
        icono.className = esFavorita
          ? 'bi bi-heart-fill icono-card-fav'
          : 'bi bi-heart icono-card-fav';
      }
    }

    #actualizarEstadoVisualBotonWatchlist(btnWatch, enWatchlist) {
      if (!btnWatch) return;
      btnWatch.classList.toggle('activo', enWatchlist);
      btnWatch.setAttribute('aria-pressed', String(enWatchlist));
      btnWatch.setAttribute('title', enWatchlist ? 'Quitar de watchlist' : 'Añadir a watchlist');
      const icono = btnWatch.querySelector('.icono-card-watchlist');
      if (icono) {
        icono.className = enWatchlist
          ? 'bi bi-bookmark-check-fill icono-card-watchlist'
          : 'bi bi-bookmark-plus icono-card-watchlist';
      }
    }

    async #manejarToggleFavorita(btnFav) {
      const peliculaId = btnFav.dataset.peliculaId;
      if (!peliculaId) return;

      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) {
        window.location.href = '/login.html';
        return;
      }

      const eraFavorita = btnFav.classList.contains('activo');
      if (eraFavorita) {
        this.#abrirModalConfirmarRemover({
          tipo: 'favorita',
          btn: btnFav,
          peliculaId,
          titulo: btnFav.dataset.titulo || ''
        });
        return;
      }

      await this.#ejecutarCambioFavorita(btnFav, peliculaId, true);
    }

    async #ejecutarCambioFavorita(btnFav, peliculaId, nuevoEstado) {
      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) {
        window.location.href = '/login.html';
        return;
      }

      const estadoPrevio = !nuevoEstado;
      this.#actualizarEstadoVisualBotonFav(btnFav, nuevoEstado);

      try {
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn(`/api/usuarios/favoritas/${encodeURIComponent(peliculaId)}`, {
          method: 'POST',
          credentials: 'same-origin'
        });

        if (res.status === 401) {
          this.#actualizarEstadoVisualBotonFav(btnFav, estadoPrevio);
          window.location.href = '/login.html';
          return;
        }

        if (!res.ok) {
          this.#actualizarEstadoVisualBotonFav(btnFav, estadoPrevio);
          return;
        }

        const usuarioActualizado = await res.json();
        const favsServer = Array.isArray(usuarioActualizado.favoritas)
          ? usuarioActualizado.favoritas.map(String)
          : [];
        const quedoFavorita = favsServer.includes(String(peliculaId));
        this.#actualizarEstadoVisualBotonFav(btnFav, quedoFavorita);

        try {
          const parsed = JSON.parse(rawUser);
          if (parsed && typeof parsed === 'object') {
            parsed.favoritas = favsServer;
            localStorage.setItem('usuario', JSON.stringify(parsed));
          }
        } catch {
        }
      } catch {
        this.#actualizarEstadoVisualBotonFav(btnFav, estadoPrevio);
      }
    }

    async #manejarToggleWatchlist(btnWatch) {
      const peliculaId = btnWatch.dataset.peliculaId;
      if (!peliculaId) return;

      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) {
        window.location.href = '/login.html';
        return;
      }

      const estabaEnWatchlist = btnWatch.classList.contains('activo');
      if (estabaEnWatchlist) {
        this.#abrirModalConfirmarRemover({
          tipo: 'watchlist',
          btn: btnWatch,
          peliculaId,
          titulo: btnWatch.dataset.titulo || ''
        });
        return;
      }

      await this.#ejecutarCambioWatchlist(btnWatch, peliculaId, true);
    }

    async #ejecutarCambioWatchlist(btnWatch, peliculaId, nuevoEstado) {
      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) {
        window.location.href = '/login.html';
        return;
      }

      let userId = null;
      try {
        const parsed = JSON.parse(rawUser);
        userId = parsed?.id ? String(parsed.id).trim() : null;
      } catch {
      }

      if (!userId) {
        userId = localStorage.getItem('userId');
      }

      if (!userId) {
        window.location.href = '/login.html';
        return;
      }

      const estadoPrevio = !nuevoEstado;
      this.#actualizarEstadoVisualBotonWatchlist(btnWatch, nuevoEstado);

      try {
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn(`/api/usuarios/${encodeURIComponent(userId)}/watchlist`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            peliculaId: String(peliculaId),
            accion: nuevoEstado ? 'agregar' : 'quitar'
          }),
          credentials: 'same-origin'
        });

        if (res.status === 401) {
          this.#actualizarEstadoVisualBotonWatchlist(btnWatch, estadoPrevio);
          window.location.href = '/login.html';
          return;
        }

        if (!res.ok) {
          this.#actualizarEstadoVisualBotonWatchlist(btnWatch, estadoPrevio);
          return;
        }

        const usuarioActualizado = await res.json();
        const watchlistServer = Array.isArray(usuarioActualizado.watchlist)
          ? usuarioActualizado.watchlist.map(String)
          : [];
        const quedoEnWatchlist = watchlistServer.includes(String(peliculaId));
        this.#actualizarEstadoVisualBotonWatchlist(btnWatch, quedoEnWatchlist);

        try {
          const parsed = JSON.parse(rawUser);
          if (parsed && typeof parsed === 'object') {
            parsed.watchlist = watchlistServer;
            localStorage.setItem('usuario', JSON.stringify(parsed));
          }
        } catch {
        }
      } catch {
        this.#actualizarEstadoVisualBotonWatchlist(btnWatch, estadoPrevio);
      }
    }

    async #cambiarPagina(nuevaPagina) {
      await this.#cargarPaginaAPI(nuevaPagina);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async #manejarBusqueda() {
      const texto = (this.#inputBuscar?.value || '').trim();

      if (texto === this.#ultimoTextoBuscado) {
        return;
      }
      this.#ultimoTextoBuscado = texto;

      if (!texto) {
        this.#actualizarTituloDefault();
        await this.#cargarPaginaAPI(1, true);
        return;
      }

      if (this.#tituloSeccion) {
        this.#tituloSeccion.textContent = 'Esto es lo que el club encontró para vos:';
      }

      await this.#cargarPaginaAPI(1, true);
    }

    #actualizarTituloDefault() {
      if (!this.#tituloSeccion) return;
      this.#tituloSeccion.textContent = 'POPULARES';
    }

    #aplicarFiltros() {
      this.#cargarPaginaAPI(1, true);
    }

    #actualizarPaginacionUI() {
      if (this.#indicadorPaginaHeader) {
        this.#indicadorPaginaHeader.textContent = `Página ${this.#paginaActual}`;
      }

      if (!this.#paginacionContenedor) return;

      const mostrarPaginacion = this.#peliculas.length > 0 || this.#paginaActual > 1;
      if (!mostrarPaginacion) {
        this.#paginacionContenedor.classList.add('d-none');
        return;
      }

      this.#paginacionContenedor.classList.remove('d-none');

      if (this.#indicadorPagina) {
        this.#indicadorPagina.textContent = String(this.#paginaActual);
      }

      if (this.#btnPaginaAnterior) {
        this.#btnPaginaAnterior.disabled = this.#paginaActual <= 1;
      }

      if (this.#btnPaginaSiguiente) {
        this.#btnPaginaSiguiente.disabled = !this.#tieneMasPaginas;
      }
    }

    #renderizar(lista) {
      this.#contenedor.textContent = '';

      if (this.#contador) {
        this.#contador.textContent = `Mostrando ${lista.length} ${lista.length === 1 ? 'película' : 'películas'}`;
      }

      if (lista.length === 0) {
        if (this.#estadoVacio) this.#estadoVacio.classList.remove('d-none');
        return;
      }

      if (this.#estadoVacio) this.#estadoVacio.classList.add('d-none');

      const fragmento = document.createDocumentFragment();
      const favoritasSet = this.#obtenerFavoritasUsuarioLocal();
      const watchlistSet = this.#obtenerWatchlistUsuarioLocal();

      lista.forEach((pelicula) => {
        const clone = this.#template.content.cloneNode(true);

        const link = clone.querySelector('.pelicula-card-link');
        const poster = clone.querySelector('.pelicula-card-poster');
        const titulo = clone.querySelector('.pelicula-card-titulo');
        const anio = clone.querySelector('.pelicula-card-anio');
        const estrellas = clone.querySelector('.pelicula-card-estrellas');
        const ratingNum = clone.querySelector('.pelicula-card-rating-num');
        const btnFav = clone.querySelector('.btn-card-favorita');
        const btnWatch = clone.querySelector('.btn-card-watchlist');

        const urlDetalle = `/detallePelicula.html?id=${encodeURIComponent(pelicula.id)}`;

        if (link) {
          link.setAttribute('href', urlDetalle);
        }

        if (btnFav) {
          btnFav.dataset.peliculaId = pelicula.id;
          btnFav.dataset.titulo = pelicula.titulo;
          const esFav = favoritasSet.has(String(pelicula.id));
          this.#actualizarEstadoVisualBotonFav(btnFav, esFav);
        }

        if (btnWatch) {
          btnWatch.dataset.peliculaId = pelicula.id;
          btnWatch.dataset.titulo = pelicula.titulo;
          const enWatch = watchlistSet.has(String(pelicula.id));
          this.#actualizarEstadoVisualBotonWatchlist(btnWatch, enWatch);
        }

        if (poster) {
          poster.setAttribute('src', pelicula.poster);
          poster.setAttribute('alt', pelicula.titulo);
          poster.addEventListener('error', () => {
            poster.src = '/img/logoMovieClub.png';
          });
        }

        if (titulo) {
          titulo.textContent = pelicula.titulo;
        }

        if (anio) {
          anio.textContent = String(pelicula.anio);
        }

        if (estrellas) {
          estrellas.textContent = renderizarEstrellas(pelicula.puntuacion);
        }

        if (ratingNum) {
          ratingNum.textContent = Number(pelicula.puntuacion).toFixed(1);
        }

        fragmento.appendChild(clone);
      });

      this.#contenedor.appendChild(fragmento);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const catalogo = new CatalogoPeliculasUI();
    catalogo.init();
  });
})();
