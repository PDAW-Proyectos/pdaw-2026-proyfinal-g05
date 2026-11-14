const bcrypt = require('bcryptjs');
const { Usuario, Espectador } = require('../models/Usuario');
const { ValidationError, UnauthorizedError, ConflictError, NotFoundError } = require('../utils/errors');

class UsuarioService {
  #usuarioRepository;

  constructor(options = {}) {
    const repository = options?.usuarioRepository || options;
    if (!repository || (typeof repository.leer !== 'function' && typeof repository.findByEmail !== 'function')) {
      throw new Error('usuarioRepository es requerido');
    }
    this.#usuarioRepository = repository;
  }

  async registrar({ nombre, email, password, rol } = {}) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      throw new ValidationError('El nombre es obligatorio');
    }

    if (nombre.trim().length > 20) {
      throw new ValidationError('El nombre no puede tener más de 20 caracteres');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new ValidationError('El email es obligatorio y debe tener formato válido');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    }

    if (rol && String(rol).trim() !== 'Espectador') {
      throw new ValidationError('No está permitido seleccionar un rol en el registro');
    }

    const emailNormalizado = email.trim().toLowerCase();
    let usuarioExistente = null;

    if (typeof this.#usuarioRepository.findByEmail === 'function') {
      usuarioExistente = await this.#usuarioRepository.findByEmail(emailNormalizado);
    } else if (typeof this.#usuarioRepository.leer === 'function') {
      const usuarios = await this.#usuarioRepository.leer();
      usuarioExistente = usuarios.find(
        (u) => typeof u.email === 'string' && u.email.trim().toLowerCase() === emailNormalizado
      );
    }

    if (usuarioExistente) {
      throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const nuevoUsuario = new Espectador({
      id,
      nombre: nombre.trim(),
      email: emailNormalizado,
      passwordHash
    });

    if (typeof this.#usuarioRepository.guardar === 'function') {
      await this.#usuarioRepository.guardar(nuevoUsuario);
    }

    return nuevoUsuario;
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

  async obtenerPorId(id) {
    if (!id || typeof id !== 'string') {
      return null;
    }

    let usuarioData = null;

    if (typeof this.#usuarioRepository.findById === 'function') {
      usuarioData = await this.#usuarioRepository.findById(id);
    } else if (typeof this.#usuarioRepository.leer === 'function') {
      const usuarios = await this.#usuarioRepository.leer();
      usuarioData = usuarios.find((u) => u.id === id);
    }

    if (!usuarioData) {
      return null;
    }

    return usuarioData instanceof Usuario ? usuarioData : Usuario.fromJSON(usuarioData);
  }

  async actualizarPerfil(userId, { nombre, usuario, email } = {}) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    if (email !== undefined) {
      throw new ValidationError('El correo electrónico no se puede modificar. Contactá con soporte para este cambio.');
    }

    if (nombre === undefined && usuario === undefined) {
      throw new ValidationError('Debes proporcionar al menos el nombre o el usuario (@) para actualizar');
    }

    const idLimpio = userId.trim();
    const existente = await this.obtenerPorId(idLimpio);
    if (!existente) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (usuario !== undefined && typeof usuario === 'string') {
      const handleLimpio = usuario.trim().replace(/^@+/, '').toLowerCase();
      if (handleLimpio && typeof this.#usuarioRepository.leer === 'function') {
        const usuarios = await this.#usuarioRepository.leer();
        const duplicado = usuarios.find(
          (u) =>
            u.id !== idLimpio &&
            typeof (u.usuario || u.id) === 'string' &&
            (u.usuario || u.id).trim().replace(/^@+/, '').toLowerCase() === handleLimpio
        );
        if (duplicado) {
          throw new ConflictError('Ese nombre de usuario (@) ya está en uso');
        }
      }
    }

    existente.actualizarDatosPersonales({ nombre, usuario });

    if (typeof this.#usuarioRepository.guardar === 'function') {
      await this.#usuarioRepository.guardar(existente);
    }

    return existente;
  }
}

module.exports = UsuarioService;
