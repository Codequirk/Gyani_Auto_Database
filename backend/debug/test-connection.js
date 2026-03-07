require('dotenv').config();
const db = require('./src/models/db');

async function testConnection() {
  try {
    // Test connection
    console.log('Testing Supabase connection...');
    const result = await db.raw('SELECT 1');
    console.log('✅ Connection successful!');

    // List tables
    const tables = await db.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in Supabase:');
    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found - you need to run migrations');
    } else {
      tables.rows.forEach(row => console.log('  -', row.table_name));
    }

    // Check for data
    console.log('\n📊 Data Summary:');
    const tableNames = tables.rows.map(r => r.table_name);
    
    for (const table of tableNames) {
      const count = await db(table).count('* as count').first();
      console.log(`  ${table}: ${count.count} rows`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testConnection();
