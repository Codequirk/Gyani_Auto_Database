const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    pool: {
      min: 0,
      max: 3,
      reapIntervalMillis: 1000,
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
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
    },
    pool: {
      min: 0,
      max: 5,
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
};
