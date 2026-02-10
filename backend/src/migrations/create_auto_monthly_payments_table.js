exports.up = function(knex) {
  return knex.schema.createTable('auto_monthly_payments', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('assignment_id').nullable();
    table.uuid('auto_id').notNullable();
    table.uuid('company_id').nullable();
    table.decimal('monthly_cost', 10, 2).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Foreign keys
    table.foreign('assignment_id').references('id').inTable('assignments').onDelete('SET NULL');
    table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
    table.foreign('company_id').references('id').inTable('companies').onDelete('SET NULL');

    // Indexes
    table.index('assignment_id');
    table.index('auto_id');
    table.index('company_id');
    table.index('deleted_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('auto_monthly_payments');
};

