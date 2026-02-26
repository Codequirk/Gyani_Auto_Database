/**
 * Cron Jobs for Auto Image Management
 * 
 * Job 1: Sunday 00:00 - Mark old images as buffer
 * Job 2: Tuesday 23:59 - Delete old images automatically
 */

const cron = require('node-cron');
const autoImageController = require('../controllers/autoImageController');

/**
 * Initialize all image management cron jobs
 */
function initializeImageCronJobs() {
  console.log('⏰ Initializing auto image management cron jobs...\n');
  
  /**
   * Job 1: Every Sunday at 00:00 (midnight)
   * Update buffer section - move previous week images to buffer status
   */
  const sundayJob = cron.schedule('0 0 * * 0', async () => {
    console.log('\n🔔 [CRON] Sunday 00:00 - Buffer section update');
    try {
      await autoImageController.updateBufferSectionStatus();
    } catch (error) {
      console.error('❌ Sunday job failed:', error.message);
    }
  });
  
  /**
   * Job 2: Every Tuesday at 23:59 (11:59 PM)
   * Auto-delete old images that weren't replaced
   */
  const tuesdayJob = cron.schedule('59 23 * * 2', async () => {
    console.log('\n🔔 [CRON] Tuesday 23:59 - Auto-delete expired images');
    try {
      await autoImageController.autoDeleteExpiredImages();
    } catch (error) {
      console.error('❌ Tuesday job failed:', error.message);
    }
  });
  
  /**
   * Optional: Daily check at 12:00 PM for debugging
   * Can be removed in production
   */
  const dailyCheckJob = cron.schedule('0 12 * * *', async () => {
    const now = new Date();
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    console.log(`\n📅 [DAILY CHECK] ${dayName} 12:00 PM - Image management status`);
    console.log(`   Current week: ${require('../utils/imageManagement').getCurrentWeekNumber()}`);
    console.log(`   In buffer window: ${require('../utils/imageManagement').isInBufferWindow()}`);
    console.log(`   Past Tuesday deadline: ${require('../utils/imageManagement').isPastTuesdayDeadline()}`);
  });
  
  console.log('✅ Cron jobs initialized:');
  console.log('   - Sunday 00:00: Update buffer section');
  console.log('   - Tuesday 23:59: Auto-delete expired images');
  console.log('   - Daily 12:00 PM: Status check\n');
  
  return {
    sundayJob,
    tuesdayJob,
    dailyCheckJob,
  };
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopImageCronJobs(jobs) {
  console.log('\n⏹️  Stopping image management cron jobs...');
  if (jobs.sundayJob) jobs.sundayJob.stop();
  if (jobs.tuesdayJob) jobs.tuesdayJob.stop();
  if (jobs.dailyCheckJob) jobs.dailyCheckJob.stop();
  console.log('✅ Cron jobs stopped');
}

module.exports = {
  initializeImageCronJobs,
  stopImageCronJobs,
};
