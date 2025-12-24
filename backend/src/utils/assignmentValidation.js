const { computeDaysRemaining } = require('./dateUtils');

/**
 * Validates if a date is in the past
 * @param {Date} date - The date to check
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateNotInPast = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate < today) {
    return {
      isValid: false,
      error: 'Selected dates are already over. Auto cannot be assigned.'
    };
  }

  return { isValid: true };
};

/**
 * Validates assignment dates for IDLE autos
 * @param {Date} startDate - Assignment start date
 * @param {Date} endDate - Assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateIdleAutoAssignment = (startDate, endDate) => {
  // First check if dates are in the past
  const pastCheck = validateNotInPast(endDate);
  if (!pastCheck.isValid) {
    return pastCheck;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkStartDate = new Date(startDate);
  checkStartDate.setHours(0, 0, 0, 0);

  if (checkStartDate < today) {
    return {
      isValid: false,
      error: 'Start date must be today or later. Cannot assign auto to past dates.'
    };
  }

  return { isValid: true };
};

/**
 * Validates assignment dates for ASSIGNED/PRE_ASSIGNED autos
 * @param {Date} newStartDate - New assignment start date
 * @param {Date} newEndDate - New assignment end date
 * @param {Date} existingEndDate - Existing assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateAssignedAutoAssignment = (newStartDate, newEndDate, existingEndDate) => {
  // First check if new dates are in the past
  const pastCheck = validateNotInPast(newEndDate);
  if (!pastCheck.isValid) {
    return pastCheck;
  }

  const newStart = new Date(newStartDate);
  newStart.setHours(0, 0, 0, 0);
  
  const existingEnd = new Date(existingEndDate);
  existingEnd.setHours(0, 0, 0, 0);

  // Calculate the next day after existing assignment ends
  const nextDayAfterExisting = new Date(existingEnd);
  nextDayAfterExisting.setDate(nextDayAfterExisting.getDate() + 1);

  // New assignment must start from the day after existing ends (no same-day continuation)
  if (newStart.getTime() < nextDayAfterExisting.getTime()) {
    return {
      isValid: false,
      error: 'This auto is already working for or pre-assigned to another company during the selected dates.'
    };
  }

  return { isValid: true };
};

/**
 * Checks for overlapping assignments
 * @param {Array} existingAssignments - Array of existing assignments
 * @param {Date} newStartDate - New assignment start date
 * @param {Date} newEndDate - New assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateNoOverlap = (existingAssignments, newStartDate, newEndDate) => {
  const newStart = new Date(newStartDate);
  newStart.setHours(0, 0, 0, 0);
  
  const newEnd = new Date(newEndDate);
  newEnd.setHours(0, 0, 0, 0);

  for (const assignment of existingAssignments) {
    const existingStart = new Date(assignment.start_date);
    existingStart.setHours(0, 0, 0, 0);
    
    const existingEnd = new Date(assignment.end_date);
    existingEnd.setHours(0, 0, 0, 0);

    // Check if there's any overlap
    if (newStart <= existingEnd && newEnd >= existingStart) {
      return {
        isValid: false,
        error: 'This auto is already working for or pre-assigned to another company during the selected dates.'
      };
    }
  }

  return { isValid: true };
};

/**
 * Complete validation for assignment creation
 * @param {Object} autoData - Auto with status and existing assignments
 * @param {Date} newStartDate - New assignment start date
 * @param {Date} newEndDate - New assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateAssignmentDates = (autoData, newStartDate, newEndDate) => {
  const autoStatus = autoData.status;
  const existingAssignments = autoData.assignments || [];

  // Check for past dates (applies to all statuses)
  const pastCheck = validateNotInPast(newEndDate);
  if (!pastCheck.isValid) {
    return pastCheck;
  }

  // IDLE status: start date must be >= today
  if (autoStatus === 'IDLE') {
    const idleCheck = validateIdleAutoAssignment(newStartDate, newEndDate);
    if (!idleCheck.isValid) {
      return idleCheck;
    }
  }

  // ASSIGNED/PRE_ASSIGNED: check against existing assignments
  if (autoStatus === 'ASSIGNED' || autoStatus === 'PRE_ASSIGNED') {
    // Get the most recent active/prebooked assignment
    const activeAssignments = existingAssignments.filter(a => 
      a.status === 'ACTIVE' || a.status === 'PREBOOKED'
    );

    if (activeAssignments.length > 0) {
      // Use the latest (most recent) active assignment
      const latestAssignment = activeAssignments.sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      )[0];

      const assignedCheck = validateAssignedAutoAssignment(
        newStartDate,
        newEndDate,
        latestAssignment.end_date
      );
      if (!assignedCheck.isValid) {
        return assignedCheck;
      }
    }
  }

  // Check for overlaps with any assignment
  const overlapCheck = validateNoOverlap(existingAssignments, newStartDate, newEndDate);
  if (!overlapCheck.isValid) {
    return overlapCheck;
  }

  return { isValid: true };
};

module.exports = {
  validateNotInPast,
  validateIdleAutoAssignment,
  validateAssignedAutoAssignment,
  validateNoOverlap,
  validateAssignmentDates
};
