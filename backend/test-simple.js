require('dotenv').config();
const knex = require('knex');

console.log('[TEST] Starting simple connection test...');
console.log('[TEST] DB_HOST:', process.env.DB_HOST);
console.log('[TEST] DB_PORT:', process.env.DB_PORT);

// Import config and remove DATABASE_URL to force individual params
const config = require('./knexfile');
delete process.env.DATABASE_URL;

const environment = process.env.NODE_ENV || 'development';
console.log('[TEST] Environment:', environment);

const cfg = config[environment];
console.log('[TEST] Using individual connection params (not DATABASE_URL)');

const db = knex(cfg);

// Try a simple query
db.raw('SELECT NOW()')
  .then(result => {
    console.log('✅ DATABASE CONNECTION SUCCESSFUL!');
    console.log('[TEST] Server time:', result.rows?.[0] || result);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ DATABASE CONNECTION FAILED!');
    console.error('[TEST] Error:', err.message);
    console.error('[TEST] Code:', err.code);
    process.exit(1);
  });

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ CONNECTION TIMEOUT!');
  process.exit(1);
}, 10000);
