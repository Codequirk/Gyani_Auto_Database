/**
 * Migration: Redesign auto status enum
 * - Replace enum: IN_BUSINESS, OUT_OF_BUSINESS, IDLE, ACTIVE -> IDLE, PREBOOKED, ACTIVE
 * - All status values will be calculated dynamically based on assignments
 */

exports.up = async (knex) => {
  console.log('\n✓ Starting migration: Redesign auto status enum...');
  
  try {
    // PostgreSQL: Drop the old enum type and create new one
    // First, we need to change the column type to text temporarily, then back to new enum
    
    console.log('Step 1: Dropping old constraint and changing column type...');
    
    // Change status column from enum to text to allow any value
    await knex.schema.table('autos', table => {
      table.dropColumn('status');
    });
    console.log('✓ Dropped old status column');
    
    // Add new status column with new enum
    await knex.schema.table('autos', table => {
      table.enum('status', ['IDLE', 'PREBOOKED', 'ACTIVE']).defaultTo('IDLE');
    });
    console.log('✓ Added new status column with updated enum');
    
    console.log('\nStep 2: Updating status values...');
    
    // Update ASSIGNED -> ACTIVE
    const activeCount = await knex('autos').where({ status: 'ACTIVE' }).orWhere({ status: 'ASSIGNED' }).update({ status: 'ACTIVE' });
    console.log(`✓ Updated ${activeCount} records to ACTIVE`);
    
    // Update PRE_ASSIGNED -> PREBOOKED
    const prebookedCount = await knex('autos').where({ status: 'PREBOOKED' }).orWhere({ status: 'PRE_ASSIGNED' }).update({ status: 'PREBOOKED' });
    console.log(`✓ Updated ${prebookedCount} records to PREBOOKED`);
    
    // Update IN_BUSINESS, OUT_OF_BUSINESS, and others -> IDLE
    const idleCount = await knex('autos')
      .whereIn('status', ['IN_BUSINESS', 'OUT_OF_BUSINESS'])
      .update({ status: 'IDLE' });
    console.log(`✓ Updated ${idleCount} records to IDLE`);

    console.log('\n✓ Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async (knex) => {
  console.log('\n✓ Rolling back migration: Redesign auto status enum...');
  
  try {
    // Change back to old enum (if needed)
    await knex.schema.table('autos', table => {
      table.dropColumn('status');
    });
    
    await knex.schema.table('autos', table => {
      table.enum('status', ['IN_BUSINESS', 'OUT_OF_BUSINESS', 'IDLE', 'ACTIVE']).defaultTo('IN_BUSINESS');
    });
    
    console.log('✓ Rollback completed successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
};
