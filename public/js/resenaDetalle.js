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
    const linkPeliculaTitulo = document.getElementById('resena-pelicula-titulo-link');
    const posterTitulo = document.getElementById('resena-poster-titulo');
    const linkPosterTitulo = document.getElementById('resena-poster-titulo-link');
    const peliculaAnio = document.getElementById('resena-pelicula-anio');
    const peliculaPoster = document.getElementById('resena-pelicula-poster');
    const linkPeliculaPoster = document.getElementById('resena-pelicula-poster-link');
    const peliculaSinopsis = document.getElementById('resena-pelicula-sinopsis');
    const estrellasCabecera = document.getElementById('resena-estrellas-cabecera');
    const corazonCabecera = document.getElementById('resena-icono-corazon-cabecera');
    const alertaSpoilers = document.getElementById('resena-alerta-spoilers');
    const btnToggleSpoiler = document.getElementById('btn-toggle-spoiler');
    const textoToggleSpoiler = document.getElementById('texto-toggle-spoiler');
    const resenaTexto = document.getElementById('resena-texto');
    const badgeDestacada = document.getElementById('resena-badge-destacada');
    const iconoFavoritaStat = document.getElementById('icono-favorita-stat');
    const panelEstrellas = document.getElementById('panel-estrellas-rating');
    const panelCalificacionTexto = document.getElementById('panel-calificacion-texto');
    const fechaVisionado = document.getElementById('resena-fecha-visionado');
    const fechaPublicacion = document.getElementById('resena-fecha-publicacion');
    const btnCompartir = document.getElementById('btn-compartir-resena');
    const feedbackCompartir = document.getElementById('feedback-compartir');
    const btnEditarDetalle = document.getElementById('btn-editar-resena-detalle');
    const btnPromoverCritico = document.getElementById('btn-promover-critico');
    const btnMarcarSpoilerDetalle = document.getElementById('btn-marcar-spoiler-detalle');

    let datosResenaActual = null;
    let esModeradorSesion = false;

    function actualizarBotonRol(rolActual) {
      if (!btnPromoverCritico || !datosResenaActual) return;
      const rolNorm = String(rolActual || 'Espectador').toLowerCase();
      if (esModeradorSesion && datosResenaActual.autorId && rolNorm !== 'moderador') {
        btnPromoverCritico.classList.remove('d-none');
        if (rolNorm === 'critico') {
          btnPromoverCritico.dataset.accion = 'quitar-critico';
          btnPromoverCritico.className = 'btn btn-outline-secondary btn-sm py-0 px-2 small';
          const icono = document.createElement('i');
          icono.className = 'bi bi-person-x me-1';
          icono.setAttribute('aria-hidden', 'true');
          btnPromoverCritico.replaceChildren(icono, document.createTextNode(' Quitar Crítico'));
        } else {
          btnPromoverCritico.dataset.accion = 'hacer-critico';
          btnPromoverCritico.className = 'btn btn-outline-pink btn-sm py-0 px-2 small';
          const icono = document.createElement('i');
          icono.className = 'bi bi-award me-1';
          icono.setAttribute('aria-hidden', 'true');
          btnPromoverCritico.replaceChildren(icono, document.createTextNode(' Hacer Crítico'));
        }
      } else {
        btnPromoverCritico.classList.add('d-none');
      }
    }

    function actualizarBotonSpoiler(tieneSpoilers) {
      if (!btnMarcarSpoilerDetalle || !datosResenaActual) return;
      if (esModeradorSesion && datosResenaActual.id) {
        btnMarcarSpoilerDetalle.classList.remove('d-none');
        if (tieneSpoilers) {
          btnMarcarSpoilerDetalle.className = 'btn btn-outline-secondary btn-sm py-2';
          btnMarcarSpoilerDetalle.dataset.contieneSpoilers = 'true';
          const icono = document.createElement('i');
          icono.className = 'bi bi-eye me-1';
          icono.setAttribute('aria-hidden', 'true');
          btnMarcarSpoilerDetalle.replaceChildren(icono, document.createTextNode(' Quitar Spoiler'));
        } else {
          btnMarcarSpoilerDetalle.className = 'btn btn-outline-warning btn-sm py-2';
          btnMarcarSpoilerDetalle.dataset.contieneSpoilers = 'false';
          const icono = document.createElement('i');
          icono.className = 'bi bi-exclamation-triangle me-1';
          icono.setAttribute('aria-hidden', 'true');
          btnMarcarSpoilerDetalle.replaceChildren(icono, document.createTextNode(' Contiene Spoiler'));
        }
      } else {
        btnMarcarSpoilerDetalle.classList.add('d-none');
      }
    }

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
        datosResenaActual = data;

        const rolAutorNorm = String(data.rolAutor || 'Espectador').toLowerCase();
        const esAutorModerador = rolAutorNorm === 'moderador';
        const esAutorEspectador = rolAutorNorm === 'espectador';

        if (autorNombre) {
          autorNombre.textContent = data.nombreAutor || 'Miembro de MovieClub';
          autorNombre.classList.toggle('text-pink', esAutorModerador);
          autorNombre.classList.toggle('text-light', !esAutorModerador);
        }
        if (autorRol) {
          autorRol.textContent = (data.rolAutor || 'Espectador').toUpperCase();
          autorRol.classList.toggle('text-secondary', esAutorEspectador);
          autorRol.classList.toggle('text-pink', !esAutorEspectador);
        }

        const peli = data.pelicula || {};
        const tituloPeli = peli.titulo || 'Película sin título';
        if (peliculaTitulo) peliculaTitulo.textContent = tituloPeli;
        if (posterTitulo) posterTitulo.textContent = tituloPeli;
        if (peliculaAnio) peliculaAnio.textContent = peli.anio ? `(${peli.anio})` : '';

        const peliculaId = data.peliculaId || peli.id;
        if (peliculaId) {
          const urlDetallePeli = `/detallePelicula.html?id=${encodeURIComponent(peliculaId)}`;
          if (linkPeliculaTitulo) linkPeliculaTitulo.setAttribute('href', urlDetallePeli);
          if (linkPosterTitulo) linkPosterTitulo.setAttribute('href', urlDetallePeli);
          if (linkPeliculaPoster) linkPeliculaPoster.setAttribute('href', urlDetallePeli);
        }

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
        const panelBox = document.querySelector('.resena-panel-box');
        if (panelBox && esDest) {
          panelBox.classList.add('resena-card-destacada');
        }

        if (alertaSpoilers) {
          const tieneSpoilers = Boolean(data.contieneSpoilers);
          alertaSpoilers.classList.toggle('d-none', !tieneSpoilers);
          if (tieneSpoilers && resenaTexto) {
            resenaTexto.classList.add('spoiler-blureado');
          }
        }

        if (fechaVisionado) {
          fechaVisionado.textContent = formatearFecha(data.fechaVisionado);
        }

        if (fechaPublicacion) {
          fechaPublicacion.textContent = formatearFecha(data.fechaCreacion);
        }

        const panelAccionesAutor = document.getElementById('resena-acciones-autor-detalle');
        if (panelAccionesAutor) {
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
            data.autorId &&
            String(usuarioActivo.id) === String(data.autorId)
          );
          const esModerador = Boolean(
            usuarioActivo.id &&
            String(usuarioActivo.rol || '').toLowerCase() === 'moderador'
          );

          if (esAutor || esModerador) {
            panelAccionesAutor.classList.remove('d-none');
            if (btnEditarDetalle) {
              btnEditarDetalle.classList.toggle('d-none', !esAutor);
            }
            if (btnEliminarDetalle) {
              btnEliminarDetalle.classList.remove('d-none');
              btnEliminarDetalle.dataset.esAutor = esAutor ? 'true' : 'false';
              btnEliminarDetalle.dataset.esModerador = esModerador ? 'true' : 'false';
              if (esModerador && !esAutor) {
                const iconoShield = document.createElement('i');
                iconoShield.className = 'bi bi-shield-x me-1';
                iconoShield.setAttribute('aria-hidden', 'true');
                btnEliminarDetalle.replaceChildren(iconoShield, document.createTextNode(' Eliminar reseña (Moderación)'));
              } else {
                const iconoTrash = document.createElement('i');
                iconoTrash.className = 'bi bi-trash me-1';
                iconoTrash.setAttribute('aria-hidden', 'true');
                btnEliminarDetalle.replaceChildren(iconoTrash, document.createTextNode(' Eliminar reseña'));
              }
            }
          } else {
            panelAccionesAutor.classList.add('d-none');
          }

          esModeradorSesion = esModerador;
          actualizarBotonRol(data.rolAutor);
          actualizarBotonSpoiler(Boolean(data.contieneSpoilers));
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

    if (btnToggleSpoiler && resenaTexto) {
      btnToggleSpoiler.addEventListener('click', () => {
        const estaRevelado = resenaTexto.classList.toggle('revelado');
        if (textoToggleSpoiler) {
          textoToggleSpoiler.textContent = estaRevelado ? 'Ocultar spoilers.' : 'Mostrala sin filtros.';
        }
      });
    }

    if (btnEditarDetalle) {
      btnEditarDetalle.addEventListener('click', () => {
        if (!datosResenaActual) return;
        if (typeof window.abrirModalEdicionResena === 'function') {
          window.abrirModalEdicionResena(datosResenaActual, () => {
            cargarDetalleResena();
          });
        }
      });
    }

    const btnEliminarDetalle = document.getElementById('btn-eliminar-resena-detalle');
    const modalConfirmarEliminar = document.getElementById('modal-confirmar-eliminar');
    const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
    const msgConfirmarEliminar = document.getElementById('modal-confirmar-eliminar-mensaje');

    let bsModalEliminar = null;
    if (modalConfirmarEliminar && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      bsModalEliminar = bootstrap.Modal.getOrCreateInstance(modalConfirmarEliminar);
    }

    if (btnEliminarDetalle) {
      btnEliminarDetalle.addEventListener('click', () => {
        if (!datosResenaActual) return;
        const peliTitulo = datosResenaActual.pelicula?.titulo;
        const esAutor = btnEliminarDetalle.dataset.esAutor !== 'false';
        const tituloFinal = peliTitulo || tituloPeli;

        if (msgConfirmarEliminar) {
          if (tituloFinal) {
            msgConfirmarEliminar.textContent = esAutor
              ? `¿Confirmás que querés eliminar tu reseña de "${tituloFinal}"?`
              : `¿Confirmás que querés eliminar la reseña de "${tituloFinal}" como moderador?`;
          } else {
            msgConfirmarEliminar.textContent = esAutor
              ? '¿Confirmás que querés eliminar esta reseña?'
              : '¿Confirmás que querés eliminar esta reseña como moderador?';
          }
        }
        if (btnConfirmarEliminar) {
          btnConfirmarEliminar.disabled = false;
          btnConfirmarEliminar.textContent = 'Eliminar';
        }
        if (bsModalEliminar) {
          bsModalEliminar.show();
        }
      });
    }

    if (btnConfirmarEliminar) {
      btnConfirmarEliminar.addEventListener('click', async () => {
        if (!resenaId) return;
        btnConfirmarEliminar.disabled = true;
        btnConfirmarEliminar.textContent = 'Eliminando...';

        try {
          const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
          const resp = await fetchFn(`/api/resenas/${encodeURIComponent(resenaId.trim())}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });

          if (!resp.ok) {
            throw new Error('No se pudo eliminar la reseña.');
          }

          if (bsModalEliminar) {
            bsModalEliminar.hide();
          }

          const esAutor = btnEliminarDetalle ? btnEliminarDetalle.dataset.esAutor !== 'false' : true;
          window.location.href = esAutor ? '/perfil.html' : '/resenas.html';
        } catch {
          btnConfirmarEliminar.disabled = false;
          btnConfirmarEliminar.textContent = 'Error al eliminar';
        }
      });
    }

    if (btnPromoverCritico) {
      btnPromoverCritico.addEventListener('click', async () => {
        if (!datosResenaActual || !datosResenaActual.autorId) return;
        const accion = btnPromoverCritico.dataset.accion || 'hacer-critico';
        const nuevoRol = accion === 'quitar-critico' ? 'Espectador' : 'Critico';
        btnPromoverCritico.disabled = true;
        btnPromoverCritico.textContent = 'Actualizando...';
        try {
          const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
          const resp = await fetchFn(`/api/usuarios/${encodeURIComponent(datosResenaActual.autorId)}/rol`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ rol: nuevoRol })
          });
          if (resp && !resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const err = new Error(errData.error || errData.message || 'No se pudo actualizar el rol');
            err.status = resp.status;
            throw err;
          }
          datosResenaActual.rolAutor = nuevoRol;
          const esNuevoEspectador = String(nuevoRol).toLowerCase() === 'espectador';
          const esNuevoModerador = String(nuevoRol).toLowerCase() === 'moderador';
          if (autorNombre) {
            autorNombre.classList.toggle('text-pink', esNuevoModerador);
            autorNombre.classList.toggle('text-light', !esNuevoModerador);
          }
          if (autorRol) {
            autorRol.textContent = nuevoRol.toUpperCase();
            autorRol.classList.toggle('text-secondary', esNuevoEspectador);
            autorRol.classList.toggle('text-pink', !esNuevoEspectador);
          }
          actualizarBotonRol(nuevoRol);
        } catch (err) {
          actualizarBotonRol(datosResenaActual.rolAutor);
          if (err && (err.status === 401 || err.message?.includes('iniciar sesión') || err.message?.includes('autorizado'))) {
            if (typeof window.mostrarCartelSesionExpirada === 'function') {
              window.mostrarCartelSesionExpirada(err.message);
            }
          } else if (err && err.message) {
            alert(err.message);
          }
        } finally {
          btnPromoverCritico.disabled = false;
        }
      });
    }

    if (btnMarcarSpoilerDetalle) {
      btnMarcarSpoilerDetalle.addEventListener('click', async () => {
        if (!datosResenaActual || !datosResenaActual.id) return;
        const tieneSpoilersActual = btnMarcarSpoilerDetalle.dataset.contieneSpoilers === 'true';
        const nuevoEstado = !tieneSpoilersActual;
        btnMarcarSpoilerDetalle.disabled = true;
        btnMarcarSpoilerDetalle.textContent = 'Actualizando...';
        try {
          const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
          const resp = await fetchFn(`/api/resenas/${encodeURIComponent(datosResenaActual.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ contieneSpoilers: nuevoEstado })
          });
          if (resp && !resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const err = new Error(errData.error || errData.message || 'No se pudo actualizar el estado de spoiler');
            err.status = resp.status;
            throw err;
          }
          datosResenaActual.contieneSpoilers = nuevoEstado;
          if (alertaSpoilers) {
            alertaSpoilers.classList.toggle('d-none', !nuevoEstado);
          }
          if (resenaTexto) {
            resenaTexto.classList.toggle('spoiler-blureado', nuevoEstado);
          }
          actualizarBotonSpoiler(nuevoEstado);
        } catch (err) {
          actualizarBotonSpoiler(Boolean(datosResenaActual.contieneSpoilers));
          if (err && (err.status === 401 || err.message?.includes('iniciar sesión') || err.message?.includes('autorizado'))) {
            if (typeof window.mostrarCartelSesionExpirada === 'function') {
              window.mostrarCartelSesionExpirada(err.message);
            }
          } else if (err && err.message) {
            alert(err.message);
          }
        } finally {
          btnMarcarSpoilerDetalle.disabled = false;
        }
      });
    }

    cargarDetalleResena();
  });
})();

