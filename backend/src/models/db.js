const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const knex = require('knex');
const config = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
console.log(`[DB] Initializing with environment: ${environment}`);
console.log(`[DB] DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET'}`);
console.log(`[DB] Config connection type: ${typeof config[environment].connection}`);
if (typeof config[environment].connection === 'string') {
  console.log(`[DB] Connection string (first 50 chars): ${config[environment].connection.substring(0, 50)}`);
}

const db = knex(config[environment]);

module.exports = db;
