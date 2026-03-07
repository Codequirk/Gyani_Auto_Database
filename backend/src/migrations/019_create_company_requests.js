exports.up = function (knex) {
  return knex.schema.createTable('company_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable();
    table.uuid('auto_id').notNullable();
    table.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
    table.string('rejection_reason', 500).nullable();
    table.boolean('dismissed_by_company').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
    
    table.index('company_id');
    table.index('status');
    table.index(['company_id', 'status', 'dismissed_by_company']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('company_requests');
};
