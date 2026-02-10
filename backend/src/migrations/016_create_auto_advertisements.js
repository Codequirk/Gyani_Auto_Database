exports.up = function(knex) {
  return knex.schema.createTable('auto_advertisements', table => {
    table.increments('id').primary();
    table.uuid('auto_id').notNullable();
    table.uuid('company_id').notNullable();
    table.string('image_path').notNullable();
    table.string('image_filename').notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    table.foreign('auto_id').references('id').inTable('autos').onDelete('CASCADE');
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    
    // Index for efficient lookups
    table.index(['auto_id', 'company_id', 'deleted_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('auto_advertisements');
};
