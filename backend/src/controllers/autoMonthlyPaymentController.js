const AutoMonthlyPayment = require('../models/AutoMonthlyPayment');
const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const Company = require('../models/Company');

/**
 * CRITICAL HELPER: Normalize date strings to DATE-ONLY format
 * 
 * Purpose: Ensure dates are treated as calendar dates, NOT timestamps
 * - Input: "2026-02-10" or "2026-02-10T00:00:00" or "2026-02-10T00:00:00+05:30"
 * - Output: "2026-02-10" (always YYYY-MM-DD, no time/timezone)
 * 
 * This prevents timezone conversion bugs where:
 *   - User selects Feb 10
 *   - Backend converts to UTC timestamp
 *   - Timezone offset causes shift to Feb 9
 *   - User sees Feb 9 after saving
 * 
 * Solution: Always extract and return YYYY-MM-DD only
 */
const normalizeDateString = (dateInput) => {
  if (!dateInput) return null;
  
  // If already in YYYY-MM-DD format, return as-is
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // If it's a Date object, convert to YYYY-MM-DD
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's an ISO string with time/timezone info, extract just the date part
  if (typeof dateInput === 'string') {
    // Extract YYYY-MM-DD from ISO format: "2026-02-10T00:00:00Z" → "2026-02-10"
    const dateMatch = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
  }
  
  // Invalid format
  return null;
};

exports.createAutoMonthlyPayment = async (req, res, next) => {
  try {
    const { assignment_id, auto_id, company_id, monthly_cost, advance_payment, start_date, end_date, notes } = req.body;

    // Validate required fields
    if (!monthly_cost || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields: monthly_cost, start_date, end_date',
      });
    }

    // CRITICAL: Ensure dates are treated as DATE-ONLY (YYYY-MM-DD format)
    // Do NOT convert to ISO strings or add timezone info
    // Dates must be stored as SQL DATE type, never as TIMESTAMP
    const normalizedStartDate = normalizeDateString(start_date);
    const normalizedEndDate = normalizeDateString(end_date);

    if (!normalizedStartDate || !normalizedEndDate) {
      return res.status(400).json({
        error: 'Invalid date format. Dates must be YYYY-MM-DD (e.g., 2026-02-10)',
      });
    }

    let finalAutoId = auto_id;
    let finalCompanyId = company_id;

    // If assignment_id is provided, get auto_id and company_id from it
    if (assignment_id) {
      const assignment = await Assignment.findById(assignment_id);
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      finalAutoId = assignment.auto_id;
      finalCompanyId = assignment.company_id;
    }

    // Validate that we have auto_id and company_id
    if (!finalAutoId) {
      return res.status(400).json({ error: 'Missing required field: auto_id' });
    }

    // Get auto details to verify it exists
    const auto = await Auto.findById(finalAutoId);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    // If company_id not provided, try to find it from active assignment
    if (!finalCompanyId && assignment_id) {
      finalCompanyId = (await Assignment.findById(assignment_id))?.company_id;
    }

    // Create payment record
    // Dates are stored as DATE-ONLY strings (YYYY-MM-DD) - NO timezone conversion
    const payment = await AutoMonthlyPayment.create({
      assignment_id: assignment_id || null,
      auto_id: finalAutoId,
      company_id: finalCompanyId || null,
      monthly_cost: parseFloat(monthly_cost),
      advance_payment: advance_payment ? parseFloat(advance_payment) : 0, // NEW: Advance payment
      start_date: normalizedStartDate,
      end_date: normalizedEndDate,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Auto monthly payment created successfully',
      payment,
    });
  } catch (error) {
    console.error('[AUTO-PAYMENT] Create error:', error);
    next(error);
  }
};

exports.getAutoMonthlyPayments = async (req, res, next) => {
  try {
    const payments = await AutoMonthlyPayment.findAll();
    console.log(`[AUTO-PAYMENT] Found ${payments.length} payments`);

    // If no payments, return empty list
    if (!payments || payments.length === 0) {
      return res.json({
        list: [],
        count: 0,
      });
    }

    // Try to enrich with auto and company details
    let enriched = [];
    try {
      enriched = await Promise.all(
        payments.map(async (payment) => {
          try {
            const auto = payment.auto_id ? await Auto.findById(payment.auto_id) : null;
            const company = payment.company_id ? await Company.findById(payment.company_id) : null;
            
            return {
              ...payment,
              auto_no: auto?.auto_no || 'Unknown',
              owner_name: auto?.owner_name || 'Unknown',
              area_name: auto?.area_name || 'Unknown',
              company_name: company?.name || 'Unknown',
            };
          } catch (enrichError) {
            console.warn(`[AUTO-PAYMENT] Error enriching payment ${payment.id}:`, enrichError.message);
            // Return payment with default values if enrichment fails
            return {
              ...payment,
              auto_no: 'Unknown',
              owner_name: 'Unknown',
              area_name: 'Unknown',
              company_name: 'Unknown',
            };
          }
        })
      );
    } catch (enrichError) {
      console.warn(`[AUTO-PAYMENT] Enrichment process failed, returning raw payments:`, enrichError.message);
      // If enrichment completely fails, return payments as-is
      enriched = payments.map(p => ({
        ...p,
        auto_no: 'Unknown',
        owner_name: 'Unknown',
        area_name: 'Unknown',
        company_name: 'Unknown',
      }));
    }

    console.log(`[AUTO-PAYMENT] Returning ${enriched.length} enriched payments`);

    res.json({
      list: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error('[AUTO-PAYMENT] Get all error:', error);
    next(error);
  }
};

exports.getAutoMonthlyPaymentsByAuto = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    const payments = await AutoMonthlyPayment.findByAutoId(autoId);

    if (!payments || payments.length === 0) {
      return res.json({
        list: [],
        count: 0,
      });
    }

    // Enrich with company details
    const enriched = await Promise.all(
      payments.map(async (payment) => {
        try {
          const company = await Company.findById(payment.company_id);
          return {
            ...payment,
            company_name: company?.name || 'Unknown',
          };
        } catch (err) {
          console.warn(`[AUTO-PAYMENT] Error enriching payment ${payment.id}:`, err.message);
          return {
            ...payment,
            company_name: 'Unknown',
          };
        }
      })
    );

    res.json({
      list: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error('[AUTO-PAYMENT] Get by auto error:', error);
    next(error);
  }
};

exports.updateAutoMonthlyPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { monthly_cost, advance_payment, start_date, end_date, notes } = req.body;

    const payment = await AutoMonthlyPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updateData = {};
    if (monthly_cost !== undefined) updateData.monthly_cost = parseFloat(monthly_cost);
    if (advance_payment !== undefined) updateData.advance_payment = parseFloat(advance_payment) || 0; // NEW: Update advance payment
    
    // CRITICAL: Normalize dates to DATE-ONLY format (YYYY-MM-DD)
    // Do NOT convert to ISO strings or add timezone info
    if (start_date) {
      const normalizedStartDate = normalizeDateString(start_date);
      if (!normalizedStartDate) {
        return res.status(400).json({
          error: 'Invalid start_date format. Must be YYYY-MM-DD (e.g., 2026-02-10)',
        });
      }
      updateData.start_date = normalizedStartDate;
    }
    
    if (end_date) {
      const normalizedEndDate = normalizeDateString(end_date);
      if (!normalizedEndDate) {
        return res.status(400).json({
          error: 'Invalid end_date format. Must be YYYY-MM-DD (e.g., 2026-03-11)',
        });
      }
      updateData.end_date = normalizedEndDate;
    }
    
    if (notes !== undefined) updateData.notes = notes;

    const updated = await AutoMonthlyPayment.update(paymentId, updateData);

    res.json({
      success: true,
      message: 'Auto monthly payment updated successfully',
      payment: updated,
    });
  } catch (error) {
    console.error('[AUTO-PAYMENT] Update error:', error);
    next(error);
  }
};

exports.deleteAutoMonthlyPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const payment = await AutoMonthlyPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await AutoMonthlyPayment.delete(paymentId);

    res.json({
      success: true,
      message: 'Auto monthly payment deleted successfully',
    });
  } catch (error) {
    console.error('[AUTO-PAYMENT] Delete error:', error);
    next(error);
  }
};
