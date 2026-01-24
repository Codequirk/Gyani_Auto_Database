exports.up = function(knex) {
  return knex.schema.table('assignments', (table) => {
    table.integer('days').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('assignments', (table) => {
    table.dropColumn('days');
  });
};
