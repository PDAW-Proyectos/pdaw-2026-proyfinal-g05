const bcrypt = require('bcryptjs');
const { Usuario } = require('../models/Usuario');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

class UsuarioService {
  #usuarioRepository;

  constructor(options = {}) {
    const repository = options?.usuarioRepository || options;
    if (!repository || (typeof repository.leer !== 'function' && typeof repository.findByEmail !== 'function')) {
      throw new Error('usuarioRepository es requerido');
    }
    this.#usuarioRepository = repository;
  }

  async login({ email, password } = {}) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new ValidationError('El email es obligatorio');
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new ValidationError('La contraseña es obligatoria');
    }

    const emailNormalizado = email.trim().toLowerCase();
    let usuarioData = null;

    if (typeof this.#usuarioRepository.leer === 'function') {
      const usuarios = await this.#usuarioRepository.leer();
      usuarioData = usuarios.find(
        (u) => typeof u.email === 'string' && u.email.trim().toLowerCase() === emailNormalizado
      );
    } else if (typeof this.#usuarioRepository.findByEmail === 'function') {
      usuarioData = await this.#usuarioRepository.findByEmail(emailNormalizado);
    }

    if (!usuarioData) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const usuario = usuarioData instanceof Usuario ? usuarioData : Usuario.fromJSON(usuarioData);
    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValido) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    return usuario;
  }
}

module.exports = UsuarioService;
