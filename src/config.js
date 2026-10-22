require('dotenv').config();
const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'movieclub_session_secret_default',
  publicDir: path.resolve(__dirname, '../public'),
  data: {
    usuariosFile: path.resolve(__dirname, '../data/usuarios.json'),
    resenasFile: path.resolve(__dirname, '../data/resenas.json')
  }
};

module.exports = config;
