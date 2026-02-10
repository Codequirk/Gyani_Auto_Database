const db = require('./db');
const { v4: uuidv4 } = require('uuid');

/**
 * CRITICAL: Format DATE columns back to YYYY-MM-DD strings
 * 
 * When Knex retrieves DATE columns, it converts them to Date objects.
 * In a timezone-aware system, this causes shifts:
 *   - Stored: "2026-02-10" in DATE column
 *   - Retrieved: Date object interpreted as UTC midnight
 *   - Timezone offset: IST +5:30 shifts it to Feb 9 at 7:30 PM
 *   - Result: User sees Feb 9 instead of Feb 10
 * 
 * Solution: Convert Date objects back to YYYY-MM-DD strings immediately.
 */
const formatDate = (date) => {
  if (!date) return null;
  
  // If already a string in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a Date object, format to YYYY-MM-DD
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return date;
};

/**
 * Format all date fields in a payment object
 */
const formatPaymentDates = (payment) => {
  if (!payment) return null;
  return {
    ...payment,
    start_date: formatDate(payment.start_date),
    end_date: formatDate(payment.end_date),
  };
};

class AutoMonthlyPayment {
  static async create(data) {
    const id = uuidv4();
    const payload = {
      id,
      assignment_id: data.assignment_id,
      auto_id: data.auto_id,
      company_id: data.company_id,
      monthly_cost: data.monthly_cost,
      advance_payment: data.advance_payment || 0, // NEW: Advance payment for this auto
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('auto_monthly_payments').insert(payload);
    return this.findById(id);
  }

  static async findById(id) {
    const payment = await db('auto_monthly_payments')
      .where({ id, deleted_at: null })
      .first();
    // CRITICAL: Format dates back to YYYY-MM-DD strings (prevent timezone shifts)
    return formatPaymentDates(payment);
  }

  static async findByAutoId(autoId) {
    const payments = await db('auto_monthly_payments')
      .where({ auto_id: autoId, deleted_at: null })
      .orderBy('start_date', 'desc');
    // CRITICAL: Format dates back to YYYY-MM-DD strings (prevent timezone shifts)
    return payments.map(formatPaymentDates);
  }

  static async findByAssignmentId(assignmentId) {
    const payments = await db('auto_monthly_payments')
      .where({ assignment_id: assignmentId, deleted_at: null })
      .orderBy('start_date', 'desc');
    // CRITICAL: Format dates back to YYYY-MM-DD strings (prevent timezone shifts)
    return payments.map(formatPaymentDates);
  }

  static async findByCompanyId(companyId) {
    const payments = await db('auto_monthly_payments')
      .where({ company_id: companyId, deleted_at: null })
      .orderBy('start_date', 'desc');
    // CRITICAL: Format dates back to YYYY-MM-DD strings (prevent timezone shifts)
    return payments.map(formatPaymentDates);
  }

  static async findAll() {
    const payments = await db('auto_monthly_payments')
      .where({ deleted_at: null })
      .orderBy('start_date', 'desc');
    // CRITICAL: Format dates back to YYYY-MM-DD strings (prevent timezone shifts)
    return payments.map(formatPaymentDates);
  }

  static async update(id, data) {
    const updatePayload = {
      ...data,
      updated_at: new Date(),
    };

    await db('auto_monthly_payments')
      .where({ id, deleted_at: null })
      .update(updatePayload);

    return this.findById(id);
  }

  static async delete(id) {
    // Soft delete
    await db('auto_monthly_payments')
      .where({ id })
      .update({ deleted_at: new Date() });
  }

  static async hardDelete(id) {
    await db('auto_monthly_payments').where({ id }).del();
  }
}

module.exports = AutoMonthlyPayment;
