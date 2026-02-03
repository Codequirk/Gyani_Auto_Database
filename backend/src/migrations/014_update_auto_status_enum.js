/**
 * Migration: Update auto status enum to include PREBOOKED
 * Add PREBOOKED to the status enum in autos table
 */

exports.up = async (knex) => {
  console.log('\n✓ Starting migration: Update auto status enum...');
  
  try {
    // For PostgreSQL, we need to alter the type
    // First, create new type with all values
    await knex.raw(`
      ALTER TYPE auto_status ADD VALUE 'PREBOOKED' BEFORE 'ACTIVE';
    `).catch(() => {
      console.log('Note: PREBOOKED value might already exist, continuing...');
    });

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async (knex) => {
  console.log('\n✓ Rolling back migration: Update auto status enum...');
  console.log('Note: Cannot remove enum values in PostgreSQL easily, skipping rollback');
};
