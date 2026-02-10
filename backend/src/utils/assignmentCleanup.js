/**
 * Cleanup utility for deleting old completed assignments
 * Assignments are deleted 30 days after their end_date
 */

const Assignment = require('../models/Assignment');

const deleteOldCompletedAssignments = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get assignments eligible for deletion
    const oldAssignments = await Assignment.findEligibleForDeletion();

    if (oldAssignments.length > 0) {
      console.log(`[CLEANUP] Found ${oldAssignments.length} assignments to delete (> 30 days old)`);
      
      // Delete them
      const deletedCount = await Assignment.deleteOldCompleted();
      console.log(`[CLEANUP] Deleted ${deletedCount} assignments`);
      return deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('[CLEANUP] Error in deleteOldCompletedAssignments:', error.message);
    return 0;
  }
};

module.exports = {
  deleteOldCompletedAssignments,
};
