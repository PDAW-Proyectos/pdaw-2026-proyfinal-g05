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

      if (req.session && respuesta?.nombre) {
        req.session.usuarioNombre = respuesta.nombre;
      }

      return res.status(200).json(respuesta);
    } catch (error) {
      next(error);
    }
  }

  async toggleFavorita(req, res, next) {
    try {
      const userId = req?.session?.userId;
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { peliculaId } = req.params || {};
      const usuarioActualizado = await this.#usuarioService.toggleFavorita(userId, peliculaId);

      const respuesta =
        usuarioActualizado && typeof usuarioActualizado.paraExponer === 'function'
          ? usuarioActualizado.paraExponer()
          : usuarioActualizado;

      return res.status(200).json({
        ...respuesta,
        favoritas: Array.isArray(usuarioActualizado?.favoritas) ? usuarioActualizado.favoritas : []
      });
    } catch (error) {
      next(error);
    }
  }

  async actualizarWatchlist(req, res, next) {
    try {
      const sessionUserId = req?.session?.userId;
      if (!sessionUserId || typeof sessionUserId !== 'string' || sessionUserId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { id } = req.params || {};
      const { peliculaId, idPelicula, accion } = req.body || {};

      const usuarioActualizado = await this.#usuarioService.actualizarWatchlist(id, {
        sessionUserId,
        peliculaId,
        idPelicula,
        accion
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

  async cambiarRol(req, res, next) {
    try {
      const moderadorId = req?.session?.userId;
      const targetUserId = req.params.id;
      const { rol, medioDePrensa } = req.body || {};

      if (!moderadorId) {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      if (!rol) {
        return res.status(400).json({ error: 'El rol es obligatorio' });
      }

      const usuarioActualizado = await this.#usuarioService.cambiarRol(
        moderadorId,
        targetUserId,
        rol,
        { medioDePrensa }
      );

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

