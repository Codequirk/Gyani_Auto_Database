/**
 * Migration: Add OAuth columns to companies table
 * 
 * Adds support for Google OAuth authentication:
 * - google_id: Store Google's unique identifier
 * - auth_provider: Track authentication method (local or google)
 * - is_profile_complete: Gate access until profile is completed
 */

exports.up = async (knex) => {
  console.log('⬆️  Running migration: Add OAuth columns to companies table');

  try {
    // Check if columns already exist
    const hasGoogleId = await knex.schema.hasColumn('companies', 'google_id');
    const hasAuthProvider = await knex.schema.hasColumn('companies', 'auth_provider');
    const hasProfileComplete = await knex.schema.hasColumn('companies', 'is_profile_complete');

    if (!hasGoogleId) {
      await knex.schema.table('companies', (table) => {
        table.string('google_id', 255).unique().nullable();
        console.log('✓ Added google_id column');
      });
    }

    if (!hasAuthProvider) {
      await knex.schema.table('companies', (table) => {
        table.string('auth_provider', 50).defaultTo('local').notNullable();
        console.log('✓ Added auth_provider column');
      });
    }

    if (!hasProfileComplete) {
      await knex.schema.table('companies', (table) => {
        table.boolean('is_profile_complete').defaultTo(false).notNullable();
        console.log('✓ Added is_profile_complete column');
      });
    }

    // Create indexes for better query performance (with error handling if they already exist)
    try {
      if (hasGoogleId || !hasGoogleId) { // Only create if we just added the column
        await knex.raw('CREATE INDEX IF NOT EXISTS idx_companies_google_id ON companies(google_id);');
        console.log('✓ Created index on google_id');
      }
    } catch (e) {
      console.log('ℹ️  Index idx_companies_google_id may already exist');
    }

    try {
      if (hasAuthProvider || !hasAuthProvider) { // Only create if we just added the column
        await knex.raw('CREATE INDEX IF NOT EXISTS idx_companies_auth_provider ON companies(auth_provider);');
        console.log('✓ Created index on auth_provider');
      }
    } catch (e) {
      console.log('ℹ️  Index idx_companies_auth_provider may already exist');
    }

    try {
      if (hasProfileComplete || !hasProfileComplete) { // Only create if we just added the column
        await knex.raw('CREATE INDEX IF NOT EXISTS idx_companies_profile_complete ON companies(is_profile_complete);');
        console.log('✓ Created index on is_profile_complete');
      }
    } catch (e) {
      console.log('ℹ️  Index idx_companies_profile_complete may already exist');
    }

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async (knex) => {
  console.log('⬇️  Rolling back migration: Add OAuth columns to companies table');

  try {
    await knex.schema.table('companies', (table) => {
      table.dropColumn('is_profile_complete');
      table.dropColumn('auth_provider');
      table.dropColumn('google_id');
    });
    console.log('✓ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};
