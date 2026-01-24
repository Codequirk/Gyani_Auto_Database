// Calculate days remaining from end_date
// Returns 0 if the end_date is today or in the past (never negative)
function computeDaysRemaining(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Return 0 if assignment has expired (no negative values)
  return daysDiff < 0 ? 0 : daysDiff;
}

// Calculate days remaining for assignment based on status
// For PREBOOKED: days from today (inclusive) until the day before start_date (inclusive)
// For ACTIVE: days from today until end_date
function computeDaysRemainingByStatus(startDate, endDate, status) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (status === 'PREBOOKED') {
    // Calculate days from today (inclusive) until day before start_date (inclusive)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1); // Day before start_date
    
    const timeDiff = start - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Add 1 to include today in the count
    return daysDiff < 0 ? 0 : daysDiff + 1;
  } else {
    // For ACTIVE and other statuses, use end_date
    return computeDaysRemaining(endDate);
  }
}

// Calculate total days between two dates (inclusive)
function calculateTotalDays(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - start;
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to make it inclusive
  
  return daysDiff;
}

// Check if auto is priority (2 days or less remaining)
function isPriority(endDate) {
  const daysRemaining = computeDaysRemaining(endDate);
  return daysRemaining >= 0 && daysRemaining <= 2;
}

// Get date N days from a given date (or from now if no date provided)
function getDateNDaysFromNow(days, fromDate = null) {
  const date = fromDate ? new Date(fromDate) : new Date();
  // Subtract 1 from days because the start date is day 1
  // e.g., 1 day = same day (add 0), 2 days = next day (add 1), etc.
  date.setDate(date.getDate() + parseInt(days) - 1);
  return date;
}

// Format date for database (YYYY-MM-DD)
function formatDateForDb(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

module.exports = {
  computeDaysRemaining,
  computeDaysRemainingByStatus,
  calculateTotalDays,
  isPriority,
  getDateNDaysFromNow,
  formatDateForDb,
};
