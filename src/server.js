const config = require('./config');
const { createContainer } = require('./container');
const { createApp } = require('./app');
const { defaultLogger } = require('./utils/logger');

const container = createContainer({ config });
const app = createApp({ config, services: container.services });

const server = app.listen(config.port, () => {
  defaultLogger.info(`Servidor iniciado en puerto ${config.port}`, { port: config.port, env: config.env });
});

const handleShutdown = (signal) => {
  defaultLogger.info(`Señal ${signal} recibida, iniciando apagado ordenado`);
  server.close(() => {
    defaultLogger.info('Servidor cerrado exitosamente');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  defaultLogger.error('Promesa rechazada no controlada (unhandledRejection)', {
    err: reason instanceof Error ? reason : new Error(String(reason))
  });
});

process.on('uncaughtException', (err) => {
  defaultLogger.error('Excepción no capturada crítica (uncaughtException)', { err });
  server.close(() => {
    process.exit(1);
  });
  setTimeout(() => {
    process.exit(1);
  }, 1000).unref();
});

module.exports = server;
