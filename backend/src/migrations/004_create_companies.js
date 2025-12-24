exports.up = function (knex) {
  return knex.schema.createTable('companies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.integer('required_autos').notNullable();
    table.uuid('area_id').notNullable();
    table.integer('days_requested').notNullable();
    table.enum('status', ['REQUESTED', 'APPROVED', 'REJECTED']).defaultTo('REQUESTED');
    table.uuid('created_by_admin_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    table.foreign('area_id').references('id').inTable('areas').onDelete('RESTRICT');
    table.foreign('created_by_admin_id').references('id').inTable('admins').onDelete('RESTRICT');
    table.index('status');
    table.index('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('companies');
};
