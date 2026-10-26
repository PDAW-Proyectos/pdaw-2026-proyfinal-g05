class AuthController {
  #usuarioService;

  constructor({ usuarioService }) {
    if (!usuarioService) {
      throw new Error('usuarioService es requerido');
    }
    this.#usuarioService = usuarioService;
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
}

module.exports = AuthController;
