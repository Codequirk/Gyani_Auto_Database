/**
 * Migration: Allow null password_hash for OAuth users
 * 
 * Google OAuth users don't have passwords, so password_hash should be nullable
 */

exports.up = async (knex) => {
  console.log('⬆️  Running migration: Allow null password_hash for OAuth users');

  try {
    // Make password_hash nullable for OAuth support
    await knex.schema.table('companies', (table) => {
      table.string('password_hash', 255).nullable().alter();
    });
    console.log('✓ Made password_hash nullable');

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async (knex) => {
  console.log('⬇️  Rolling back migration: Allow null password_hash for OAuth users');

  try {
    // Revert password_hash to NOT NULL
    await knex.schema.table('companies', (table) => {
      table.string('password_hash', 255).notNullable().alter();
    });
    console.log('✓ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};
