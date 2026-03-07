/**
 * Image Management Utilities
 * 
 * Handles week-based image lifecycle computation
 * 
 * KEY PRINCIPLE: Image lifecycle is determined ONLY by:
 * - image_url
 * - image_week_number
 * - image_year
 * 
 * No manual section status is stored in the database.
 * Sections are computed dynamically based on week numbers.
 */

const { getWeek, getYear } = require('date-fns');

/**
 * Get current ISO week number (1-53)
 */
function getCurrentWeekNumber() {
  return getWeek(new Date());
}

/**
 * Get current year
 */
function getCurrentYear() {
  return getYear(new Date());
}

/**
 * Check if image is from previous week
 * 
 * Handles year boundary correctly:
 * - If current week = 1, previous week = 53 of last year
 * - Otherwise, previous week = current_week - 1 of current year
 */
function isPreviousWeek(imageWeekNumber, imageYear) {
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getCurrentYear();
  
  // Year boundary: week 1 comes after week 53
  if (currentWeek === 1) {
    return imageWeekNumber === 53 && imageYear === currentYear - 1;
  }
  
  return imageWeekNumber === currentWeek - 1 && imageYear === currentYear;
}

/**
 * DEPRECATED: This function is no longer used
 * Sections are now computed directly in getImageSections() with clear week logic
 * 
 * Kept for reference only - remove in future cleanup
 */
function getAutoImageSection(auto) {
  // No image at all
  if (!auto.image_url || !auto.image_week_number) {
    return 'MISSING';
  }
  
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getCurrentYear();
  const autoImageWeek = auto.image_week_number;
  const autoImageYear = auto.image_year;
  
  // Current week image
  if (autoImageWeek === currentWeek && autoImageYear === currentYear) {
    return 'UPLOADED';
  }
  
  // Previous week image
  if (isPreviousWeek(autoImageWeek, autoImageYear)) {
    return 'BUFFER';
  }
  
  // Any other old image
  return 'MISSING';
}

module.exports = {
  getCurrentWeekNumber,
  getCurrentYear,
  isPreviousWeek,
  getAutoImageSection, // Deprecated, kept for compatibility
};
