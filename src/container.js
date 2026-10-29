const JsonFileRepository = require('./repositories/JsonFileRepository');
const UsuarioService = require('./services/usuarioService');
const TmdbService = require('./services/tmdbService');

function createContainer({ config }) {
  const repos = {
    usuarioRepository: new JsonFileRepository(config.data.usuariosFile),
    resenaRepository: new JsonFileRepository(config.data.resenasFile)
  };

  const services = {
    usuarioService: new UsuarioService({ usuarioRepository: repos.usuarioRepository }),
    tmdbService: new TmdbService({ config })
  };

  return {
    repos,
    services
  };
}

module.exports = { createContainer };
