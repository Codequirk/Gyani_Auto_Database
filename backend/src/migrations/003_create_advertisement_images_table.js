/**
 * Migration: Create advertisement_images table
 * 
 * Stores PNG advertisement images for ACTIVE autos
 * Auto-deletes after 7 days
 */

exports.up = async (knex) => {
  return knex.schema.createTable('advertisement_images', (table) => {
    table.uuid('id').primary();
    table.uuid('auto_id').notNullable().index();
    table.string('filename').notNullable(); // Stored filename in /uploads
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // uploaded_at + 7 days
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint: only one active image per auto at a time
    table.unique(['auto_id']);

    // Foreign key
    table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
  });
};

exports.down = async (knex) => {
  return knex.schema.dropTableIfExists('advertisement_images');
};
