exports.up = function(knex) {
  return knex.schema.table('company_tickets', (table) => {
    table.boolean('dismissed_by_company').defaultTo(false);
    table.index(['company_id', 'ticket_status', 'dismissed_by_company']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('company_tickets', (table) => {
    table.dropIndex(['company_id', 'ticket_status', 'dismissed_by_company']);
    table.dropColumn('dismissed_by_company');
  });
};
