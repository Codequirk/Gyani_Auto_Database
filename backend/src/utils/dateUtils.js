// Calculate days remaining from end_date
function computeDaysRemaining(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
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
  date.setDate(date.getDate() + parseInt(days));
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
  calculateTotalDays,
  isPriority,
  getDateNDaysFromNow,
  formatDateForDb,
};
