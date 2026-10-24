const bcrypt = require('bcryptjs');
const { Usuario } = require('../models/Usuario');
const { ValidationError, UnauthorizedError } = require('../utils/errors');

class UsuarioService {
  #usuarioRepository;

  constructor({ usuarioRepository }) {
    if (!usuarioRepository) {
      throw new Error('usuarioRepository es requerido');
    }
    this.#usuarioRepository = usuarioRepository;
  }

  async login({ email, password }) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new ValidationError('El email es obligatorio');
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new ValidationError('La contraseña es obligatoria');
    }

    const usuarios = await this.#usuarioRepository.leer();
    const emailNormalizado = email.trim().toLowerCase();
    const usuarioData = usuarios.find(
      (u) => typeof u.email === 'string' && u.email.toLowerCase() === emailNormalizado
    );

    if (!usuarioData) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const usuario = Usuario.fromJSON(usuarioData);
    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValido) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    return usuario;
  }
}

module.exports = UsuarioService;
