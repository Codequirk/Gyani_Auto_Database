/**
 * MIGRATION TEMPLATE: Add Audit Fields to Existing Table
 * 
 * Use this template to add audit fields to any existing table.
 * Replace TABLE_NAME with actual table name.
 * 
 * Required audit fields:
 * - created_by (uuid, FK to admins)
 * - created_on (timestamp)
 * - updated_by (uuid, FK to admins, nullable)
 * - updated_on (timestamp)
 * - is_deleted (boolean, default false)
 */

/**
 * Example: Add audit fields to 'companies' table
 */
exports.up = function (knex) {
  return knex.schema.alterTable('companies', (table) => {
    // Add audit fields if they don't exist
    // Check existing schema first to avoid duplicate columns
    
    // User who created the record
    table.uuid('created_by').nullable().after('id');
    
    // Timestamp of creation
    table.timestamp('created_on').defaultTo(knex.fn.now()).after('created_by');
    
    // User who last updated the record
    table.uuid('updated_by').nullable().after('created_on');
    
    // Timestamp of last update
    table.timestamp('updated_on').defaultTo(knex.fn.now()).after('updated_by');
    
    // Soft delete flag
    table.boolean('is_deleted').defaultTo(false).after('updated_on');
    
    // Add foreign key constraints
    table.foreign('created_by').references('id').inTable('admins').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('admins').onDelete('SET NULL');
    
    // Add indexes for performance
    table.index('is_deleted');
    table.index('created_by');
    table.index('updated_by');
    table.index(['is_deleted', 'created_on']); // Composite index for filtered sorting
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('companies', (table) => {
    // Drop foreign keys
    table.dropForeign('created_by');
    table.dropForeign('updated_by');
    
    // Drop columns
    table.dropColumn('created_by');
    table.dropColumn('created_on');
    table.dropColumn('updated_by');
    table.dropColumn('updated_on');
    table.dropColumn('is_deleted');
  });
};

/**
 * ============================================
 * SCHEMA FOR NEW TABLES (Complete Example)
 * ============================================
 * 
 * When creating a new table, include audit fields from the start:
 */

/*
exports.up = function (knex) {
  return knex.schema.createTable('your_table_name', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Business data
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('status').defaultTo('ACTIVE');
    
    // Audit Fields (REQUIRED for all tables)
    table.uuid('created_by').nullable();
    table.timestamp('created_on').defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('updated_on').defaultTo(knex.fn.now());
    table.boolean('is_deleted').defaultTo(false);
    
    // Foreign Keys
    table.foreign('created_by').references('id').inTable('admins').onDelete('SET NULL');
    table.foreign('updated_by').references('id').inTable('admins').onDelete('SET NULL');
    
    // Indexes
    table.index('is_deleted');
    table.index('created_by');
    table.index('updated_by');
    table.index(['is_deleted', 'created_on']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('your_table_name');
};
*/

/**
 * ============================================
 * AUDIT LOGS TABLE (For tracking changes)
 * ============================================
 */

/*
exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // What was changed
    table.string('entity_type').notNullable(); // Table name
    table.uuid('entity_id').notNullable();     // Record ID
    table.string('action').notNullable();      // CREATE, UPDATE, DELETE, RESTORE
    
    // Change details
    table.json('changed_fields').nullable();   // Fields that changed
    table.json('old_values').nullable();       // Previous values
    table.json('new_values').nullable();       // New values
    
    // Who made the change
    table.uuid('changed_by').notNullable();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    
    // Timestamp
    table.timestamp('created_on').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('entity_type');
    table.index('entity_id');
    table.index('action');
    table.index('created_on');
    table.foreign('changed_by').references('id').inTable('admins').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('audit_logs');
};
*/
