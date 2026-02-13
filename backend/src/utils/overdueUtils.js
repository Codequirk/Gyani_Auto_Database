const db = require('../models/db');
const { computeDaysRemaining } = require('./dateUtils');

/**
 * Check if an auto is overdue (has an overdue payment)
 * An auto is overdue if it has a payment where the end_date has passed
 * 
 * @param {string} autoId - The auto ID to check
 * @returns {Promise<boolean>} - True if auto is overdue, false otherwise
 */
async function isAutoOverdue(autoId) {
  try {
    // Get the latest payment for this auto
    const payment = await db('auto_monthly_payments')
      .where({ auto_id: autoId, deleted_at: null })
      .orderBy('end_date', 'desc')
      .first();

    if (!payment) {
      // No payment means auto is not overdue
      return false;
    }

    // Check if the end_date has passed (daysRemaining <= 0 means overdue)
    const daysRemaining = computeDaysRemaining(payment.end_date);
    const isOverdue = daysRemaining <= 0;
    
    if (isOverdue) {
      console.log(`  📅 Auto payment check: end_date=${payment.end_date}, daysRemaining=${daysRemaining} → OVERDUE`);
    }
    
    return isOverdue;
  } catch (error) {
    console.error('❌ Error checking if auto is overdue:', error);
    return false;
  }
}

/**
 * Get all overdue auto IDs
 * @returns {Promise<Array<string>>} - Array of auto IDs that are overdue
 */
async function getAllOverdueAutoIds() {
  try {
    const payments = await db('auto_monthly_payments')
      .where({ deleted_at: null })
      .select('auto_id', 'end_date')
      .orderBy('auto_id')
      .orderBy('end_date', 'desc');

    const overdueAutoIds = new Set();
    
    for (const payment of payments) {
      const daysRemaining = computeDaysRemaining(payment.end_date);
      if (daysRemaining === 0) {
        overdueAutoIds.add(payment.auto_id);
      }
    }

    return Array.from(overdueAutoIds);
  } catch (error) {
    console.error('❌ Error getting overdue auto IDs:', error);
    return [];
  }
}

module.exports = {
  isAutoOverdue,
  getAllOverdueAutoIds,
};
