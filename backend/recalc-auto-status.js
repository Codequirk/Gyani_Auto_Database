const db = require('./src/models/db');
const Auto = require('./src/models/Auto');

(async () => {
  try {
    console.log('Recalculating auto statuses after assignment fixes...');
    
    // Get all unique autos that have assignments
    const assignmentsWithAutos = await db('assignments')
      .select('auto_id')
      .distinct();
    
    console.log(`Found ${assignmentsWithAutos.length} autos with assignments`);
    
    let count = 0;
    for (const row of assignmentsWithAutos) {
      const autoId = row.auto_id;
      try {
        await Auto.recalculateAndUpdateStatus(autoId);
        count++;
        console.log(`✓ Recalculated status for auto ${autoId}`);
      } catch (error) {
        console.log(`✗ Error recalculating auto ${autoId}: ${error.message}`);
      }
    }
    
    console.log(`\n✓ Recalculated ${count} auto statuses`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
