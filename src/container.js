const JsonFileRepository = require('./repositories/JsonFileRepository');
const UsuarioService = require('./services/usuarioService');
const TmdbService = require('./services/tmdbService');
const PeliculasController = require('./controllers/PeliculasController');
const createPeliculasRoutes = require('./routes/peliculasRoutes');

function createContainer({ config }) {
  const repos = {
    usuarioRepository: new JsonFileRepository(config.data.usuariosFile),
    resenaRepository: new JsonFileRepository(config.data.resenasFile)
  };

  const services = {
    usuarioService: new UsuarioService({ usuarioRepository: repos.usuarioRepository }),
    tmdbService: new TmdbService({ config })
  };

  const peliculasController = new PeliculasController({
    tmdbService: services.tmdbService
  });

  services.peliculasController = peliculasController;
  services.peliculasRoutes = createPeliculasRoutes({ peliculasController });

  return {
    repos,
    services
  };
}

module.exports = { createContainer };
