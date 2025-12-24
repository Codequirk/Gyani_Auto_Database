exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('admin_id').notNullable();
    table.string('action').notNullable();
    table.jsonb('payload').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.foreign('admin_id').references('id').inTable('admins').onDelete('RESTRICT');
    table.index('admin_id');
    table.index('timestamp');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('audit_logs');
};
