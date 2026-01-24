exports.up = function(knex) {
  return knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary();
    table.uuid('auto_id').notNullable();
    table.uuid('company_id').notNullable();
    table.uuid('ticket_id').nullable();
    table.decimal('cost_per_day', 10, 2).notNullable();
    table.integer('total_days').notNullable();
    table.decimal('total_cost', 12, 2).notNullable();
    table.enum('payment_status', ['PENDING', 'APPROVED', 'PAID', 'CANCELLED']).defaultTo('PENDING');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    
    table.index('payment_status');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};
