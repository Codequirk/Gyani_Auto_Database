require('dotenv').config();
const knex = require('knex');

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: { min: 0, max: 1 }
};

console.log('Testing connection with config:', {
  host: config.connection.host,
  port: config.connection.port,
  user: config.connection.user,
  database: config.connection.database,
  password: '***'
});

const db = knex(config);

db.raw('SELECT NOW()')
  .then(result => {
    console.log('✓ Connection successful!');
    console.log('Server time:', result.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Connection failed:');
    console.error(err.message);
    process.exit(1);
  });
