const JsonFileRepository = require('./repositories/JsonFileRepository');

function createContainer({ config }) {
  const repos = {
    usuarioRepository: new JsonFileRepository(config.data.usuariosFile),
    resenaRepository: new JsonFileRepository(config.data.resenasFile)
  };

  const services = {};

  return {
    repos,
    services
  };
}

module.exports = { createContainer };
