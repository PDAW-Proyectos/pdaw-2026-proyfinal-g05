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

    const formResena = document.getElementById('form-resena');
    const alertaResena = document.getElementById('alerta-resena');
    const inputPeliculaId = document.getElementById('input-resena-pelicula-id');
    const inputPuntuacion = document.getElementById('input-resena-puntuacion');
    const inputFavorita = document.getElementById('input-resena-favorita');
    const btnBackResena = document.getElementById('btn-back-resena');
    const modalResenaPoster = document.getElementById('modal-resena-poster');
    const modalResenaTitulo = document.getElementById('modal-resena-titulo');
    const modalResenaAnio = document.getElementById('modal-resena-anio');
    const labelWatchedDate = document.getElementById('label-watched-date');
    const inputWatchedDate = document.getElementById('input-watched-date');
    const checkWatchedOn = document.getElementById('check-watched-on');
    const checkWatchedBefore = document.getElementById('check-watched-before');
    const labelWatchedBefore = document.getElementById('label-watched-before');
    const labelRatingResena = document.getElementById('label-rating-resena');
    const contenedorEstrellas = document.getElementById('contenedor-estrellas');
    const btnLikeResena = document.getElementById('btn-like-resena');
    const modalResenaTexto = document.getElementById('modal-resena-texto');
    const checkContieneSpoilers = document.getElementById('check-contiene-spoilers');
    const btnSaveResena = document.getElementById('btn-save-resena');

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
    let resenaAbortController = null;
    let cierreModalTimeoutId = null;

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

    function obtenerFechaHoyISO() {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }

    function ocultarFeedbackResena() {
      if (!alertaResena) return;
      alertaResena.classList.add('d-none');
      alertaResena.classList.remove('alerta-fightclub-error', 'alerta-fightclub-exito');
      alertaResena.textContent = '';
    }

    function mostrarFeedbackResena(tipo, mensaje) {
      if (!alertaResena) return;
      alertaResena.textContent = String(mensaje || '');
      alertaResena.classList.remove('d-none', 'alerta-fightclub-error', 'alerta-fightclub-exito');
      if (tipo === 'exito') {
        alertaResena.classList.add('alerta-fightclub-exito');
      } else {
        alertaResena.classList.add('alerta-fightclub-error');
      }
    }

    function calcularValorEstrella(starElement, clientX) {
      const rawValor = parseFloat(starElement.dataset.valor);
      const base = parseInt(starElement.dataset.estrella || starElement.dataset.valor, 10) || 1;
      const rect = typeof starElement.getBoundingClientRect === 'function'
        ? starElement.getBoundingClientRect()
        : null;

      if (rect && rect.width > 0 && typeof clientX === 'number' && clientX > 0) {
        const offsetX = clientX - rect.left;
        if (offsetX < rect.width / 2) {
          return base - 0.5;
        }
        return base;
      }

      return !Number.isNaN(rawValor) ? rawValor : base;
    }

    function renderizarEstrellas(valor) {
      if (!contenedorEstrellas) return;
      const numValor = Number(valor) || 0;
      contenedorEstrellas.querySelectorAll('.estrella-rating').forEach((star) => {
        const estrellaIdx = parseInt(star.dataset.estrella || star.dataset.valor, 10) || 0;
        star.classList.remove('activa', 'bi-star-fill', 'bi-star-half', 'bi-star');

        if (estrellaIdx <= numValor) {
          star.classList.add('activa', 'bi-star-fill');
        } else if (estrellaIdx - 0.5 === numValor) {
          star.classList.add('activa', 'bi-star-half');
        } else {
          star.classList.add('bi-star');
        }
      });
    }

    function fijarCalificacion(valor) {
      const numValor = Number(valor) || 0;
      ratingActual = numValor;
      if (inputPuntuacion) {
        inputPuntuacion.value = String(numValor);
      }
      if (labelRatingResena) {
        labelRatingResena.textContent = `${numValor} de 5`;
      }
      renderizarEstrellas(numValor);
    }

    function fijarFavorita(activo) {
      const esActiva = Boolean(activo);
      if (btnLikeResena) {
        btnLikeResena.classList.toggle('activo', esActiva);
        btnLikeResena.setAttribute('aria-pressed', String(esActiva));
        const icono = btnLikeResena.querySelector('.icono-like');
        if (icono) {
          icono.classList.toggle('activo', esActiva);
        }
      }
      if (inputFavorita) {
        inputFavorita.value = String(esActiva);
      }
    }

    function resetearFormularioResena() {
      if (cierreModalTimeoutId) {
        clearTimeout(cierreModalTimeoutId);
        cierreModalTimeoutId = null;
      }
      if (resenaAbortController) {
        resenaAbortController.abort();
        resenaAbortController = null;
      }
      fijarCalificacion(0);
      fijarFavorita(false);
      if (modalResenaTexto) {
        modalResenaTexto.value = '';
        modalResenaTexto.disabled = false;
      }
      if (checkContieneSpoilers) checkContieneSpoilers.checked = false;
      if (checkWatchedBefore) {
        checkWatchedBefore.checked = false;
      }
      if (labelWatchedBefore) {
        labelWatchedBefore.classList.remove('text-light');
        labelWatchedBefore.classList.add('text-secondary');
      }
      if (checkWatchedOn) checkWatchedOn.checked = true;
      if (inputWatchedDate) {
        const hoyIso = obtenerFechaHoyISO();
        inputWatchedDate.max = hoyIso;
        inputWatchedDate.value = hoyIso;
        inputWatchedDate.disabled = false;
      }
      if (btnSaveResena) {
        btnSaveResena.disabled = false;
        btnSaveResena.textContent = 'Publicar Reseña';
      }
      ocultarFeedbackResena();
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

      const cleanId = id ? String(id).trim() : '';
      if (modalResenaElement) {
        modalResenaElement.dataset.peliculaId = cleanId;
      }
      if (inputPeliculaId) {
        inputPeliculaId.value = cleanId;
      }

      if (cleanId) {
        try {
          const storedUserRaw = localStorage.getItem('usuario');
          if (storedUserRaw) {
            const parsedUser = JSON.parse(storedUserRaw);
            if (parsedUser && Array.isArray(parsedUser.favoritas)) {
              const yaEsFavorita = parsedUser.favoritas.map(String).includes(cleanId);
              if (yaEsFavorita) {
                fijarFavorita(true);
              }
            }
          }
        } catch (_) {}
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
      contenedorEstrellas.addEventListener('mousemove', (e) => {
        const star = e.target.closest('.estrella-rating');
        if (!star) return;
        const valorPreview = calcularValorEstrella(star, e.clientX);
        renderizarEstrellas(valorPreview);
        if (labelRatingResena) {
          labelRatingResena.textContent = `${valorPreview} de 5`;
        }
      });

      contenedorEstrellas.addEventListener('mouseleave', () => {
        renderizarEstrellas(ratingActual);
        if (labelRatingResena) {
          labelRatingResena.textContent = `${ratingActual} de 5`;
        }
      });

      contenedorEstrellas.addEventListener('click', (e) => {
        const star = e.target.closest('.estrella-rating');
        if (!star) return;
        const valorSeleccionado = calcularValorEstrella(star, e.clientX);
        fijarCalificacion(valorSeleccionado);
      });
    }

    if (checkWatchedOn && inputWatchedDate) {
      checkWatchedOn.addEventListener('change', () => {
        if (checkWatchedOn.checked) {
          inputWatchedDate.disabled = false;
          if (!inputWatchedDate.value) {
            inputWatchedDate.value = obtenerFechaHoyISO();
          }
        } else {
          inputWatchedDate.disabled = true;
        }
      });
    }

    if (checkWatchedBefore && labelWatchedBefore) {
      checkWatchedBefore.addEventListener('change', () => {
        labelWatchedBefore.classList.toggle('text-light', checkWatchedBefore.checked);
        labelWatchedBefore.classList.toggle('text-secondary', !checkWatchedBefore.checked);
      });
    }

    if (btnLikeResena) {
      btnLikeResena.addEventListener('click', () => {
        const nuevoEstado = !btnLikeResena.classList.contains('activo');
        fijarFavorita(nuevoEstado);
      });
    }

    if (formResena) {
      formResena.addEventListener('submit', async (e) => {
        e.preventDefault();
        ocultarFeedbackResena();

        const formData = new FormData(formResena);
        const peliculaId = String(
          formData.get('peliculaId') ||
          (inputPeliculaId && inputPeliculaId.value) ||
          (modalResenaElement && modalResenaElement.dataset.peliculaId) ||
          ''
        ).trim();

        const puntuacionRaw = (inputPuntuacion && inputPuntuacion.value !== '0')
          ? inputPuntuacion.value
          : (ratingActual || formData.get('puntuacion'));
        const puntuacion = parseFloat(puntuacionRaw);

        const texto = String(
          (modalResenaTexto ? modalResenaTexto.value : formData.get('texto')) || ''
        ).trim();

        const contieneSpoilers = Boolean(
          checkContieneSpoilers ? checkContieneSpoilers.checked : formData.get('contieneSpoilers')
        );

        const vistaPreviamente = Boolean(
          checkWatchedBefore ? checkWatchedBefore.checked : formData.get('vistaPreviamente')
        );

        const esFavorita = Boolean(
          (btnLikeResena && btnLikeResena.classList.contains('activo')) ||
          formData.get('esFavorita') === 'true'
        );

        const marcoFechaVisionado = checkWatchedOn ? checkWatchedOn.checked : true;
        let fechaVisionado = null;

        if (!peliculaId) {
          mostrarFeedbackResena('error', 'Seleccioná una película válida para asociar a la reseña.');
          return;
        }

        if (marcoFechaVisionado) {
          const fechaRaw = String(
            (inputWatchedDate ? inputWatchedDate.value : formData.get('fechaVisionado')) || ''
          ).trim();

          if (!fechaRaw || !/^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) {
            mostrarFeedbackResena('error', 'Seleccioná una fecha válida en la que viste la película.');
            if (inputWatchedDate) inputWatchedDate.focus();
            return;
          }

          if (fechaRaw > obtenerFechaHoyISO()) {
            mostrarFeedbackResena('error', 'La fecha en que viste la película no puede ser futura.');
            if (inputWatchedDate) inputWatchedDate.focus();
            return;
          }

          fechaVisionado = new Date(`${fechaRaw}T00:00:00.000Z`).toISOString();
        }

        if (
          Number.isNaN(puntuacion) ||
          puntuacion < 0.5 ||
          puntuacion > 5 ||
          !Number.isInteger(puntuacion * 2)
        ) {
          mostrarFeedbackResena('error', 'Seleccioná una calificación entre 0.5 y 5 estrellas');
          return;
        }

        if (texto.length < 10 || texto.length > 2000) {
          mostrarFeedbackResena('error', 'Escribí una reseña que contenga entre 10 y 2000 caracteres.');
          if (modalResenaTexto) modalResenaTexto.focus();
          return;
        }

        if (resenaAbortController) {
          resenaAbortController.abort();
        }
        resenaAbortController = new AbortController();

        if (btnSaveResena) {
          btnSaveResena.disabled = true;
          btnSaveResena.textContent = 'Publicando...';
        }

        const payload = {
          peliculaId,
          puntuacion,
          texto,
          contieneSpoilers,
          vistaPreviamente,
          fechaVisionado,
          esFavorita
        };

        try {
          const headers = {
            'Content-Type': 'application/json'
          };

          try {
            const storedUserId = localStorage.getItem('userId');
            const storedUserRaw = localStorage.getItem('usuario');
            let fallbackUserId = storedUserId;
            if (!fallbackUserId && storedUserRaw) {
              const parsedUser = JSON.parse(storedUserRaw);
              if (parsedUser && parsedUser.id) {
                fallbackUserId = String(parsedUser.id);
              }
            }
            if (fallbackUserId) {
              headers['x-user-id'] = fallbackUserId;
            }
          } catch (_) { }

          const response = await fetch('/api/resenas', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            credentials: 'same-origin',
            signal: resenaAbortController.signal
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            const mensajeError =
              data.detail ||
              data.error ||
              (response.status === 401
                ? 'Debés iniciar sesión para publicar una reseña.'
                : 'No se pudo publicar la reseña. Intentá nuevamente.');
            mostrarFeedbackResena('error', mensajeError);
            if (btnSaveResena) {
              btnSaveResena.disabled = false;
              btnSaveResena.textContent = 'Publicar Reseña';
            }
            return;
          }

          if (esFavorita && peliculaId) {
            try {
              const storedUserRaw = localStorage.getItem('usuario');
              if (storedUserRaw) {
                const parsedUser = JSON.parse(storedUserRaw);
                if (parsedUser && typeof parsedUser === 'object') {
                  const favs = Array.isArray(parsedUser.favoritas)
                    ? parsedUser.favoritas.map(String)
                    : [];
                  if (!favs.includes(peliculaId)) {
                    favs.push(peliculaId);
                  }
                  parsedUser.favoritas = favs;
                  localStorage.setItem('usuario', JSON.stringify(parsedUser));
                }
              }
            } catch (_) {}
          }

          mostrarFeedbackResena('exito', 'Reseña publicada con éxito en MovieClub!');

          cierreModalTimeoutId = setTimeout(() => {
            if (bsModalResena) {
              bsModalResena.hide();
            }
            resetearFormularioResena();
            actualizarUltimasResenas();
          }, 1200);
        } catch (err) {
          if (err && err.name === 'AbortError') {
            return;
          }
          mostrarFeedbackResena(
            'error',
            err?.message || 'Error de conexión al intentar publicar la reseña.'
          );
          if (btnSaveResena) {
            btnSaveResena.disabled = false;
            btnSaveResena.textContent = 'Publicar Reseña';
          }
        }
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

    const movieSlider = document.querySelector('.movie-slider');
    if (movieSlider) {
      movieSlider.addEventListener('click', (e) => {
        const item = e.target.closest('.movie-card');
        if (!item) return;

        const peliculaId = item.dataset.id;
        const peliculaTitulo = item.dataset.titulo;
        const peliculaAnio = item.dataset.anio;
        const peliculaPoster = item.dataset.poster;

        if (peliculaId) {
          abrirModalResena({
            id: peliculaId,
            titulo: peliculaTitulo,
            anio: peliculaAnio,
            poster: peliculaPoster
          });
        }
      });
    }

    async function actualizarUltimasResenas() {
      try {
        const response = await fetch('/api/resenas?limite=6');
        if (!response.ok) return;
        const resenas = await response.json();
        if (!Array.isArray(resenas) || resenas.length === 0) return;

        const slider = document.querySelector('.movie-slider');
        const template = document.getElementById('template-tarjeta-resena');
        if (!slider || !template) return;

        const fragment = document.createDocumentFragment();

        resenas.forEach((resena) => {
          const clon = template.content.cloneNode(true);
          const card = clon.querySelector('.movie-card');
          const img = clon.querySelector('.movie-poster');
          const title = clon.querySelector('.movie-title');
          const year = clon.querySelector('.movie-year');
          const rating = clon.querySelector('.movie-rating');
          const author = clon.querySelector('.movie-review-author');
          const snippet = clon.querySelector('.movie-review-snippet');

          const pelicula = resena.pelicula || {};
          const peliId = String(pelicula.id || resena.peliculaId || '');
          const peliTitulo = pelicula.titulo || 'Película';
          const peliAnio = pelicula.anio || '';
          const peliPoster = pelicula.poster || '/img/logoMovieClub.png';

          if (card) {
            card.dataset.id = peliId;
            card.dataset.titulo = peliTitulo;
            card.dataset.anio = peliAnio;
            card.dataset.poster = peliPoster;
          }

          if (img) {
            img.src = peliPoster;
            img.alt = peliTitulo;
          }

          if (title) {
            title.textContent = peliTitulo;
          }

          if (year) {
            year.textContent = peliAnio;
          }

          if (rating) {
            rating.textContent = `★ ${Number(resena.puntuacion || 0).toFixed(1)}`;
          }

          if (author) {
            author.textContent = resena.nombreAutor || 'Miembro de MovieClub';
          }

          if (snippet) {
            snippet.textContent = resena.texto ? `“${resena.texto}”` : '';
          }

          fragment.appendChild(clon);
        });

        slider.replaceChildren(fragment);
      } catch {}
    }

    actualizarUltimasResenas();

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

    if (modalResenaElement) {
      modalResenaElement.addEventListener('hidden.bs.modal', () => {
        if (resenaAbortController) {
          resenaAbortController.abort();
          resenaAbortController = null;
        }
        if (cierreModalTimeoutId) {
          clearTimeout(cierreModalTimeoutId);
          cierreModalTimeoutId = null;
        }
      });
    }
  });
})();
