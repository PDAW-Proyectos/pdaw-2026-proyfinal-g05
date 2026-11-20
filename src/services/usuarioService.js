const bcrypt = require('bcryptjs');
const { Usuario, Espectador, Moderador } = require('../models/Usuario');
const {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError
} = require('../utils/errors');

class UsuarioService {
  #usuarioRepository;

  constructor(options = {}) {
    const repository = options?.usuarioRepository || options;
    if (!repository || (typeof repository.leer !== 'function' && typeof repository.findByEmail !== 'function')) {
      throw new Error('usuarioRepository es requerido');
    }
    this.#usuarioRepository = repository;
  }

  async registrar({ nombre, email, password, confirmPassword, rol } = {}) {
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

    if (confirmPassword !== undefined && confirmPassword !== password) {
      throw new ValidationError('Las contraseñas no coinciden');
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

  async toggleFavorita(userId, peliculaId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    if (!peliculaId || String(peliculaId).trim() === '') {
      throw new ValidationError('El id de película es obligatorio');
    }

    const idLimpio = userId.trim();
    const peliLimpia = String(peliculaId).trim();
    const existente = await this.obtenerPorId(idLimpio);
    if (!existente) {
      throw new NotFoundError('Usuario no encontrado');
    }

    if (existente.esFavorita(peliLimpia)) {
      existente.quitarDeFavoritas(peliLimpia);
    } else {
      existente.agregarAFavoritas(peliLimpia);
    }

    if (typeof this.#usuarioRepository.guardar === 'function') {
      await this.#usuarioRepository.guardar(existente);
    }

    return existente;
  }

  async obtenerWatchlist(targetUserId, { sessionUserId } = {}) {
    const idSesion = sessionUserId !== undefined ? sessionUserId : targetUserId;
    if (!idSesion || typeof idSesion !== 'string' || idSesion.trim() === '') {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      throw new ValidationError('El id de usuario es obligatorio');
    }

    const targetLimpio = targetUserId.trim();
    const sesionLimpia = idSesion.trim();

    if (targetLimpio !== sesionLimpia) {
      throw new ForbiddenError('No tienes permisos para consultar la watchlist de otro usuario');
    }

    const existente = await this.obtenerPorId(targetLimpio);
    if (!existente) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return Array.isArray(existente.watchlist) ? existente.watchlist : [];
  }

  async actualizarWatchlist(targetUserId, { sessionUserId, peliculaId, idPelicula, accion } = {}) {
    const idSesion = sessionUserId !== undefined ? sessionUserId : targetUserId;
    if (!idSesion || typeof idSesion !== 'string' || idSesion.trim() === '') {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      throw new ValidationError('El id de usuario es obligatorio');
    }

    const targetLimpio = targetUserId.trim();
    const sesionLimpia = idSesion.trim();

    if (targetLimpio !== sesionLimpia) {
      throw new ForbiddenError('No tienes permisos para modificar la watchlist de otro usuario');
    }

    const rawPeli = peliculaId !== undefined ? peliculaId : idPelicula;
    if (
      rawPeli === undefined ||
      rawPeli === null ||
      typeof rawPeli === 'boolean' ||
      typeof rawPeli === 'object' ||
      String(rawPeli).trim() === ''
    ) {
      throw new ValidationError('El id de película es obligatorio');
    }

    const peliLimpia = String(rawPeli).trim();

    if (accion !== undefined && accion !== null) {
      const accionNorm = String(accion).trim().toLowerCase();
      if (!['agregar', 'quitar', 'add', 'remove', 'toggle'].includes(accionNorm)) {
        throw new ValidationError('La acción debe ser "agregar" o "quitar"');
      }
    }

    const existente = await this.obtenerPorId(targetLimpio);
    if (!existente) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const accionNorm = accion ? String(accion).trim().toLowerCase() : 'toggle';

    if (accionNorm === 'agregar' || accionNorm === 'add') {
      existente.agregarAWatchlist(peliLimpia);
    } else if (accionNorm === 'quitar' || accionNorm === 'remove') {
      existente.quitarDeWatchlist(peliLimpia);
    } else {
      if (existente.estaEnWatchlist(peliLimpia)) {
        existente.quitarDeWatchlist(peliLimpia);
      } else {
        existente.agregarAWatchlist(peliLimpia);
      }
    }

    if (typeof this.#usuarioRepository.guardar === 'function') {
      await this.#usuarioRepository.guardar(existente);
    }

    return existente;
  }

  async cambiarRol(moderadorId, targetUserId, nuevoRol, { medioDePrensa } = {}) {
    if (!moderadorId || typeof moderadorId !== 'string' || moderadorId.trim() === '') {
      throw new UnauthorizedError('Acceso no autorizado: se requiere iniciar sesión');
    }

    const moderador = await this.obtenerPorId(moderadorId.trim());
    if (
      !moderador ||
      (!moderador.puedeModerar?.() && !(moderador instanceof Moderador) && moderador.rol !== 'Moderador')
    ) {
      throw new ForbiddenError('Acceso denegado: permisos insuficientes para realizar esta acción');
    }

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      throw new ValidationError('El ID del usuario es requerido');
    }

    const targetUser = await this.obtenerPorId(targetUserId.trim());
    if (!targetUser) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const rolesValidos = ['Espectador', 'Critico', 'Moderador'];
    if (!rolesValidos.includes(nuevoRol)) {
      throw new ValidationError('El rol especificado es inválido');
    }

    const usuarioConNuevoRol = typeof moderador.cambiarRolUsuario === 'function'
      ? moderador.cambiarRolUsuario(targetUser, nuevoRol, { medioDePrensa })
      : (() => {
          const raw = targetUser.toJSON();
          raw.rol = nuevoRol;
          if (nuevoRol === 'Critico') {
            raw.medioDePrensa = medioDePrensa || raw.medioDePrensa || 'Prensa Oficial MovieClub';
          }
          return Usuario.fromJSON(raw);
        })();

    if (typeof this.#usuarioRepository.guardar === 'function') {
      await this.#usuarioRepository.guardar(usuarioConNuevoRol);
    }

    return usuarioConNuevoRol;
  }
}

module.exports = UsuarioService;
