exports.up = function (knex) {
  return knex.schema.createTable('companies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('contact_person').notNullable();
    table.string('phone_number').nullable();
    table.jsonb('emails').defaultTo('[]');
    table.jsonb('phone_numbers').defaultTo('[]');
    table.integer('required_autos').notNullable().defaultTo(0);
    table.uuid('area_id').nullable();
    table.integer('days_requested').notNullable().defaultTo(0);
    table.enum('status', ['INACTIVE', 'ACTIVE', 'SUSPENDED', 'REQUESTED', 'APPROVED', 'REJECTED']).defaultTo('INACTIVE');
    table.enum('company_status', ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE']).defaultTo('PENDING_APPROVAL');
    table.uuid('created_by_admin_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    table.foreign('area_id').references('id').inTable('areas').onDelete('SET NULL');
    table.foreign('created_by_admin_id').references('id').inTable('admins').onDelete('SET NULL');
    table.index('status');
    table.index('company_status');
    table.index('email');
    table.index('deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('companies');
};
