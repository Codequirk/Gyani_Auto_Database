exports.up = function(knex) {
  return knex.schema.createTable('company_tickets', (table) => {
    table.uuid('id').primary();
    table.uuid('company_id').notNullable();
    table.integer('autos_required').notNullable().defaultTo(0);
    table.integer('days_required').notNullable().defaultTo(0);
    table.date('start_date').nullable();
    table.uuid('area_id').nullable();
    table.string('area_name').nullable().defaultTo('Any Area');
    table.text('notes').nullable();
    table.enum('ticket_status', ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).defaultTo('PENDING');
    table.uuid('approved_by_admin_id').nullable();
    table.text('rejected_reason').nullable();
    table.text('admin_notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.foreign('area_id').references('id').inTable('areas').onDelete('SET NULL');
    table.foreign('approved_by_admin_id').references('id').inTable('admins').onDelete('SET NULL');
    
    table.index('ticket_status');
    table.index('company_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('company_tickets');
};
