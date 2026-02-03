/**
 * Scheduled task to clean up COMPLETED assignments after 30 days
 * This runs periodically to remove old completed assignments from the database
 */

const Assignment = require('../models/Assignment');

const COMPLETION_RETENTION_DAYS = 30;

/**
 * Delete completed assignments that ended more than 30 days ago
 * This is called periodically to clean up old data
 */
const deleteOldCompletedAssignments = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - COMPLETION_RETENTION_DAYS);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Find and delete completed assignments where end_date is older than 30 days
    const result = await Assignment.deleteMany({
      status: 'COMPLETED',
      end_date: { $lte: thirtyDaysAgo }
    });

    if (result.deletedCount > 0) {
      console.log(`✓ Deleted ${result.deletedCount} completed assignments older than 30 days`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('✗ Error deleting old completed assignments:', error.message);
    throw error;
  }
};

/**
 * Check if a completed assignment should be deleted
 * @param {Date} endDate - The end date of the assignment
 * @returns {boolean} - True if the assignment is old enough to delete
 */
const shouldDeleteCompletedAssignment = (endDate) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - COMPLETION_RETENTION_DAYS);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const endDateNormalized = new Date(endDate);
  endDateNormalized.setHours(0, 0, 0, 0);

  return endDateNormalized <= thirtyDaysAgo;
};

module.exports = {
  deleteOldCompletedAssignments,
  shouldDeleteCompletedAssignment,
  COMPLETION_RETENTION_DAYS
};
