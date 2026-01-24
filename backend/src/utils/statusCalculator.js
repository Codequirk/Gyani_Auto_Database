/**
 * Status calculation logic based on assignment dates
 * - ACTIVE: if start_date <= today <= end_date
 * - PREBOOKED: if start_date > today
 * - IDLE: if no active or prebooked assignments
 * - COMPLETED: if end_date < today (for history only, not displayed in status)
 */

const today = (includeTime = false) => {
  const now = new Date();
  if (!includeTime) {
    now.setHours(0, 0, 0, 0);
  }
  return now;
};

/**
 * Calculate auto status based on its assignments
 * @param {Array} assignments - Array of assignment objects with start_date, end_date, status
 * @returns {string} - 'ACTIVE', 'PREBOOKED', 'IDLE', or 'COMPLETED'
 */
const calculateAutoStatus = (assignments = []) => {
  const todayDate = today();

  // Filter out deleted/cancelled assignments
  const activeStatuses = ['ACTIVE', 'PREBOOKED'];
  const relevantAssignments = assignments.filter(a => activeStatuses.includes(a.status));

  if (relevantAssignments.length === 0) {
    return 'IDLE';
  }

  // Check for ACTIVE assignment (start_date <= today <= end_date)
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(assignment.end_date);
    endDate.setHours(0, 0, 0, 0);

    // Assignment is active if today falls within the range
    if (startDate <= todayDate && todayDate <= endDate) {
      return 'ACTIVE';
    }
  }

  // Check for PREBOOKED assignment (start_date > today)
  for (const assignment of relevantAssignments) {
    const startDate = new Date(assignment.start_date);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > todayDate) {
      return 'PREBOOKED';
    }
  }

  // If all assignments have end_date in the past, status is IDLE (completed)
  return 'IDLE';
};

/**
 * Check if an assignment is completed
 * @param {Date|string} endDate - End date of assignment
 * @returns {boolean}
 */
const isCompletedAssignment = (endDate) => {
  const assignmentEndDate = new Date(endDate);
  assignmentEndDate.setHours(0, 0, 0, 0);
  
  const todayDate = today();
  return assignmentEndDate < todayDate;
};

/**
 * Check if an assignment should be deleted (30 days after end_date)
 * @param {Date|string} endDate - End date of assignment
 * @returns {boolean}
 */
const shouldDeleteAssignment = (endDate) => {
  const assignmentEndDate = new Date(endDate);
  assignmentEndDate.setHours(0, 0, 0, 0);
  
  // Add 30 days
  const deleteDate = new Date(assignmentEndDate);
  deleteDate.setDate(deleteDate.getDate() + 30);
  
  const todayDate = today();
  return todayDate >= deleteDate;
};

/**
 * Get all completed assignments
 * @param {Array} assignments - Array of assignment objects
 * @returns {Array} - Completed assignments
 */
const getCompletedAssignments = (assignments = []) => {
  return assignments.filter(a => isCompletedAssignment(a.end_date));
};

/**
 * Get assignments eligible for deletion (30 days after completion)
 * @param {Array} assignments - Array of assignment objects
 * @returns {Array} - Assignments to delete
 */
const getAssignmentsToDelete = (assignments = []) => {
  return assignments.filter(a => shouldDeleteAssignment(a.end_date));
};

module.exports = {
  calculateAutoStatus,
  isCompletedAssignment,
  shouldDeleteAssignment,
  getCompletedAssignments,
  getAssignmentsToDelete,
  today,
};
