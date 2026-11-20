class UsuarioController {
  #usuarioService;

  constructor({ usuarioService } = {}) {
    if (!usuarioService) {
      throw new Error('usuarioService es requerido');
    }
    this.#usuarioService = usuarioService;
  }

  async listar(req, res, next) {
    try {
      const solicitanteId = req?.session?.userId;
      if (!solicitanteId || typeof solicitanteId !== 'string' || solicitanteId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { pagina, limite, busqueda, rol } = req.query || {};
      const resultado = await this.#usuarioService.listarUsuarios(solicitanteId, {
        pagina,
        limite,
        busqueda,
        rol
      });

      return res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async eliminar(req, res, next) {
    try {
      const moderadorId = req?.session?.userId;
      if (!moderadorId || typeof moderadorId !== 'string' || moderadorId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { id } = req.params || {};
      const eliminarResenas =
        req.query?.eliminarResenas === 'true' ||
        req.body?.eliminarResenas === true ||
        req.body?.eliminarResenas === 'true';

      await this.#usuarioService.eliminarUsuario(moderadorId, id, { eliminarResenas });

      return res.status(204).end();
    } catch (error) {
      next(error);
    }
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

  async obtenerWatchlist(req, res, next) {
    try {
      const sessionUserId = req?.session?.userId;
      if (!sessionUserId || typeof sessionUserId !== 'string' || sessionUserId.trim() === '') {
        return res.status(401).json({ error: 'Acceso no autorizado: se requiere iniciar sesión' });
      }

      const { id } = req.params || {};
      const watchlist = await this.#usuarioService.obtenerWatchlist(id, {
        sessionUserId
      });

      return res.status(200).json({
        id: String(id).trim(),
        watchlist: Array.isArray(watchlist) ? watchlist : []
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

