/**
 * Migration: Create company_otps table for OTP storage
 * Handles: Email verification OTPs with expiry
 */

exports.up = async function(knex) {
  await knex.schema.createTable('company_otps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    table.string('email').notNullable();
    table.string('otp').notNullable(); // 6-digit OTP as string for consistency
    
    // Expiry handling
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Tracking
    table.integer('attempts').defaultTo(0);
    table.timestamp('last_attempt').nullable();
    
    // Indexes for quick lookup
    table.index('email');
    table.index('expires_at');
  });

  console.log('✓ Created company_otps table');
};

exports.down = async function(knex) {
  await knex.schema.dropTable('company_otps');
  console.log('✓ Dropped company_otps table');
};
