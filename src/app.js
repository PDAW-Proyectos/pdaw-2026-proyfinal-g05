const express = require('express');
const session = require('express-session');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const createAuthRoutes = require('./routes/authRoutes');
const createUsuarioRoutes = require('./routes/usuarioRoutes');
const createResenaRoutes = require('./routes/resenaRoutes');

function createApp({ config, services } = {}) {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(session({
    secret: config?.sessionSecret || 'movieclub_session_secret_default',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config?.env === 'production'
    }
  }));

  app.use(express.static(config?.publicDir || path.resolve(__dirname, '../public')));

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'MovieClub API' });
  });

  app.use('/api/auth', createAuthRoutes({ usuarioService: services?.usuarioService }));
  app.use('/api/usuarios', createUsuarioRoutes({ usuarioService: services?.usuarioService }));
  app.use('/api/resenas', createResenaRoutes({ resenaService: services?.resenaService }));
  if (services?.peliculasRoutes) {
    app.use('/api/peliculas', services.peliculasRoutes);
  }

  app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
