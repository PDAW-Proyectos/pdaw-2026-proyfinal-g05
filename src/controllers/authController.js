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

      if (req.session) {
        req.session.userId = usuario.id;
        req.session.userRole = usuario.rol;
      }

      return res.status(200).json(usuario.paraExponer());
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
