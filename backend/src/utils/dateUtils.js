// Calculate days remaining from end_date
// Returns 0 if the end_date is today or in the past (never negative)
function computeDaysRemaining(endDate) {
  // Get today's date in local timezone, normalized to midnight
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayNormalized = new Date(`${year}-${month}-${day}T00:00:00`);
  
  // Parse end date and normalize to midnight
  let end;
  if (typeof endDate === 'string') {
    // If it's a string like "2026-01-30", parse it directly
    if (endDate.includes('T')) {
      // It's an ISO string with time
      end = new Date(endDate.split('T')[0] + 'T00:00:00');
    } else {
      // It's just a date string
      end = new Date(endDate + 'T00:00:00');
    }
  } else {
    end = new Date(endDate);
    // Extract just the date part and create a new date at midnight
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    end = new Date(`${endYear}-${endMonth}-${endDay}T00:00:00`);
  }
  
  const timeDiff = end - todayNormalized;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  // Return 0 if assignment has expired (no negative values)
  return daysDiff < 0 ? 0 : daysDiff;
}

// Calculate total days between two dates (inclusive)
function calculateTotalDays(startDate, endDate) {
  // Parse start date
  let start;
  if (typeof startDate === 'string') {
    if (startDate.includes('T')) {
      start = new Date(startDate.split('T')[0] + 'T00:00:00');
    } else {
      start = new Date(startDate + 'T00:00:00');
    }
  } else {
    start = new Date(startDate);
    const startYear = start.getFullYear();
    const startMonth = String(start.getMonth() + 1).padStart(2, '0');
    const startDay = String(start.getDate()).padStart(2, '0');
    start = new Date(`${startYear}-${startMonth}-${startDay}T00:00:00`);
  }
  
  // Parse end date
  let end;
  if (typeof endDate === 'string') {
    if (endDate.includes('T')) {
      end = new Date(endDate.split('T')[0] + 'T00:00:00');
    } else {
      end = new Date(endDate + 'T00:00:00');
    }
  } else {
    end = new Date(endDate);
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    end = new Date(`${endYear}-${endMonth}-${endDay}T00:00:00`);
  }
  
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
  // If 1 day is selected, end date should be the same day (start date)
  // So we add (days - 1) to the start date
  date.setDate(date.getDate() + (parseInt(days) - 1));
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
