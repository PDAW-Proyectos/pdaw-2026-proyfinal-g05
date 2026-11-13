const crypto = require('crypto');
const { ValidationError } = require('../utils/errors');

class Resena {
  #id;
  #peliculaId;
  #autorId;
  #puntuacion;
  #texto;
  #contieneSpoilers;
  #vistaPreviamente;
  #esFavorita;
  #fechaVisionado;
  #fechaCreacion;
  #likes;
  #esDestacada;

  constructor({
    id,
    peliculaId,
    autorId,
    puntuacion,
    texto,
    contieneSpoilers = false,
    vistaPreviamente = false,
    esFavorita = false,
    fechaVisionado = null,
    esDestacada = false,
    fechaCreacion,
    likes = [],
  }) {
    this.#id = Resena.#validarId(id);
    this.#peliculaId = Resena.#validarPeliculaId(peliculaId);
    this.#autorId = Resena.#validarAutorId(autorId);
    this.#puntuacion = Resena.#validarPuntuacion(puntuacion);
    this.#texto = Resena.#validarTexto(texto);
    this.#contieneSpoilers = Resena.#normalizarBooleano(contieneSpoilers);
    this.#vistaPreviamente = Resena.#normalizarBooleano(vistaPreviamente);
    this.#esFavorita = Resena.#normalizarBooleano(esFavorita);
    this.#fechaVisionado = Resena.#validarFechaVisionado(fechaVisionado);
    this.#esDestacada = Resena.#normalizarBooleano(esDestacada);
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

  static #normalizarBooleano(valor) {
    if (typeof valor === 'string') {
      const limpio = valor.trim().toLowerCase();
      return limpio === 'true' || limpio === '1' || limpio === 'on';
    }
    return Boolean(valor);
  }

  static #validarFechaVisionado(fechaVisionado) {
    if (
      fechaVisionado === undefined ||
      fechaVisionado === null ||
      String(fechaVisionado).trim() === ''
    ) {
      return null;
    }
    const raw = String(fechaVisionado).trim();
    const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T00:00:00.000Z`
      : raw;
    const fecha = new Date(isoCandidate);
    if (Number.isNaN(fecha.getTime())) {
      throw new ValidationError(
        'Proporcione una fecha de visionado en formato ISO 8601 válido.',
      );
    }
    const finDeHoyUTC = new Date();
    finDeHoyUTC.setUTCHours(23, 59, 59, 999);
    if (fecha.getTime() > finDeHoyUTC.getTime()) {
      throw new ValidationError(
        'La fecha en que viste la película no puede ser futura.',
      );
    }
    return fecha.toISOString();
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

  get vistaPreviamente() {
    return this.#vistaPreviamente;
  }

  get esFavorita() {
    return this.#esFavorita;
  }

  get fechaVisionado() {
    return this.#fechaVisionado;
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

  get esDestacada() {
    return this.#esDestacada;
  }

  actualizar({
    puntuacion,
    texto,
    contieneSpoilers,
    vistaPreviamente,
    esFavorita,
    fechaVisionado,
  } = {}) {
    if (puntuacion !== undefined) {
      this.#puntuacion = Resena.#validarPuntuacion(puntuacion);
    }
    if (texto !== undefined) {
      this.#texto = Resena.#validarTexto(texto);
    }
    if (contieneSpoilers !== undefined) {
      this.#contieneSpoilers = Resena.#normalizarBooleano(contieneSpoilers);
    }
    if (vistaPreviamente !== undefined) {
      this.#vistaPreviamente = Resena.#normalizarBooleano(vistaPreviamente);
    }
    if (esFavorita !== undefined) {
      this.#esFavorita = Resena.#normalizarBooleano(esFavorita);
    }
    if (fechaVisionado !== undefined) {
      this.#fechaVisionado = Resena.#validarFechaVisionado(fechaVisionado);
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
    if (!usuarioId || typeof usuarioId !== 'string' || usuarioId.trim() === '') {
      return false;
    }
    return this.#autorId === usuarioId.trim();
  }

  toJSON() {
    return {
      id: this.#id,
      peliculaId: this.#peliculaId,
      autorId: this.#autorId,
      puntuacion: this.#puntuacion,
      texto: this.#texto,
      contieneSpoilers: this.#contieneSpoilers,
      vistaPreviamente: this.#vistaPreviamente,
      esFavorita: this.#esFavorita,
      fechaVisionado: this.#fechaVisionado,
      esDestacada: this.#esDestacada,
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
      vistaPreviamente: this.#vistaPreviamente,
      esFavorita: this.#esFavorita,
      fechaVisionado: this.#fechaVisionado,
      esDestacada: this.#esDestacada,
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
      vistaPreviamente: data.vistaPreviamente ?? false,
      esFavorita: Boolean(data.esFavorita ?? data.favorita ?? false),
      fechaVisionado: data.fechaVisionado ?? null,
      esDestacada: Boolean(data.esDestacada ?? data.destacada ?? false),
      fechaCreacion: data.fechaCreacion,
      likes: data.likes,
    });
  }
}

module.exports = Resena;

