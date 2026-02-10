exports.up = function(knex) {
  return knex.schema.alterTable('auto_monthly_payments', function(table) {
    // Add advance payment column (nullable, default 0)
    table.decimal('advance_payment', 10, 2).nullable().defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('auto_monthly_payments', function(table) {
    table.dropColumn('advance_payment');
  });
};
