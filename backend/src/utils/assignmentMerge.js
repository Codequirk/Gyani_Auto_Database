/**
 * Check if two dates are consecutive (no gap between them)
 * @param {Date} endDate1 - End date of first period
 * @param {Date} startDate2 - Start date of second period
 * @returns {boolean} True if consecutive (end of first + 1 day = start of second)
 */
const isConsecutive = (endDate1, startDate2) => {
  const end = new Date(endDate1);
  end.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate2);
  start.setHours(0, 0, 0, 0);
  
  // Next day after end date
  const nextDay = new Date(end);
  nextDay.setDate(nextDay.getDate() + 1);
  
  return nextDay.getTime() === start.getTime();
};

/**
 * Merge consecutive assignments for the same company
 * @param {Array} assignments - Array of assignments sorted by start_date
 * @returns {Array} Array of merged assignments
 */
const mergeConsecutiveAssignments = (assignments) => {
  if (assignments.length === 0) return [];
  
  const merged = [];
  let currentMerged = { ...assignments[0] };

  for (let i = 1; i < assignments.length; i++) {
    const current = assignments[i];
    
    // Check if same company and consecutive
    if (
      current.company_id === currentMerged.company_id &&
      isConsecutive(currentMerged.end_date, current.start_date)
    ) {
      // Merge: extend the end date and add days
      currentMerged.end_date = current.end_date;
      currentMerged.days = (currentMerged.days || 0) + (current.days || 0);
      currentMerged.merged_from = [
        ...(currentMerged.merged_from || [currentMerged.id]),
        current.id
      ];
      currentMerged.is_merged = true;
    } else {
      // Different company or gap exists
      merged.push(currentMerged);
      currentMerged = { ...current };
    }
  }
  
  // Push the last merged assignment
  merged.push(currentMerged);
  
  return merged;
};

module.exports = {
  isConsecutive,
  mergeConsecutiveAssignments
};
