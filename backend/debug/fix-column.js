#!/usr/bin/env node

/**
 * Quick fix: Add dismissed_by_company column to company_tickets if it doesn't exist
 */

require('dotenv').config();
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'admin_panel_db',
  },
});

async function addColumn() {
  try {
    console.log('Attempting to add dismissed_by_company column...');
    
    // Raw SQL to add column if not exists
    await db.raw(`
      ALTER TABLE company_tickets
      ADD COLUMN IF NOT EXISTS dismissed_by_company BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('✓ Column added successfully');
    
    // Create index
    await db.raw(`
      CREATE INDEX IF NOT EXISTS idx_company_tickets_company_status_dismissed
      ON company_tickets(company_id, ticket_status, dismissed_by_company);
    `);
    
    console.log('✓ Index created successfully');
    
    // Verify
    const result = await db.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'company_tickets' AND column_name = 'dismissed_by_company'
    `);
    
    if (result.rows && result.rows.length > 0) {
      console.log('✓ Verification successful - column exists');
    } else {
      console.log('⚠ Warning: Column may not exist, but no error was thrown');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

addColumn();
