/**
 * Image Management Utilities
 * Handles week-based image lifecycle management
 */

const { getWeek, getYear, isThursday, isSunday, isMonday, isTuesday, getWeeksInYear } = require('date-fns');

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
 * Get week number for a specific date
 */
function getWeekNumber(date) {
  return getWeek(new Date(date));
}

/**
 * Get year for a specific date
 */
function getYearForDate(date) {
  return getYear(new Date(date));
}

/**
 * Check if image is from current week
 */
function isCurrentWeek(imageWeekNumber, imageYear) {
  const now = new Date();
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getCurrentYear();
  
  return imageWeekNumber === currentWeek && imageYear === currentYear;
}

/**
 * Check if image is from previous week
 */
function isPreviousWeek(imageWeekNumber, imageYear) {
  const now = new Date();
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getCurrentYear();
  
  // Previous week
  if (currentWeek === 1) {
    return imageWeekNumber === 53 && imageYear === currentYear - 1;
  }
  
  return imageWeekNumber === currentWeek - 1 && imageYear === currentYear;
}

/**
 * Check if today is in the buffer window (Sunday 00:00 - Tuesday 23:59)
 */
function isInBufferWindow() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
  
  return dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2; // Sunday, Monday, Tuesday
}

/**
 * Check if today is past Tuesday 11:59 PM
 */
function isPastTuesdayDeadline() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // If it's Wednesday or later
  if (dayOfWeek >= 3) return true;
  
  // If it's Tuesday, check if it's past 23:59
  if (dayOfWeek === 2) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();
    
    // Check if past 23:59:00
    if (hour > 23) return true;
    if (hour === 23 && minute > 59) return true;
    if (hour === 23 && minute === 59 && second > 0) return true;
  }
  
  return false;
}

/**
 * Determine which section an auto should be in
 * 
 * Section 1 (MISSING): No image, or old image past deadline
 * Section 2 (BUFFER): Previous week image, within buffer window
 * Section 3 (UPLOADED): Current week image
 * 
 * NOTE: This function assumes the auto has already been filtered for active assignments.
 * It should NOT check auto.status column as it may be outdated.
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
  
  // Previous week image + in buffer window (Sun-Tue)
  if (isPreviousWeek(autoImageWeek, autoImageYear) && isInBufferWindow()) {
    return 'BUFFER';
  }
  
  // Old image past Tuesday deadline
  if (isPreviousWeek(autoImageWeek, autoImageYear) && isPastTuesdayDeadline()) {
    return 'MISSING'; // Image should be deleted
  }
  
  // Any other old image = MISSING
  return 'MISSING';
}

/**
 * Check if auto image should be auto-deleted (Tuesday 23:59 deadline)
 */
function shouldAutoDeleteImage(auto) {
  // Must have an image
  if (!auto.image_url || !auto.image_week_number) {
    return false;
  }
  
  const currentWeek = getCurrentWeekNumber();
  const currentYear = getCurrentYear();
  
  // Is from previous week
  const isPrev = isPreviousWeek(auto.image_week_number, auto.image_year);
  
  // Is past Tuesday deadline
  const pastDeadline = isPastTuesdayDeadline();
  
  return isPrev && pastDeadline;
}

/**
 * Check if image should be deleted due to assignment completion
 * (different company in next assignment or no next assignment)
 */
function shouldDeleteImageOnAssignmentEnd(currentCompanyId, nextCompanyId) {
  // If no next assignment, delete image
  if (!nextCompanyId) {
    return true;
  }
  
  // If next company is different, delete image
  if (nextCompanyId !== currentCompanyId) {
    return true;
  }
  
  // Same company, keep image
  return false;
}

module.exports = {
  getCurrentWeekNumber,
  getCurrentYear,
  getWeekNumber,
  getYearForDate,
  isCurrentWeek,
  isPreviousWeek,
  isInBufferWindow,
  isPastTuesdayDeadline,
  getAutoImageSection,
  shouldAutoDeleteImage,
  shouldDeleteImageOnAssignmentEnd,
};
