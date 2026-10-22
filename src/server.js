const config = require('./config');
const { createContainer } = require('./container');
const { createApp } = require('./app');

const container = createContainer({ config });
const app = createApp({ config, services: container.services });

const server = app.listen(config.port, () => {
  console.log(`Servidor iniciado en puerto ${config.port}`);
});

const handleShutdown = (signal) => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = server;
