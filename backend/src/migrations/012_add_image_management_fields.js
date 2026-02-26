/**
 * Migration: Add image management fields to autos table
 */

exports.up = async function(knex) {
  try {
    console.log('🔧 Adding image management fields to autos table...');
    
    // Check if columns already exist
    const hasImageUrl = await knex.schema.hasColumn('autos', 'image_url');
    
    if (!hasImageUrl) {
      await knex.schema.alterTable('autos', (table) => {
        // Image storage
        table.string('image_url').nullable().comment('URL of the weekly auto image');
        
        // Image metadata
        table.dateTime('image_upload_date').nullable().comment('When the image was uploaded');
        table.integer('image_week_number').nullable().comment('ISO week number of the image');
        table.integer('image_year').nullable().comment('Year of the image');
        
        // Image lifecycle tracking
        table.dateTime('last_image_deleted_date').nullable().comment('When the old image was auto-deleted');
        table.string('image_status').defaultTo('MISSING').comment('MISSING, BUFFER, UPLOADED');
        
        // Indexes for efficient queries
        table.index('image_status');
        table.index('image_week_number');
        table.index(['image_week_number', 'image_year']);
      });
      
      console.log('✅ Image fields added successfully');
    } else {
      console.log('⏭️  Image fields already exist, skipping');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  try {
    const hasImageUrl = await knex.schema.hasColumn('autos', 'image_url');
    
    if (hasImageUrl) {
      await knex.schema.alterTable('autos', (table) => {
        table.dropColumn('image_url');
        table.dropColumn('image_upload_date');
        table.dropColumn('image_week_number');
        table.dropColumn('image_year');
        table.dropColumn('last_image_deleted_date');
        table.dropColumn('image_status');
      });
      
      console.log('✅ Image fields removed');
    }
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};
