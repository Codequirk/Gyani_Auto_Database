exports.up = function(knex) {
  return knex.schema.table('payments', (table) => {
    table.string('auto_no').nullable();
    table.string('owner_name').nullable();
    table.uuid('area_id').nullable();
    table.string('area_name').nullable();
    table.uuid('assigned_by_admin_id').nullable();
    table.text('notes').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('payments', (table) => {
    table.dropColumn('auto_no');
    table.dropColumn('owner_name');
    table.dropColumn('area_id');
    table.dropColumn('area_name');
    table.dropColumn('assigned_by_admin_id');
    table.dropColumn('notes');
  });
};
