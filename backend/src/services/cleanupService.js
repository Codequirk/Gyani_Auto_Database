/**
 * Scheduled cleanup service for old completed assignments
 * Deletes assignments that are 30+ days past their end_date
 */

const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const cron = require('node-cron');

let cleanupJob = null;

/**
 * Start the cleanup scheduler
 * Runs at 2:00 AM every day
 */
const startCleanupScheduler = () => {
  if (cleanupJob) {
    console.log('[CLEANUP] Scheduler already running');
    return;
  }

  // Schedule task to run every day at 2:00 AM
  cleanupJob = cron.schedule('0 2 * * *', async () => {
    console.log('[CLEANUP] Scheduled cleanup started...');
    try {
      await cleanupOldCompletedAssignments();
    } catch (error) {
      console.error('[CLEANUP] Error during scheduled cleanup:', error.message);
    }
  });

  console.log('[CLEANUP] Scheduler started - will run daily at 2:00 AM');
};

/**
 * Stop the cleanup scheduler
 */
const stopCleanupScheduler = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    console.log('[CLEANUP] Scheduler stopped');
  }
};

/**
 * Execute cleanup of old completed assignments
 * @returns {Object} - Cleanup result with deleted count
 */
const cleanupOldCompletedAssignments = async () => {
  try {
    console.log('[CLEANUP] Finding assignments eligible for deletion...');
    
    // Find assignments eligible for deletion (30+ days after end_date)
    const toDelete = await Assignment.findEligibleForDeletion();
    
    if (toDelete.length === 0) {
      console.log('[CLEANUP] No assignments to delete');
      return { deletedCount: 0, affectedAutos: 0 };
    }
    
    console.log(`[CLEANUP] Found ${toDelete.length} assignments eligible for deletion`);
    
    // Group by auto_id to update statuses later
    const affectedAutoIds = new Set(toDelete.map(a => a.auto_id));
    
    // Delete the assignments
    const deletedCount = await Assignment.deleteOldCompleted();
    console.log(`[CLEANUP] Deleted ${deletedCount} old completed assignments`);
    
    // Update auto statuses for affected autos
    for (const autoId of affectedAutoIds) {
      try {
        await Auto.recalculateAndUpdateStatus(autoId);
      } catch (error) {
        console.error(`[CLEANUP] Error updating status for auto ${autoId}:`, error.message);
      }
    }
    
    console.log(`[CLEANUP] Updated status for ${affectedAutoIds.size} autos`);
    console.log('[CLEANUP] Cleanup completed successfully');
    
    return {
      deletedCount,
      affectedAutos: affectedAutoIds.size
    };
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error);
    throw error;
  }
};

/**
 * Manually trigger cleanup
 * Useful for testing and on-demand cleanup
 */
const triggerCleanupNow = async () => {
  console.log('[CLEANUP] Manual cleanup triggered...');
  return cleanupOldCompletedAssignments();
};

module.exports = {
  startCleanupScheduler,
  stopCleanupScheduler,
  cleanupOldCompletedAssignments,
  triggerCleanupNow,
};
