class AuthController {
  #usuarioService;

  constructor({ usuarioService }) {
    if (!usuarioService) {
      throw new Error('usuarioService es requerido');
    }
    this.#usuarioService = usuarioService;
  }

  async register(req, res, next) {
    try {
      const { nombre, email, password, rol } = req.body || {};
      const usuario = await this.#usuarioService.registrar({ nombre, email, password, rol });

      if (req.session && typeof req.session.regenerate === 'function') {
        req.session.regenerate((err) => {
          if (err) return next(err);
          req.session.userId = usuario.id;
          return res.status(201).json(usuario.paraExponer());
        });
        return;
      }

      if (req.session) {
        req.session.userId = usuario.id;
      }

      return res.status(201).json(usuario.paraExponer());
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const usuario = await this.#usuarioService.login({ email, password });

      if (req.session && typeof req.session.regenerate === 'function') {
        req.session.regenerate((err) => {
          if (err) return next(err);
          req.session.userId = usuario.id;
          return res.status(200).json(usuario.paraExponer());
        });
        return;
      }

      if (req.session) {
        req.session.userId = usuario.id;
      }

      return res.status(200).json(usuario.paraExponer());
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.session && typeof req.session.destroy === 'function') {
        req.session.destroy((err) => {
          if (err) return next(err);
          res.clearCookie('connect.sid');
          return res.status(204).end();
        });
        return;
      }

      res.clearCookie('connect.sid');
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'No hay sesión activa' });
      }

      const usuario = await this.#usuarioService.obtenerPorId(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      return res.status(200).json(usuario.paraExponer());
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
