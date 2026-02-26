console.log("🔥 LOADED assignmentController FROM:", __filename);

const Assignment = require('../models/Assignment');
const Auto = require('../models/Auto');
const AutoAdvertisement = require('../models/AutoAdvertisement');
const { computeDaysRemaining, calculateTotalDays, formatDateForDb, getDateNDaysFromNow } = require('../utils/dateUtils');
const { validateAssignmentDates } = require('../utils/assignmentValidation');

/**
 * Defensive fallback for computeDaysRemainingByStatus
 * Maps to computeDaysRemaining for compatibility
 */
function computeDaysRemainingByStatus(input) {
  if (!input) return null;
  if (input.end_date) return computeDaysRemaining(input.end_date);
  return computeDaysRemaining(input);
}

/**
 * Helper function to determine correct assignment status based on dates
 * PREBOOKED: start_date > today
 * ACTIVE: start_date <= today <= end_date
 * COMPLETED: end_date < today
 */
function getCorrectAssignmentStatus(startDate, endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (end < today) {
    return 'COMPLETED';
  } else if (start > today) {
    return 'PREBOOKED';
  } else {
    return 'ACTIVE';
  }
}

/**
 * Helper function to update assignment status based on current date
 * Automatically transitions assignments through their lifecycle
 * When transitioning to COMPLETED, auto-deletes associated advertisements
 */
async function updateAssignmentStatusIfNeeded(assignmentId) {
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return;
    
    const correctStatus = getCorrectAssignmentStatus(assignment.start_date, assignment.end_date);
    
    // Only update if status has changed
    if (assignment.status !== correctStatus) {
      await Assignment.updateStatus(assignmentId, correctStatus);
      
      // If transitioning to COMPLETED, delete associated advertisements
      if (correctStatus === 'COMPLETED') {
        try {
          await AutoAdvertisement.deleteByAutoAndCompany(assignment.auto_id, assignment.company_id);
          console.log(`✓ Deleted advertisements for auto ${assignment.auto_id} (company ${assignment.company_id}) on assignment completion`);
        } catch (adError) {
          console.error(`Error deleting advertisements for assignment ${assignmentId}:`, adError);
          // Don't throw - continue even if advertisement deletion fails
        }
      }
    }
  } catch (error) {
    console.error(`Error updating assignment status for ${assignmentId}:`, error);
  }
}

/**
 * Helper function to check if an auto has expired assignments and update auto status if needed
 * Sets auto to IDLE if all assignments are COMPLETED
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const { auto_id, company_id, days, start_date, is_prebooked } = req.body;

    if (!auto_id || !company_id || !days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const auto = await Auto.findById(auto_id);
    if (!auto) {
      return res.status(404).json({ error: 'Auto not found' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = getDateNDaysFromNow(days - 1, startDate);
    const totalDays = calculateTotalDays(startDate, endDate);

    // Get auto with all assignments for validation
    const autoWithAssignments = await Auto.getWithAssignments(auto_id);

    // Validate dates
    const validation = validateAssignmentDates(autoWithAssignments, startDate, endDate);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Determine status based on start_date (if start is today or before, it's ACTIVE; otherwise PREBOOKED)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    // Validate company exists
    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const assignment = await Assignment.create({
      auto_id,
      company_id,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    });

    // Update auto status based on assignment dates
    await Auto.recalculateAndUpdateStatus(auto_id);

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignAutos = async (req, res, next) => {
  try {
    const { auto_ids, company_id, days, start_date, is_prebooked, cost_per_day } = req.body;

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    // Filter out null/undefined auto_ids
    const validAutoIds = auto_ids.filter(id => id && id !== null && id !== undefined);
    if (validAutoIds.length === 0) {
      return res.status(400).json({ error: 'No valid auto IDs provided' });
    }

    // Get company name
    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = getDateNDaysFromNow(days - 1, startDate);
    const totalDays = calculateTotalDays(startDate, endDate);

    // Validate dates for each auto
    const validationErrors = [];
    for (const autoId of validAutoIds) {
      const auto = await Auto.getWithAssignments(autoId);
      if (!auto) {
        validationErrors.push({ auto_id: autoId, error: 'Auto not found' });
        continue;
      }

      const validation = validateAssignmentDates(auto, startDate, endDate);
      if (!validation.isValid) {
        validationErrors.push({ auto_id: autoId, error: validation.error });
      }
    }

    // If any validation errors, return them all
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed for some autos',
        details: validationErrors
      });
    }

    // Determine status based on start_date (if start is today or before, it's ACTIVE; otherwise PREBOOKED)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    const assignmentData = validAutoIds.map(auto_id => ({
      auto_id,
      company_id,
      start_date: formatDateForDb(startDate),
      end_date: formatDateForDb(endDate),
      days: totalDays,
      status: assignmentStatus,
    }));

    const assignments = await Assignment.createBulk(assignmentData);

    // Create payment records if cost_per_day is provided
    if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
      const Payment = require('../models/Payment');
      const Area = require('../models/Area');
      
      for (let i = 0; i < validAutoIds.length; i++) {
        const autoId = validAutoIds[i];
        const assignment = assignments[i];
        
        try {
          const auto = await Auto.findById(autoId);
          if (auto) {
            // Get area name if not present
            let areaName = auto.area_name || '';
            if (!areaName && auto.area_id) {
              const area = await Area.findById(auto.area_id);
              if (area) areaName = area.name;
            }

            await Payment.create({
              ticket_id: assignment.id,
              auto_id: autoId,
              company_id: company_id,
              auto_no: auto.auto_no,
              owner_name: auto.owner_name || '',
              area_id: auto.area_id || null,
              area_name: areaName,
              cost_per_day: parseFloat(cost_per_day),
              total_days: totalDays,
              total_cost: parseFloat(cost_per_day) * totalDays,
              assigned_time: new Date(),
              payment_status: 'PENDING'
            });
          }
        } catch (paymentError) {
          console.error(`[BULK_ASSIGN] Warning: Payment creation failed for auto ${autoId}:`, paymentError.message);
          // Don't throw - continue with other payments
        }
      }
    }

    // Update auto statuses based on their assignments (recalculate)
    await Promise.all(validAutoIds.map(id => Auto.recalculateAndUpdateStatus(id)));

    res.status(201).json(assignments);
  } catch (error) {
    next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { company_id, start_date, end_date, status, days } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const autoId = assignment.auto_id;

    // Prepare update data
    const updateData = {};
    if (company_id) updateData.company_id = company_id;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (days) updateData.days = parseInt(days);

    // If dates changed but status not specified, calculate correct status based on dates
    if ((start_date || end_date) && !status) {
      const newStartDate = start_date || assignment.start_date;
      const newEndDate = end_date || assignment.end_date;
      const newAssignmentStatus = getCorrectAssignmentStatus(newStartDate, newEndDate);
      updateData.status = newAssignmentStatus;
    } else if (status) {
      updateData.status = status;
    }

    const updated = await Assignment.update(id, updateData);

    // Recalculate auto status based on all its assignments
    await Auto.recalculateAndUpdateStatus(autoId);

    // Enrich the response with company_name and days_remaining
    const Company = require('../models/Company');
    if (updated && updated.company_id) {
      const company = await Company.findById(updated.company_id);
      updated.company_name = company?.name || 'Unknown';
    }
    updated.days_remaining = computeDaysRemaining(updated.end_date);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.getActiveAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.findActive();
    
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemaining(a.end_date),
    }));
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.getAllAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.findAll();
    
    const enriched = assignments.map(a => ({
      ...a,
      days_remaining: computeDaysRemaining(a.end_date),
    }));
    
    res.json({
      list: enriched,
      count: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentsByCompany = async (req, res, next) => {
  console.log('[NEW_FIXED_VERSION_FEB4] getAssignmentsByCompany called with companyId:', req.params.companyId);
  const { companyId } = req.params;
  if (!companyId) return res.status(400).json({ error: 'Company ID required' });
  try {
    const assignments = await Assignment.findByCompanyId(companyId);
    if (!assignments || !assignments.length) return res.json([]);
    const list = assignments.map(a => {
      const daysRemaining = computeDaysRemaining(a.end_date);
      return { ...a, days_remaining: daysRemaining };
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch assignments', details: e.message });
  }
};

exports.getPriorityAssignments = async (req, res, next) => {
  try {
    const daysThreshold = req.query.threshold ? parseInt(req.query.threshold) : 2;
    const autos = await Auto.getPriorityAutos(daysThreshold);
    
    const enriched = await Promise.all(autos.map(async (auto) => {
      const assignments = await Assignment.findByAutoId(auto.id);
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
      
      return {
        ...auto,
        days_remaining: activeAssignment ? computeDaysRemaining(activeAssignment.end_date) : null,
        end_date: activeAssignment?.end_date,
        company_name: activeAssignment?.company_name,
      };
    }));

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.deleteByAutoId = async (req, res, next) => {
  try {
    const { autoId } = req.params;

    if (!autoId) {
      return res.status(400).json({ error: 'Auto ID is required' });
    }

    // Delete all assignments for the auto
    const result = await Assignment.deleteByAutoId(autoId);

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'No assignments found for this auto' });
    }

    // Update auto status to IDLE
    await Auto.updateStatus(autoId, 'IDLE');

    res.json({ 
      message: `${result.deletedCount} assignment(s) deleted successfully. Auto status updated to IDLE.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const autoId = assignment.auto_id;

    // Delete the assignment
    const result = await Assignment.deleteById(id);

    if (!result) {
      return res.status(404).json({ error: 'Failed to delete assignment' });
    }

    // Check remaining assignments for this auto
    const remainingAssignments = await Assignment.findByAutoId(autoId);
    
    // If no more active/prebooked assignments, update auto status to IDLE
    const hasActiveAssignments = remainingAssignments.some(a => a.status === 'ACTIVE' || a.status === 'PREBOOKED');
    if (!hasActiveAssignments) {
      await Auto.updateStatus(autoId, 'IDLE');
    }

    res.json({ 
      message: 'Assignment deleted successfully',
      autoId: autoId
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateAssignments = async (req, res, next) => {
  try {
    const { auto_ids, company_id, days, start_date, cost_per_day } = req.body;

    console.log('[BULK UPDATE] Request body:', JSON.stringify(req.body));

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0 || !company_id || !days || !start_date) {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    const validAutoIds = auto_ids.filter(id => id && id !== null && id !== undefined);
    if (validAutoIds.length === 0) {
      return res.status(400).json({ error: 'No valid auto IDs provided' });
    }

    const Company = require('../models/Company');
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const startDate = new Date(start_date);
    const endDate = getDateNDaysFromNow(days - 1, startDate);
    const totalDays = calculateTotalDays(startDate, endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkStartDate = new Date(startDate);
    checkStartDate.setHours(0, 0, 0, 0);
    const assignmentStatus = checkStartDate <= today ? 'ACTIVE' : 'PREBOOKED';

    const db = require('../models/db');
    const Payment = require('../models/Payment');
    const Area = require('../models/Area');
    
    // For each auto:
    // 1. Get ALL existing assignments (except COMPLETED - keep those)
    // 2. Delete those assignments and their payments
    // 3. Create new assignment
    // 4. Create new payment if cost_per_day provided
    
    const deletedAssignments = [];
    const deletedPayments = [];
    const newAssignments = [];
    const newPayments = [];

    for (const autoId of validAutoIds) {
      // Get all non-COMPLETED assignments (ACTIVE, PREBOOKED, etc.)
      const existingAssignments = await db('assignments')
        .where({ auto_id: autoId })
        .whereNot({ status: 'COMPLETED' });  // Keep COMPLETED assignments
      
      console.log(`[BULK UPDATE] Auto ${autoId}: Found ${existingAssignments.length} non-completed assignments to delete`);

      // Delete payments for these assignments
      for (const assignment of existingAssignments) {
        const payments = await db('payments').where({ assignment_id: assignment.id });
        for (const payment of payments) {
          await db('payments').where({ id: payment.id }).del();
          deletedPayments.push(payment);
          console.log(`[BULK UPDATE] Deleted payment ${payment.id} for assignment ${assignment.id}`);
        }
      }

      // Delete these assignments
      if (existingAssignments.length > 0) {
        const assignmentIds = existingAssignments.map(a => a.id);
        await db('assignments').whereIn('id', assignmentIds).del();
        deletedAssignments.push(...existingAssignments);
        console.log(`[BULK UPDATE] Deleted ${existingAssignments.length} assignments for auto ${autoId}`);
      }

      // Create NEW assignment
      const newAssignment = await db('assignments').insert({
        id: require('uuid').v4(),
        auto_id: autoId,
        company_id: company_id,
        start_date: formatDateForDb(startDate),
        end_date: formatDateForDb(endDate),
        days: totalDays,
        status: assignmentStatus,
        created_at: new Date(),
        updated_at: new Date(),
      }).returning('*');

      newAssignments.push(newAssignment[0]);
      console.log(`[BULK UPDATE] Created new assignment for auto ${autoId}`);

      // Create NEW payment if cost_per_day provided
      if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
        const auto = await require('../models/Auto').findById(autoId);
        if (auto && auto.area_id) {
          const area = await Area.findByIdAsync(auto.area_id);
          const monthlyPaymentAmount = cost_per_day * totalDays;

          const newPayment = await db('payments').insert({
            id: require('uuid').v4(),
            auto_id: autoId,
            company_id: company_id,
            assignment_id: newAssignment[0].id,
            amount: monthlyPaymentAmount,
            area_id: auto.area_id,
            status: 'PENDING',
            payment_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          }).returning('*');

          newPayments.push(newPayment[0]);
          console.log(`[BULK UPDATE] Created new payment ${newPayment[0].id} for auto ${autoId}`);
        }
      }
    }

    // Recalculate auto statuses
    await Promise.all(validAutoIds.map(id => require('../models/Auto').recalculateAndUpdateStatus(id)));

    res.status(200).json({
      message: `Successfully updated ${validAutoIds.length} autos. Deleted old assignments and payments, created new ones.`,
      summary: {
        autos_updated: validAutoIds.length,
        assignments_deleted: deletedAssignments.length,
        payments_deleted: deletedPayments.length,
        assignments_created: newAssignments.length,
        payments_created: newPayments.length,
      },
      new_assignments: newAssignments,
      new_payments: newPayments,
    });
  } catch (error) {
    console.error('[BULK UPDATE] Error:', error);
    next(error);
  }
};

/**
 * Get completed assignments (for history/archive view)
 * These are assignments where end_date <= today
 */
exports.getCompletedAssignments = async (req, res, next) => {
  try {
    // Get all completed assignments (for history/archive)
    const assignments = await Assignment.findCompleted();
    
    // Enrich with company and auto info
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const Company = require('../models/Company');
        const Auto = require('../models/Auto');
        
        if (a.company_id && !a.company_name) {
          const company = await Company.findById(a.company_id);
          a.company_name = company?.name || 'Unknown';
        }
        
        if (a.auto_id && !a.auto_no) {
          const auto = await Auto.findById(a.auto_id);
          a.auto_no = auto?.auto_no || 'Unknown';
        }
        
        return {
          ...a,
          days_remaining: 0,  // Completed assignments have 0 days remaining
        };
      })
    );
    
    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.deleteOldCompletedAssignments = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Assignment.deleteWhere({
      status: 'COMPLETED',
      deleted_at: null
    });
    
    res.json({
      message: `Deleted ${result.deletedCount || 0} old completed assignments`,
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignAutos = async (req, res, next) => {
  try {
    // Accept either 'days' or 'days_required' from frontend
    let { auto_ids, company_id, start_date, end_date, days_required, days, is_prebooked, cost_per_day } = req.body;

    console.log('[BULK] Raw request body:', JSON.stringify(req.body));

    // Use 'days' if 'days_required' is not provided
    if (!days_required && days) {
      days_required = days;
    }

    // Normalize inputs - be very flexible with date formats
    if (typeof start_date === 'string') start_date = start_date.trim();
    if (typeof end_date === 'string') end_date = end_date.trim();
    
    // Convert DD-MM-YYYY to YYYY-MM-DD if needed
    if (start_date && start_date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = start_date.split('-');
      start_date = `${year}-${month}-${day}`;
    }
    if (end_date && end_date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = end_date.split('-');
      end_date = `${year}-${month}-${day}`;
    }
    
    // Parse days_required to number
    let parsedDaysRequired = null;
    if (days_required !== undefined && days_required !== null && days_required !== '') {
      parsedDaysRequired = Number(days_required);
      if (!isNaN(parsedDaysRequired) && parsedDaysRequired > 0) {
        days_required = parsedDaysRequired;
      } else {
        days_required = null;
      }
    } else {
      days_required = null;
    }

    console.log('[BULK] After normalization:', { auto_ids, company_id, start_date, end_date, days_required, cost_per_day });

    // Validate required fields
    if (!start_date || start_date === '') {
      return res.status(400).json({ error: 'start_date is required' });
    }

    if (!company_id || company_id.toString().trim() === '') {
      return res.status(400).json({ error: 'company_id is required' });
    }

    if (!auto_ids || !Array.isArray(auto_ids) || auto_ids.length === 0) {
      return res.status(400).json({ error: 'auto_ids must be a non-empty array' });
    }

    // Must have either end_date OR days_required - check properly
    const hasValidEndDate = end_date && end_date.trim && end_date.trim() !== '';
    const hasValidDaysRequired = days_required !== null && days_required !== undefined && days_required > 0;

    console.log('[BULK] Validation check:', { hasValidEndDate, hasValidDaysRequired, end_date, days_required });

    if (!hasValidEndDate && !hasValidDaysRequired) {
      return res.status(400).json({ 
        error: 'Provide either end_date (like 2026-02-07) or days (like 7)',
        debug: { end_date, days_required }
      });
    }

    // Determine final end_date
    let finalEndDate;
    if (hasValidEndDate) {
      finalEndDate = end_date;
    } else if (hasValidDaysRequired) {
      finalEndDate = getDateNDaysFromNow(days_required - 1, start_date);
    }

    // Calculate total days
    const totalDays = calculateTotalDays(start_date, finalEndDate);
    const assignmentStatus = getCorrectAssignmentStatus(start_date, finalEndDate);

    console.log('[BULK] Creating assignments:', { totalDays, assignmentStatus, auto_ids_count: auto_ids.length });

    // Create assignments for all autos
    const assignments = [];
    const errors = [];

    for (const autoId of auto_ids) {
      try {
        const assignment = await Assignment.create({
          auto_id: autoId,
          company_id: company_id,
          start_date: start_date,
          end_date: finalEndDate,
          days: totalDays,
          status: assignmentStatus,
        });
        assignments.push(assignment);
        console.log(`[BULK] Created assignment for auto ${autoId}:`, assignment.id);

        // Update auto status
        try {
          await Auto.recalculateAndUpdateStatus(autoId);
        } catch (statusError) {
          console.warn(`[BULK] Warning: Could not recalculate status for auto ${autoId}:`, statusError.message);
        }

        // Create payment record if cost_per_day provided
        if (cost_per_day !== undefined && cost_per_day !== null && cost_per_day > 0) {
          try {
            const Payment = require('../models/Payment');
            const auto = await Auto.findById(autoId);
            await Payment.create({
              ticket_id: assignment.id,
              auto_id: autoId,
              company_id: company_id,
              auto_no: auto?.auto_no || '',
              owner_name: auto?.owner_name || '',
              area_id: auto?.area_id || null,
              area_name: auto?.area_name || '',
              cost_per_day: parseFloat(cost_per_day),
              total_days: totalDays,
              total_cost: parseFloat(cost_per_day) * totalDays,
              payment_status: 'PENDING'
            });
          } catch (paymentError) {
            console.warn(`[BULK] Warning: Could not create payment for auto ${autoId}:`, paymentError.message);
          }
        }
      } catch (autoError) {
        const errorMsg = `Error creating assignment for auto ${autoId}: ${autoError.message}`;
        console.error(`[BULK]`, errorMsg);
        errors.push({ autoId, error: errorMsg });
      }
    }

    console.log(`[BULK] Complete: Created ${assignments.length} assignments, ${errors.length} errors`);

    res.status(201).json({
      message: `Created ${assignments.length}/${auto_ids.length} assignments`,
      assignments: assignments,
      count: assignments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[BULK] Fatal error:', error);
    next(error);
  }
};



