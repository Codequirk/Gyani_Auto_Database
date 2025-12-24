exports.up = function (knex) {
  return knex.schema.createTable('admins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.enum('role', ['SUPER_ADMIN', 'ADMIN']).defaultTo('ADMIN');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.uuid('updated_by_admin_id').nullable();
    table.foreign('updated_by_admin_id').references('id').inTable('admins').onDelete('SET NULL');
    
    table.index('email');
    table.index('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('admins');
};
