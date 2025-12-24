require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'admin_panel_db',
    },
    migrations: {
      directory: './src/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './src/seeds',
      extension: 'js',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './src/migrations',
      extension: 'js',
    },
    seeds: {
      directory: './src/seeds',
      extension: 'js',
    },
  },
};
