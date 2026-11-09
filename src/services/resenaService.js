const Resena = require('../models/Resena');
const { Usuario } = require('../models/Usuario');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

class ResenaService {
  #resenaRepository;
  #usuarioRepository;
  #tmdbAdapter;

  constructor(options = {}) {
    const repository = options?.resenaRepository || options;
    if (!repository || (typeof repository.guardar !== 'function' && typeof repository.leer !== 'function')) {
      throw new Error('resenaRepository es requerido');
    }
    this.#resenaRepository = repository;
    this.#usuarioRepository = options?.usuarioRepository || options?.usuarioService || null;
    this.#tmdbAdapter = options?.tmdbAdapter || options?.tmdbService || null;
  }

  async #obtenerUsuario(autorId) {
    if (!this.#usuarioRepository || !autorId) {
      return null;
    }

    if (typeof this.#usuarioRepository.obtenerPorId === 'function') {
      return await this.#usuarioRepository.obtenerPorId(autorId);
    }

    if (typeof this.#usuarioRepository.findById === 'function') {
      const data = await this.#usuarioRepository.findById(autorId);
      if (!data) return null;
      return data instanceof Usuario ? data : Usuario.fromJSON(data);
    }

    if (typeof this.#usuarioRepository.leer === 'function') {
      const usuarios = await this.#usuarioRepository.leer();
      const data = usuarios.find((u) => u.id === autorId);
      if (!data) return null;
      return data instanceof Usuario ? data : Usuario.fromJSON(data);
    }

    return null;
  }

  async crear({
    autorId,
    peliculaId,
    puntuacion,
    texto,
    contieneSpoilers,
    vistaPreviamente,
    esFavorita,
    favorita,
    fechaVisionado,
    esDestacada,
    destacada,
  } = {}) {
    let flagDestacada = Boolean(esDestacada ?? destacada ?? false);
    let usuario = null;

    if (autorId) {
      usuario = await this.#obtenerUsuario(autorId);
      if (usuario && typeof usuario.puedeDestacar === 'function') {
        flagDestacada = usuario.puedeDestacar();
      }
    }

    const resena = new Resena({
      autorId,
      peliculaId,
      puntuacion,
      texto,
      contieneSpoilers,
      vistaPreviamente,
      esFavorita: esFavorita ?? favorita ?? false,
      fechaVisionado,
      esDestacada: flagDestacada,
    });

    if (typeof this.#resenaRepository.guardar === 'function') {
      await this.#resenaRepository.guardar(resena);
    }

    if (
      usuario &&
      resena.esFavorita &&
      typeof usuario.agregarAFavoritas === 'function'
    ) {
      usuario.agregarAFavoritas(resena.peliculaId);
      if (
        this.#usuarioRepository &&
        typeof this.#usuarioRepository.guardar === 'function'
      ) {
        await this.#usuarioRepository.guardar(usuario);
      }
    }

    return resena;
  }

  async obtenerPorId(id) {
    if (!id || typeof id !== 'string') {
      return null;
    }

    let data = null;
    if (typeof this.#resenaRepository.findById === 'function') {
      data = await this.#resenaRepository.findById(id);
    } else if (typeof this.#resenaRepository.leer === 'function') {
      const todas = await this.#resenaRepository.leer();
      data = todas.find((r) => r.id === id) || null;
    }

    if (!data) {
      return null;
    }

    return data instanceof Resena ? data : Resena.fromJSON(data);
  }

  async actualizar(
    id,
    {
      autorId,
      puntuacion,
      texto,
      contieneSpoilers,
      vistaPreviamente,
      esFavorita,
      favorita,
      fechaVisionado,
    } = {},
  ) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('El id de la reseña es obligatorio');
    }

    const flagFavorita =
      esFavorita !== undefined
        ? esFavorita
        : favorita !== undefined
          ? favorita
          : undefined;

    if (
      puntuacion === undefined &&
      texto === undefined &&
      contieneSpoilers === undefined &&
      vistaPreviamente === undefined &&
      flagFavorita === undefined &&
      fechaVisionado === undefined
    ) {
      throw new ValidationError(
        'Debe proporcionar al menos un campo para actualizar (puntuacion, texto, contieneSpoilers, vistaPreviamente, esFavorita o fechaVisionado)',
      );
    }

    const resena = await this.obtenerPorId(id.trim());
    if (!resena) {
      throw new NotFoundError('Reseña no encontrada');
    }

    if (autorId && !resena.esAutor(autorId)) {
      throw new ForbiddenError('No tienes permisos para modificar esta reseña');
    }

    resena.actualizar({
      puntuacion,
      texto,
      contieneSpoilers,
      vistaPreviamente,
      esFavorita: flagFavorita,
      fechaVisionado,
    });

    if (typeof this.#resenaRepository.guardar === 'function') {
      await this.#resenaRepository.guardar(resena);
    }

    if (flagFavorita !== undefined && resena.autorId) {
      const usuario = await this.#obtenerUsuario(resena.autorId);
      if (usuario) {
        if (
          resena.esFavorita &&
          typeof usuario.agregarAFavoritas === 'function'
        ) {
          usuario.agregarAFavoritas(resena.peliculaId);
        } else if (
          !resena.esFavorita &&
          typeof usuario.quitarDeFavoritas === 'function'
        ) {
          usuario.quitarDeFavoritas(resena.peliculaId);
        }
        if (
          this.#usuarioRepository &&
          typeof this.#usuarioRepository.guardar === 'function'
        ) {
          await this.#usuarioRepository.guardar(usuario);
        }
      }
    }

    return resena;
  }

  async listar({ peliculaId, limite } = {}) {
    let todas = [];
    if (typeof this.#resenaRepository.leer === 'function') {
      todas = await this.#resenaRepository.leer();
    } else if (typeof this.#resenaRepository.findAll === 'function') {
      todas = await this.#resenaRepository.findAll();
    }

    let filtradas = todas;
    if (peliculaId) {
      filtradas = filtradas.filter(
        (r) => String(r.peliculaId) === String(peliculaId),
      );
    }

    filtradas.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion || 0).getTime();
      const fechaB = new Date(b.fechaCreacion || 0).getTime();
      return fechaB - fechaA;
    });

    const cant = Number(limite) || filtradas.length;
    const seleccionadas = filtradas.slice(0, cant);

    return Promise.all(
      seleccionadas.map(async (r) => {
        const instancia = r instanceof Resena ? r : Resena.fromJSON(r);
        const expuesta =
          typeof instancia.paraExponer === 'function'
            ? instancia.paraExponer()
            : instancia.toJSON();

        let nombreAutor = null;
        if (instancia.autorId) {
          const usuario = await this.#obtenerUsuario(instancia.autorId);
          if (usuario && usuario.nombre) {
            nombreAutor = usuario.nombre;
          }
        }

        let pelicula = null;
        if (this.#tmdbAdapter && instancia.peliculaId) {
          try {
            const fn =
              typeof this.#tmdbAdapter.obtenerPeliculaPorId === 'function'
                ? this.#tmdbAdapter.obtenerPeliculaPorId.bind(this.#tmdbAdapter)
                : typeof this.#tmdbAdapter.getMovieById === 'function'
                  ? this.#tmdbAdapter.getMovieById.bind(this.#tmdbAdapter)
                  : null;

            if (fn) {
              const p = await fn(instancia.peliculaId);
              if (p) {
                pelicula = {
                  id: String(p.id),
                  titulo: p.titulo || p.title || 'Película',
                  anio: (p.fechaEstreno || p.release_date || '').slice(0, 4),
                  poster: (p.posterPath || p.poster_path)
                    ? `https://image.tmdb.org/t/p/w500${p.posterPath || p.poster_path}`
                    : '/img/logoMovieClub.png',
                };
              }
            }
          } catch {}
        }

        return {
          ...expuesta,
          nombreAutor: nombreAutor || 'Miembro de MovieClub',
          ...(pelicula && { pelicula }),
        };
      }),
    );
  }
}

module.exports = ResenaService;
