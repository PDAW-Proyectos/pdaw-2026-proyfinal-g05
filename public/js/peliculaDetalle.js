'use strict';

(() => {
  function renderizarEstrellas(puntuacionDiez) {
    const num = (Number(puntuacionDiez) || 0) / 2;
    const enteras = Math.floor(num);
    const media = (num % 1) >= 0.5;
    let resultado = '★'.repeat(enteras);
    if (media) resultado += '½';
    return resultado || '★';
  }

  function formatearFecha(isoString) {
    if (!isoString) return '—';
    try {
      const fecha = new Date(isoString);
      if (Number.isNaN(fecha.getTime())) return '—';
      return fecha.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  class PeliculaDetalleUI {
    #peliculaId;
    #alertaNoEncontrada;
    #contenidoPrincipal;

    constructor() {
      const urlParams = new URLSearchParams(window.location.search);
      this.#peliculaId = urlParams.get('id');
      this.#alertaNoEncontrada = document.getElementById('pelicula-alerta-no-encontrada');
      this.#contenidoPrincipal = document.getElementById('pelicula-contenido-principal');
    }

    async init() {
      if (!this.#peliculaId) {
        this.#mostrarErrorNoEncontrada();
        return;
      }

      await this.#cargarPelicula(this.#peliculaId);
      this.#inicializarStatsActividad();
      this.#cargarActividadUsuario(this.#peliculaId);

      window.addEventListener('movieclub:resena-guardada', () => {
        this.#cargarActividadUsuario(this.#peliculaId);
      });
    }

    #mostrarErrorNoEncontrada() {
      if (this.#alertaNoEncontrada) {
        this.#alertaNoEncontrada.classList.remove('d-none');
      }
      if (this.#contenidoPrincipal) {
        this.#contenidoPrincipal.classList.add('d-none');
      }
      const heroTitulo = document.getElementById('pelicula-hero-titulo');
      if (heroTitulo) heroTitulo.textContent = 'Película no encontrada';
      const heroElement = document.getElementById('pelicula-hero') || document.querySelector('.pelicula-hero-backdrop');
      if (heroElement) {
        heroElement.style.backgroundImage = '';
      }
    }

    async #cargarPelicula(id) {
      try {
        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn(`/api/peliculas/${encodeURIComponent(id)}`);

        if (!res.ok) {
          this.#mostrarErrorNoEncontrada();
          return;
        }

        const data = await res.json();
        this.#actualizarDOM(data);
      } catch {
        this.#mostrarErrorNoEncontrada();
      }
    }

    #actualizarDOM(p) {
      const anio = (p.fechaEstreno || '').slice(0, 4) || '—';
      const score = Number(p.calificacion || 0).toFixed(1);
      const posterUrl = p.posterPath
        ? (p.posterPath.startsWith('http') ? p.posterPath : `https://image.tmdb.org/t/p/w500${p.posterPath}`)
        : '/img/logoMovieClub.png';

      document.title = `${p.titulo} (${anio}) | MovieClub`;

      const heroElement = document.getElementById('pelicula-hero') || document.querySelector('.pelicula-hero-backdrop');
      if (heroElement) {
        if (p.backdropPath) {
          const backdropUrl = p.backdropPath.startsWith('http')
            ? p.backdropPath
            : `https://image.tmdb.org/t/p/w1280${p.backdropPath}`;
          heroElement.style.backgroundImage = `url("${backdropUrl}")`;
        } else {
          heroElement.style.backgroundImage = '';
        }
      }

      const heroTitulo = document.getElementById('pelicula-hero-titulo');
      if (heroTitulo) heroTitulo.textContent = p.titulo;

      const heroAnio = document.getElementById('pelicula-hero-anio');
      if (heroAnio) heroAnio.textContent = anio;

      const heroTagline = document.getElementById('pelicula-hero-tagline');
      if (heroTagline) {
        if (p.tagline) {
          heroTagline.textContent = `“${p.tagline}”`;
          heroTagline.classList.remove('d-none');
        } else {
          heroTagline.textContent = '';
          heroTagline.classList.add('d-none');
        }
      }

      const heroGeneros = document.getElementById('pelicula-hero-generos');
      if (heroGeneros) {
        heroGeneros.textContent = '';
        if (Array.isArray(p.generos) && p.generos.length > 0) {
          p.generos.forEach((g, idx) => {
            const span = document.createElement('span');
            span.textContent = g;
            heroGeneros.appendChild(span);
            if (idx < p.generos.length - 1) {
              const sep = document.createElement('span');
              sep.textContent = '·';
              heroGeneros.appendChild(sep);
            }
          });
        }
      }

      const posterImg = document.getElementById('pelicula-poster-img');
      if (posterImg) {
        posterImg.setAttribute('src', posterUrl);
        posterImg.setAttribute('alt', `${p.titulo} Póster`);
        posterImg.onerror = () => {
          posterImg.src = '/img/logoMovieClub.png';
        };
      }

      const sinopsis = document.getElementById('pelicula-sinopsis-texto');
      if (sinopsis) {
        sinopsis.textContent = p.sinopsis || 'No hay sinopsis disponible en este momento.';
      }

      const tmdbScore = document.getElementById('pelicula-tmdb-score');
      if (tmdbScore) tmdbScore.textContent = score;

      const tmdbEstrellas = document.getElementById('pelicula-tmdb-estrellas');
      if (tmdbEstrellas) tmdbEstrellas.textContent = renderizarEstrellas(p.calificacion);

      const fichaTitulo = document.getElementById('ficha-titulo-original');
      if (fichaTitulo) fichaTitulo.textContent = p.tituloOriginal || p.titulo || '—';

      const fichaFecha = document.getElementById('ficha-fecha-estreno');
      if (fichaFecha) fichaFecha.textContent = formatearFecha(p.fechaEstreno);

      const fichaDuracion = document.getElementById('ficha-duracion');
      if (fichaDuracion) {
        fichaDuracion.textContent = p.duracion ? `${p.duracion} minutos` : '—';
      }

      const fichaGeneros = document.getElementById('ficha-generos');
      if (fichaGeneros && Array.isArray(p.generos)) {
        fichaGeneros.textContent = p.generos.join(', ') || '—';
      }

      const fichaIdioma = document.getElementById('ficha-idioma');
      if (fichaIdioma) {
        fichaIdioma.textContent = p.idiomaOriginal ? `${p.idiomaOriginal.toUpperCase()}` : '—';
      }

      const fichaVotos = document.getElementById('ficha-votos');
      if (fichaVotos) {
        const votos = Number(p.votosTotal || 0).toLocaleString('es-AR');
        fichaVotos.textContent = `${score} / 10 (${votos} votos)`;
      }

      const castLista = document.getElementById('pelicula-cast-lista');
      if (castLista) {
        castLista.textContent = '';
        if (Array.isArray(p.reparto) && p.reparto.length > 0) {
          p.reparto.forEach((actor) => {
            const card = document.createElement('div');
            card.className = 'pelicula-cast-card d-flex justify-content-between align-items-center p-2 rounded';
            card.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            card.style.border = '1px solid rgba(255, 255, 255, 0.06)';

            const info = document.createElement('div');
            const nombre = document.createElement('div');
            nombre.className = 'text-white small fw-bold';
            nombre.textContent = actor.nombre;

            const personaje = document.createElement('div');
            personaje.className = 'text-secondary';
            personaje.style.fontSize = '0.75rem';
            personaje.textContent = actor.personaje || 'Reparto';

            info.appendChild(nombre);
            info.appendChild(personaje);
            card.appendChild(info);
            castLista.appendChild(card);
          });
        } else {
          const empty = document.createElement('span');
          empty.className = 'text-secondary small';
          empty.textContent = 'Información de reparto no disponible';
          castLista.appendChild(empty);
        }
      }

      this.#configurarBotonResenaDinamico(p, anio, posterUrl);
    }

    #configurarBotonResenaDinamico(p, anio, posterUrl) {
      const btn = document.getElementById('btn-resenar-pelicula-detalle');
      if (!btn) return;

      btn.addEventListener('click', (e) => {
        if (typeof window.abrirModalResena === 'function') {
          e.preventDefault();
          window.abrirModalResena({
            id: String(p.id),
            titulo: p.titulo,
            anio: anio,
            poster: posterUrl
          });
        }
      });
    }

    #actualizarEstadoStat(containerId, selectorIcono, activo) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const icon = container.querySelector(selectorIcono);
      if (icon) {
        icon.classList.toggle('text-pink', activo);
        icon.style.color = activo ? 'var(--accent-pink)' : '#64748b';
      }
    }

    #inicializarStatsActividad() {
      this.#actualizarEstadoStat('stat-ya-la-vi', '.bi-eye-fill', false);
      this.#actualizarEstadoStat('stat-favorita', '.bi-heart-fill', false);
      this.#actualizarEstadoStat('stat-watchlist', '.bi-clock-fill', false);
    }

    async #cargarActividadUsuario(id) {
      try {
        let u = null;
        if (typeof window.API !== 'undefined' && typeof window.API.obtenerUsuarioActual === 'function') {
          u = await window.API.obtenerUsuarioActual({ force: true });
        } else {
          const meRes = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          });
          if (meRes.ok) {
            u = await meRes.json();
          }
        }
        if (!u?.id) return;

        if (Array.isArray(u.favoritas) && u.favoritas.map(String).includes(String(id))) {
          this.#actualizarEstadoStat('stat-favorita', '.bi-heart-fill', true);
        }

        if (Array.isArray(u.watchlist) && u.watchlist.map(String).includes(String(id))) {
          this.#actualizarEstadoStat('stat-watchlist', '.bi-clock-fill', true);
        }

        const fetchFn = typeof window.apiFetch === 'function' ? window.apiFetch : fetch;
        const res = await fetchFn('/api/resenas');
        if (!res.ok) return;

        const todas = await res.json();
        if (!Array.isArray(todas)) return;

        const miResena = todas.find(
          (r) =>
            String(r.peliculaId) === String(id) &&
            String(r.autorId || r.usuarioId) === String(u.id)
        );
        if (miResena) {
          this.#actualizarEstadoStat('stat-ya-la-vi', '.bi-eye-fill', true);

          if (miResena.esFavorita) {
            this.#actualizarEstadoStat('stat-favorita', '.bi-heart-fill', true);
          }

          if (miResena.puntuacion) {
            const num = Math.floor(Number(miResena.puntuacion) || 0);
            const panelEstrellas = document.getElementById('panel-tu-puntuacion-estrellas');
            if (panelEstrellas) panelEstrellas.textContent = '★'.repeat(num) + '☆'.repeat(Math.max(0, 5 - num));

            const panelTexto = document.getElementById('panel-tu-puntuacion-texto');
            if (panelTexto) panelTexto.textContent = `${Number(miResena.puntuacion).toFixed(1)} de 5 estrellas`;
          }
        }
      } catch {}
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const detalle = new PeliculaDetalleUI();
    detalle.init();
  });
})();

