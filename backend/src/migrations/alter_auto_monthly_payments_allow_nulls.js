exports.up = function(knex) {
  return knex.schema.alterTable('auto_monthly_payments', function(table) {
    // Change assignment_id to nullable
    table.uuid('assignment_id').nullable().alter();
    // Change company_id to nullable
    table.uuid('company_id').nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('auto_monthly_payments', function(table) {
    // Revert changes
    table.uuid('assignment_id').notNullable().alter();
    table.uuid('company_id').notNullable().alter();
  });
};
