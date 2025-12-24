exports.up = function (knex) {
  return knex.schema.createTable('autos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('auto_no').unique().notNullable();
    table.string('owner_name').notNullable();
    table.uuid('area_id').notNullable();
    table.enum('status', ['IN_BUSINESS', 'OUT_OF_BUSINESS', 'IDLE', 'ASSIGNED']).defaultTo('IN_BUSINESS');
    table.timestamp('last_updated_at').defaultTo(knex.fn.now());
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    table.foreign('area_id').references('id').inTable('areas').onDelete('RESTRICT');
    table.index('auto_no');
    table.index('status');
    table.index('last_updated_at');
    table.index('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('autos');
};
