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
    #peliculas = [];
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
    }

    async init() {
      if (!this.#contenedor || !this.#template) {
        return;
      }

      this.#configurarListeners();
      await this.#cargarPaginaAPI(1);
    }

    async #cargarPaginaAPI(pagina = 1) {
      const texto = (this.#inputBuscar?.value || '').trim();
      const esBusqueda = texto.length >= 2;

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
        const url = esBusqueda
          ? `/api/peliculas/buscar?q=${encodeURIComponent(texto)}&page=${pagina}`
          : `/api/peliculas/populares?page=${pagina}`;

        const res = await fetchFn(url, {
          signal: this.#abortController.signal
        });

        if (!res.ok) {
          this.#peliculas = [];
          this.#tieneMasPaginas = false;
          this.#aplicarFiltros();
          return;
        }

        const data = await res.json();
        const headerTotalPages = typeof res.headers?.get === 'function'
          ? Number(res.headers.get('X-Total-Pages'))
          : NaN;

        if (Array.isArray(data)) {
          if (data.length === 0 && pagina > 1) {
            this.#tieneMasPaginas = false;
            this.#totalPaginas = pagina - 1;
            this.#actualizarPaginacionUI();
            return;
          }

          this.#paginaActual = pagina;
          if (!Number.isNaN(headerTotalPages) && headerTotalPages > 0) {
            this.#totalPaginas = headerTotalPages;
            this.#tieneMasPaginas = pagina < headerTotalPages && data.length > 0;
          } else {
            this.#totalPaginas = data.length < 20 ? pagina : pagina + 1;
            this.#tieneMasPaginas = data.length >= 20;
          }
          this.#peliculas = data.map((p) => normalizarPeliculaApi(p, esBusqueda ? 'todos' : 'semana'));
        } else {
          this.#peliculas = [];
          this.#tieneMasPaginas = false;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        this.#peliculas = [];
        this.#tieneMasPaginas = false;
      } finally {
        if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
      }

      this.#aplicarFiltros();
    }

    #configurarListeners() {
      if (this.#inputBuscar) {
        this.#inputBuscar.addEventListener('input', () => {
          clearTimeout(this.#debounceTimer);
          this.#debounceTimer = setTimeout(() => {
            this.#manejarBusqueda();
          }, 300);
        });
      }

      if (this.#filtroGenero) {
        this.#filtroGenero.addEventListener('change', () => {
          this.#aplicarFiltros();
        });
      }

      if (this.#filtroAnio) {
        this.#filtroAnio.addEventListener('change', () => {
          this.#aplicarFiltros();
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
        await this.#cargarPaginaAPI(1);
        return;
      }

      if (this.#tituloSeccion) {
        this.#tituloSeccion.textContent = 'Esto es lo que el club encontró para vos:';
      }

      if (texto.length >= 2) {
        await this.#cargarPaginaAPI(1);
        return;
      }

      this.#aplicarFiltros();
    }

    #actualizarTituloDefault() {
      if (!this.#tituloSeccion) return;
      this.#tituloSeccion.textContent = 'POPULARES';
    }

    #aplicarFiltros() {
      const texto = (this.#inputBuscar?.value || '').trim().toLowerCase();
      const genero = this.#filtroGenero?.value || 'todos';
      const anio = this.#filtroAnio?.value || 'todos';

      const filtradas = this.#peliculas.filter((p) => {
        if (texto && texto.length < 2 && !p.titulo.toLowerCase().includes(texto)) {
          return false;
        }

        if (genero !== 'todos') {
          const tieneGenero = p.generos.some((g) => g.toLowerCase() === genero.toLowerCase());
          if (!tieneGenero) return false;
        }

        if (anio !== 'todos') {
          if (anio === 'clasicos') {
            if (p.anio >= 2020) return false;
          } else if (Number(anio) !== p.anio) {
            return false;
          }
        }

        return true;
      });

      this.#renderizar(filtradas);
      this.#actualizarPaginacionUI();
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

      lista.forEach((pelicula) => {
        const clone = this.#template.content.cloneNode(true);

        const link = clone.querySelector('.pelicula-card-link');
        const poster = clone.querySelector('.pelicula-card-poster');
        const titulo = clone.querySelector('.pelicula-card-titulo');
        const anio = clone.querySelector('.pelicula-card-anio');
        const estrellas = clone.querySelector('.pelicula-card-estrellas');
        const ratingNum = clone.querySelector('.pelicula-card-rating-num');

        const urlDetalle = `/detallePelicula.html?id=${encodeURIComponent(pelicula.id)}`;

        if (link) {
          link.setAttribute('href', urlDetalle);
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
