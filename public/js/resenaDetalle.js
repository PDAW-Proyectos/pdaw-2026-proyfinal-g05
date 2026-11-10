'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const resenaId = urlParams.get('id');

    const contCargando = document.getElementById('resena-estado-cargando');
    const contError = document.getElementById('resena-estado-error');
    const contContenido = document.getElementById('resena-contenido');
    const msgError = document.getElementById('resena-mensaje-error');

    const autorNombre = document.getElementById('resena-autor-nombre');
    const autorRol = document.getElementById('resena-autor-rol');
    const peliculaTitulo = document.getElementById('resena-pelicula-titulo');
    const posterTitulo = document.getElementById('resena-poster-titulo');
    const peliculaAnio = document.getElementById('resena-pelicula-anio');
    const peliculaPoster = document.getElementById('resena-pelicula-poster');
    const peliculaSinopsis = document.getElementById('resena-pelicula-sinopsis');
    const estrellasCabecera = document.getElementById('resena-estrellas-cabecera');
    const corazonCabecera = document.getElementById('resena-icono-corazon-cabecera');
    const alertaSpoilers = document.getElementById('resena-alerta-spoilers');
    const resenaTexto = document.getElementById('resena-texto');
    const badgeDestacada = document.getElementById('resena-badge-destacada');
    const iconoFavoritaStat = document.getElementById('icono-favorita-stat');
    const panelEstrellas = document.getElementById('panel-estrellas-rating');
    const panelCalificacionTexto = document.getElementById('panel-calificacion-texto');
    const fechaVisionado = document.getElementById('resena-fecha-visionado');
    const fechaPublicacion = document.getElementById('resena-fecha-publicacion');
    const btnCompartir = document.getElementById('btn-compartir-resena');
    const feedbackCompartir = document.getElementById('feedback-compartir');

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

    function mostrarError(mensaje) {
      if (contCargando) contCargando.classList.add('d-none');
      if (contContenido) contContenido.classList.add('d-none');
      if (contError) {
        contError.classList.remove('d-none');
        if (msgError && mensaje) {
          msgError.textContent = mensaje;
        }
      }
    }

    if (!resenaId || resenaId.trim() === '') {
      mostrarError('No se especificó un identificador de reseña válido en la dirección web.');
      return;
    }

    async function cargarDetalleResena() {
      try {
        const respuesta = await fetch(`/api/resenas/${encodeURIComponent(resenaId.trim())}`);
        if (!respuesta.ok) {
          const errData = await respuesta.json().catch(() => ({}));
          const detalle = errData.detail || errData.error || 'La reseña solicitada no existe o fue eliminada.';
          mostrarError(detalle);
          return;
        }

        const data = await respuesta.json();

        if (autorNombre) autorNombre.textContent = data.nombreAutor || 'Miembro de MovieClub';
        if (autorRol) autorRol.textContent = (data.rolAutor || 'Espectador').toUpperCase();

        const peli = data.pelicula || {};
        const tituloPeli = peli.titulo || 'Película sin título';
        if (peliculaTitulo) peliculaTitulo.textContent = tituloPeli;
        if (posterTitulo) posterTitulo.textContent = tituloPeli;
        if (peliculaAnio) peliculaAnio.textContent = peli.anio ? `(${peli.anio})` : '';

        if (peliculaPoster) {
          peliculaPoster.src = peli.poster || '/img/logoMovieClub.png';
          peliculaPoster.alt = tituloPeli;
        }

        if (peliculaSinopsis) {
          peliculaSinopsis.textContent = peli.sinopsis || 'Sin sinopsis disponible.';
        }

        if (resenaTexto) {
          resenaTexto.textContent = data.texto || '';
        }

        const puntuacionNum = Number(data.puntuacion || 0);
        const estrellasTexto = renderizarEstrellas(puntuacionNum);
        if (estrellasCabecera) estrellasCabecera.textContent = estrellasTexto;
        if (panelEstrellas) panelEstrellas.textContent = estrellasTexto;
        if (panelCalificacionTexto) panelCalificacionTexto.textContent = `${puntuacionNum.toFixed(1)} de 5 estrellas`;

        const esFav = Boolean(data.favorita || data.esFavorita);
        if (corazonCabecera) {
          corazonCabecera.classList.toggle('d-none', !esFav);
        }
        if (iconoFavoritaStat) {
          if (esFav) {
            iconoFavoritaStat.style.color = 'var(--accent-pink)';
          } else {
            iconoFavoritaStat.style.color = '#64748b';
          }
        }

        const esDest = Boolean(data.destacada || data.esDestacada);
        if (badgeDestacada) {
          badgeDestacada.classList.toggle('d-none', !esDest);
        }

        if (alertaSpoilers) {
          alertaSpoilers.classList.toggle('d-none', !data.contieneSpoilers);
        }

        if (fechaVisionado) {
          fechaVisionado.textContent = formatearFecha(data.fechaVisionado);
        }

        if (fechaPublicacion) {
          fechaPublicacion.textContent = formatearFecha(data.fechaCreacion);
        }

        document.title = `${tituloPeli} - Reseña de ${data.nombreAutor || 'MovieClub'} | MovieClub`;

        if (contCargando) contCargando.classList.add('d-none');
        if (contContenido) contContenido.classList.remove('d-none');
      } catch (err) {
        mostrarError(err?.message || 'Error de conexión al cargar la reseña.');
      }
    }

    if (btnCompartir) {
      btnCompartir.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          if (feedbackCompartir) {
            feedbackCompartir.classList.remove('d-none');
            setTimeout(() => {
              feedbackCompartir.classList.add('d-none');
            }, 2500);
          }
        } catch {
          if (feedbackCompartir) {
            feedbackCompartir.textContent = 'Copiá este enlace: ' + window.location.href;
            feedbackCompartir.classList.remove('d-none');
          }
        }
      });
    }

    cargarDetalleResena();
  });
})();

