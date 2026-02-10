/**
 * Migration: Fix auto status values for PostgreSQL
 * - Handle enum migration from old values to IDLE, PREBOOKED, ACTIVE
 * - Update all references in autos and assignments tables
 */

exports.up = async (knex) => {
  console.log('\n✓ Starting migration: Fix auto status values for PostgreSQL...');
  
  try {
    console.log('Step 1: Updating autos table status values...');
    
    // Update autos table - first change any ASSIGNED to ACTIVE
    const assignedCount = await knex('autos')
      .where({ status: 'ASSIGNED', deleted_at: null })
      .update({ status: 'ACTIVE', updated_at: new Date() });
    console.log(`✓ Updated ${assignedCount} ASSIGNED autos to ACTIVE`);

    // Change PRE_ASSIGNED to PREBOOKED
    const preAssignedCount = await knex('autos')
      .where({ status: 'PRE_ASSIGNED', deleted_at: null })
      .update({ status: 'PREBOOKED', updated_at: new Date() });
    console.log(`✓ Updated ${preAssignedCount} PRE_ASSIGNED autos to PREBOOKED`);

    // Set any other values to IDLE
    const idleCount = await knex('autos')
      .whereNotIn('status', ['IDLE', 'PREBOOKED', 'ACTIVE'])
      .whereNull('deleted_at')
      .update({ status: 'IDLE', updated_at: new Date() });
    console.log(`✓ Set ${idleCount} autos to IDLE`);

    console.log('Step 2: Updating assignments table status values...');
    
    // Update assignments table similarly
    const assignmentAssignedCount = await knex('assignments')
      .where({ status: 'ASSIGNED', deleted_at: null })
      .update({ status: 'ACTIVE', updated_at: new Date() });
    console.log(`✓ Updated ${assignmentAssignedCount} ASSIGNED assignments to ACTIVE`);

    const assignmentPreAssignedCount = await knex('assignments')
      .where({ status: 'PRE_ASSIGNED', deleted_at: null })
      .update({ status: 'PREBOOKED', updated_at: new Date() });
    console.log(`✓ Updated ${assignmentPreAssignedCount} PRE_ASSIGNED assignments to PREBOOKED`);

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async (knex) => {
  console.log('\n✓ Rolling back migration: Fix auto status values...');
  console.log('Note: Rollback will attempt to revert status values');
  
  try {
    // Reverse for autos table - best effort rollback
    await knex('autos')
      .where({ status: 'ACTIVE', deleted_at: null })
      .update({ status: 'ASSIGNED', updated_at: new Date() });
    
    await knex('autos')
      .where({ status: 'PREBOOKED', deleted_at: null })
      .update({ status: 'PRE_ASSIGNED', updated_at: new Date() });

    // Reverse for assignments table
    await knex('assignments')
      .where({ status: 'ACTIVE', deleted_at: null })
      .update({ status: 'ASSIGNED', updated_at: new Date() });
    
    await knex('assignments')
      .where({ status: 'PREBOOKED', deleted_at: null })
      .update({ status: 'PRE_ASSIGNED', updated_at: new Date() });

    console.log('✓ Rollback completed successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
  }
};
