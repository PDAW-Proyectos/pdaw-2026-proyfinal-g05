'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const modalBuscadorElement = document.getElementById('modal-buscador');
    const modalResenaElement = document.getElementById('modal-resena');
    const inputBuscar = document.getElementById('input-buscar-pelicula');
    const spinner = document.getElementById('spinner-busqueda');
    const contenedorResultados = document.getElementById('contenedor-resultados');
    const listaResultados = document.getElementById('lista-resultados');
    const mensajeSinResultados = document.getElementById('mensaje-sin-resultados');
    const templateItem = document.getElementById('template-item-pelicula');

    const btnBackResena = document.getElementById('btn-back-resena');
    const modalResenaPoster = document.getElementById('modal-resena-poster');
    const modalResenaTitulo = document.getElementById('modal-resena-titulo');
    const modalResenaAnio = document.getElementById('modal-resena-anio');
    const labelWatchedDate = document.getElementById('label-watched-date');
    const labelRatingResena = document.getElementById('label-rating-resena');
    const contenedorEstrellas = document.getElementById('contenedor-estrellas');
    const btnLikeResena = document.getElementById('btn-like-resena');
    const modalResenaTexto = document.getElementById('modal-resena-texto');
    const checkContieneSpoilers = document.getElementById('check-contiene-spoilers');

    if (!inputBuscar || !listaResultados || !templateItem) {
      return;
    }

    let bsModalBuscador = null;
    let bsModalResena = null;

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      if (modalBuscadorElement) {
        bsModalBuscador = bootstrap.Modal.getOrCreateInstance(modalBuscadorElement);
      }
      if (modalResenaElement) {
        bsModalResena = bootstrap.Modal.getOrCreateInstance(modalResenaElement);
      }
    }

    const cacheBusquedas = new Map();
    let activeAbortController = null;

    function debounce(callback, delay = 400) {
      let timeoutId = null;
      return (...args) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          callback(...args);
        }, delay);
      };
    }

    function mostrarSpinner(visible) {
      if (!spinner) return;
      if (visible) {
        spinner.classList.remove('d-none');
      } else {
        spinner.classList.add('d-none');
      }
    }

    function limpiarResultados() {
      if (listaResultados) {
        while (listaResultados.firstChild) {
          listaResultados.removeChild(listaResultados.firstChild);
        }
      }
      if (contenedorResultados) {
        contenedorResultados.classList.add('d-none');
      }
      if (mensajeSinResultados) {
        mensajeSinResultados.classList.add('d-none');
      }
    }

    function renderizarResultados(peliculas) {
      while (listaResultados.firstChild) {
        listaResultados.removeChild(listaResultados.firstChild);
      }

      if (!Array.isArray(peliculas) || peliculas.length === 0) {
        if (contenedorResultados) contenedorResultados.classList.add('d-none');
        if (mensajeSinResultados) mensajeSinResultados.classList.remove('d-none');
        return;
      }

      if (mensajeSinResultados) mensajeSinResultados.classList.add('d-none');
      if (contenedorResultados) contenedorResultados.classList.remove('d-none');

      const fragment = document.createDocumentFragment();

      peliculas.forEach((pelicula) => {
        const clon = templateItem.content.cloneNode(true);
        const item = clon.querySelector('.item-pelicula');
        const img = clon.querySelector('.item-poster');
        const titulo = clon.querySelector('.item-titulo');
        const anio = clon.querySelector('.item-anio');
        const sinopsis = clon.querySelector('.item-sinopsis');
        const calificacion = clon.querySelector('.item-calificacion');

        if (item) {
          item.dataset.id = String(pelicula.id);
          item.dataset.titulo = pelicula.titulo || '';
          item.dataset.anio = pelicula.fechaEstreno ? String(pelicula.fechaEstreno).slice(0, 4) : '';
          item.dataset.poster = pelicula.posterPath ? `https://image.tmdb.org/t/p/w500${pelicula.posterPath}` : '/img/logoMovieClub.png';
          item.dataset.fecha = pelicula.fechaEstreno || '';
        }

        if (titulo) {
          titulo.textContent = pelicula.titulo || 'Sin título';
        }

        if (anio) {
          const anioTexto = pelicula.fechaEstreno ? String(pelicula.fechaEstreno).slice(0, 4) : '';
          anio.textContent = anioTexto ? `(${anioTexto})` : '';
        }

        if (sinopsis) {
          sinopsis.textContent = pelicula.sinopsis || 'Sin sinopsis disponible';
        }

        if (calificacion) {
          calificacion.textContent = pelicula.calificacion ? `★ ${Number(pelicula.calificacion).toFixed(1)}` : '★ —';
        }

        if (img) {
          img.alt = pelicula.titulo || 'Póster';
          if (pelicula.posterPath) {
            img.src = `https://image.tmdb.org/t/p/w92${pelicula.posterPath}`;
          } else {
            img.src = '/img/logoMovieClub.png';
          }
        }

        fragment.appendChild(clon);
      });

      listaResultados.appendChild(fragment);
    }

    const ejecutarBusqueda = debounce(async (termino) => {
      const terminoLimpio = String(termino || '').trim().toLowerCase();
      if (!terminoLimpio || terminoLimpio.length < 2) {
        limpiarResultados();
        return;
      }

      if (cacheBusquedas.has(terminoLimpio)) {
        renderizarResultados(cacheBusquedas.get(terminoLimpio));
        return;
      }

      if (activeAbortController) {
        activeAbortController.abort();
      }
      activeAbortController = new AbortController();

      mostrarSpinner(true);

      try {
        let peliculas = [];
        if (typeof API !== 'undefined' && typeof API.buscarPeliculas === 'function') {
          peliculas = await API.buscarPeliculas(terminoLimpio, { signal: activeAbortController.signal });
        } else {
          const res = await fetch(`/api/peliculas/buscar?q=${encodeURIComponent(terminoLimpio)}`, {
            signal: activeAbortController.signal
          });
          if (res.ok) {
            peliculas = await res.json();
          }
        }

        cacheBusquedas.set(terminoLimpio, peliculas);
        if (cacheBusquedas.size > 50) {
          const primeraClave = cacheBusquedas.keys().next().value;
          cacheBusquedas.delete(primeraClave);
        }

        renderizarResultados(peliculas);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        limpiarResultados();
        if (mensajeSinResultados) {
          mensajeSinResultados.textContent = 'Error al buscar películas. Intentá nuevamente.';
          mensajeSinResultados.classList.remove('d-none');
        }
      } finally {
        mostrarSpinner(false);
      }
    }, 400);

    inputBuscar.addEventListener('input', (e) => {
      ejecutarBusqueda(e.target.value);
    });

    let ratingActual = 0;

    function formatearFechaHoy() {
      const hoy = new Date();
      const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    }

    function resetearFormularioResena() {
      ratingActual = 0;
      if (modalResenaTexto) modalResenaTexto.value = '';
      if (checkContieneSpoilers) checkContieneSpoilers.checked = false;
      if (labelRatingResena) labelRatingResena.textContent = '0 de 5';
      if (contenedorEstrellas) {
        contenedorEstrellas.querySelectorAll('.estrella-rating').forEach((star) => {
          star.classList.remove('activa', 'bi-star-fill');
          star.classList.add('bi-star');
        });
      }
      if (btnLikeResena) {
        btnLikeResena.classList.remove('activo');
      }
    }

    function abrirModalResena({ id, titulo, anio, poster }) {
      if (modalResenaTitulo) {
        modalResenaTitulo.textContent = titulo || 'Sin título';
      }
      if (modalResenaAnio) {
        modalResenaAnio.textContent = anio || '';
      }
      if (modalResenaPoster) {
        modalResenaPoster.src = poster || '/img/logoMovieClub.png';
        modalResenaPoster.alt = titulo || 'Póster';
      }
      if (labelWatchedDate) {
        labelWatchedDate.textContent = formatearFechaHoy();
      }

      resetearFormularioResena();

      if (modalResenaElement) {
        modalResenaElement.dataset.peliculaId = id || '';
      }

      if (bsModalBuscador) {
        bsModalBuscador.hide();
      }
      if (bsModalResena) {
        setTimeout(() => {
          bsModalResena.show();
        }, 150);
      }
    }

    function volverAlBuscador() {
      if (bsModalResena) {
        bsModalResena.hide();
      }
      if (bsModalBuscador) {
        setTimeout(() => {
          bsModalBuscador.show();
        }, 150);
      }
    }

    if (btnBackResena) {
      btnBackResena.addEventListener('click', () => {
        volverAlBuscador();
      });
    }

    if (contenedorEstrellas) {
      contenedorEstrellas.addEventListener('click', (e) => {
        const star = e.target.closest('.estrella-rating');
        if (!star) return;
        const valor = parseInt(star.dataset.valor, 10) || 0;
        ratingActual = valor;
        if (labelRatingResena) {
          labelRatingResena.textContent = `${valor} de 5`;
        }
        contenedorEstrellas.querySelectorAll('.estrella-rating').forEach((s) => {
          const val = parseInt(s.dataset.valor, 10) || 0;
          if (val <= valor) {
            s.classList.add('activa', 'bi-star-fill');
            s.classList.remove('bi-star');
          } else {
            s.classList.remove('activa', 'bi-star-fill');
            s.classList.add('bi-star');
          }
        });
      });
    }

    if (btnLikeResena) {
      btnLikeResena.addEventListener('click', () => {
        btnLikeResena.classList.toggle('activo');
      });
    }

    listaResultados.addEventListener('click', (e) => {
      const item = e.target.closest('.item-pelicula');
      if (!item) return;

      const peliculaId = item.dataset.id;
      const peliculaTitulo = item.dataset.titulo;
      const peliculaAnio = item.dataset.anio;
      const peliculaPoster = item.dataset.poster;

      abrirModalResena({
        id: peliculaId,
        titulo: peliculaTitulo,
        anio: peliculaAnio,
        poster: peliculaPoster
      });
    });

    if (modalBuscadorElement) {
      modalBuscadorElement.addEventListener('shown.bs.modal', () => {
        inputBuscar.focus();
      });

      modalBuscadorElement.addEventListener('hidden.bs.modal', () => {
        if (!modalResenaElement || !modalResenaElement.classList.contains('show')) {
          inputBuscar.value = '';
          limpiarResultados();
          if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
          }
        }
      });
    }
  });
})();

