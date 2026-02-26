exports.up = function (knex) {
  return knex.schema.table('companies', (table) => {
    table.text('rejection_reason').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('companies', (table) => {
    table.dropColumn('rejection_reason');
  });
};
