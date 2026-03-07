// Setup script to create company_requests table if it doesn't exist
const db = require('./src/models/db');

async function setupTable() {
  try {
    const exists = await db.schema.hasTable('company_requests');
    
    if (!exists) {
      console.log('Creating company_requests table...');
      await db.schema.createTable('company_requests', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable();
        table.uuid('auto_id').notNullable();
        table.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
        table.string('rejection_reason', 500).nullable();
        table.boolean('dismissed_by_company').defaultTo(false);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
        table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
        
        table.index('company_id');
        table.index('status');
        table.index(['company_id', 'status', 'dismissed_by_company']);
      });
      console.log('✓ company_requests table created successfully');
    } else {
      console.log('✓ company_requests table already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating table:', error.message);
    process.exit(1);
  }
}

setupTable();
