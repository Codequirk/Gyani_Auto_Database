exports.up = async function(knex) {
  // Add assigned_time column to assignments table
  const assignmentsHasColumn = await knex.schema.hasColumn('assignments', 'assigned_time');
  if (!assignmentsHasColumn) {
    await knex.schema.table('assignments', (table) => {
      table.datetime('assigned_time').defaultTo(knex.fn.now());
    });
  }

  // Add assigned_time column to payments table
  const paymentsHasColumn = await knex.schema.hasColumn('payments', 'assigned_time');
  if (!paymentsHasColumn) {
    await knex.schema.table('payments', (table) => {
      table.datetime('assigned_time').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function(knex) {
  // Remove assigned_time column from assignments table
  const assignmentsHasColumn = await knex.schema.hasColumn('assignments', 'assigned_time');
  if (assignmentsHasColumn) {
    await knex.schema.table('assignments', (table) => {
      table.dropColumn('assigned_time');
    });
  }

  // Remove assigned_time column from payments table
  const paymentsHasColumn = await knex.schema.hasColumn('payments', 'assigned_time');
  if (paymentsHasColumn) {
    await knex.schema.table('payments', (table) => {
      table.dropColumn('assigned_time');
    });
  }
};
