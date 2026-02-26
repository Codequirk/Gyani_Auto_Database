/**
 * Validates if a date is in the past
 * @param {Date} date - The date to check
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateNotInPast = (date) => {
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
export const validateIdleAutoAssignment = (startDate, endDate) => {
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
 * Validates assignment dates for ACTIVE/PREBOOKED autos
 * @param {Date} newStartDate - New assignment start date
 * @param {Date} newEndDate - New assignment end date
 * @param {Date} existingEndDate - Existing assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
export const validateAssignedAutoAssignment = (newStartDate, newEndDate, existingEndDate) => {
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
export const validateNoOverlap = (existingAssignments, newStartDate, newEndDate) => {
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
export const validateAssignmentDates = (autoData, newStartDate, newEndDate) => {
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

  // ACTIVE/PREBOOKED: For ACTIVE autos, check if new assignment must come after current ACTIVE
  if (autoStatus === 'ACTIVE' || autoStatus === 'PREBOOKED') {
    // Get ONLY ACTIVE assignments (not prebooked) for sequential validation
    const activeAssignments = existingAssignments.filter(a => a.status === 'ACTIVE');

    if (activeAssignments.length > 0) {
      // Use the most recent active assignment (the one that's actually running now)
      const latestActiveAssignment = activeAssignments.sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      )[0];

      // Check if the latest ACTIVE assignment is still ongoing (hasn't ended yet)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const latestEnd = new Date(latestActiveAssignment.end_date);
      latestEnd.setHours(0, 0, 0, 0);
      const isLatestAssignmentOngoing = latestEnd >= today;

      // Only enforce sequential constraint if new assignment is ACTIVE AND existing is still ongoing
      const newStartCheck = new Date(newStartDate);
      newStartCheck.setHours(0, 0, 0, 0);
      const isNewAssignmentActive = newStartCheck <= today;

      if (isNewAssignmentActive && isLatestAssignmentOngoing) {
        // Only ACTIVE assignments must come after existing ongoing ACTIVE ends
        const assignedCheck = validateAssignedAutoAssignment(
          newStartDate,
          newEndDate,
          latestActiveAssignment.end_date
        );
        if (!assignedCheck.isValid) {
          return assignedCheck;
        }
      }
    }
  }

  // Check for overlaps - only with ACTIVE and PREBOOKED assignments (not COMPLETED which are free days)
  let assignmentsToCheckForOverlap = existingAssignments.filter(a => 
    a.status === 'ACTIVE' || a.status === 'PREBOOKED'
  );

  const overlapCheck = validateNoOverlap(assignmentsToCheckForOverlap, newStartDate, newEndDate);
  if (!overlapCheck.isValid) {
    return overlapCheck;
  }

  return { isValid: true };
};
