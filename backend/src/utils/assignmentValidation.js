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
 * Validates if start date is not in the past (can be today or later)
 * @param {Date} startDate - The start date to check
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateStartDateNotInPast = (startDate) => {
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
 * Validates assignment dates for ACTIVE/PREBOOKED autos
 * @param {Date} newStartDate - New assignment start date
 * @param {Date} newEndDate - New assignment end date
 * @param {Date} existingEndDate - Existing assignment end date
 * @returns {Object} { isValid: boolean, error: string }
 */
const validateAssignedAutoAssignment = (newStartDate, newEndDate, existingEndDate) => {
  // First check if start date is not in the past
  const startCheck = validateStartDateNotInPast(newStartDate);
  if (!startCheck.isValid) {
    return startCheck;
  }

  // Check if end date is not in the past
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

  console.log(`[SEQUENTIAL] Existing ends: ${existingEnd.toISOString()}, Next available: ${nextDayAfterExisting.toISOString()}, New start: ${newStart.toISOString()}`);
  console.log(`[SEQUENTIAL] Check: newStart >= nextDay? ${newStart.getTime()} >= ${nextDayAfterExisting.getTime()} = ${newStart.getTime() >= nextDayAfterExisting.getTime()}`);

  // New assignment must start from the day after existing ends (no same-day continuation)
  if (newStart.getTime() < nextDayAfterExisting.getTime()) {
    console.log(`[SEQUENTIAL] ✗ FAILED - New assignment must start on or after ${nextDayAfterExisting.toDateString()}`);
    return {
      isValid: false,
      error: 'This auto is already working for or pre-assigned to another company during the selected dates.'
    };
  }

  console.log(`[SEQUENTIAL] ✓ PASSED - Sequential constraint OK`);
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

  console.log(`[OVERLAP] Checking ${existingAssignments.length} assignments for overlap`);
  console.log(`[OVERLAP] New dates: ${newStart.toISOString()} to ${newEnd.toISOString()}`);

  for (const assignment of existingAssignments) {
    const existingStart = new Date(assignment.start_date);
    existingStart.setHours(0, 0, 0, 0);
    
    const existingEnd = new Date(assignment.end_date);
    existingEnd.setHours(0, 0, 0, 0);

    console.log(`[OVERLAP] Comparing against ${assignment.status} ${existingStart.toISOString()} to ${existingEnd.toISOString()}`);

    // Check if there's any overlap
    const hasOverlap = newStart <= existingEnd && newEnd >= existingStart;
    console.log(`[OVERLAP] ${assignment.status}: newStart(${newStart}) <= existEnd(${existingEnd}) = ${newStart <= existingEnd}, newEnd(${newEnd}) >= existStart(${existingStart}) = ${newEnd >= existingStart}, hasOverlap = ${hasOverlap}`);

    if (hasOverlap) {
      console.log(`[OVERLAP] ✗ FOUND OVERLAP with ${assignment.status} assignment!`);
      return {
        isValid: false,
        error: 'This auto is already working for or pre-assigned to another company during the selected dates.'
      };
    }
  }

  console.log(`[OVERLAP] ✓ No overlaps found`);
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

  console.log(`[VALIDATION] Auto status: ${autoStatus}`);
  console.log(`[VALIDATION] New assignment: ${newStartDate} to ${newEndDate}`);
  console.log(`[VALIDATION] Existing assignments:`, existingAssignments.map(a => ({
    status: a.status,
    start: a.start_date,
    end: a.end_date
  })));

  // Check start date is not in the past (applies to all statuses)
  const startCheck = validateStartDateNotInPast(newStartDate);
  if (!startCheck.isValid) {
    return startCheck;
  }

  // Check for past end dates (applies to all statuses)
  const pastCheck = validateNotInPast(newEndDate);
  if (!pastCheck.isValid) {
    return pastCheck;
  }

  // IDLE status: start date must be >= today (already checked above)
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
      console.log(`[VALIDATION] Found ${activeAssignments.length} ACTIVE assignments`);
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

      console.log(`[VALIDATION] Latest ACTIVE assignment ends: ${latestActiveAssignment.end_date}`);
      console.log(`[VALIDATION] Is it still ongoing (ends today or later)? ${isLatestAssignmentOngoing}`);

      // Only enforce sequential constraint if new assignment is ACTIVE AND existing is still ongoing
      const newStartCheck = new Date(newStartDate);
      newStartCheck.setHours(0, 0, 0, 0);
      const isNewAssignmentActive = newStartCheck <= today;

      console.log(`[VALIDATION] Is new assignment ACTIVE (today or before)? ${isNewAssignmentActive}`);
      console.log(`[VALIDATION] Today: ${today}, New start: ${newStartCheck}`);

      if (isNewAssignmentActive && isLatestAssignmentOngoing) {
        console.log(`[VALIDATION] Checking sequential constraint against ongoing ACTIVE assignment`);
        // Only ACTIVE assignments must come after existing ongoing ACTIVE ends
        const assignedCheck = validateAssignedAutoAssignment(
          newStartDate,
          newEndDate,
          latestActiveAssignment.end_date
        );
        if (!assignedCheck.isValid) {
          console.log(`[VALIDATION] FAILED sequential check: ${assignedCheck.error}`);
          return assignedCheck;
        }
      } else {
        console.log(`[VALIDATION] Skipping sequential check (new is PREBOOKED or existing ACTIVE already ended)`);
      }
    }
  }

  // Check for overlaps - only with ACTIVE and PREBOOKED assignments (not COMPLETED which are free days)
  let assignmentsToCheckForOverlap = existingAssignments.filter(a => 
    a.status === 'ACTIVE' || a.status === 'PREBOOKED'
  );
  
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let newStartCheck = new Date(newStartDate);
  newStartCheck.setHours(0, 0, 0, 0);
  let isNewAssignmentActive = newStartCheck <= today;
  
  console.log(`[VALIDATION] Checking overlap against ${assignmentsToCheckForOverlap.length} active/prebooked assignments (filtered from ${existingAssignments.length})`);

  const overlapCheck = validateNoOverlap(assignmentsToCheckForOverlap, newStartDate, newEndDate);
  if (!overlapCheck.isValid) {
    console.log(`[VALIDATION] FAILED overlap check: ${overlapCheck.error}`);
    return overlapCheck;
  }

  console.log(`[VALIDATION] ✓ PASSED all checks`);
  return { isValid: true };
};

module.exports = {
  validateNotInPast,
  validateStartDateNotInPast,
  validateIdleAutoAssignment,
  validateAssignedAutoAssignment,
  validateNoOverlap,
  validateAssignmentDates
};
