exports.up = function (knex) {
  return knex.schema.createTable('assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('auto_id').notNullable();
    table.uuid('company_id').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['ACTIVE', 'COMPLETED', 'PREBOOKED']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('auto_id').references('id').inTable('autos').onDelete('RESTRICT');
    table.foreign('company_id').references('id').inTable('companies').onDelete('RESTRICT');
    table.index('auto_id');
    table.index('company_id');
    table.index('end_date');
    table.index('status');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('assignments');
};
