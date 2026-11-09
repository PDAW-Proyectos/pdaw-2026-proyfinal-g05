const Resena = require('../models/Resena');

class ResenaService {
  #resenaRepository;

  constructor(options = {}) {
    const repository = options?.resenaRepository || options;
    if (!repository || (typeof repository.guardar !== 'function' && typeof repository.leer !== 'function')) {
      throw new Error('resenaRepository es requerido');
    }
    this.#resenaRepository = repository;
  }

  async crear({ autorId, peliculaId, puntuacion, texto, contieneSpoilers } = {}) {
    const resena = new Resena({
      autorId,
      peliculaId,
      puntuacion,
      texto,
      contieneSpoilers
    });

    if (typeof this.#resenaRepository.guardar === 'function') {
      await this.#resenaRepository.guardar(resena);
    }

    return resena;
  }
}

module.exports = ResenaService;

