const db = require('./src/models/db');

(async () => {
  try {
    console.log('Fixing old 1-day assignments with incorrect end_dates...');
    
    // Find all assignments with days = 0 or end_date = previous day of start_date
    const assignments = await db('assignments')
      .where('days', 0)
      .orWhere(db.raw('end_date = start_date - interval \'1 day\''))
      .select('*');
    
    console.log(`Found ${assignments.length} assignments to potentially fix`);
    
    for (const assignment of assignments) {
      const startDate = new Date(assignment.start_date);
      const endDate = new Date(assignment.end_date);
      
      // Check if end_date is 1 day before start_date (the bug pattern)
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (Math.abs(startTime - endTime) === oneDayMs && endTime < startTime) {
        // This is the bug! end_date should equal start_date
        console.log(`\nFixing assignment ${assignment.id}:`);
        console.log(`  Before: start=${assignment.start_date}, end=${assignment.end_date}, days=${assignment.days}`);
        
        // Update: set end_date = start_date, days = 1
        await db('assignments')
          .where('id', assignment.id)
          .update({
            end_date: assignment.start_date,
            days: 1,
            updated_at: new Date()
          });
        
        console.log(`  After: start=${assignment.start_date}, end=${assignment.start_date}, days=1`);
      }
    }
    
    console.log('\n✓ Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
