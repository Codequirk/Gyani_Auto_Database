require('dotenv').config();
const { Client } = require('pg');

console.log('[PG TEST] Starting direct pg connection test...');

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

(async () => {
  try {
    console.log('[PG TEST] Connecting to:', process.env.DB_HOST);
    await client.connect();
    console.log('✅ CONNECTED!');

    const result = await client.query('SELECT NOW()');
    console.log('✅ QUERY SUCCESSFUL!');
    console.log('[PG TEST] Server time:', result.rows[0]);

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ FAILED!');
    console.error('[PG TEST] Error:', err.message);
    console.error('[PG TEST] Code:', err.code);
    process.exit(1);
  }
})();
