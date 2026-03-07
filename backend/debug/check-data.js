const db = require('./src/models/db');

(async () => {
  try {
    // Get assignments for the company
    const assignments = await db('assignments')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(10);
    
    console.log('Recent Assignments:');
    assignments.forEach((a, i) => {
      console.log(`\n[${i}] ID: ${a.id}`);
      console.log(`    Status: ${a.status}`);
      console.log(`    Start: ${a.start_date}`);
      console.log(`    End: ${a.end_date}`);
      console.log(`    Days: ${a.days}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
