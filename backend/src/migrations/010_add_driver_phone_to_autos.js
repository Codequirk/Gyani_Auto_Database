exports.up = function (knex) {
  return knex.schema.table('autos', (table) => {
    table.string('driver_phone').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('autos', (table) => {
    table.dropColumn('driver_phone');
  });
};
