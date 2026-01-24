exports.up = function (knex) {
  return knex.schema.table('areas', (table) => {
    table.string('pin_code').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('areas', (table) => {
    table.dropColumn('pin_code');
  });
};
