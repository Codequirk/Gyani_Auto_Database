const db = require('./src/models/db');
const { computeDaysRemaining } = require('./src/utils/dateUtils');

(async () => {
  try {
    // Get the assignment with end_date 30/1/2026
    const assignment = await db('assignments')
      .where('end_date', '2026-01-30')
      .first();
    
    if (!assignment) {
      console.log('No assignment found with end_date 2026-01-30');
      process.exit(0);
    }
    
    console.log('Assignment found:');
    console.log('  ID:', assignment.id);
    console.log('  Status:', assignment.status);
    console.log('  Start Date:', assignment.start_date);
    console.log('  End Date:', assignment.end_date);
    console.log('  End Date Type:', typeof assignment.end_date);
    console.log('  End Date Value:', assignment.end_date);
    
    const daysRemaining = computeDaysRemaining(assignment.end_date);
    console.log('\nComputeDaysRemaining Result:', daysRemaining);
    
    // Manual calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(assignment.end_date);
    end.setHours(0, 0, 0, 0);
    
    console.log('\nManual Calculation:');
    console.log('  Today:', today);
    console.log('  End Date:', end);
    console.log('  Time Diff (ms):', end - today);
    console.log('  Days Diff:', Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
