class UsuarioController {
  #usuarioService;

  constructor({ usuarioService } = {}) {
    if (!usuarioService) {
      throw new Error('usuarioService es requerido');
    }
    this.#usuarioService = usuarioService;
  }

  async actualizarPerfil(req, res, next) {
    try {
      const userId = req?.session?.userId;
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { nombre, usuario, email } = req.body || {};
      const usuarioActualizado = await this.#usuarioService.actualizarPerfil(userId, {
        nombre,
        usuario,
        email,
      });

      const respuesta =
        usuarioActualizado && typeof usuarioActualizado.paraExponer === 'function'
          ? usuarioActualizado.paraExponer()
          : usuarioActualizado;

      return res.status(200).json(respuesta);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsuarioController;

