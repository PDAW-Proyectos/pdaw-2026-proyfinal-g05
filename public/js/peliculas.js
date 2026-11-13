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
    #filtroPeriodo;
    #tituloSeccion;
    #peliculas = [];
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
      this.#filtroPeriodo = document.getElementById('filtro-periodo');
      this.#tituloSeccion = document.getElementById('titulo-seccion-peliculas');
    }

    async init() {
      if (!this.#contenedor || !this.#template) {
        return;
      }

      this.#configurarListeners();
      await this.#cargarPopularesAPI();
      this.#aplicarFiltros();
    }

    async #cargarPopularesAPI() {
      try {
        if (this.#estadoCargando) this.#estadoCargando.classList.remove('d-none');
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn('/api/peliculas/populares');

        if (!res.ok) {
          if (this.#estadoCargando) this.#estadoCargando.classList.add('d-none');
          return;
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.#peliculas = data.map((p) => normalizarPeliculaApi(p, 'semana'));
        }
      } catch {
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

      if (this.#filtroPeriodo) {
        this.#filtroPeriodo.addEventListener('change', () => {
          this.#actualizarTituloPeriodo();
          this.#aplicarFiltros();
        });
      }
    }

    async #manejarBusqueda() {
      const texto = (this.#inputBuscar?.value || '').trim();

      if (!texto) {
        this.#actualizarTituloPeriodo();
        this.#aplicarFiltros();
        return;
      }

      if (this.#tituloSeccion) {
        this.#tituloSeccion.textContent = `RESULTADOS PARA: "${texto.toUpperCase()}"`;
      }

      if (texto.length >= 2) {
        if (this.#abortController) {
          this.#abortController.abort();
        }
        this.#abortController = new AbortController();

        try {
          const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
          const res = await fetchFn(`/api/peliculas/buscar?q=${encodeURIComponent(texto)}`, {
            signal: this.#abortController.signal
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const resultados = data.map((p) => normalizarPeliculaApi(p, 'todos'));
              this.#renderizar(resultados);
              return;
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      this.#aplicarFiltros();
    }

    #actualizarTituloPeriodo() {
      if (!this.#tituloSeccion) return;
      const periodo = this.#filtroPeriodo?.value || 'semana';
      switch (periodo) {
        case 'semana':
          this.#tituloSeccion.textContent = 'PELÍCULAS POPULARES ESTA SEMANA';
          break;
        case 'mes':
          this.#tituloSeccion.textContent = 'PELÍCULAS POPULARES ESTE MES';
          break;
        case 'anio':
          this.#tituloSeccion.textContent = 'PELÍCULAS POPULARES ESTE AÑO';
          break;
        case 'historico':
          this.#tituloSeccion.textContent = 'CLÁSICOS DEL CLUB';
          break;
        case 'todos':
        default:
          this.#tituloSeccion.textContent = 'CATÁLOGO DE PELÍCULAS';
          break;
      }
    }

    #aplicarFiltros() {
      const texto = (this.#inputBuscar?.value || '').trim().toLowerCase();
      const genero = this.#filtroGenero?.value || 'todos';
      const anio = this.#filtroAnio?.value || 'todos';
      const periodo = this.#filtroPeriodo?.value || 'todos';

      const filtradas = this.#peliculas.filter((p) => {
        if (texto && !p.titulo.toLowerCase().includes(texto)) {
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

        if (periodo !== 'todos' && !texto) {
          if (periodo === 'historico') {
            if (p.anio >= 2020) return false;
          } else if (periodo === 'anio') {
            if (p.anio < new Date().getFullYear()) return false;
          }
        }

        return true;
      });

      this.#renderizar(filtradas);
    }

    #renderizar(lista) {
      this.#contenedor.textContent = '';

      if (this.#contador) {
        this.#contador.textContent = `${lista.length} ${lista.length === 1 ? 'película' : 'películas'}`;
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
