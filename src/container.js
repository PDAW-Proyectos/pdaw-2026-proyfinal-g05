const JsonFileRepository = require('./repositories/JsonFileRepository');
const UsuarioService = require('./services/usuarioService');
const ResenaService = require('./services/resenaService');
const TmdbService = require('./services/tmdbService');
const TmdbAdapter = require('./services/tmdbAdapter');
const PeliculasController = require('./controllers/PeliculasController');
const createPeliculasRoutes = require('./routes/peliculasRoutes');

function createContainer({ config }) {
  const repos = {
    usuarioRepository: new JsonFileRepository(config.data.usuariosFile),
    resenaRepository: new JsonFileRepository(config.data.resenasFile)
  };

  const services = {
    usuarioService: new UsuarioService({ usuarioRepository: repos.usuarioRepository }),
    resenaService: new ResenaService({
      resenaRepository: repos.resenaRepository,
      usuarioRepository: repos.usuarioRepository
    }),
    tmdbService: new TmdbService({ config })
  };

  const tmdbAdapter = new TmdbAdapter({ tmdbService: services.tmdbService });

  const peliculasController = new PeliculasController({
    tmdbAdapter: tmdbAdapter
  });

  services.peliculasController = peliculasController;
  services.peliculasRoutes = createPeliculasRoutes({ peliculasController });

  return {
    repos,
    services
  };
}

module.exports = { createContainer };
