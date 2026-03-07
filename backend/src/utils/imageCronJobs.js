/**
 * Cron Jobs for Auto Image Management
 * 
 * SIMPLIFIED: Only one critical job
 * - Tuesday 23:59 Asia/Kolkata: Auto-delete expired images (week < current_week - 1)
 * 
 * Buffer state is computed dynamically - NO cron update needed
 */

const cron = require('node-cron');
const autoImageController = require('../controllers/autoImageController');

/**
 * Initialize image management cron jobs
 */
function initializeImageCronJobs() {
  console.log('⏰ Initializing auto image management cron jobs...\n');
  
  let tuesdayJob = null;
  
  /**
   * Tuesday 23:59 (11:59 PM) Asia/Kolkata
   * Auto-delete expired images that are past the previous week
   * 
   * Cron pattern: 59 23 * * 2
   * - 59: minute 59
   * - 23: hour 23 (11 PM)
   * - *:  any day of month
   * - *:  any month
   * - 2:  Tuesday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
   */
  tuesdayJob = cron.schedule('59 23 * * 2', async () => {
    console.log('\n🔔 [CRON JOB TRIGGERED] Tuesday 23:59 - Auto-delete expired images');
    try {
      const result = await autoImageController.autoDeleteExpiredImages();
      console.log('✅ Cron job completed successfully');
    } catch (error) {
      console.error('❌ Cron job failed:', error.message);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log('✅ Cron jobs initialized:');
  console.log('   ✓ Tuesday 23:59: Auto-delete expired images (week < current_week - 1)');
  console.log('   ✓ Buffer state: Computed dynamically, no cron update needed\n');
  
  return {
    tuesdayJob,
  };
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopImageCronJobs(jobs) {
  console.log('\n⏹️  Stopping image management cron jobs...');
  if (jobs?.tuesdayJob) {
    jobs.tuesdayJob.stop();
    console.log('  ✓ Tuesday job stopped');
  }
  console.log('✅ All cron jobs stopped\n');
}

module.exports = {
  initializeImageCronJobs,
  stopImageCronJobs,
};
