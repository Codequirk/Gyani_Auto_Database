/**
 * Migration: Create company_users table for company portal authentication
 * Handles: Email verification, OTP flow, registration completion
 */

exports.up = async function(knex) {
  // Create company_users table
  await knex.schema.createTable('company_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Email & verification
    table.string('email').unique().notNullable();
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at').nullable();
    
    // Authentication
    table.text('password').nullable(); // Hashed password (nullable for OAuth-only users initially)
    table.string('google_id').nullable().unique(); // Google OAuth ID
    
    // Password reset
    table.text('reset_token').nullable();
    table.timestamp('reset_token_expires_at').nullable();
    
    // Company details
    table.string('company_name').nullable();
    table.string('phone_number').nullable();
    table.string('company_person').nullable(); // Contact person name
    
    // Audit
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login').nullable();
    table.timestamp('deleted_at').nullable(); // Soft delete
  });

  console.log('✓ Created company_users table');
};

exports.down = async function(knex) {
  await knex.schema.dropTable('company_users');
  console.log('✓ Dropped company_users table');
};
