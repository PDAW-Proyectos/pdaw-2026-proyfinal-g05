const crypto = require('crypto');
const { ValidationError } = require('../utils/errors');

class Resena {
  #id;
  #peliculaId;
  #autorId;
  #puntuacion;
  #texto;
  #contieneSpoilers;
  #fechaCreacion;
  #likes;

  constructor({
    id,
    peliculaId,
    autorId,
    puntuacion,
    texto,
    contieneSpoilers = false,
    fechaCreacion,
    likes = [],
  }) {
    this.#id = Resena.#validarId(id);
    this.#peliculaId = Resena.#validarPeliculaId(peliculaId);
    this.#autorId = Resena.#validarAutorId(autorId);
    this.#puntuacion = Resena.#validarPuntuacion(puntuacion);
    this.#texto = Resena.#validarTexto(texto);
    this.#contieneSpoilers = Boolean(contieneSpoilers);
    this.#fechaCreacion = Resena.#validarFecha(fechaCreacion);
    this.#likes = Resena.#validarLikes(likes);
  }

  static #validarId(id) {
    if (id === undefined || id === null) {
      return crypto.randomUUID();
    }
    const trimmed = String(id).trim();
    if (trimmed === '') {
      return crypto.randomUUID();
    }
    return trimmed;
  }

  static #validarPeliculaId(peliculaId) {
    if (
      peliculaId === undefined ||
      peliculaId === null ||
      String(peliculaId).trim() === ''
    ) {
      throw new ValidationError(
        'Seleccione una película válida para asociar a la reseña.',
      );
    }
    return String(peliculaId).trim();
  }

  static #validarAutorId(autorId) {
    if (
      autorId === undefined ||
      autorId === null ||
      String(autorId).trim() === ''
    ) {
      throw new ValidationError(
        'Identifique al autor antes de publicar la reseña.',
      );
    }
    return String(autorId).trim();
  }

  static #validarPuntuacion(puntuacion) {
    if (
      puntuacion === undefined ||
      puntuacion === null ||
      typeof puntuacion === 'boolean' ||
      (typeof puntuacion === 'string' && puntuacion.trim() === '')
    ) {
      throw new ValidationError(
        'Ingrese una puntuación entre 0.5 y 5 estrellas en pasos de 0.5.',
      );
    }
    const num = Number(puntuacion);
    if (
      Number.isNaN(num) ||
      num < 0.5 ||
      num > 5 ||
      !Number.isInteger(num * 2)
    ) {
      throw new ValidationError(
        'Ingrese una puntuación entre 0.5 y 5 estrellas en pasos de 0.5.',
      );
    }
    return num;
  }

  static #validarTexto(texto) {
    if (texto === undefined || texto === null || typeof texto !== 'string') {
      throw new ValidationError(
        'Escriba una reseña que contenga entre 10 y 2000 caracteres.',
      );
    }
    const trimmed = texto.trim();
    if (trimmed.length < 10 || trimmed.length > 2000) {
      throw new ValidationError(
        'Escriba una reseña que contenga entre 10 y 2000 caracteres.',
      );
    }
    return trimmed;
  }

  static #validarFecha(fechaCreacion) {
    if (fechaCreacion === undefined || fechaCreacion === null) {
      return new Date().toISOString();
    }
    const fecha = new Date(fechaCreacion);
    if (Number.isNaN(fecha.getTime())) {
      throw new ValidationError(
        'Proporcione una fecha de creación en formato ISO 8601 válido.',
      );
    }
    return fecha.toISOString();
  }

  static #validarLikes(likes) {
    if (!Array.isArray(likes)) {
      return [];
    }
    const limpios = likes
      .filter((l) => l !== undefined && l !== null)
      .map((l) => String(l).trim())
      .filter((l) => l !== '');
    return [...new Set(limpios)];
  }

  get id() {
    return this.#id;
  }

  get peliculaId() {
    return this.#peliculaId;
  }

  get autorId() {
    return this.#autorId;
  }

  get puntuacion() {
    return this.#puntuacion;
  }

  get texto() {
    return this.#texto;
  }

  get contieneSpoilers() {
    return this.#contieneSpoilers;
  }

  get fechaCreacion() {
    return this.#fechaCreacion;
  }

  get likes() {
    return structuredClone(this.#likes);
  }

  get cantidadLikes() {
    return this.#likes.length;
  }

  actualizar({ puntuacion, texto, contieneSpoilers } = {}) {
    if (puntuacion !== undefined) {
      this.#puntuacion = Resena.#validarPuntuacion(puntuacion);
    }
    if (texto !== undefined) {
      this.#texto = Resena.#validarTexto(texto);
    }
    if (contieneSpoilers !== undefined) {
      this.#contieneSpoilers = Boolean(contieneSpoilers);
    }
  }

  toggleLike(usuarioId) {
    const id = String(usuarioId).trim();
    if (id === '') {
      throw new ValidationError(
        'Identifique al usuario para registrar el like.',
      );
    }
    const index = this.#likes.indexOf(id);
    if (index === -1) {
      this.#likes = [...this.#likes, id];
    } else {
      this.#likes = this.#likes.filter((l) => l !== id);
    }
  }

  esAutor(usuarioId) {
    return this.#autorId === String(usuarioId).trim();
  }

  toJSON() {
    return {
      id: this.#id,
      peliculaId: this.#peliculaId,
      autorId: this.#autorId,
      puntuacion: this.#puntuacion,
      texto: this.#texto,
      contieneSpoilers: this.#contieneSpoilers,
      fechaCreacion: this.#fechaCreacion,
      likes: [...this.#likes],
    };
  }

  paraExponer() {
    return {
      id: this.#id,
      peliculaId: this.#peliculaId,
      autorId: this.#autorId,
      puntuacion: this.#puntuacion,
      texto: this.#texto,
      contieneSpoilers: this.#contieneSpoilers,
      fechaCreacion: this.#fechaCreacion,
      likes: [...this.#likes],
      cantidadLikes: this.#likes.length,
    };
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError(
        'Los datos para reconstruir la reseña son inválidos.',
      );
    }
    return new Resena({
      id: data.id,
      peliculaId: data.peliculaId,
      autorId: data.autorId,
      puntuacion: data.puntuacion,
      texto: data.texto,
      contieneSpoilers: data.contieneSpoilers,
      fechaCreacion: data.fechaCreacion,
      likes: data.likes,
    });
  }
}

module.exports = Resena;

