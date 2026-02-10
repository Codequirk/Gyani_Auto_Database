/**
 * Migration: Add deleted_at column to assignments table
 * This migration adds soft-delete support to assignments
 */

exports.up = function (knex) {
  return knex.schema.table('assignments', (table) => {
    table.timestamp('deleted_at').nullable();
    table.index('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.table('assignments', (table) => {
    table.dropIndex('deleted_at');
    table.dropColumn('deleted_at');
  });
};
