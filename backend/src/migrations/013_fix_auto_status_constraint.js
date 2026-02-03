/**
 * Migration: Fix auto status values for Supabase PostgreSQL
 * - Update old MongoDB status values (ASSIGNED, PRE_ASSIGNED) to PostgreSQL constraint values (ACTIVE, PREBOOKED, IDLE)
 * - Update assignment statuses to match
 */

exports.up = async (knex) => {
  console.log('\n✓ Starting migration: Fix auto status values for PostgreSQL...');
  
  try {
    // Update autos table
    // Step 1: Rename ASSIGNED to ACTIVE
    const assignedCount = await knex('autos')
      .where({ status: 'ASSIGNED', deleted_at: null })
      .update({ status: 'ACTIVE', updated_at: new Date() });
    console.log(`✓ Updated ${assignedCount} ASSIGNED autos to ACTIVE`);

    // Step 2: Rename PRE_ASSIGNED to PREBOOKED
    const preAssignedCount = await knex('autos')
      .where({ status: 'PRE_ASSIGNED', deleted_at: null })
      .update({ status: 'PREBOOKED', updated_at: new Date() });
    console.log(`✓ Updated ${preAssignedCount} PRE_ASSIGNED autos to PREBOOKED`);

    // Update assignments table
    // Step 3: Rename ASSIGNED to ACTIVE in assignments
    const assignmentAssignedCount = await knex('assignments')
      .where({ status: 'ASSIGNED', deleted_at: null })
      .update({ status: 'ACTIVE', updated_at: new Date() });
    console.log(`✓ Updated ${assignmentAssignedCount} ASSIGNED assignments to ACTIVE`);

    // Step 4: Rename PRE_ASSIGNED to PREBOOKED in assignments
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
  
  try {
    // Reverse for autos table
    await knex('autos')
      .where({ status: 'ACTIVE', deleted_at: null })
      .update({ status: 'ASSIGNED', updated_at: new Date() });
    console.log('✓ Renamed ACTIVE autos back to ASSIGNED');

    await knex('autos')
      .where({ status: 'PREBOOKED', deleted_at: null })
      .update({ status: 'PRE_ASSIGNED', updated_at: new Date() });
    console.log('✓ Renamed PREBOOKED autos back to PRE_ASSIGNED');

    // Reverse for assignments table
    await knex('assignments')
      .where({ status: 'ACTIVE', deleted_at: null })
      .update({ status: 'ASSIGNED', updated_at: new Date() });
    console.log('✓ Renamed ACTIVE assignments back to ASSIGNED');

    await knex('assignments')
      .where({ status: 'PREBOOKED', deleted_at: null })
      .update({ status: 'PRE_ASSIGNED', updated_at: new Date() });
    console.log('✓ Renamed PREBOOKED assignments back to PRE_ASSIGNED');

    console.log('✓ Rollback completed successfully!');
  } catch (error) {
    console.error('✗ Rollback failed:', error.message);
    throw error;
  }
};
